import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const SetupWizard: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<string[]>([])

  const validateForm = () => {
    const newErrors: string[] = []
    
    if (!formData.username.trim()) {
      newErrors.push('Benutzername ist erforderlich')
    }
    
    if (!formData.email.trim()) {
      newErrors.push('E-Mail ist erforderlich')
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.push('Ungültige E-Mail-Adresse')
    }
    
    if (!formData.password) {
      newErrors.push('Passwort ist erforderlich')
    } else if (formData.password.length < 6) {
      newErrors.push('Passwort muss mindestens 6 Zeichen lang sein')
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.push('Passwörter stimmen nicht überein')
    }
    
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Store token and user info
        localStorage.setItem('adminToken', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        alert('Admin-Account erfolgreich erstellt!')
        navigate('/admin/dashboard')
      } else {
        setErrors([data.error || 'Fehler beim Erstellen des Admin-Accounts'])
      }
    } catch (error) {
      setErrors(['Verbindungsfehler. Bitte versuchen Sie es erneut.'])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <div className="setup-header">
          <h1>🎯 Quiz Arena Setup</h1>
          <p>Willkommen! Erstellen Sie Ihren ersten Administrator-Account.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label htmlFor="username">Benutzername *</label>
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              placeholder="admin"
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
              placeholder="admin@example.com"
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
              placeholder="Mindestens 6 Zeichen"
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
          
          {errors.length > 0 && (
            <div className="error-messages">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  ❌ {error}
                </div>
              ))}
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn-setup"
            disabled={loading}
          >
            {loading ? '⏳ Erstelle Admin...' : '🚀 Admin erstellen'}
          </button>
        </form>
        
        <div className="setup-info">
          <h3>ℹ️ Wichtige Informationen:</h3>
          <ul>
            <li>Dieser Account wird Administrator-Rechte haben</li>
            <li>Sie können später weitere Benutzer erstellen</li>
            <li>Merken Sie sich Ihre Zugangsdaten gut</li>
            <li>Das Setup kann nur einmal durchgeführt werden</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SetupWizard