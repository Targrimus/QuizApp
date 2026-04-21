import React, { useState, useEffect, useRef } from 'react';
import { Container, Card, Button, Form, Alert, ProgressBar } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function TestTake() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [testState, setTestState] = useState('NOT_STARTED'); // 'NOT_STARTED', 'IN_PROGRESS'
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const answersRef = useRef({});
  const testStateRef = useRef('NOT_STARTED');

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await api.get(`/test/${id}`);
        setTest(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Test yüklenemedi.');
      }
    };
    fetchTest();
  }, [id]);

  const handleStartTest = () => {
    const tTime = test.questions.length * 60; // 1 min per question
    setTotalTime(tTime);
    setTimeLeft(tTime);
    setTestState('IN_PROGRESS');
    testStateRef.current = 'IN_PROGRESS';
  };

  const handleOptionChange = (questionId, option) => {
    answersRef.current = { ...answersRef.current, [questionId]: option };
    setAnswers({ ...answersRef.current });
  };

  const handleSubmit = async (isAutoSubmit = false, forceReason = null) => {
    if (!isAutoSubmit && Object.keys(answersRef.current).length < test.questions.length) {
      if (!window.confirm("Bütün soruları cevaplamadınız. Yine de bitirmek istiyor musunuz?")) {
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const payload = { answers: answersRef.current };
      if (forceReason) payload.terminationReason = forceReason;

      const res = await api.post(`/test/${id}/submit`, payload);
      setTest(prev => ({
        ...prev,
        isCompleted: true,
        score: res.data.score,
        letterGrade: res.data.letterGrade,
        letterLabel: res.data.label,
        completedAt: new Date().toISOString()
      }));
      setTestState('COMPLETED');
      testStateRef.current = 'COMPLETED';
    } catch (err) {
      setError(err.response?.data?.error || 'Gönderim sırasında hata oluştu.');
      setIsSubmitting(false);
    }
  };

  // Timer Effect
  useEffect(() => {
    if (timeLeft === null || isSubmitting || test?.isCompleted || testState !== 'IN_PROGRESS') return;
    
    if (timeLeft <= 0) {
      handleSubmit(true, 'Süre Doldu');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitting, test, testState]);

  // Anti-Cheat (Blur) Detection Effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && testStateRef.current === 'IN_PROGRESS' && !isSubmitting) {
         handleSubmit(true, 'Kopya Girişimi (Sekme veya Uygulama Değiştirildi)');
      }
    };

    const handleBlur = () => {
      if (testStateRef.current === 'IN_PROGRESS' && !isSubmitting) {
         handleSubmit(true, 'Kopya Girişimi (Pencere Odak Kaybı)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isSubmitting]);

  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!test) return <Container className="py-5">Yükleniyor...</Container>;

  if (test.isCompleted) {
    const passed = test.score >= 60;
    const grade = test.letterGrade || (passed ? 'CC' : 'FF');
    const gradeColors = {
      AA: '#1a7431', BA: '#155724', BB: '#0c5460',
      CB: '#004085', CC: '#856404', DC: '#856404',
      DD: '#721c24', FF: '#721c24'
    };
    const gradeBgs = {
      AA: '#d4edda', BA: '#c3e6cb', BB: '#d1ecf1',
      CB: '#cce5ff', CC: '#fff3cd', DC: '#fff3cd',
      DD: '#f8d7da', FF: '#f5c6cb'
    };
    const gradeLabels = {
      AA: 'Pekiyi', BA: 'İyi-Pekiyi', BB: 'İyi',
      CB: 'Orta-İyi', CC: 'Orta', DC: 'Geçer-Orta',
      DD: 'Geçer', FF: 'Başarısız'
    };
    const completedDate = test.completedAt
      ? new Date(test.completedAt).toLocaleString('tr-TR')
      : new Date().toLocaleString('tr-TR');

    return (
      <Container className="py-5 mt-5 text-center" style={{ maxWidth: '620px' }}>
        <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
          {/* Sleek Minimal Header */}
          <div className="bg-white px-4 pt-5 pb-3 border-bottom position-relative">
            {/* Subtle accent line on top */}
            <div 
              className="position-absolute top-0 start-0 w-100" 
              style={{ height: '5px', background: passed ? '#0d6efd' : '#dc3545' }} // Blue for pass, Red for fail
            ></div>
            
            <div className="text-center">
              <div 
                className={`d-inline-flex align-items-center justify-content-center rounded-circle mb-3 ${passed ? 'bg-primary bg-opacity-10 text-primary' : 'bg-danger bg-opacity-10 text-danger'}`} 
                style={{ width: '70px', height: '70px', fontSize: '2rem' }}
              >
                {passed ? '🎓' : '📋'}
              </div>
              <h3 className="fw-bold text-dark mb-1">Sayın {test.personel?.ad} {test.personel?.soyad}</h3>
              <p className="text-muted mb-0 fs-6">Sınav katılımınız başarıyla kaydedildi</p>
            </div>
          </div>

          <Card.Body className="p-5">
            {/* Minimalist Score Dashboard */}
            <div className="d-flex align-items-center justify-content-center gap-5 mb-5">
              <div className="text-center">
                <span className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Sınav Puanı</span>
                <div style={{ fontSize: '4rem', fontWeight: 300, color: passed ? '#212529' : '#dc3545', lineHeight: '1' }} className="mt-1">
                  {test.score}
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>/ 100</div>
              </div>

              <div style={{ width: '1px', background: '#e9ecef', height: '80px' }}></div>

              <div className="text-center">
                <span className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>Harf Notu</span>
                <div className="mt-1">
                  <span 
                    className="fw-bold" 
                    style={{ 
                      fontSize: '3rem', 
                      color: passed ? '#0d6efd' : '#dc3545',
                      lineHeight: '1'
                    }}
                  >
                    {grade}
                  </span>
                </div>
                <div className="text-muted mt-1 fw-medium" style={{ fontSize: '0.9rem' }}>{gradeLabels[grade] || ''}</div>
              </div>
            </div>

            {/* Alert Box for Status */}
            <div 
              className={`rounded-3 p-3 mb-4 text-center border ${passed ? 'border-primary bg-light text-primary' : 'border-danger bg-light text-danger'}`}
              style={{ padding: '16px 20px' }}
            >
              <h5 className="mb-0 fw-bold">
                {passed ? '✅ TEBRİKLER, SINAVI BAŞARIYLA GEÇTİNİZ' : '❌ MAALESEF, SINAVI GEÇEMEDİNİZ'}
              </h5>
              {!passed && <p className="mb-0 mt-2 opacity-75" style={{fontSize: '0.9rem'}}>Sınavı geçmek için en az 60 puan almanız gerekmektedir.</p>}
            </div>

            {test.terminationReason && test.terminationReason.includes('Kopya') && (
              <div className="bg-danger bg-opacity-10 border border-danger text-danger p-3 rounded-3 mb-4 text-center">
                <strong>🚨 İHLAL TESPİT EDİLDİ:</strong> Sınavınız "{test.terminationReason}" nedeniyle başarısız sayılarak sonlandırılmıştır.
              </div>
            )}

            {/* Completion Timestamp */}
            <div className="text-center text-secondary mt-2">
              <span className="me-2 text-muted">Tamamlanma Zamanı:</span>
              <span className="fw-medium">{completedDate}</span>
            </div>
          </Card.Body>

          <Card.Footer className="bg-white border-top-0 py-4 text-center">
            <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>
              Katılımınız için teşekkür ederiz. Sayfayı güvenle kapatabilirsiniz.
            </p>
          </Card.Footer>
        </Card>
      </Container>
    );
  }

  if (new Date() > new Date(test.expiresAt)) {
    return (
      <Container className="py-5 mt-5 text-center" style={{ maxWidth: '600px' }}>
        <Card className="shadow-lg border-0 p-5 rounded-4 bg-light">
          <h2 className="text-danger mb-3">Sınav Süresi Dolmuştur</h2>
          <p className="text-muted mb-0">Atanan bu sınavın geçerlilik süresi tamamlandığı için artık çözülemez.</p>
        </Card>
      </Container>
    );
  }

  if (testState === 'NOT_STARTED') {
     return (
       <Container className="py-5 mt-5 text-center" style={{ maxWidth: '650px' }}>
         <Card className="shadow-lg border-0 p-5 rounded-4 bg-light">
           <div className="text-primary mb-3" style={{ fontSize: '3.5rem' }}>📋</div>
           <h2 className="mb-3 fw-bold text-dark">Sınav Bilgilendirme Ekranı</h2>
           <p className="text-secondary mb-4 fs-5">Lütfen aşağıdaki önemli kuralları okuyup onaylayınız.</p>
           
           <div className="bg-white p-4 rounded-3 shadow-sm mb-4 text-start border">
             <ul className="mb-0 fs-5 text-dark" style={{ lineHeight: '1.8' }}>
               <li><strong>Soru Sayısı:</strong> {test.questions.length} Adet</li>
               <li><strong>Sınav Süresi:</strong> {test.questions.length} Dakika</li>
             </ul>
           </div>

           <Alert variant="danger" className="text-start shadow-sm border-0 mb-4">
             <h5 className="fw-bold mb-2">🚨 DİKKAT: OTOMATİK KOPYA DENETİMİ</h5>
             <p className="mb-0">
               Sınavınız başladığı andan itibaren <strong>tam ekran veya geçerli sekmede</strong> kalmak zorundasınız. <br/><br/>Eğer sınav ekranından çıkarsanız, başka bir sekmeye geçerseniz veya bilgisayarınızda farklı bir uygulamayı açarsanız sistem sizi anında tespit edip sınavınızı <strong>KOPYA GİRİŞİMİ</strong> gerekçesiyle başarısız sayacaktır.
             </p>
           </Alert>

           <Button variant="success" size="lg" className="w-100 py-3 fw-bold shadow-sm fs-5" onClick={handleStartTest}>
             KURALLARI ANLADIM, SINAVI BAŞLAT
           </Button>
         </Card>
       </Container>
     );
  }

  return (
    <div className="test-taking-wrapper">
      <div className="sticky-top bg-white border-bottom py-3 shadow-sm" style={{ zIndex: 1000 }}>
        <Container className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <h5 className="mb-0 fw-bold">
            Kalan Süreniz: <span className={timeLeft < 60 ? "text-danger" : "text-primary"}>{formatTime(timeLeft)}</span>
          </h5>
          <div className="flex-grow-1 mx-md-4">
            <ProgressBar 
              animated 
              variant={timeLeft < 60 ? 'danger' : 'success'} 
              now={(timeLeft / totalTime) * 100} 
              style={{ height: '12px' }}
            />
          </div>
        </Container>
      </div>

      <Container className="py-4 mt-3">
        <Card className="shadow-sm mb-4">
          <Card.Body>
            <Card.Title>Sınav Ekranı</Card.Title>
            <Card.Subtitle className="mb-2 text-muted">Aşağıdaki soruları dikkatlice okuyup cevaplayınız.</Card.Subtitle>
            <hr />
            
            <Alert variant="warning" className="text-center fw-bold">
              Lütfen sınav bitene kadar bu sayfadan ayrılmayınız (Sekme değiştirmeyiniz, uygulamayı arka plana almayınız).
            </Alert>

          {test.questions.map((q, idx) => {
            const entries = q.secenekler instanceof Map
              ? [...q.secenekler.entries()]
              : Object.entries(q.secenekler || {});
            entries.sort((a, b) => a[0].localeCompare(b[0]));
            return (
              <div key={q._id} className="mb-4">
                <h5>{idx + 1}. {q.soru}</h5>
                <div className="ps-3 pt-2">
                  {entries.map(([key, value]) => (
                    <Form.Check
                      type="radio"
                      id={`q-${q._id}-${key}`}
                      name={`q-${q._id}`}
                      label={<span><strong>{key})</strong> {value}</span>}
                      checked={answers[q._id] === key}
                      onChange={() => handleOptionChange(q._id, key)}
                      key={key}
                      className="mb-2"
                    />
                  ))}
                </div>
              </div>
            );
          })}
          </Card.Body>
        </Card>

      <div className="d-flex justify-content-end mb-5">
        <Button variant="primary" size="lg" className="px-5" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
          {isSubmitting ? 'Gönderiliyor...' : 'Testi Bitir'}
        </Button>
      </div>
      </Container>
    </div>
  );
}

export default TestTake;
