import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import { notifyAuthChange } from '../../hooks/useSocket'
import ProfileSettings from '../ProfileSettings'
import QRModal from '../../lib/QRModal'
import ThemeToggle from '../../lib/ThemeToggle'

interface Game {
  id: number
  name: string
  game_code: string
  max_teams: number
  joker_count: number
  risiko_enabled: boolean
  game_mode: string
  status: string
  team_count: number
  created_at: string
}

const GamemasterDashboard = () => {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [qrData, setQrData] = useState<{ url: string; title: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 4,
    jokerCount: 3,
    risikoEnabled: true,
    gameMode: 'self_service' as 'quizmaster' | 'self_service'
  })

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const data = await apiFetch('/api/gamemaster/games')
      setGames(data)
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    try {
      const result = await apiFetch('/api/gamemaster/games', {
        method: 'POST',
        body: formData
      })
      alert(`Spiel erstellt! Code: ${result.gameCode}`)
      setShowForm(false)
      setFormData({ name: '', maxTeams: 4, jokerCount: 3, risikoEnabled: true, gameMode: 'self_service' })
      fetchGames()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleLogout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }) } catch {}
    localStorage.removeItem('adminUser')
    notifyAuthChange()
    navigate('/admin/login')
  }

  const handleDeleteGame = async (id: number, name: string) => {
    if (!confirm(`Spiel "${name}" wirklich löschen?`)) return
    try {
      await apiFetch(`/api/gamemaster/games/${id}`, { method: 'DELETE' })
      fetchGames()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
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

  if (loading) return <div className="admin-dashboard"><div className="loading">Lade Dashboard...</div></div>

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>Quiz Arena - Spielleiter</h1>
          <p>Erstelle und verwalte deine Quiz-Spiele</p>
        </div>
        <div className="admin-user">
          <ThemeToggle />
          <button className="btn-register-link" onClick={() => setShowProfile(true)} style={{ marginRight: '0.5rem' }}>
            {JSON.parse(localStorage.getItem('adminUser') || '{}').username}
          </button>
          <button className="btn-logout" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-content">
        <div className="games-manager">
          <div className="games-header">
            <h2>Meine Spiele ({games.length})</h2>
            <button className="btn-add" onClick={() => setShowForm(true)}>
              Neues Spiel
            </button>
          </div>

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
                      placeholder="z.B. Familienquiz"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Spielmodus</label>
                      <select
                        value={formData.gameMode}
                        onChange={(e) => setFormData({...formData, gameMode: e.target.value as any})}
                      >
                        <option value="self_service">Selbstbedienung</option>
                        <option value="quizmaster">Quizmaster</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Max. Teams</label>
                      <select
                        value={formData.maxTeams}
                        onChange={(e) => setFormData({...formData, maxTeams: parseInt(e.target.value)})}
                      >
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="6">6</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Joker pro Team</label>
                      <select
                        value={formData.jokerCount}
                        onChange={(e) => setFormData({...formData, jokerCount: parseInt(e.target.value)})}
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="5">5</option>
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
                    </label>
                  </div>
                  <div className="form-actions">
                    <button type="button" onClick={() => setShowForm(false)} className="btn-cancel">Abbrechen</button>
                    <button type="submit" className="btn-save">Spiel erstellen</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="games-list">
            {games.map(game => (
              <div key={game.id} className="game-card">
                <div className="game-header">
                  <div className="game-title">
                    <h3>{game.name}</h3>
                    <span className="status-badge">{getStatusText(game.status)}</span>
                    <span className="mode-badge">
                      {game.game_mode === 'quizmaster' ? 'Quizmaster' : 'Selbstbedienung'}
                    </span>
                  </div>
                  <div className="game-code-section">
                    <div className="game-code">{game.game_code}</div>
                    <button
                      className="btn-copy"
                      onClick={() => { navigator.clipboard.writeText(game.game_code); alert('Kopiert!') }}
                    >
                      Kopieren
                    </button>
                    <button
                      className="btn-copy"
                      onClick={() => setQrData({
                        url: `${window.location.origin}/join?code=${game.game_code}`,
                        title: `Spiel beitreten: ${game.name}`
                      })}
                    >
                      QR
                    </button>
                  </div>
                </div>
                <div className="game-details">
                  <div className="game-stat">
                    <span className="stat-label">Teams:</span>
                    <span className="stat-value">{game.team_count} / {game.max_teams}</span>
                  </div>
                  <div className="game-stat">
                    <span className="stat-label">Erstellt:</span>
                    <span className="stat-value">
                      {new Date(game.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                </div>
                <div className="question-actions">
                  {(game.status === 'waiting' || game.status === 'active') && (
                    <button className="btn-edit" onClick={() => setQrData({
                      url: `${window.location.origin}/spectate?code=${game.game_code}`,
                      title: `Beamer: ${game.name}`
                    })}>
                      Beamer-QR
                    </button>
                  )}
                  {game.status === 'finished' && (
                    <button className="btn-edit" onClick={() => navigate(`/game/results?id=${game.id}&source=gamemaster`)}>
                      Ergebnisse
                    </button>
                  )}
                  {game.status !== 'active' && (
                    <button className="btn-delete" onClick={() => handleDeleteGame(game.id, game.name)}>
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {games.length === 0 && (
            <div className="empty-state">
              <h3>Noch keine Spiele</h3>
              <p>Erstelle dein erstes Quiz-Spiel!</p>
            </div>
          )}
        </div>
      </div>

      {showProfile && <ProfileSettings onClose={() => setShowProfile(false)} />}
      {qrData && <QRModal url={qrData.url} title={qrData.title} onClose={() => setQrData(null)} />}
    </div>
  )
}

export default GamemasterDashboard
