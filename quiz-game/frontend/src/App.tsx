import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useSocket } from './hooks/useSocket'
import HomePage from './pages/HomePage'
import JoinGame from './pages/JoinGame'
import GameScreen from './pages/GameScreen'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import SetupWizard from './pages/SetupWizard'
import './App.css'

function App() {
  // Initialize socket connection globally
  useSocket()
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin" element={<AdminLogin />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
