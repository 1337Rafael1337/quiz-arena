import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { connected } = useGameStore()
  
  return (
    <div className="home-container">
      <h1 className="title">🎯 Quiz Arena</h1>
      <p className="subtitle">Der große Preis - Online Edition</p>
      
      <div className="connection-status">
        <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Verbunden' : '🔴 Nicht verbunden'}
        </span>
      </div>
      
      <div className="home-buttons">
        <button 
          className="btn-primary" 
          onClick={() => navigate('/join')}
          disabled={!connected}
        >
          🎮 Spiel beitreten
        </button>
        
        <button 
          className="btn-admin" 
          onClick={() => navigate('/admin')}
        >
          🔐 Admin Login
        </button>
      </div>
      
      <div className="features">
        <div className="feature">
          <h3>🎮 Multiplayer</h3>
          <p>Bis zu 4 Teams</p>
        </div>
        <div className="feature">
          <h3>⚡ Echtzeit</h3>
          <p>Live Updates</p>
        </div>
        <div className="feature">
          <h3>🃏 Joker & Risiko</h3>
          <p>Strategische Elemente</p>
        </div>
      </div>
      
      <div className="admin-note">
        <p>💡 Spiele werden vom Admin erstellt</p>
        <p>Frage deinen Spielleiter nach dem Spielcode!</p>
      </div>
    </div>
  )
}

export default HomePage
