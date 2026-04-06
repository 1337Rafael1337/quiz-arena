import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const RegisterGamemaster = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      await apiFetch('/api/auth/register-gamemaster', {
        method: 'POST',
        body: {
          username: formData.username,
          email: formData.email,
          password: formData.password
        }
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-header">
            <h1>Registrierung erfolgreich!</h1>
            <p>
              Wir haben dir einen Bestätigungslink an <strong>{formData.email}</strong> gesendet.
              Bitte bestätige deine Email-Adresse um dich einloggen zu können.
            </p>
          </div>
          <button className="btn-setup" onClick={() => navigate('/admin/login')}>
            Zum Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Als Spielleiter registrieren</h1>
          <p>Erstelle einen Account um eigene Quiz-Spiele zu erstellen und zu verwalten.</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {error && (
            <div className="error-messages">
              <div className="error-message">{error}</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Benutzername *</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="Dein Benutzername"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-Mail-Adresse *</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="deine@email.de"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Passwort *</label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Mindestens 8 Zeichen"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Passwort bestätigen *</label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Passwort wiederholen"
              required
            />
          </div>

          <button type="submit" className="btn-setup" disabled={loading}>
            {loading ? 'Registriere...' : 'Registrieren'}
          </button>
        </form>

        <button className="back-btn" onClick={() => navigate('/admin/login')}>
          Zurück zum Login
        </button>
      </div>
    </div>
  )
}

export default RegisterGamemaster
