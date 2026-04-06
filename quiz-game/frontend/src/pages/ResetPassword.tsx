import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password }
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-header">
            <h1>Ungültiger Link</h1>
          </div>
          <div className="error-messages">
            <div className="error-message">Kein Reset-Token gefunden. Bitte fordere einen neuen Link an.</div>
          </div>
          <button className="btn-setup" onClick={() => navigate('/forgot-password')}>
            Neuen Link anfordern
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-header">
            <h1>Passwort geändert</h1>
            <p>Dein Passwort wurde erfolgreich zurückgesetzt. Du kannst dich jetzt einloggen.</p>
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
          <h1>Neues Passwort vergeben</h1>
          <p>Gib dein neues Passwort ein.</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {error && (
            <div className="error-messages">
              <div className="error-message">{error}</div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Neues Passwort</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mindestens 8 Zeichen"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Passwort bestätigen</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
            />
          </div>

          <button type="submit" className="btn-setup" disabled={loading}>
            {loading ? 'Speichere...' : 'Passwort ändern'}
          </button>
        </form>

        <button className="back-btn" onClick={() => navigate('/admin/login')}>
          Zurück zum Login
        </button>
      </div>
    </div>
  )
}

export default ResetPassword
