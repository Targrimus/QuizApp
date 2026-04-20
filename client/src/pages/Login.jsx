import React, { useState } from 'react';
import { Form, Button, Container, Card, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const [sicil, setSicil] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { sicil, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      if (res.data.user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
      <Card style={{ width: '400px' }} className="shadow">
        <Card.Body>
          <h3 className="text-center mb-4">AksaQuiz Giriş</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleLogin}>
            <Form.Group className="mb-3">
              <Form.Label>Sicil / Kullanıcı Adı</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Örn: 19774" 
                value={sicil} 
                onChange={(e) => setSicil(e.target.value)} 
                required 
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>Şifre</Form.Label>
              <Form.Control 
                type="password" 
                placeholder="Şifre" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100">
              Giriş Yap
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;
