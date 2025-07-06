import React from 'react'
import { useNavigate } from 'react-router-dom'

const AdminPanel: React.FC = () => {
  const navigate = useNavigate()
  
  return (
    <div className="admin-panel">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← Zurück
      </button>
      
      <h1>Admin Panel</h1>
      <p>In Entwicklung...</p>
    </div>
  )
}

export default AdminPanel
