import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const JoinGame: React.FC = () => {
  const navigate = useNavigate()
  const { socket, connected } = useGameStore()
  
  const [gameCode, setGameCode] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState('#4caf50')
  const [joining, setJoining] = useState(false)
  
  const colors = [
    { name: 'Grün', value: '#4caf50' },
    { name: 'Blau', value: '#2196f3' },
    { name: 'Rot', value: '#f44336' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Lila', value: '#9c27b0' },
    { name: 'Türkis', value: '#00bcd4' }
  ]
  
  const handleJoinGame = () => {
    if (!socket || !gameCode.trim() || !teamName.trim() || !connected) return
    
    setJoining(true)
    
    socket.emit('join_game', {
      gameCode: gameCode.trim().toUpperCase(),
      teamName: teamName.trim(),
      teamColor
    })
    
    // Listen for successful join
    socket.once('joined_game', () => {
      console.log('✅ Joined game, navigating to game screen')
      navigate('/game')
    })
    
    // Timeout fallback
    setTimeout(() => {
      setJoining(false)
    }, 5000)
  }
  
  return (
    <div className="join-game-container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Zurück
      </button>
      
      <h2>Spiel beitreten</h2>
      
      <div className="form-container">
        <div className="form-group">
          <label>Spielcode</label>
          <input
            type="text"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            placeholder="ABCDEF"
            maxLength={6}
            style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.5rem' }}
          />
        </div>
        
        <div className="form-group">
          <label>Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Die Gewinner"
            maxLength={30}
          />
        </div>
        
        <div className="form-group">
          <label>Team Farbe</label>
          <div className="color-grid">
            {colors.map((color) => (
              <button
                key={color.value}
                className={`color-btn ${teamColor === color.value ? 'selected' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => setTeamColor(color.value)}
                title={color.name}
              >
                {teamColor === color.value && '✓'}
              </button>
            ))}
          </div>
        </div>
        
        <button 
          className="btn-primary btn-large" 
          onClick={handleJoinGame}
          disabled={!gameCode.trim() || !teamName.trim() || !connected || joining}
        >
          {joining ? 'Trete bei...' : 'Spiel beitreten'}
        </button>
        
        {!connected && (
          <p className="error-message">❌ Keine Verbindung zum Server</p>
        )}
      </div>
    </div>
  )
}

export default JoinGame
