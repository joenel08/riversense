import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Lock, Mail, ShieldCheck } from 'lucide-react';

const Login = ({ setAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

    const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setAuth(true);
      navigate('/admin');
    } catch (err) {
      // This will show the exact error from the backend
      const errorMessage = err.response?.data?.message || 'Server error. Check backend console.';
      setError(errorMessage);
      console.error("Login Error Details:", err.response || err);
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #e6f3ff 0%, #b3d4ff 100%)', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: 'white', padding: '40px', borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)', width: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={36} color="#0056b3" />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0056b3', margin: 0 }}>Admin Portal</h1>
        </div>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '30px' }}>Sign in to manage sensors and data</p>

        {error && (
          <div style={{ background: '#ffebee', color: '#d32f2f', padding: '10px', borderRadius: '8px', width: '100%', marginBottom: '20px', fontSize: '13px', textAlign: 'center', border: '1px solid #ffcdd2' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '6px', display: 'block' }}>Email Address</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}>
              <Mail size={18} color="#999" style={{ marginRight: '10px' }} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                placeholder="admin@riversense.gov.ph"
                style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', marginBottom: '6px', display: 'block' }}>Password</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}>
              <Lock size={18} color="#999" style={{ marginRight: '10px' }} />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px' }}
              />
            </div>
          </div>

          <button type="submit" style={{
            background: '#0056b3', color: 'white', border: 'none', padding: '12px',
            borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer',
            marginTop: '10px', transition: 'background 0.2s'
          }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;