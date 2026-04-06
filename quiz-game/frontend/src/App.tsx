import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useSocket } from './hooks/useSocket'
import { ProtectedRoute } from './lib/ProtectedRoute'
import HomePage from './pages/HomePage'
import JoinGame from './pages/JoinGame'
import GameScreen from './pages/GameScreen'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import SetupWizard from './pages/SetupWizard'
import RegisterGamemaster from './pages/RegisterGamemaster'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import GameResults from './pages/GameResults'
import SpectatorView from './pages/SpectatorView'
import GamemasterDashboard from './pages/gamemaster/GamemasterDashboard'
import './App.css'

function App() {
  useSocket()

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join" element={<JoinGame />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/register" element={<RegisterGamemaster />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/game/results" element={
            <ProtectedRoute allowedRoles={['admin', 'gamemaster']}>
              <GameResults />
            </ProtectedRoute>
          } />
          <Route path="/spectate" element={<SpectatorView />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/gamemaster/dashboard" element={
            <ProtectedRoute allowedRoles={['admin', 'gamemaster']}>
              <GamemasterDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App
