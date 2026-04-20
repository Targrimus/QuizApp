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
  const [isSubmittig, setIsSubmitting] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const answersRef = useRef({});

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await api.get(`/test/${id}`);
        setTest(res.data);
        if (!res.data.isCompleted && new Date() <= new Date(res.data.expiresAt)) {
          const tTime = res.data.questions.length * 60; // 1 min per question
          setTotalTime(tTime);
          setTimeLeft(tTime);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Test yüklenemedi.');
      }
    };
    fetchTest();
  }, [id]);

  const handleOptionChange = (questionId, option) => {
    answersRef.current = { ...answersRef.current, [questionId]: option };
    setAnswers({ ...answersRef.current });
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!isAutoSubmit && Object.keys(answersRef.current).length < test.questions.length) {
      if (!window.confirm("Bütün soruları cevaplamadınız. Yine de bitirmek istiyor musunuz?")) {
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      const res = await api.post(`/test/${id}/submit`, { answers: answersRef.current });
      setTest(prev => ({
        ...prev,
        isCompleted: true,
        score: res.data.score,
        letterGrade: res.data.letterGrade,
        letterLabel: res.data.label,
        completedAt: new Date().toISOString()
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Gönderim sırasında hata oluştu.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeLeft === null || isSubmittig || test?.isCompleted) return;
    
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmittig, test]);

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
          {/* Header band */}
          <div style={{ background: passed ? '#198754' : '#dc3545', padding: '28px 20px 20px' }}>
            <div className="text-white">
              <div style={{ fontSize: '3rem' }}>{passed ? '🎓' : '📋'}</div>
              <h2 className="fw-bold mb-1">
                {test.personel?.ad ? `${test.personel.ad} ${test.personel.soyad}` : 'Sınav Tamamlandı'}
              </h2>
              <p className="mb-0 opacity-75">Sınav başarıyla teslim edildi</p>
            </div>
          </div>

          <Card.Body className="p-4">
            {/* Score + Grade Row */}
            <div className="d-flex justify-content-center gap-4 mb-4">
              <div className="text-center">
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: gradeColors[grade] || '#333' }}>
                  {test.score}
                </div>
                <div className="text-muted fw-semibold">100 Üzerinden Puan</div>
              </div>
              <div style={{ width: '1px', background: '#dee2e6' }}></div>
              <div className="text-center">
                <div
                  style={{
                    fontSize: '3rem', fontWeight: 900,
                    color: gradeColors[grade] || '#333',
                    background: gradeBgs[grade] || '#f8f9fa',
                    borderRadius: '12px', padding: '4px 20px',
                    display: 'inline-block', minWidth: '80px'
                  }}
                >
                  {grade}
                </div>
                <div className="text-muted fw-semibold mt-1">{gradeLabels[grade] || ''}</div>
              </div>
            </div>

            {/* Status Banner */}
            <div
              className="py-2 px-4 rounded-3 fw-bold mb-4"
              style={{
                background: passed ? '#d4edda' : '#f8d7da',
                color: passed ? '#155724' : '#721c24',
                fontSize: '1.1rem'
              }}
            >
              {passed ? '✅ Sınavı Başarıyla Geçtiniz' : '❌ Sınavı Geçemediniz (60 Puan Geçme Notu)'}
            </div>

            {/* Completion time */}
            <div className="text-muted" style={{ fontSize: '0.92rem' }}>
              <span className="me-1">🕐</span>
              Tamamlanma Tarihi & Saati: <strong>{completedDate}</strong>
            </div>
          </Card.Body>

          <Card.Footer className="bg-light border-0 py-3">
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
          {test.questions.map((q, idx) => {
            // secenekler hem Map hem plain object olabilir
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

           {/* Correcting the radio button rendering slightly */}
           
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end mb-5">
        <Button variant="primary" size="lg" className="px-5" onClick={handleSubmit} disabled={isSubmittig}>
          {isSubmittig ? 'Gönderiliyor...' : 'Testi Bitir'}
        </Button>
      </div>
      </Container>
    </div>
  );
}

export default TestTake;
