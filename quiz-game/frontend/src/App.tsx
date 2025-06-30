import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useSocket } from './hooks/useSocket'
import HomePage from './pages/HomePage'
import CreateGame from './pages/CreateGame'
import JoinGame from './pages/JoinGame'
import GameScreen from './pages/GameScreen'
import AdminPanel from './pages/AdminPanel'
import './App.css'

function App() {
  // Initialize socket connection globally
  useSocket()
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateGame />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
