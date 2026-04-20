import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function EmployeeDashboard() {
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchMyTests = async () => {
      try {
        const res = await api.get('/test/my-tests');
        setTests(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMyTests();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Hoş Geldiniz, {user?.ad} {user?.soyad}</h2>
        <Button variant="outline-danger" onClick={handleLogout}>Çıkış Yap</Button>
      </div>

      <Card className="shadow-sm">
        <Card.Body>
          <Card.Title>Atanmış Sınavlarınız</Card.Title>
          <Table striped bordered hover responsive className="mt-3">
            <thead>
              <tr>
                <th>Test ID</th>
                <th>Soru Sayısı</th>
                <th>Son Katılım Tarihi</th>
                <th>Durum</th>
                <th>Puanınız</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => {
                const isExpired = new Date() > new Date(test.expiresAt);
                return (
                  <tr key={test._id}>
                    <td>{test._id.toString().substring(18)}...</td>
                    <td>{test.questions?.length}</td>
                    <td>{new Date(test.expiresAt).toLocaleString()}</td>
                    <td>
                      {test.isCompleted ? <Badge bg="success">Tamamlandı</Badge> : 
                        isExpired ? <Badge bg="danger">Süresi Doldu</Badge> : <Badge bg="primary">Bekliyor</Badge>
                      }
                    </td>
                    <td>{test.isCompleted ? <strong>{test.score}</strong> : '-'}</td>
                    <td>
                      {!test.isCompleted && !isExpired && (
                        <Button variant="success" size="sm" onClick={() => navigate(`/test/${test._id}`)}>
                          Teste Başla
                        </Button>
                      )}
                      {test.isCompleted && <span className="text-muted">Katılım sağlandı</span>}
                      {!test.isCompleted && isExpired && <span className="text-danger">Süre Geçti</span>}
                    </td>
                  </tr>
                );
              })}
              {tests.length === 0 && <tr><td colSpan="6" className="text-center">Şu an için atanmış bir sınavınız bulunmuyor.</td></tr>}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default EmployeeDashboard;
