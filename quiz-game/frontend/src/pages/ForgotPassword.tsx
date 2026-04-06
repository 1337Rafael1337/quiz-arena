import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email }
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
            <h1>Email gesendet</h1>
            <p>
              Falls ein Account mit der Adresse <strong>{email}</strong> existiert,
              wurde ein Link zum Zurücksetzen des Passworts gesendet. Bitte prüfe dein Postfach.
            </p>
          </div>
          <button className="btn-setup" onClick={() => navigate('/admin/login')}>
            Zurück zum Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Passwort vergessen</h1>
          <p>Gib deine Email-Adresse ein und wir senden dir einen Link zum Zurücksetzen.</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {error && (
            <div className="error-messages">
              <div className="error-message">{error}</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">E-Mail-Adresse</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              required
            />
          </div>

          <button type="submit" className="btn-setup" disabled={loading}>
            {loading ? 'Sende...' : 'Reset-Link senden'}
          </button>
        </form>

        <button className="back-btn" onClick={() => navigate('/admin/login')}>
          Zurück zum Login
        </button>
      </div>
    </div>
  )
}

export default ForgotPassword
