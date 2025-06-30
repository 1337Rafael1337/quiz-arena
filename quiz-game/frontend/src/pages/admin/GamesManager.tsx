import React, { useState, useEffect } from 'react'

interface Game {
  id: number
  name: string
  game_code: string
  creator_name: string
  max_teams: number
  joker_count: number
  risiko_enabled: boolean
  status: string
  team_count: number
  created_at: string
}

const GamesManager: React.FC = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 4,
    jokerCount: 3,
    risikoEnabled: true
  })
  
  useEffect(() => {
    fetchGames()
  }, [])
  
  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3001/api/admin/games', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Spiel-Name ist erforderlich')
      return
    }
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:3001/api/admin/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Spiel erstellt! Code: ${result.gameCode}`)
        resetForm()
        fetchGames()
      } else {
        const error = await response.json()
        alert(`Fehler: ${error.error}`)
      }
    } catch (error) {
      alert(`Fehler: ${error.message}`)
    }
  }
  
  const copyGameCode = (gameCode: string) => {
    navigator.clipboard.writeText(gameCode)
    alert(`Spielcode ${gameCode} kopiert!`)
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return '#ff9800'
      case 'active': return '#4caf50'
      case 'finished': return '#666'
      default: return '#2196f3'
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Wartet auf Teams'
      case 'active': return 'Aktiv'
      case 'finished': return 'Beendet'
      default: return status
    }
  }
  
  const resetForm = () => {
    setShowForm(false)
    setFormData({
      name: '',
      maxTeams: 4,
      jokerCount: 3,
      risikoEnabled: true
    })
  }
  
  if (loading) return <div className="loading">Loading games...</div>
  
  return (
    <div className="games-manager">
      <div className="games-header">
        <h2>🎮 Spiele verwalten</h2>
        <button 
          className="btn-add"
          onClick={() => setShowForm(true)}
        >
          ➕ Neues Spiel
        </button>
      </div>
      
      {/* Game Creation Form */}
      {showForm && (
        <div className="question-form-overlay">
          <div className="question-form">
            <h3>Neues Spiel erstellen</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Spielname</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="z.B. Familienquiz, Firmenfeier, Klassentreffen"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Maximale Teams</label>
                  <select 
                    value={formData.maxTeams}
                    onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value)})}
                  >
                    <option value="2">2 Teams</option>
                    <option value="3">3 Teams</option>
                    <option value="4">4 Teams</option>
                    <option value="6">6 Teams</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Joker pro Team</label>
                  <select 
                    value={formData.jokerCount}
                    onChange={(e) => setFormData({...formData, jokerCount: parseInt(e.target.value)})}
                  >
                    <option value="0">Keine Joker</option>
                    <option value="1">1 Joker</option>
                    <option value="2">2 Joker</option>
                    <option value="3">3 Joker</option>
                    <option value="5">5 Joker</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={formData.risikoEnabled}
                    onChange={(e) => setFormData({...formData, risikoEnabled: e.target.checked})}
                  />
                  RISIKO-Fragen aktivieren
                  <span className="checkbox-help">
                    (Doppelte Punkte bei richtiger, Punktverlust bei falscher Antwort)
                  </span>
                </label>
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-cancel">
                  Abbrechen
                </button>
                <button type="submit" className="btn-save">
                  Spiel erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Games List */}
      <div className="games-list">
        {games.map(game => (
          <div key={game.id} className="game-card">
            <div className="game-header">
              <div className="game-title">
                <h3>{game.name}</h3>
                <span 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(game.status) }}
                >
                  {getStatusText(game.status)}
                </span>
              </div>
              
              <div className="game-code-section">
                <div className="game-code">{game.game_code}</div>
                <button 
                  className="btn-copy"
                  onClick={() => copyGameCode(game.game_code)}
                  title="Code kopieren"
                >
                  📋
                </button>
              </div>
            </div>
            
            <div className="game-details">
              <div className="game-stat">
                <span className="stat-label">Teams:</span>
                <span className="stat-value">{game.team_count} / {game.max_teams}</span>
              </div>
              
              <div className="game-stat">
                <span className="stat-label">Joker:</span>
                <span className="stat-value">{game.joker_count} pro Team</span>
              </div>
              
              <div className="game-stat">
                <span className="stat-label">RISIKO:</span>
                <span className="stat-value">
                  {game.risiko_enabled ? '✅ Aktiviert' : '❌ Deaktiviert'}
                </span>
              </div>
              
              <div className="game-stat">
                <span className="stat-label">Erstellt:</span>
                <span className="stat-value">
                  {new Date(game.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {game.creator_name && (
                <div className="game-stat">
                  <span className="stat-label">Ersteller:</span>
                  <span className="stat-value">{game.creator_name}</span>
                </div>
              )}
            </div>
            
            <div className="game-actions">
              <button 
                className="btn-monitor"
                title="Spiel überwachen"
                disabled={game.status === 'finished'}
              >
                👁️ Überwachen
              </button>
              
              <button 
                className="btn-share"
                onClick={() => copyGameCode(game.game_code)}
                title="Code teilen"
              >
                🔗 Code teilen
              </button>
              
              {game.status === 'waiting' && (
                <button 
                  className="btn-delete"
                  title="Spiel löschen"
                >
                  🗑️ Löschen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {games.length === 0 && (
        <div className="empty-state">
          <h3>Keine Spiele vorhanden</h3>
          <p>Erstelle dein erstes Spiel um loszulegen</p>
        </div>
      )}
    </div>
  )
}

export default GamesManager
