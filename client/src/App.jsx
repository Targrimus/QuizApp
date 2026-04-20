import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AdminTestDetails from './pages/AdminTestDetails';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TestTake from './pages/TestTake';
import { jwtDecode } from 'jwt-decode';

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  
  try {
    const decoded = jwtDecode(token);
    if (role && decoded.role !== role) {
      return <Navigate to={decoded.role === 'admin' ? '/admin' : '/dashboard'} />;
    }
    return children;
  } catch (e) {
    return <Navigate to="/login" />;
  }
};

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="/admin/test-details/:id" element={
          <PrivateRoute>
            <AdminTestDetails />
          </PrivateRoute>
        } />
        <Route path="/employee" element={
          <PrivateRoute>
            <EmployeeDashboard />
          </PrivateRoute>
        } />
        
        {/* Şifresiz Sınav Rotası */}
        <Route path="/test/:id" element={<TestTake />} />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
