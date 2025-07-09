import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserInfo {
  id: number
  username: string
  role: string
  created_at: string
}

interface GameStats {
  totalGames: number
  activeGames: number
  recentGames: Array<{
    id: number
    name: string
    status: string
    created_at: string
  }>
}

const UserDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [gameStats, setGameStats] = useState<GameStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuth()
    loadUserData()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('adminToken')
    const user = localStorage.getItem('adminUser')
    
    if (!token || !user) {
      navigate('/admin/login')
      return
    }
    
    try {
      const userData = JSON.parse(user)
      setUserInfo(userData)
    } catch (error) {
      console.error('Error parsing user data:', error)
      navigate('/admin/login')
    }
  }

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      
      // Load game statistics
      const response = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load user data')
      }
      
      const data = await response.json()
      setGameStats({
        totalGames: data.totalGames || 0,
        activeGames: data.activeGames || 0,
        recentGames: data.recentGames || []
      })
    } catch (error) {
      console.error('Error loading user data:', error)
      setError('Fehler beim Laden der Benutzerdaten')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/')
  }

  const joinGame = () => {
    navigate('/join')
  }

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="loading">Lade Benutzer-Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🎯 Quiz Arena - Benutzer-Dashboard</h1>
          <div className="user-info">
            <span>Willkommen, {userInfo?.username}!</span>
            <button className="logout-btn" onClick={handleLogout}>
              🚪 Abmelden
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {error && (
          <div className="error-banner">
            ❌ {error}
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <h3>Verfügbare Spiele</h3>
              <div className="stat-number">{gameStats?.totalGames || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>Aktive Spiele</h3>
              <div className="stat-number">{gameStats?.activeGames || 0}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>Benutzerrolle</h3>
              <div className="stat-text">{userInfo?.role || 'Benutzer'}</div>
            </div>
          </div>
        </div>

        <div className="action-section">
          <h2>🎯 Aktionen</h2>
          <div className="action-buttons">
            <button 
              className="btn-primary large"
              onClick={joinGame}
            >
              🎮 Spiel beitreten
            </button>
            
            <button 
              className="btn-secondary large"
              onClick={() => navigate('/')}
            >
              🏠 Zur Startseite
            </button>
          </div>
        </div>

        {gameStats?.recentGames && gameStats.recentGames.length > 0 && (
          <div className="recent-games">
            <h2>📋 Letzte Spiele</h2>
            <div className="games-list">
              {gameStats.recentGames.slice(0, 5).map((game) => (
                <div key={game.id} className="game-item">
                  <div className="game-info">
                    <h4>{game.name}</h4>
                    <span className={`status ${game.status}`}>
                      {game.status === 'active' ? '🟢 Aktiv' : 
                       game.status === 'completed' ? '✅ Beendet' : 
                       '⏸️ Pausiert'}
                    </span>
                  </div>
                  <div className="game-date">
                    {new Date(game.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="help-section">
          <h2>💡 Hilfe</h2>
          <div className="help-content">
            <p>
              <strong>Spiel beitreten:</strong> Klicken Sie auf "Spiel beitreten" und geben Sie den 
              Spielcode ein, den Sie vom Spielleiter erhalten haben.
            </p>
            <p>
              <strong>Aktive Spiele:</strong> Hier sehen Sie, wie viele Spiele gerade laufen.
            </p>
            <p>
              <strong>Probleme?</strong> Wenden Sie sich an Ihren Administrator oder Spielleiter.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserDashboard