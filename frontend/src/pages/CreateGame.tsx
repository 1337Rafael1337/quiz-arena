import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const CreateGame: React.FC = () => {
  const navigate = useNavigate()
  const { socket, connected } = useGameStore()
  
  const [gameName, setGameName] = useState('')
  const [settings, setSettings] = useState({
    maxTeams: 4,
    jokerCount: 3,
    risikoEnabled: true
  })
  const [creating, setCreating] = useState(false)
  
  const handleCreateGame = () => {
    if (!socket || !gameName.trim() || !connected) return
    
    setCreating(true)
    
    socket.emit('create_game', {
      gameName: gameName.trim(),
      settings
    })
    
    // Listen for game creation
    socket.once('game_created', () => {
      console.log('✅ Game created, navigating to game screen')
      navigate('/game')
    })
    
    // Timeout fallback
    setTimeout(() => {
      setCreating(false)
    }, 5000)
  }
  
  return (
    <div className="create-game-container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Zurück
      </button>
      
      <h2>Neues Spiel erstellen</h2>
      
      <div className="form-container">
        <div className="form-group">
          <label>Spielname</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Mein Quiz-Spiel"
            maxLength={50}
          />
        </div>
        
        <div className="form-group">
          <label>Maximale Teams</label>
          <select 
            value={settings.maxTeams} 
            onChange={(e) => setSettings({...settings, maxTeams: parseInt(e.target.value)})}
          >
            <option value="2">2 Teams</option>
            <option value="3">3 Teams</option>
            <option value="4">4 Teams</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Joker pro Team</label>
          <input
            type="number"
            value={settings.jokerCount}
            onChange={(e) => setSettings({...settings, jokerCount: parseInt(e.target.value)})}
            min="0"
            max="5"
          />
        </div>
        
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.risikoEnabled}
              onChange={(e) => setSettings({...settings, risikoEnabled: e.target.checked})}
            />
            Risiko aktivieren
          </label>
        </div>
        
        <button 
          className="btn-primary btn-large" 
          onClick={handleCreateGame}
          disabled={!gameName.trim() || !connected || creating}
        >
          {creating ? 'Erstelle Spiel...' : 'Spiel erstellen'}
        </button>
        
        {!connected && (
          <p className="error-message">❌ Keine Verbindung zum Server</p>
        )}
      </div>
    </div>
  )
}

export default CreateGame
