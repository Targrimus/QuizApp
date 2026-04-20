import React, { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

function AdminTestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const res = await api.get(`/admin/test/${id}`);
        setTest(res.data);
      } catch (err) {
        setError('Sınav detayları yüklenemedi.');
      }
    };
    fetchTestDetails();
  }, [id]);

  if (error) return <Container className="py-5"><Alert variant="danger">{error}</Alert></Container>;
  if (!test) return <Container className="py-5">Yükleniyor...</Container>;

  const passed = test.score >= 60;

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Sınav İnceleme Kağıdı</h2>
        <Button variant="outline-secondary" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>

      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="bg-light rounded">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h4 className="mb-1">{test.personel?.ad} {test.personel?.soyad}</h4>
              <p className="text-muted mb-1">{test.personel?.birim} / {test.personel?.gorev} (Sicil: {test.personel?.sicil})</p>
              {test.completedAt && (
                <small className="text-muted">
                  🕐 Tamamlanma: <strong>{new Date(test.completedAt).toLocaleString('tr-TR')}</strong>
                </small>
              )}
            </div>
            <div className="text-end">
              {/* Score */}
              <h1 className={passed ? "text-success mb-1" : "text-danger mb-1"} style={{fontSize:'3rem', fontWeight:900}}>
                {test.score}
              </h1>
              {/* Letter Grade */}
              {test.letterGrade && (() => {
                const gradeColors = {AA:'#1a7431',BA:'#155724',BB:'#0c5460',CB:'#004085',CC:'#856404',DC:'#856404',DD:'#721c24',FF:'#721c24'};
                const gradeBgs = {AA:'#d4edda',BA:'#c3e6cb',BB:'#d1ecf1',CB:'#cce5ff',CC:'#fff3cd',DC:'#fff3cd',DD:'#f8d7da',FF:'#f5c6cb'};
                const gradeLabels = {AA:'Pekiyi',BA:'İyi-Pekiyi',BB:'İyi',CB:'Orta-İyi',CC:'Orta',DC:'Geçer-Orta',DD:'Geçer',FF:'Başarısız'};
                return (
                  <div className="d-flex align-items-center justify-content-end gap-2 mb-1">
                    <span style={{fontWeight:900,fontSize:'1.8rem',color:gradeColors[test.letterGrade]||'#333',background:gradeBgs[test.letterGrade]||'#f8f9fa',borderRadius:'10px',padding:'2px 14px'}}>
                      {test.letterGrade}
                    </span>
                    <span className="text-muted fw-semibold">{gradeLabels[test.letterGrade]||''}</span>
                  </div>
                );
              })()}
              <h5>
                {passed ? <Badge bg="success">✅ BAŞARILI</Badge> : <Badge bg="danger">❌ BAŞARISIZ</Badge>}
              </h5>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>
          <Card.Title className="mb-4">Soru Bazlı Cevap Detayları</Card.Title>
          {test.questions.map((q, idx) => {
            const userAnswer = test.answers ? (test.answers[q._id] || test.answers[q.id]) : null;
            const isCorrect = userAnswer === q.cevap;

            return (
              <div key={q._id} className="mb-4 p-3 border rounded">
                <h5 className="mb-3">{idx + 1}. {q.soru}</h5>
                <div className="d-flex flex-column gap-2 mb-3">
                  {(() => {
                    const entries = q.secenekler instanceof Map
                      ? [...q.secenekler.entries()]
                      : Object.entries(q.secenekler || {});
                    entries.sort((a, b) => a[0].localeCompare(b[0]));
                    return entries.map(([key, val]) => {
                      let bg = "bg-light";
                      if (key === q.cevap) bg = "bg-success text-white";
                      else if (key === userAnswer && !isCorrect) bg = "bg-danger text-white";
                      return (
                        <div key={key} className={`p-2 rounded ${bg}`}>
                          <strong>{key})</strong> {val}
                          {key === userAnswer && <span className="float-end fw-bold">Kullanıcının Cevabı</span>}
                          {key === q.cevap && <span className="float-end fw-bold">✔ Doğru Cevap</span>}
                        </div>
                      );
                    });
                  })()}
                </div>
                {!userAnswer && <Alert variant="warning" className="py-2">Kullanıcı bu soruyu boş bırakmış.</Alert>}
              </div>
            );
          })}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AdminTestDetails;
