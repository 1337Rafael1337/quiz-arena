import { useState, useEffect } from 'react'
import { apiFetch } from '../../lib/api'

interface User {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  email_verified: boolean
  created_at: string
  games_created: number
}

const UsersManager = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  })

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await apiFetch('/api/admin/users')
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.email || !formData.password) {
      alert('Alle Felder sind erforderlich')
      return
    }

    if (formData.password.length < 8) {
      alert('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: formData
      })
      alert('Benutzer erfolgreich erstellt!')
      resetForm()
      fetchUsers()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleUpdateUser = async (user: User) => {
    try {
      await apiFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        body: {
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        }
      })
      alert('Benutzer aktualisiert!')
      fetchUsers()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return

    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      alert('Benutzer gelöscht!')
      fetchUsers()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handlePasswordReset = async (userId: number) => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwörter stimmen nicht überein')
      return
    }

    if (passwordData.newPassword.length < 8) {
      alert('Passwort muss mindestens 8 Zeichen lang sein')
      return
    }

    try {
      await apiFetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: { newPassword: passwordData.newPassword }
      })
      alert('Passwort zurückgesetzt!')
      setShowPasswordReset(null)
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setFormData({ username: '', email: '', password: '', role: 'user' })
  }

  const toggleUserStatus = (user: User) => {
    handleUpdateUser({ ...user, is_active: !user.is_active })
  }

  const updateUserRole = (user: User, newRole: string) => {
    handleUpdateUser({ ...user, role: newRole })
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Admin'
      case 'gamemaster': return 'Spielleiter'
      default: return 'Benutzer'
    }
  }

  if (loading) return <div className="loading">Lade Benutzer...</div>

  return (
    <div className="users-manager">
      <div className="users-header">
        <h2>Benutzerverwaltung ({users.length} Benutzer)</h2>
        <button className="btn-add" onClick={() => setShowForm(true)}>
          Neuer Benutzer
        </button>
      </div>

      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>Neuen Benutzer erstellen</h3>
              <button className="btn-close" onClick={resetForm}>X</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Benutzername *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>E-Mail *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Passwort *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder="Mindestens 8 Zeichen"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rolle *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">Benutzer</option>
                    <option value="gamemaster">Spielleiter</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Abbrechen
                </button>
                <button type="submit" className="btn-save">
                  Benutzer erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordReset && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>Passwort zurücksetzen</h3>
              <button className="btn-close" onClick={() => setShowPasswordReset(null)}>X</button>
            </div>

            <div className="form-group">
              <label>Neues Passwort</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div className="form-group">
              <label>Passwort bestätigen</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Passwort wiederholen"
              />
            </div>

            <div className="form-actions">
              <button onClick={() => setShowPasswordReset(null)} className="btn-cancel">
                Abbrechen
              </button>
              <button onClick={() => handlePasswordReset(showPasswordReset)} className="btn-save">
                Passwort zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-header">
              <div className="user-info">
                <h3>{user.username}</h3>
                <p>{user.email}</p>
              </div>

              <div className="user-badges">
                <span className={`role-badge ${user.role}`}>
                  {getRoleLabel(user.role)}
                </span>
                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
                {!user.email_verified && (
                  <span className="status-badge inactive">Email unbestätigt</span>
                )}
              </div>
            </div>

            <div className="user-stats">
              <div className="stat">
                <span className="stat-label">Erstellt:</span>
                <span className="stat-value">
                  {new Date(user.created_at).toLocaleDateString('de-DE')}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Spiele erstellt:</span>
                <span className="stat-value">{user.games_created}</span>
              </div>
            </div>

            <div className="user-actions">
              <select
                value={user.role}
                onChange={(e) => updateUserRole(user, e.target.value)}
                className="role-select"
              >
                <option value="user">Benutzer</option>
                <option value="gamemaster">Spielleiter</option>
                <option value="admin">Administrator</option>
              </select>

              <button
                className={`btn-toggle ${user.is_active ? 'active' : 'inactive'}`}
                onClick={() => toggleUserStatus(user)}
              >
                {user.is_active ? 'Deaktivieren' : 'Aktivieren'}
              </button>

              <button
                className="btn-password"
                onClick={() => setShowPasswordReset(user.id)}
              >
                Passwort
              </button>

              <button
                className="btn-delete"
                onClick={() => handleDeleteUser(user.id, user.username)}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="empty-state">
          <h3>Keine Benutzer gefunden</h3>
          <p>Erstellen Sie den ersten Benutzer um loszulegen</p>
        </div>
      )}
    </div>
  )
}

export default UsersManager
