import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

interface ProfileSettingsProps {
  onClose: () => void
}

const ProfileSettings = ({ onClose }: ProfileSettingsProps) => {
  const [tab, setTab] = useState<'profile' | 'password' | 'sessions'>('profile')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  // Sessions
  const [sessions, setSessions] = useState<any[]>([])

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    fetchProfile()
    fetchSessions()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await apiFetch('/api/auth/profile')
      setUsername(data.username)
      setEmail(data.email)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchSessions = async () => {
    try {
      const data = await apiFetch('/api/auth/sessions')
      setSessions(data)
    } catch { /* ignore if table doesn't exist yet */ }
  }

  const revokeSession = async (id: number) => {
    try {
      await apiFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' })
      fetchSessions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const revokeAllOther = async () => {
    try {
      await apiFetch('/api/auth/sessions', { method: 'DELETE' })
      fetchSessions()
      setMessage('Alle anderen Sessions beendet')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const data = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: { username, email }
      })
      setMessage(data.message)
      // Update localStorage
      const stored = JSON.parse(localStorage.getItem('adminUser') || '{}')
      stored.username = data.user.username
      stored.email = data.user.email
      localStorage.setItem('adminUser', JSON.stringify(stored))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (newPassword.length < 8) {
      setError('Neues Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      const data = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword }
      })
      setMessage(data.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="question-form-overlay">
      <div className="question-form" style={{ maxWidth: '500px' }}>
        <h3>Einstellungen</h3>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={tab === 'profile' ? 'btn-save' : 'btn-cancel'}
            onClick={() => { setTab('profile'); setError(''); setMessage('') }}
          >
            Profil
          </button>
          <button
            type="button"
            className={tab === 'password' ? 'btn-save' : 'btn-cancel'}
            onClick={() => { setTab('password'); setError(''); setMessage('') }}
          >
            Passwort
          </button>
          <button
            type="button"
            className={tab === 'sessions' ? 'btn-save' : 'btn-cancel'}
            onClick={() => { setTab('sessions'); setError(''); setMessage(''); fetchSessions() }}
          >
            Sessions
          </button>
        </div>

        {message && <div className="success-banner" style={{ padding: '0.75rem', marginBottom: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '8px' }}>{message}</div>}
        {error && <div className="error-messages"><div className="error-message">{error}</div></div>}

        {tab === 'profile' && (
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Benutzername</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Schließen</button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </form>
        )}

        {tab === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="form-group">
              <label>Aktuelles Passwort</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Neues Passwort</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                required
              />
            </div>
            <div className="form-group">
              <label>Neues Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">Schließen</button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Speichere...' : 'Passwort ändern'}
              </button>
            </div>
          </form>
        )}

        {tab === 'sessions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#a0a0b8' }}>{sessions.length} aktive Sessions</span>
              {sessions.filter(s => !s.isCurrent).length > 0 && (
                <button className="btn-delete" onClick={revokeAllOther} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                  Alle anderen beenden
                </button>
              )}
            </div>
            {sessions.map(s => (
              <div key={s.id} style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                background: s.isCurrent ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                border: s.isCurrent ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {s.isCurrent ? 'Aktuelle Session' : 'Session'}
                      <span style={{ fontWeight: 400, color: '#a0a0b8', marginLeft: '0.5rem' }}>
                        {s.ip_address}
                      </span>
                    </div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {(s.user_agent || '').substring(0, 80)}{s.user_agent?.length > 80 ? '...' : ''}
                    </div>
                    <div style={{ color: '#a0a0b8', fontSize: '0.8rem' }}>
                      Erstellt: {new Date(s.created_at).toLocaleString('de-DE')}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <button className="btn-delete" onClick={() => revokeSession(s.id)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                      Beenden
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" onClick={onClose} className="btn-cancel">Schließen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileSettings
