require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Harf notu hesaplama (YÖK 100 tabanlı)
function getLetterGrade(score) {
  if (score >= 93) return { letter: 'AA', label: 'Pekiyi', color: '#1a7431', bg: '#d4edda' };
  if (score >= 85) return { letter: 'BA', label: 'İyi-Pekiyi', color: '#155724', bg: '#c3e6cb' };
  if (score >= 77) return { letter: 'BB', label: 'İyi', color: '#0c5460', bg: '#d1ecf1' };
  if (score >= 70) return { letter: 'CB', label: 'Orta-İyi', color: '#004085', bg: '#cce5ff' };
  if (score >= 60) return { letter: 'CC', label: 'Orta', color: '#533f03', bg: '#fff3cd' };
  if (score >= 50) return { letter: 'DC', label: 'Geçer-Orta', color: '#856404', bg: '#fff3cd' };
  if (score >= 40) return { letter: 'DD', label: 'Geçer', color: '#721c24', bg: '#f8d7da' };
  return { letter: 'FF', label: 'Başarısız', color: '#721c24', bg: '#f5c6cb' };
}

// E-Posta Gönderimi İçin SMTP Konfigürasyonu
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_EMAIL || process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: false
  },
  debug: true, // Show debug output
  logger: true, // Log information in console
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000 // 10 seconds
});

const User = require('./models/User');
const Question = require('./models/Question');
const TestAssignment = require('./models/TestAssignment');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aksaquiz';

// Connect MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Middleware to verify auth token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Auth token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

/* --- ROUTES --- */

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { sicil, password } = req.body;
    const user = await User.findOne({ sicil });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, sicil: user.sicil, role: user.role, ad: user.ad, soyad: user.soyad }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, sicil: user.sicil, ad: user.ad, soyad: user.soyad, role: user.role, birim: user.birim } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all users
app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ ad: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all questions
app.get('/api/admin/questions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const questions = await Question.find({});
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Add Question
app.post('/api/admin/questions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { soru, secenekler, cevap, grup } = req.body;
    
    // Find the next available numeric id
    const lastQ = await Question.findOne().sort({ id: -1 });
    const nextId = lastQ ? lastQ.id + 1 : 1;

    const newQuestion = new Question({
      id: nextId,
      soru,
      secenekler,
      cevap,
      grup
    });
    
    await newQuestion.save();
    res.json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: 'Server error adding question' });
  }
});

// Admin: Delete Question
app.delete('/api/admin/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const qId = req.params.id;
    await Question.findByIdAndDelete(qId);
    res.json({ message: 'Soru silindi' });
  } catch (err) {
    res.status(500).json({ error: 'Server error deleting question' });
  }
});

// Admin: Update (Edit) Question
app.put('/api/admin/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { soru, secenekler, cevap, grup } = req.body;
    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { soru, secenekler, cevap, grup },
      { new: true, runValidators: false }
    );
    if (!updated) return res.status(404).json({ error: 'Soru bulunamadı' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating question' });
  }
});

// Admin: Get Question Groups
app.get('/api/admin/question-groups', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const groups = await Question.distinct('grup');
    res.json(groups.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Assign Test
app.post('/api/admin/assign-test', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userIds, questionCount, filterBirim, filterGorev, hoursToExpire, selectedQuestionIds, groupName } = req.body;
    let targetUsers = [];

    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({ _id: { $in: userIds } });
    } else {
      let query = {}; // Removed role: 'personel' so admin can send test to themselves for testing
      if (filterBirim) query.birim = filterBirim;
      if (filterGorev) query.gorev = filterGorev;
      targetUsers = await User.find(query);
    }

    if (targetUsers.length === 0) return res.status(400).json({ error: 'No users found matching criteria' });

    let finalQuestionIds = [];
    if (selectedQuestionIds && selectedQuestionIds.length > 0) {
      console.log('Mode: Manual', selectedQuestionIds.length);
      finalQuestionIds = selectedQuestionIds;
    } else if (groupName && groupName !== "all" && groupName !== "") {
      console.log('Mode: Group', groupName);
      const groupQuestions = await Question.find({ grup: groupName });
      console.log('Group found questions:', groupQuestions.length);
      let selectedQuestions = [...groupQuestions].sort(() => 0.5 - Math.random());
      if (questionCount && questionCount > 0) {
        selectedQuestions = selectedQuestions.slice(0, Number(questionCount));
      }
      finalQuestionIds = selectedQuestions.map(q => q._id);
    } else {
      console.log('Mode: Random ALL');
      const allQuestions = await Question.find();
      let selectedQuestions = [...allQuestions].sort(() => 0.5 - Math.random()).slice(0, Number(questionCount) || 25);
      finalQuestionIds = selectedQuestions.map(q => q._id);
    }

    if (finalQuestionIds.length === 0) return res.status(400).json({ error: 'No questions selected' });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (hoursToExpire || 24));

    const successfulAssignments = [];
    let successCount = 0;
    let failCount = 0;

    for (const user of targetUsers) {
      if (user.eposta) {
        try {
          const testId = new mongoose.Types.ObjectId();
          const mailOptions = {
            from: process.env.FROM_EMAIL || '"AksaQuiz Yönetimi" <no-reply@aksagaz.com.tr>',
            to: user.eposta,
            subject: 'Sizin İçin Yeni Bir Sınav Atandı',
            html: `<h3>Merhaba ${user.ad} ${user.soyad},</h3>
                   <p>Yönetici departmanınız tarafından çözmeniz gereken yeni bir sınav sistem üzerinden size ulaşmıştır.</p>
                   <p><b>Sınav Geçerlilik Bitiş Süresi:</b> ${expiresAt.toLocaleString('tr-TR')}</p>
                   <p>Lütfen aşağıdaki bağlantıya tıklayarak en kısa sürede sınavınızı tamamlayınız:<br/>
                   <a href="http://localhost:5173/test/${testId.toString()}">Sınavı Başlatmak İçin Tıklayın</a></p>
                   <br/><small>Bu otomatik bir maildir. Lütfen yanıtlamayınız.</small>`
          };
          
          await transporter.sendMail(mailOptions);
          
          // E-posta gönderimi başarılı olduysa sınavı listeye ekle
          successfulAssignments.push({
            _id: testId,
            personel: user._id,
            questions: finalQuestionIds,
            expiresAt,
            isCompleted: false
          });
          successCount++;
          
        } catch (err) {
          console.error("Email send failed to ", user.eposta, err);
          failCount++;
        }
      } else {
        // E-posta adresi olmayanlara atama yapılmıyor
        failCount++;
      }
    }

    if (successfulAssignments.length > 0) {
      await TestAssignment.insertMany(successfulAssignments);
    }

    if (successCount === 0 && failCount > 0) {
       return res.status(400).json({ error: 'Mail gönderimi tüm personellerde başarısız olduğu için sınavlar oluşturulamadı. Lütfen SMTP veya internet erişimini kontrol edin.' });
    }

    res.json({ message: `${successCount} kişiye başarıyla mail gönderildi ve sınav atandı. (Başarısız/E-postası olmayan: ${failCount})` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Results
app.get('/api/admin/results', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const results = await TestAssignment.find()
      .populate('personel', 'sicil ad soyad birim gorev eposta')
      .populate('questions', 'id soru cevap')
      .sort({ createdAt: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Remove Test
app.delete('/api/admin/remove-test/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const testId = req.params.id;
    const test = await TestAssignment.findById(testId);
    if (!test) return res.status(404).json({ error: 'Sınav bulunamadı' });
    
    await TestAssignment.findByIdAndDelete(testId);
    res.json({ message: 'Sınav başarıyla iptal edildi/silindi.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Detailed Test Results (Single Test Review)
app.get('/api/admin/test/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const test = await TestAssignment.findById(req.params.id)
      .populate('personel', 'sicil ad soyad birim gorev')
      .populate('questions');
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get Analytics Data
app.get('/api/admin/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const completedTests = await TestAssignment.find({ isCompleted: true })
      .populate('personel', 'ad soyad birim gorev sicil')
      .populate('questions');

    const basicStats = {
      totalTests: completedTests.length,
      averageScore: completedTests.length ? Math.round(completedTests.reduce((acc, t) => acc + t.score, 0) / completedTests.length) : 0,
      passedCount: completedTests.filter(t => t.score >= 60).length,
      failedCount: completedTests.filter(t => t.score < 60).length,
    };

    // ── SORU İSTATİSTİKLERİ ──
    const questionStatsMap = {};
    completedTests.forEach(test => {
      const answers = test.answers;
      if (!answers) return;
      test.questions.forEach(q => {
        const qId = q._id.toString();
        const userAnswer = answers.get(qId) || answers.get(String(q.id));
        const correct = userAnswer === q.cevap;
        if (!questionStatsMap[qId]) {
          questionStatsMap[qId] = {
            _id: qId, idStr: q.id, soru: q.soru, grup: q.grup,
            timesAsked: 0, correctCount: 0, incorrectCount: 0, optionsCount: {}
          };
        }
        questionStatsMap[qId].timesAsked++;
        if (userAnswer) {
          if (correct) questionStatsMap[qId].correctCount++;
          else questionStatsMap[qId].incorrectCount++;
          questionStatsMap[qId].optionsCount[userAnswer] = (questionStatsMap[qId].optionsCount[userAnswer] || 0) + 1;
        }
      });
    });

    const questionStats = Object.values(questionStatsMap).map(qs => ({
      ...qs,
      difficulty: qs.timesAsked ? Math.round((qs.incorrectCount / qs.timesAsked) * 100) : 0
    })).sort((a, b) => b.difficulty - a.difficulty);

    // Top 5 en çok hata yapılan soru
    const top5Hardest = questionStats.filter(q => q.timesAsked > 0).slice(0, 5);
    // Top 5 en çok çözülen soru
    const top5MostSolved = [...questionStats].sort((a, b) => b.timesAsked - a.timesAsked).slice(0, 5);

    // ── GRUP (KONU BAŞLIĞI) İSTATİSTİKLERİ ──
    const groupStatsMap = {};
    completedTests.forEach(test => {
      const answers = test.answers;
      if (!answers) return;
      test.questions.forEach(q => {
        const grup = q.grup || 'Genel';
        const qId = q._id.toString();
        const userAnswer = answers.get(qId) || answers.get(String(q.id));
        const correct = userAnswer === q.cevap;
        if (!groupStatsMap[grup]) groupStatsMap[grup] = { grup, timesAsked: 0, correctCount: 0, incorrectCount: 0 };
        if (userAnswer) {
          groupStatsMap[grup].timesAsked++;
          if (correct) groupStatsMap[grup].correctCount++;
          else groupStatsMap[grup].incorrectCount++;
        }
      });
    });
    const groupStats = Object.values(groupStatsMap).map(g => ({
      ...g,
      successRate: g.timesAsked ? Math.round((g.correctCount / g.timesAsked) * 100) : 0
    })).sort((a, b) => a.successRate - b.successRate);

    // ── BİRİM BAZLI BAŞARI (grup kırılımlı) ──
    const birimGroupMap = {};
    completedTests.forEach(test => {
      const birim = test.personel?.birim || 'Bilinmiyor';
      const answers = test.answers;
      if (!answers) return;
      if (!birimGroupMap[birim]) birimGroupMap[birim] = { birim, totalTests: 0, totalScore: 0, passed: 0, failed: 0, groups: {} };
      birimGroupMap[birim].totalTests++;
      birimGroupMap[birim].totalScore += test.score;
      if (test.score >= 60) birimGroupMap[birim].passed++;
      else birimGroupMap[birim].failed++;

      test.questions.forEach(q => {
        const grup = q.grup || 'Genel';
        const qId = q._id.toString();
        const userAnswer = answers.get(qId) || answers.get(String(q.id));
        const correct = userAnswer === q.cevap;
        if (!birimGroupMap[birim].groups[grup]) birimGroupMap[birim].groups[grup] = { correct: 0, total: 0 };
        if (userAnswer) {
          birimGroupMap[birim].groups[grup].total++;
          if (correct) birimGroupMap[birim].groups[grup].correct++;
        }
      });
    });
    const birimStats = Object.values(birimGroupMap).map(b => ({
      ...b,
      avgScore: b.totalTests ? Math.round(b.totalScore / b.totalTests) : 0,
      passRate: b.totalTests ? Math.round((b.passed / b.totalTests) * 100) : 0,
      groupBreakdown: Object.entries(b.groups).map(([grup, s]) => ({
        grup,
        successRate: s.total ? Math.round((s.correct / s.total) * 100) : 0,
        total: s.total
      })).sort((a, b) => a.successRate - b.successRate)
    })).sort((a, b) => b.avgScore - a.avgScore);

    // ── GÖREV BAZLI BAŞARI (grup kırılımlı) ──
    const gorevGroupMap = {};
    completedTests.forEach(test => {
      const gorev = test.personel?.gorev || 'Bilinmiyor';
      const answers = test.answers;
      if (!answers) return;
      if (!gorevGroupMap[gorev]) gorevGroupMap[gorev] = { gorev, totalTests: 0, totalScore: 0, passed: 0, failed: 0, groups: {} };
      gorevGroupMap[gorev].totalTests++;
      gorevGroupMap[gorev].totalScore += test.score;
      if (test.score >= 60) gorevGroupMap[gorev].passed++;
      else gorevGroupMap[gorev].failed++;

      test.questions.forEach(q => {
        const grup = q.grup || 'Genel';
        const qId = q._id.toString();
        const userAnswer = answers.get(qId) || answers.get(String(q.id));
        const correct = userAnswer === q.cevap;
        if (!gorevGroupMap[gorev].groups[grup]) gorevGroupMap[gorev].groups[grup] = { correct: 0, total: 0 };
        if (userAnswer) {
          gorevGroupMap[gorev].groups[grup].total++;
          if (correct) gorevGroupMap[gorev].groups[grup].correct++;
        }
      });
    });
    const gorevStats = Object.values(gorevGroupMap).map(g => ({
      ...g,
      avgScore: g.totalTests ? Math.round(g.totalScore / g.totalTests) : 0,
      passRate: g.totalTests ? Math.round((g.passed / g.totalTests) * 100) : 0,
      groupBreakdown: Object.entries(g.groups).map(([grup, s]) => ({
        grup,
        successRate: s.total ? Math.round((s.correct / s.total) * 100) : 0,
        total: s.total
      })).sort((a, b) => a.successRate - b.successRate)
    })).sort((a, b) => b.avgScore - a.avgScore);

    res.json({ basicStats, questionStats, groupStats, birimStats, gorevStats, top5Hardest, top5MostSolved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// User: Get My Tests
app.get('/api/test/my-tests', authMiddleware, async (req, res) => {
  try {
    const tests = await TestAssignment.find({ personel: req.user.id })
      .populate('questions', 'id soru secenekler') // cevap gönderilmiyor!
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User: Get Test Details (Starts the test) - NO AUTH REQUIRED
app.get('/api/test/:id', async (req, res) => {
  try {
    const test = await TestAssignment.findOne({ _id: req.params.id })
      .populate('personel', 'ad soyad')
      .populate('questions', 'id soru secenekler');
    
    if (!test) return res.status(404).json({ error: 'Sınav bulunamadı' });
    
    // We send back the test regardless of expiration or completion status,
    // so the frontend can display a custom message.

    res.json(test);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User: Submit Test - NO AUTH REQUIRED
app.post('/api/test/:id/submit', async (req, res) => {
  try {
    const { answers } = req.body; 
    const test = await TestAssignment.findOne({ _id: req.params.id }).populate('questions');
    
    if (!test) return res.status(404).json({ error: 'Sınav bulunamadı' });
    if (test.isCompleted) return res.status(400).json({ error: 'Sınav zaten daha önceden tamamlanmış.' });
    if (new Date() > new Date(test.expiresAt)) return res.status(403).json({ error: 'Bu sınavın süresi dolmuştur.' });

    let correctCount = 0;
    let wrongCount = 0;
    const correctCountTarget = test.questions.length;
    
    test.questions.forEach(q => {
      const qIdStr = q._id.toString();
      const userAnswer = answers[qIdStr] || answers[q.id]; 
      if (userAnswer) {
        if (userAnswer === q.cevap) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });

    // 4 Yanlış 1 Doğruyu Götürür
    const penalty = wrongCount / 4;
    let netCorrect = correctCount - penalty;
    if (netCorrect < 0) netCorrect = 0;

    const finalScore = Math.round((netCorrect / correctCountTarget) * 100);
    const gradeInfo = getLetterGrade(finalScore);

    test.answers = new Map(Object.entries(answers));
    test.score = finalScore;
    test.letterGrade = gradeInfo.letter;
    test.completedAt = new Date();
    test.isCompleted = true;
    
    await test.save();
    res.json({ message: 'Test submitted', score: test.score, letterGrade: gradeInfo.letter, label: gradeInfo.label });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
