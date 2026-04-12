import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../lib/api'
import QRModal from '../../lib/QRModal'
import { useGameStore } from '../../store/gameStore'

interface Game {
  id: number
  name: string
  game_code: string
  creator_name: string
  max_teams: number
  joker_count: number
  risiko_enabled: boolean
  game_mode: string
  answer_mode: string
  status: string
  team_count: number
  created_at: string
}

const GamesManager = () => {
  const navigate = useNavigate()
  const { socket, updateGameState } = useGameStore()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [qrData, setQrData] = useState<{ url: string; title: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    maxTeams: 4,
    jokerCount: 3,
    risikoEnabled: true,
    gameMode: 'self_service' as 'quizmaster' | 'self_service',
    answerMode: 'competitive' as 'competitive' | 'turns'
  })

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const data = await apiFetch('/api/admin/games')
      setGames(data)
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
      const result = await apiFetch('/api/admin/games', {
        method: 'POST',
        body: formData
      })

      alert(`Spiel erstellt! Code: ${result.gameCode}`)
      resetForm()
      fetchGames()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
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

  const getModeText = (mode: string) => {
    return mode === 'quizmaster' ? 'Quizmaster' : 'Selbstbedienung'
  }

  const handleStartGame = (gameCode: string) => {
    if (!socket) {
      alert('Keine Socket-Verbindung. Bitte Seite neu laden.')
      return
    }
    socket.emit('start_game', { gameCode })
    updateGameState({
      gameCode,
      teamId: null,
      teams: [],
      gameStatus: 'waiting',
      questionGrid: [],
      currentQuestion: null,
      showResults: false,
      selectedAnswer: null,
      rankings: []
    })
    navigate('/game')
  }

  const handleDeleteGame = async (id: number, name: string) => {
    if (!confirm(`Spiel "${name}" wirklich löschen? Alle Teams und Ergebnisse werden entfernt.`)) return
    try {
      await apiFetch(`/api/admin/games/${id}`, { method: 'DELETE' })
      fetchGames()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const handleCancelGame = async (id: number, name: string) => {
    if (!confirm(`Spiel "${name}" wirklich beenden?`)) return
    try {
      await apiFetch(`/api/admin/games/${id}/cancel`, { method: 'PATCH' })
      fetchGames()
    } catch (err: any) {
      alert(`Fehler: ${err.message}`)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setFormData({
      name: '',
      maxTeams: 4,
      jokerCount: 3,
      risikoEnabled: true,
      gameMode: 'self_service',
      answerMode: 'competitive'
    })
  }

  if (loading) return <div className="loading">Lade Spiele...</div>

  return (
    <div className="games-manager">
      <div className="games-header">
        <h2>Spiele verwalten</h2>
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
                  placeholder="z.B. Familienquiz, Firmenfeier, Klassentreffen"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Spielmodus</label>
                  <select
                    value={formData.gameMode}
                    onChange={(e) => setFormData({...formData, gameMode: e.target.value as 'quizmaster' | 'self_service'})}
                  >
                    <option value="self_service">Selbstbedienung (Teams wählen selbst)</option>
                    <option value="quizmaster">Quizmaster (Spielleiter steuert)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Antwortmodus</label>
                  <select
                    value={formData.answerMode}
                    onChange={(e) => setFormData({...formData, answerMode: e.target.value as 'competitive' | 'turns'})}
                  >
                    <option value="competitive">Gleichzeitig (alle antworten)</option>
                    <option value="turns">Reihum (ein Team pro Runde)</option>
                  </select>
                </div>

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
                <span className="mode-badge">
                  {getModeText(game.game_mode)}
                </span>
                <span className="mode-badge" style={{ background: game.answer_mode === 'turns' ? 'rgba(14,165,233,0.2)' : 'rgba(99,102,241,0.2)', color: game.answer_mode === 'turns' ? '#38bdf8' : '#a5b4fc' }}>
                  {game.answer_mode === 'turns' ? 'Reihum' : 'Gleichzeitig'}
                </span>
              </div>

              <div className="game-code-section">
                <div className="game-code">{game.game_code}</div>
                <button
                  className="btn-copy"
                  onClick={() => copyGameCode(game.game_code)}
                  title="Code kopieren"
                >
                  Kopieren
                </button>
                <button
                  className="btn-copy"
                  onClick={() => setQrData({
                    url: `${window.location.origin}/join?code=${game.game_code}`,
                    title: `Spiel beitreten: ${game.name}`
                  })}
                  title="QR-Code anzeigen"
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
                <span className="stat-label">Joker:</span>
                <span className="stat-value">{game.joker_count} pro Team</span>
              </div>
              <div className="game-stat">
                <span className="stat-label">RISIKO:</span>
                <span className="stat-value">
                  {game.risiko_enabled ? 'Aktiviert' : 'Deaktiviert'}
                </span>
              </div>
              <div className="game-stat">
                <span className="stat-label">Erstellt:</span>
                <span className="stat-value">
                  {new Date(game.created_at).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
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

            <div className="question-actions">
              {game.status === 'waiting' && (
                <button
                  className="btn-start-game"
                  onClick={() => handleStartGame(game.game_code)}
                  disabled={game.team_count < 1}
                  title={game.team_count < 1 ? 'Mindestens 1 Team muss beitreten' : ''}
                >
                  ▶ Spiel starten ({game.team_count} Team{game.team_count !== 1 ? 's' : ''})
                </button>
              )}
              {game.status === 'active' && (
                <button className="btn-save" onClick={() => {
                  updateGameState({ gameCode: game.game_code, teamId: null, teams: [], gameStatus: 'active', questionGrid: [], currentQuestion: null, showResults: false, selectedAnswer: null, rankings: [] })
                  navigate('/game')
                }}>
                  ▶ Zum laufenden Spiel
                </button>
              )}
              <button className="btn-edit" onClick={() => copyGameCode(game.game_code)}>
                Code teilen
              </button>
              {(game.status === 'waiting' || game.status === 'active') && (
                <button className="btn-edit" onClick={() => setQrData({
                  url: `${window.location.origin}/spectate?code=${game.game_code}`,
                  title: `Beamer: ${game.name}`
                })}>
                  Beamer-QR
                </button>
              )}
              {game.status === 'finished' && (
                <button className="btn-edit" onClick={() => navigate(`/game/results?id=${game.id}&source=admin`)}>
                  Ergebnisse
                </button>
              )}
              {game.status === 'active' && (
                <button className="btn-delete" onClick={() => handleCancelGame(game.id, game.name)}>
                  Beenden
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
          <h3>Keine Spiele vorhanden</h3>
          <p>Erstelle dein erstes Spiel um loszulegen</p>
        </div>
      )}

      {qrData && <QRModal url={qrData.url} title={qrData.title} onClose={() => setQrData(null)} />}
    </div>
  )
}

export default GamesManager
