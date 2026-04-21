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
            <div className="flex-grow-1">
              <h4 className="mb-1">{test.personel?.ad} {test.personel?.soyad}</h4>
              <p className="text-muted mb-1">{test.personel?.birim} / {test.personel?.gorev} (Sicil: {test.personel?.sicil})</p>
              {test.completedAt && (
                <div className="text-muted mt-2">
                  <div className="mb-1">🕐 Tamamlanma: <strong>{new Date(test.completedAt).toLocaleString('tr-TR')}</strong></div>
                  
                  {test.ipAddress && (
                    <div className="mb-1">🌐 IP Adresi: <strong>{test.ipAddress}</strong></div>
                  )}

                  {test.terminationReason && test.terminationReason.includes('Kopya') ? (
                     <Alert variant="danger" className="d-inline-flex px-3 py-1 mt-2 mb-0 border-0 fw-bold shadow-sm">
                       <span className="me-2">🚨</span> {test.terminationReason}
                     </Alert>
                  ) : test.terminationReason ? (
                     <Alert variant="warning" className="d-inline-flex px-3 py-1 mt-2 mb-0 border-0 fw-bold shadow-sm">
                       <span>⚠️</span> {test.terminationReason}
                     </Alert>
                  ) : (
                     <Alert variant="success" className="d-inline-flex px-3 py-1 mt-2 mb-0 border-0 fw-bold shadow-sm">
                       Normal Sınav Bitişi
                     </Alert>
                  )}
                </div>
              )}
            </div>
            <div className="text-end d-flex align-items-center gap-4">
              <div className="text-center">
                <span className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Sınav Puanı</span>
                <div style={{ fontSize: '3.5rem', fontWeight: 300, color: passed ? '#212529' : '#dc3545', lineHeight: '1' }}>
                  {test.score}
                </div>
              </div>
              
              <div style={{ width: '1px', background: '#dee2e6', height: '60px' }}></div>
              
              <div className="text-center">
                <span className="text-secondary text-uppercase fw-bold" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>Harf Notu</span>
                {test.letterGrade ? (
                  <div>
                    <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: passed ? '#0d6efd' : '#dc3545', lineHeight: '1' }}>
                      {test.letterGrade}
                    </span>
                  </div>
                ) : <div className="text-muted">—</div>}
              </div>

              <div className="ms-3 text-start">
                <h5 className="mb-0">
                  {passed ? <Badge bg="success" className="px-3 py-2 shadow-sm rounded-pill">✅ BAŞARILI</Badge> : <Badge bg="danger" className="px-3 py-2 shadow-sm rounded-pill">❌ BAŞARISIZ</Badge>}
                </h5>
              </div>
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
