import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

interface Team {
  id: number
  name: string
  color: string
  current_score: number
}

interface Answer {
  id: number
  team_name: string
  question_text: string
  selected_answer?: string
  is_correct: boolean
  points_awarded: number
  time_taken: number | null
  joker_used: string | null
  answered_at: string
}

interface GameData {
  id: number
  name: string
  game_code: string
  game_mode: string
  status: string
  started_at: string | null
  finished_at: string | null
  created_at: string
}

const GameResults = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('id')
  const source = searchParams.get('source') || 'admin'

  const [game, setGame] = useState<GameData | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!gameId) {
      setError('Keine Spiel-ID angegeben')
      setLoading(false)
      return
    }
    fetchResults()
  }, [gameId])

  const fetchResults = async () => {
    try {
      const basePath = source === 'gamemaster' ? '/api/gamemaster' : '/api/admin'
      const data = await apiFetch(`${basePath}/games/${gameId}/results`)
      setGame(data.game)
      setTeams(data.teams)
      setAnswers(data.answers)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const getBackPath = () => {
    return source === 'gamemaster' ? '/gamemaster/dashboard' : '/admin/dashboard'
  }

  if (loading) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="loading">Lade Ergebnisse...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="setup-wizard">
        <div className="setup-container">
          <div className="setup-header">
            <h1>Fehler</h1>
          </div>
          <div className="error-messages">
            <div className="error-message">{error}</div>
          </div>
          <button className="btn-setup" onClick={() => navigate(getBackPath())}>
            Zurück
          </button>
        </div>
      </div>
    )
  }

  // Stats per team
  const teamStats = teams.map(team => {
    const teamAnswers = answers.filter(a => a.team_name === team.name)
    const correct = teamAnswers.filter(a => a.is_correct).length
    const total = teamAnswers.length
    return { ...team, correct, total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 }
  })

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-title">
          <h1>{game?.name || 'Spielergebnis'}</h1>
          <p>
            Code: {game?.game_code}
            {' | '}
            {game?.game_mode === 'quizmaster' ? 'Quizmaster' : 'Selbstbedienung'}
            {' | '}
            {game?.status === 'finished' ? 'Beendet' : game?.status}
          </p>
        </div>
        <div className="admin-user">
          <button className="btn-logout" onClick={() => navigate(getBackPath())}>
            Zurück
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* Rankings */}
        <div className="games-manager">
          <h2>Rangliste</h2>
          <div className="games-list">
            {teamStats.map((team, index) => (
              <div key={team.id} className="game-card">
                <div className="game-header">
                  <div className="game-title">
                    <h3>
                      <span style={{ marginRight: '0.5rem' }}>{getMedalEmoji(index)}</span>
                      <span style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: team.color,
                        marginRight: '0.5rem',
                        verticalAlign: 'middle'
                      }}></span>
                      {team.name}
                    </h3>
                  </div>
                  <div className="game-code-section">
                    <div className="game-code" style={{ fontSize: '1.4rem' }}>{team.current_score} Pkt.</div>
                  </div>
                </div>
                <div className="game-details">
                  <div className="game-stat">
                    <span className="stat-label">Richtig:</span>
                    <span className="stat-value">{team.correct} / {team.total}</span>
                  </div>
                  <div className="game-stat">
                    <span className="stat-label">Quote:</span>
                    <span className="stat-value">{team.accuracy}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="empty-state">
              <h3>Keine Teams</h3>
              <p>Es sind keine Teams in diesem Spiel.</p>
            </div>
          )}
        </div>

        {/* Answer History */}
        {answers.length > 0 && (
          <div className="games-manager" style={{ marginTop: '2rem' }}>
            <h2>Antwortverlauf ({answers.length} Antworten)</h2>
            <div className="games-list">
              {answers.map(answer => (
                <div key={answer.id} className="game-card" style={{
                  borderLeft: `4px solid ${answer.is_correct ? '#22c55e' : '#ef4444'}`
                }}>
                  <div className="game-header">
                    <div className="game-title">
                      <h3 style={{ fontSize: '0.95rem' }}>{answer.question_text || 'Frage gelöscht'}</h3>
                    </div>
                  </div>
                  <div className="game-details">
                    <div className="game-stat">
                      <span className="stat-label">Team:</span>
                      <span className="stat-value">{answer.team_name}</span>
                    </div>
                    <div className="game-stat">
                      <span className="stat-label">Antwort:</span>
                      <span className="stat-value">{answer.selected_answer || '-'}</span>
                    </div>
                    <div className="game-stat">
                      <span className="stat-label">Ergebnis:</span>
                      <span className="stat-value" style={{ color: answer.is_correct ? '#22c55e' : '#ef4444' }}>
                        {answer.is_correct ? 'Richtig' : 'Falsch'} ({answer.points_awarded > 0 ? '+' : ''}{answer.points_awarded} Pkt.)
                      </span>
                    </div>
                    {answer.time_taken != null && (
                      <div className="game-stat">
                        <span className="stat-label">Zeit:</span>
                        <span className="stat-value">{answer.time_taken}s</span>
                      </div>
                    )}
                    {answer.joker_used && (
                      <div className="game-stat">
                        <span className="stat-label">Joker:</span>
                        <span className="stat-value">{answer.joker_used}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time info */}
        {game && (
          <div className="games-manager" style={{ marginTop: '2rem' }}>
            <h2>Spielinfo</h2>
            <div className="game-card">
              <div className="game-details">
                <div className="game-stat">
                  <span className="stat-label">Erstellt:</span>
                  <span className="stat-value">{formatDate(game.created_at)}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Gestartet:</span>
                  <span className="stat-value">{formatDate(game.started_at)}</span>
                </div>
                <div className="game-stat">
                  <span className="stat-label">Beendet:</span>
                  <span className="stat-value">{formatDate(game.finished_at)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GameResults
