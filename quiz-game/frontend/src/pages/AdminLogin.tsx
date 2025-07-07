import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminLogin: React.FC = () => {
  const navigate = useNavigate()
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null)
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const { API_ENDPOINTS, apiRequest, handleApiResponse } = await import('../config/api')
      const { handleError, logError } = await import('../utils/errorHandler')
      
      const response = await apiRequest(API_ENDPOINTS.AUTH.SETUP_STATUS)
      const data = await handleApiResponse(response)
      
      if (data.setupRequired) {
        navigate('/setup')
        return
      }
      
      setSetupRequired(false)
    } catch (error) {
      const { handleError, logError } = await import('../utils/errorHandler')
      const appError = handleError(error)
      logError(appError, 'AdminLogin.checkSetupStatus')
      console.error('Error checking setup status:', error)
      setSetupRequired(false)
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
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
      
      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/user/dashboard') // For regular users
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  if (setupRequired === null) {
    return (
      <div className="admin-login">
        <div className="login-container">
          <div className="loading">Prüfe System-Status...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <h1>🎯 Quiz Arena</h1>
          <h2>🔐 Anmeldung</h2>
          <p>Melden Sie sich mit Ihren Zugangsdaten an</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-banner">
              ❌ {error}
            </div>
          )}
          
          <div className="form-group">
            <label>Benutzername</label>
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({...credentials, username: e.target.value})}
              placeholder="Ihr Benutzername"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Passwort</label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({...credentials, password: e.target.value})}
              placeholder="Ihr Passwort"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? '⏳ Anmelden...' : '🚀 Anmelden'}
          </button>
        </form>
        
        <div className="login-info">
          <p>💡 <strong>Hinweis:</strong> Sowohl Administratoren als auch normale Benutzer melden sich hier an.</p>
        </div>
        
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
