import React, { useState, useEffect } from 'react'

interface User {
  id: number
  username: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  games_created: number
}

const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
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
    
    if (formData.password.length < 6) {
      alert('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Benutzer erfolgreich erstellt!')
        resetForm()
        fetchUsers()
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }

  const handleUpdateUser = async (user: User) => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: user.username,
          email: user.email,
          role: user.role,
          is_active: user.is_active
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Benutzer aktualisiert!')
        fetchUsers()
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Benutzer "${username}" wirklich löschen?`)) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Benutzer gelöscht!')
        fetchUsers()
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }

  const handlePasswordReset = async (userId: number) => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwörter stimmen nicht überein')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert('Passwort zurückgesetzt!')
        setShowPasswordReset(null)
        setPasswordData({ newPassword: '', confirmPassword: '' })
      } else {
        alert(`Fehler: ${data.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'user'
    })
  }

  const toggleUserStatus = (user: User) => {
    const updatedUser = { ...user, is_active: !user.is_active }
    handleUpdateUser(updatedUser)
  }

  const updateUserRole = (user: User, newRole: string) => {
    const updatedUser = { ...user, role: newRole }
    handleUpdateUser(updatedUser)
  }

  if (loading) return <div className="loading">Lade Benutzer...</div>

  return (
    <div className="users-manager">
      <div className="users-header">
        <h2>👥 Benutzerverwaltung ({users.length} Benutzer)</h2>
        <button 
          className="btn-add"
          onClick={() => setShowForm(true)}
        >
          ➕ Neuer Benutzer
        </button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>Neuen Benutzer erstellen</h3>
              <button className="btn-close" onClick={resetForm}>✕</button>
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
                    placeholder="Mindestens 6 Zeichen"
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
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Abbrechen
                </button>
                <button type="submit" className="btn-save">
                  👤 Benutzer erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <div className="question-form-overlay">
          <div className="question-form">
            <div className="form-header">
              <h3>Passwort zurücksetzen</h3>
              <button className="btn-close" onClick={() => setShowPasswordReset(null)}>✕</button>
            </div>
            
            <div className="form-group">
              <label>Neues Passwort</label>
              <input 
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Mindestens 6 Zeichen"
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
              <button 
                onClick={() => setShowPasswordReset(null)} 
                className="btn-cancel"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => handlePasswordReset(showPasswordReset)} 
                className="btn-save"
              >
                🔑 Passwort zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
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
                  {user.role === 'admin' ? '👑 Admin' : '👤 Benutzer'}
                </span>
                <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? '✅ Aktiv' : '❌ Inaktiv'}
                </span>
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
                <option value="admin">Administrator</option>
              </select>
              
              <button 
                className={`btn-toggle ${user.is_active ? 'active' : 'inactive'}`}
                onClick={() => toggleUserStatus(user)}
                title={user.is_active ? 'Deaktivieren' : 'Aktivieren'}
              >
                {user.is_active ? '🔒 Deaktivieren' : '🔓 Aktivieren'}
              </button>
              
              <button 
                className="btn-password"
                onClick={() => setShowPasswordReset(user.id)}
                title="Passwort zurücksetzen"
              >
                🔑 Passwort
              </button>
              
              <button 
                className="btn-delete"
                onClick={() => handleDeleteUser(user.id, user.username)}
                title="Benutzer löschen"
              >
                🗑️ Löschen
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