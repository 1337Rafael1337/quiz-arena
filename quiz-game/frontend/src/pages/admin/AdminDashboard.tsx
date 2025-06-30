import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QuestionsManager from './QuestionsManager'
import CategoriesManager from './CategoriesManager'
import GamesManager from './GamesManager'
import ImportManager from './ImportManager'

interface Stats {
  totalQuestions: number
  totalCategories: number
  totalGames: number
  activeGames: number
  categoriesStats: Array<{ name: string; question_count: number }>
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login')
      return
    }
    
    fetchStats()
  }, [navigate])
  
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3001/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
    navigate('/admin/login')
  }
  
  const refreshStats = () => {
    fetchStats()
  }
  
  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading admin dashboard...</div>
      </div>
    )
  }
  
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>🎯 Quiz Arena - Admin Panel</h1>
          <p>Content Management System</p>
        </div>
        
        <div className="admin-user">
          <span>👤 {JSON.parse(localStorage.getItem('adminUser') || '{}').username}</span>
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
          📊 Übersicht
        </button>
        <button 
          className={`nav-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          ❓ Fragen
        </button>
        <button 
          className={`nav-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          📂 Kategorien
        </button>
        <button 
          className={`nav-btn ${activeTab === 'games' ? 'active' : ''}`}
          onClick={() => setActiveTab('games')}
        >
          🎮 Spiele
        </button>
        <button 
          className={`nav-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-header">
              <h2>📊 Statistiken</h2>
              <button className="btn-refresh" onClick={refreshStats}>
                🔄 Aktualisieren
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
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('questions')}
                >
                  ➕ Neue Frage hinzufügen
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('categories')}
                >
                  📂 Neue Kategorie
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('games')}
                >
                  🎮 Neues Spiel erstellen
                </button>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('import')}
                >
                  📥 CSV importieren
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'questions' && <QuestionsManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'games' && <GamesManager />}
        {activeTab === 'import' && <ImportManager />}
      </div>
    </div>
  )
}

export default AdminDashboard
