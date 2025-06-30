import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Login failed')
      }
      
      const data = await response.json()
      
      // Store token
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminUser', JSON.stringify(data.user))
      
      navigate('/admin/dashboard')
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <h1>🎯 Quiz Arena</h1>
          <h2>Admin Login</h2>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="admin"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <div className="login-hint">
            <p>Standard Login: <code>admin</code> / <code>admin123</code></p>
          </div>
        </form>
        
        <button 
          className="back-btn"
          onClick={() => navigate('/')}
        >
          ← Zurück zum Spiel
        </button>
      </div>
    </div>
  )
}

export default AdminLogin
