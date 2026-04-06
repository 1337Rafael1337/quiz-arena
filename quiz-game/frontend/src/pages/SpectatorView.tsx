import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { QRCodeSVG } from 'qrcode.react'

interface Team {
  id: string
  name: string
  color: string
  score: number
  current_score?: number
  jokersRemaining: number
}

interface QuestionCell {
  id: string
  category: string
  points: number
  used: boolean
  isRisiko: boolean
}

interface QuestionData {
  id: number
  text: string
  category: string
  points: number
  isRisiko: boolean
  timeLimit: number
  options: Array<{ id: number; text: string }>
}

interface AnswerResult {
  teamId: string
  teamName: string
  isCorrect: boolean
  pointsAwarded: number
  wasRisiko: boolean
  wasDoublePoints: boolean
  correctOptionId: number
}

const SpectatorView = () => {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code') || ''

  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')

  const [teams, setTeams] = useState<Team[]>([])
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'finished'>('waiting')
  const [_gameMode, setGameMode] = useState<string>('self_service')
  const [questionGrid, setQuestionGrid] = useState<QuestionCell[][]>([])
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null)
  const [rankings, setRankings] = useState<Array<{ name: string; score: number; rank: number }>>([])
  const [notifications, setNotifications] = useState<Array<{ id: number; message: string; type: string }>>([])

  const showNotification = (message: string, type: string) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000)
  }

  useEffect(() => {
    if (!code) {
      setError('Kein Spielcode angegeben. Nutze ?code=XXXXXX')
      return
    }

    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin
    const socket = io(socketUrl, { path: '/socket.io/' })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      // Join as spectator (no team name = spectator)
      socket.emit('spectate_game', { gameCode: code })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('error', (data) => {
      setError(data.message)
    })

    socket.on('spectate_joined', (data) => {
      if (data.teams) setTeams(data.teams)
      if (data.status) setGameStatus(data.status)
      if (data.questionGrid) setQuestionGrid(data.questionGrid)
      if (data.gameMode) setGameMode(data.gameMode)
    })

    socket.on('game_state_updated', (data) => {
      if (data.teams) setTeams(data.teams)
      if (data.status) setGameStatus(data.status)
      if (data.questionGrid) setQuestionGrid(data.questionGrid)
      if (data.gameMode) setGameMode(data.gameMode)
    })

    socket.on('game_started', (data) => {
      setGameStatus('active')
      if (data.teams) setTeams(data.teams)
      if (data.questionGrid) setQuestionGrid(data.questionGrid)
      if (data.gameMode) setGameMode(data.gameMode)
    })

    socket.on('question_selected', (data) => {
      setCurrentQuestion(data.question)
      setTimeRemaining(data.question.timeLimit)
      setLastResult(null)
      if (data.questionGrid) setQuestionGrid(data.questionGrid)
    })

    socket.on('answer_result', (data) => {
      setLastResult(data)
      if (data.teams) setTeams(data.teams)

      const emoji = data.isCorrect ? '✓' : '✗'
      const pts = data.pointsAwarded >= 0 ? `+${data.pointsAwarded}` : `${data.pointsAwarded}`
      showNotification(`${emoji} ${data.teamName}: ${pts} Punkte`, data.isCorrect ? 'success' : 'error')
    })

    socket.on('joker_used', (data) => {
      const jokerNames: Record<string, string> = {
        double_points: 'Doppelte Punkte',
        extra_time: 'Extra Zeit',
        '50_50': '50/50'
      }
      showNotification(`${data.teamName} nutzt Joker: ${jokerNames[data.jokerType] || data.jokerType}`, 'joker')

      if (data.effect.type === 'extra_time' && data.effect.globalEffect) {
        setTimeRemaining(prev => prev + (data.effect.timeBonus || 20))
      }
    })

    socket.on('time_up', () => {
      setTimeRemaining(0)
    })

    socket.on('game_finished', (data) => {
      setGameStatus('finished')
      if (data.rankings) setRankings(data.rankings)
      if (data.teams) setTeams(data.teams)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [code])

  // Client-side timer countdown
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (currentQuestion && timeRemaining > 0 && !lastResult) {
      timer = setTimeout(() => setTimeRemaining(prev => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [currentQuestion, timeRemaining, lastResult])

  const sortedTeams = [...teams].sort((a, b) => (b.score ?? b.current_score ?? 0) - (a.score ?? a.current_score ?? 0))

  if (error) {
    return (
      <div className="spectator-view">
        <div className="spectator-error">
          <h1>Quiz Arena</h1>
          <p className="error-message">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="spectator-view">
      {/* Notifications */}
      <div className="spectator-notifications">
        {notifications.map(n => (
          <div key={n.id} className={`spectator-notification ${n.type}`}>
            {n.message}
          </div>
        ))}
      </div>

      {/* Header Bar */}
      <div className="spectator-header">
        <div className="spectator-title">Quiz Arena</div>
        <div className="spectator-code">Code: {code}</div>
        <div className="spectator-status">
          {!connected && <span className="status-dot offline"></span>}
          {connected && gameStatus === 'waiting' && <span className="status-dot waiting"></span>}
          {connected && gameStatus === 'active' && <span className="status-dot active"></span>}
          {connected && gameStatus === 'finished' && <span className="status-dot finished"></span>}
          {gameStatus === 'waiting' ? 'Warteraum' : gameStatus === 'active' ? 'Läuft' : 'Beendet'}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="spectator-scoreboard">
        {sortedTeams.map((team, i) => (
          <div key={team.id} className="spectator-team" style={{ borderColor: team.color }}>
            <div className="spectator-team-rank">#{i + 1}</div>
            <div className="spectator-team-color" style={{ backgroundColor: team.color }}></div>
            <div className="spectator-team-name">{team.name}</div>
            <div className="spectator-team-score">{team.score ?? team.current_score ?? 0}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="spectator-main">
        {/* Waiting */}
        {gameStatus === 'waiting' && (
          <div className="spectator-waiting">
            <h2>Warte auf Spielstart...</h2>
            <div className="spectator-join-code">{code}</div>
            <div style={{ margin: '1rem auto', background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block' }}>
              <QRCodeSVG value={`${window.location.origin}/join?code=${code}`} size={200} level="M" />
            </div>
            <p>{teams.length} Team{teams.length !== 1 ? 's' : ''} beigetreten</p>
          </div>
        )}

        {/* Finished */}
        {gameStatus === 'finished' && (
          <div className="spectator-finished">
            <h2>Spiel beendet!</h2>
            <div className="spectator-rankings">
              {(rankings.length > 0
                ? rankings
                : sortedTeams.map((t, i) => ({ name: t.name, score: t.score ?? t.current_score ?? 0, rank: i + 1 }))
              ).map(entry => (
                <div key={entry.rank} className={`spectator-ranking rank-${entry.rank}`}>
                  <span className="rank">{entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}</span>
                  <span className="name">{entry.name}</span>
                  <span className="score">{entry.score} Punkte</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Game - Question Grid */}
        {gameStatus === 'active' && !currentQuestion && questionGrid.length > 0 && (
          <div className="spectator-grid">
            <table className="spectator-questions-table">
              <thead>
                <tr>
                  {questionGrid.map((col, i) => (
                    <th key={i}>{col[0]?.category}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map(row => (
                  <tr key={row}>
                    {questionGrid.map((col, ci) => {
                      const cell = col[row]
                      if (!cell) return <td key={ci}></td>
                      return (
                        <td key={ci}>
                          <div className={`spectator-cell ${cell.used ? 'used' : ''} ${cell.isRisiko ? 'risiko' : ''}`}>
                            {cell.used ? '—' : cell.points}
                            {cell.isRisiko && !cell.used && <span className="risiko-badge">R</span>}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Active Game - Current Question */}
        {gameStatus === 'active' && currentQuestion && (
          <div className="spectator-question">
            <div className="spectator-question-meta">
              <span className="category">{currentQuestion.category}</span>
              <span className="points">{currentQuestion.points} Punkte</span>
              {currentQuestion.isRisiko && <span className="risiko">RISIKO</span>}
            </div>

            <div className={`spectator-timer ${timeRemaining <= 10 ? 'danger' : ''}`}>
              {timeRemaining}s
            </div>
            <div className="spectator-timer-bar">
              <div
                className={`spectator-timer-bar-fill ${timeRemaining <= 10 ? 'danger' : ''}`}
                style={{ width: `${(timeRemaining / currentQuestion.timeLimit) * 100}%` }}
              />
            </div>

            <h2 className="spectator-question-text">{currentQuestion.text}</h2>

            <div className="spectator-options">
              {currentQuestion.options.map((opt, i) => (
                <div
                  key={opt.id}
                  className={`spectator-option ${lastResult?.correctOptionId === opt.id ? 'correct' : ''}`}
                >
                  <span className="letter">{String.fromCharCode(65 + i)}</span>
                  <span className="text">{opt.text}</span>
                </div>
              ))}
            </div>

            {lastResult && (
              <div className={`spectator-result ${lastResult.isCorrect ? 'correct' : 'wrong'}`}>
                <strong>{lastResult.teamName}</strong>: {lastResult.isCorrect ? 'Richtig!' : 'Falsch!'}
                {' '}({lastResult.pointsAwarded >= 0 ? '+' : ''}{lastResult.pointsAwarded} Pkt.)
                {lastResult.wasRisiko && (lastResult.isCorrect ? ' — RISIKO gewonnen!' : ' — RISIKO verloren!')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SpectatorView
