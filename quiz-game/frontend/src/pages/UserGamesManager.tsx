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
  access_level: 'owner' | 'write' | 'read' | 'admin'
}

const UserGamesManager: React.FC = () => {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState({ status: '', access: '', search: '' })
  
  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 4,
    jokerCount: 3,
    risikoEnabled: true
  })

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/user/games', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setGames(data)
      }
    } catch (error) {
      console.error('Error loading games:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('/api/user/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const result = await response.json()
        alert(`Spiel erstellt! Spielcode: ${result.gameCode}`)
        loadGames()
        resetForm()
        setShowForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Fehler beim Erstellen des Spiels')
      }
    } catch (error) {
      console.error('Error creating game:', error)
      alert('Fehler beim Erstellen des Spiels')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      maxTeams: 4,
      jokerCount: 3,
      risikoEnabled: true
    })
  }

  const copyGameCode = (gameCode: string) => {
    navigator.clipboard.writeText(gameCode)
    alert('Spielcode kopiert!')
  }

  const filteredGames = games.filter(game => {
    const matchesStatus = !filter.status || game.status === filter.status
    const matchesAccess = !filter.access || game.access_level === filter.access
    const matchesSearch = !filter.search || 
      game.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      game.game_code.toLowerCase().includes(filter.search.toLowerCase())
    
    return matchesStatus && matchesAccess && matchesSearch
  })

  const getAccessLevelBadge = (level: string) => {
    switch (level) {
      case 'owner':
        return <span className="access-badge owner">👑 Eigentümer</span>
      case 'write':
        return <span className="access-badge write">✏️ Bearbeiten</span>
      case 'read':
        return <span className="access-badge read">👁️ Lesen</span>
      case 'admin':
        return <span className="access-badge admin">🔐 Admin</span>
      default:
        return <span className="access-badge">❓ Unbekannt</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return <span className="status-badge waiting">⏳ Wartend</span>
      case 'active':
        return <span className="status-badge active">🟢 Aktiv</span>
      case 'completed':
        return <span className="status-badge completed">✅ Beendet</span>
      case 'paused':
        return <span className="status-badge paused">⏸️ Pausiert</span>
      default:
        return <span className="status-badge">❓ Unbekannt</span>
    }
  }

  if (loading) {
    return <div className="loading">Lade Spiele...</div>
  }

  return (
    <div className="user-games-manager">
      <div className="section-header">
        <h2>🎮 Meine Spiele</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          ➕ Neues Spiel
        </button>
      </div>

      <div className="filters">
        <select 
          value={filter.status}
          onChange={(e) => setFilter({...filter, status: e.target.value})}
        >
          <option value="">Alle Status</option>
          <option value="waiting">Wartend</option>
          <option value="active">Aktiv</option>
          <option value="completed">Beendet</option>
          <option value="paused">Pausiert</option>
        </select>

        <select 
          value={filter.access}
          onChange={(e) => setFilter({...filter, access: e.target.value})}
        >
          <option value="">Alle Berechtigungen</option>
          <option value="owner">Eigene Spiele</option>
          <option value="write">Bearbeitbare Spiele</option>
          <option value="read">Nur lesbare Spiele</option>
        </select>

        <input
          type="text"
          placeholder="Suchen..."
          value={filter.search}
          onChange={(e) => setFilter({...filter, search: e.target.value})}
        />
      </div>

      <div className="games-grid">
        {filteredGames.map(game => (
          <div key={game.id} className="game-card">
            <div className="game-header">
              <h3>{game.name}</h3>
              <div className="game-badges">
                {getAccessLevelBadge(game.access_level)}
                {getStatusBadge(game.status)}
              </div>
            </div>
            
            <div className="game-content">
              <div className="game-code">
                <strong>Spielcode: {game.game_code}</strong>
                <button 
                  className="copy-btn"
                  onClick={() => copyGameCode(game.game_code)}
                  title="Spielcode kopieren"
                >
                  📋
                </button>
              </div>
              
              <div className="game-meta">
                <div className="meta-item">
                  <span>👥 Teams: {game.team_count}/{game.max_teams}</span>
                </div>
                <div className="meta-item">
                  <span>🃏 Joker: {game.joker_count}</span>
                </div>
                <div className="meta-item">
                  <span>⚡ Risiko: {game.risiko_enabled ? 'Ja' : 'Nein'}</span>
                </div>
              </div>
              
              <div className="game-creator">
                👤 Erstellt von: {game.creator_name || 'Unbekannt'}
              </div>
              
              <div className="game-date">
                📅 {new Date(game.created_at).toLocaleDateString('de-DE', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            
            <div className="game-actions">
              {game.status === 'waiting' && (
                <button className="btn-primary">
                  🚀 Spiel starten
                </button>
              )}
              
              {game.status === 'active' && (
                <button className="btn-secondary">
                  📊 Spiel verwalten
                </button>
              )}
              
              <button 
                className="btn-secondary"
                onClick={() => copyGameCode(game.game_code)}
              >
                📋 Code teilen
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="no-games">
          <p>Keine Spiele gefunden.</p>
          <p>Erstellen Sie Ihr erstes Spiel oder bitten Sie einen Administrator, Ihnen Spiele zuzuweisen.</p>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Neues Spiel erstellen</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="game-form">
              <div className="form-group">
                <label>Spielname</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Geben Sie einen Spielnamen ein..."
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max. Teams</label>
                  <input
                    type="number"
                    value={formData.maxTeams}
                    onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value)})}
                    min="2"
                    max="8"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Joker pro Team</label>
                  <input
                    type="number"
                    value={formData.jokerCount}
                    onChange={(e) => setFormData({...formData, jokerCount: parseInt(e.target.value)})}
                    min="0"
                    max="10"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.risikoEnabled}
                    onChange={(e) => setFormData({...formData, risikoEnabled: e.target.checked})}
                  />
                  Risiko-Fragen aktivieren
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}>
                  Abbrechen
                </button>
                <button type="submit" className="btn-primary">
                  Spiel erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserGamesManager