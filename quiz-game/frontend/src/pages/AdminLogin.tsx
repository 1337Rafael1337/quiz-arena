import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'
import { notifyAuthChange } from '../hooks/useSocket'

const AdminLogin = () => {
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
      const data = await apiFetch('/api/auth/setup-status')
      if (data.setupRequired) {
        navigate('/setup')
        return
      }
      setSetupRequired(false)
    } catch {
      setSetupRequired(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: credentials
      })

      localStorage.setItem('adminUser', JSON.stringify(data.user))
      notifyAuthChange()

      if (data.user.role === 'admin') {
        navigate('/admin/dashboard')
      } else if (data.user.role === 'gamemaster') {
        navigate('/gamemaster/dashboard')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message)
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
          <h1>Quiz Arena</h1>
          <h2>Anmeldung</h2>
          <p>Melden Sie sich mit Ihren Zugangsdaten an</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="error-banner">
              {error}
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
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>

          <button
            type="button"
            className="btn-register-link"
            onClick={() => navigate('/forgot-password')}
            style={{ marginTop: '0.5rem' }}
          >
            Passwort vergessen?
          </button>
        </form>

        <div className="login-info">
          <p><strong>Hinweis:</strong> Administratoren, Spielleiter und Benutzer melden sich hier an.</p>
          <button
            className="btn-register-link"
            onClick={() => navigate('/register')}
          >
            Als Spielleiter registrieren
          </button>
        </div>

        <button
          className="back-btn"
          onClick={() => navigate('/')}
        >
          Zurück zum Spiel
        </button>
      </div>
    </div>
  )
}

export default AdminLogin
