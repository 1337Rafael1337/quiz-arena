import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { notifyAuthChange } from '../../hooks/useSocket'
import QuestionsManager from './QuestionsManager'
import CategoriesManager from './CategoriesManager'
import GamesManager from './GamesManager'
import ImportManager from './ImportManager'
import UsersManager from './UsersManager'
import AuditLog from './AuditLog'
import ProfileSettings from '../ProfileSettings'
import ThemeToggle from '../../lib/ThemeToggle'

interface Stats {
  totalQuestions: number
  totalCategories: number
  totalGames: number
  activeGames: number
  totalUsers: number
  adminUsers: number
  gamemasterUsers: number
  pendingGamemasters: number
  categoriesStats: Array<{ name: string; question_count: number }>
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/api/admin/stats')
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('adminUser')
    notifyAuthChange()
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Lade Admin Dashboard...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>Quiz Arena - Admin Panel</h1>
          <p>Content Management System</p>
        </div>

        <div className="admin-user">
          <ThemeToggle />
          <button className="btn-register-link" onClick={() => setShowProfile(true)} style={{ marginRight: '0.5rem' }}>
            {JSON.parse(localStorage.getItem('adminUser') || '{}').username}
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="admin-nav">
        <button
          className={`nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button
          className={`nav-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          Fragen
        </button>
        <button
          className={`nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          Kategorien
        </button>
        <button
          className={`nav-btn ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          Spiele
        </button>
        <button
          className={`nav-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import
        </button>
        <button
          className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Benutzer
        </button>
        <button
          className={`nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Protokoll
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-header">
              <h2>Statistiken</h2>
              <button className="btn-refresh" onClick={fetchStats}>
                Aktualisieren
              </button>
            </div>

            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{stats.totalQuestions}</div>
                  <div className="stat-label">Fragen</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.totalCategories}</div>
                  <div className="stat-label">Kategorien</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.totalGames}</div>
                  <div className="stat-label">Spiele gesamt</div>
                </div>
                <div className="stat-card active">
                  <div className="stat-number">{stats.activeGames}</div>
                  <div className="stat-label">Aktive Spiele</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.totalUsers}</div>
                  <div className="stat-label">Benutzer gesamt</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.adminUsers}</div>
                  <div className="stat-label">Administratoren</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.gamemasterUsers}</div>
                  <div className="stat-label">Spielleiter</div>
                </div>
                {stats.pendingGamemasters > 0 && (
                  <div className="stat-card">
                    <div className="stat-number">{stats.pendingGamemasters}</div>
                    <div className="stat-label">Ausstehende Bestätigungen</div>
                  </div>
                )}
              </div>
            )}

            {stats && stats.categoriesStats.length > 0 && (
              <div className="category-stats">
                <h3>Fragen pro Kategorie</h3>
                <div className="category-list">
                  {stats.categoriesStats.map((cat, index) => (
                    <div key={index} className="category-stat">
                      <span className="category-name">{cat.name}</span>
                      <div className="category-bar">
                        <div
                          className="category-bar-fill"
                          style={{
                            width: `${(cat.question_count / Math.max(...stats.categoriesStats.map(c => c.question_count))) * 100}%`
                          }}
                        ></div>
                        <span className="category-count">{cat.question_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="quick-actions">
              <h3>Schnellaktionen</h3>
              <div className="action-buttons">
                <button className="action-btn" onClick={() => setActiveTab('questions')}>
                  Neue Frage hinzufügen
                </button>
                <button className="action-btn" onClick={() => setActiveTab('categories')}>
                  Neue Kategorie
                </button>
                <button className="action-btn" onClick={() => setActiveTab('games')}>
                  Neues Spiel erstellen
                </button>
                <button className="action-btn" onClick={() => setActiveTab('import')}>
                  CSV importieren
                </button>
                <button className="action-btn" onClick={() => setActiveTab('users')}>
                  Neuen Benutzer erstellen
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && <QuestionsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'games' && <GamesManager />}
        {activeTab === 'import' && <ImportManager />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'audit' && <AuditLog />}
      </div>

      {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
    </div>
  )
}

export default AdminDashboard
