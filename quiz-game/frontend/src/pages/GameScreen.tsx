import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const GameScreen = () => {
  const navigate = useNavigate()
  const {
    socket,
    gameCode,
    teamId,
    teams,
    currentQuestion,
    questionGrid,
    gameStatus,
    gameMode,
    answerMode,
    activeTeamId,
    selectedAnswer,
    timeRemaining,
    showResults,
    rankings,
    updateGameState
  } = useGameStore()

  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([])
  const [activeJokerEffects, setActiveJokerEffects] = useState({
    doublePoints: false,
    extraTime: false,
    fiftyFifty: false
  })
  const [notifications, setNotifications] = useState<Array<{
    id: number,
    message: string,
    type: 'success' | 'error' | 'info' | 'joker'
  }>>([])

  // Declare early so it's available in all hooks below
  const isAuthenticated = !!localStorage.getItem('adminUser')

  // Gamemaster/admin: join game room as spectator-controller when no teamId
  useEffect(() => {
    if (!gameCode || !socket) {
      // Authenticated users (gamemaster) may not have a teamId but still need the screen
      if (!isAuthenticated) navigate('/')
      return
    }

    if (isAuthenticated && !teamId) {
      socket.emit('spectate_game', { gameCode })

      const handleSpectateJoined = (data: {
        teams: { id: string; name: string; color: string; score: number; jokersRemaining: number }[]
        status: 'waiting' | 'active' | 'finished'
        questionGrid: { id: string; category: string; points: number; used: boolean; isRisiko: boolean }[][]
        gameMode: 'quizmaster' | 'self_service'
        answerMode?: 'competitive' | 'turns'
        activeTeamId?: string | null
      }) => {
        updateGameState({
          teams: data.teams,
          gameStatus: data.status,
          questionGrid: data.questionGrid || [],
          gameMode: data.gameMode,
          answerMode: data.answerMode || 'competitive',
          activeTeamId: data.activeTeamId || null,
        })
      }

      socket.on('spectate_joined', handleSpectateJoined)
      return () => { socket.off('spectate_joined', handleSpectateJoined) }
    }
  // Only re-run when socket connection or game code changes, not on every state update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameCode, socket])

  useEffect(() => {
    if (!gameCode || !socket) return

    socket.on('joker_used', (data) => {
      if (data.effect.type === 'extra_time' && data.effect.globalEffect) {
        const current = useGameStore.getState().timeRemaining
        updateGameState({ timeRemaining: current + (data.effect.timeBonus || 20) })
        setActiveJokerEffects(prev => ({ ...prev, extraTime: true }))
        showNotification(`${data.teamName} gab allen +20 Sekunden!`, 'joker')
      }

      if (data.effect.type === '50_50' && data.effect.globalEffect) {
        setEliminatedOptions(data.effect.eliminatedOptions || [])
        setActiveJokerEffects(prev => ({ ...prev, fiftyFifty: true }))
        showNotification(`${data.teamName} eliminierte 2 falsche Antworten!`, 'joker')
      }

      if (data.effect.type === 'double_points' && data.teamId === teamId) {
        setActiveJokerEffects(prev => ({ ...prev, doublePoints: true }))
        showNotification('Doppelte Punkte aktiviert!', 'success')
      }
    })

    socket.on('answer_result', (data) => {
      updateGameState({
        teams: data.teams,
        showResults: true
      })

      const isMyTeam = data.teamId === teamId
      const resultText = data.isCorrect ? 'Richtig!' : 'Falsch!'
      const pointsText = data.pointsAwarded !== 0 ? ` (${data.pointsAwarded >= 0 ? '+' : ''}${data.pointsAwarded} Punkte)` : ''

      let message = `${data.teamName}: ${resultText}${pointsText}`
      if (data.wasRisiko) {
        message += data.isCorrect ? ' RISIKO gewonnen!' : ' RISIKO verloren!'
      }

      showNotification(message, isMyTeam ? (data.isCorrect ? 'success' : 'error') : 'info')
    })

    socket.on('turn_changed', (data: { activeTeamId: string }) => {
      updateGameState({ activeTeamId: data.activeTeamId })
      const nextTeam = useGameStore.getState().teams.find(t => t.id === data.activeTeamId)
      if (nextTeam) {
        const isMe = data.activeTeamId === useGameStore.getState().teamId
        showNotification(
          isMe ? '🎯 Du bist dran!' : `${nextTeam.name} ist an der Reihe`,
          isMe ? 'success' : 'info'
        )
      }
    })

    socket.on('game_started', (data: any) => {
      updateGameState({
        gameStatus: data.status,
        teams: data.teams,
        questionGrid: data.questionGrid || [],
        gameMode: data.gameMode,
        answerMode: data.answerMode || 'competitive',
        activeTeamId: data.activeTeamId || null,
      })
    })

    return () => {
      socket.off('joker_used')
      socket.off('answer_result')
      socket.off('turn_changed')
      socket.off('game_started')
    }
  }, [socket, gameCode, teamId, navigate, updateGameState])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    if (currentQuestion && timeRemaining > 0 && !showResults) {
      timer = setTimeout(() => {
        updateGameState({ timeRemaining: timeRemaining - 1 })
      }, 1000)
    }
    return () => clearTimeout(timer)
  }, [currentQuestion, timeRemaining, showResults, updateGameState])

  useEffect(() => {
    if (currentQuestion) {
      setEliminatedOptions([])
      setActiveJokerEffects({ doublePoints: false, extraTime: false, fiftyFifty: false })
    }
  }, [currentQuestion])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'joker') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }

  const handleQuestionSelect = (questionId: string) => {
    if (!socket || currentQuestion) return
    socket.emit('select_question', { gameCode, questionId, teamId })
  }

  const handleAnswerSelect = (answerId: number) => {
    if (!showResults && !eliminatedOptions.includes(answerId)) {
      updateGameState({ selectedAnswer: answerId })
    }
  }

  const handleAnswerSubmit = () => {
    if (!socket || selectedAnswer === null) return
    socket.emit('submit_answer', { gameCode, teamId, answerId: selectedAnswer, timeRemaining })
  }

  const handleJokerUse = (jokerType: string) => {
    if (!socket) return
    socket.emit('use_joker', { gameCode, teamId, jokerType })
  }

  const currentTeam = teams.find(team => team.id === teamId)
  const activeTeam = answerMode === 'turns' ? teams.find(t => t.id === activeTeamId) : null
  const isMyTurn = answerMode !== 'turns' || activeTeamId === teamId || isAuthenticated

  const MEDALS = ['🥇', '🥈', '🥉']

  // Game finished screen
  if (gameStatus === 'finished') {
    const finalRankings = rankings.length > 0
      ? rankings
      : [...teams].sort((a, b) => b.score - a.score).map((t, i) => ({ name: t.name, score: t.score, rank: i + 1 }))
    return (
      <div className="game-screen">
        <div className="game-finished">
          <div className="game-finished-inner">
            <div className="finished-title">🏆 Spiel beendet!</div>
            <div className="rankings">
              {finalRankings.map((entry) => (
                <div key={entry.rank} className={`ranking-entry rank-${entry.rank}`}>
                  <span className="rank-icon">{MEDALS[entry.rank - 1] ?? `#${entry.rank}`}</span>
                  <span className="ranking-name">{entry.name}</span>
                  <span className="ranking-score">{entry.score} Punkte</span>
                </div>
              ))}
            </div>
            <button className="btn-home" onClick={() => navigate('/')}>
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Waiting screen
  if (teams.length === 0 || gameStatus === 'waiting') {
    return (
      <div className="game-screen">
        <div className="game-header">
          <div className="game-info">
            <span className="game-code">Code: {gameCode}</span>
          </div>
          <button className="leave-btn" onClick={() => navigate('/')}>
            Verlassen
          </button>
        </div>

        <div className="waiting-screen">
          <h2>Warte auf Spielstart...</h2>
          <p>Spielcode: <strong>{gameCode}</strong></p>
          <p>Teile den Code mit anderen Spielern!</p>

          {teams.length > 0 && (
            <div className="waiting-teams">
              <p className="waiting-teams-label">Beigetreten ({teams.length}):</p>
              <div className="waiting-teams-list">
                {teams.map(team => (
                  <div key={team.id} className="waiting-team" style={{ background: team.color + '22', borderColor: team.color, color: team.color }}>
                    {team.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAuthenticated && (
            <button
              className="btn-start-game"
              onClick={() => socket?.emit('start_game', { gameCode })}
              disabled={teams.length < 1}
            >
              Spiel starten ({teams.length} Teams)
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="game-header">
        <div className="game-info">
          <span className="game-code">Code: {gameCode}</span>
          {currentTeam && (
            <span className="team-info" style={{ color: currentTeam.color }}>
              {currentTeam.name}
            </span>
          )}
        </div>

        <div className="timer-container">
          {currentQuestion && (
            <>
              <div className={`timer ${timeRemaining <= 10 ? 'danger' : ''} ${activeJokerEffects.extraTime ? 'bonus' : ''}`}>
                {timeRemaining}s
              </div>
              <div className="timer-bar">
                <div
                  className={`timer-bar-fill ${timeRemaining <= 10 ? 'danger' : ''}`}
                  style={{ width: `${(timeRemaining / currentQuestion.timeLimit) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="active-effects">
          {activeJokerEffects.doublePoints && currentTeam && (
            <span className="effect-badge double-points">2x Punkte</span>
          )}
          {activeJokerEffects.fiftyFifty && (
            <span className="effect-badge fifty-fifty">50/50</span>
          )}
        </div>

        {isAuthenticated && (
          <button
            className="btn-end-game"
            onClick={() => {
              if (confirm('Spiel wirklich beenden?')) {
                socket?.emit('end_game', { gameCode })
              }
            }}
          >
            Spiel beenden
          </button>
        )}
        <button className="leave-btn" onClick={() => navigate('/')}>
          Verlassen
        </button>
      </div>

      {/* Turn Indicator */}
      {answerMode === 'turns' && activeTeam && (
        <div
          className={`turn-indicator ${isMyTurn ? 'your-turn' : ''}`}
          style={{ borderColor: activeTeam.color }}
        >
          <span className="turn-indicator-label">
            {isMyTurn ? '🎯 Du bist dran!' : `${activeTeam.name} ist an der Reihe`}
          </span>
          <span className="turn-indicator-dot" style={{ background: activeTeam.color }} />
        </div>
      )}

      {/* Teams Display */}
      <div className="teams-display">
        {teams.map((team) => (
          <div
            key={team.id}
            className={`team-card ${team.id === teamId ? 'current-team' : ''} ${answerMode === 'turns' && team.id === activeTeamId ? 'active-turn-team' : ''}`}
            style={{ '--team-color': team.color } as React.CSSProperties}
          >
            <div className="team-color-bar" style={{ background: team.color }} />
            {team.id === teamId && <span className="your-team-badge">DU</span>}
            <h3 className="team-name" style={{ color: team.color }}>{team.name}</h3>
            <div className="team-score-wrap">
              <span className="team-score-value">{team.score}</span>
              <span className="team-score-label">Pkt</span>
            </div>
            <div className="team-jokers">
              {team.jokersRemaining > 0
                ? Array.from({ length: team.jokersRemaining }).map((_, i) => <span key={i} className="joker-star">★</span>)
                : <span className="no-jokers-text">Keine Joker</span>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Main Game Area */}
      {!currentQuestion ? (
        /* Question Grid */
        <div className="question-grid">
          <div className="grid-header">
            {gameMode === 'quizmaster' && !isAuthenticated ? (
              <h2>Warte auf den Quizmaster…</h2>
            ) : answerMode === 'turns' && !isMyTurn ? (
              <h2>Warte auf {activeTeam?.name ?? 'das aktive Team'}…</h2>
            ) : (
              <h2>Wähle eine Kategorie und Punkte</h2>
            )}
          </div>

          {(gameMode === 'self_service' || isAuthenticated) && questionGrid.length > 0 && (
            <div className="grid-container">
              <table className="questions-table">
                <thead>
                  <tr>
                    {questionGrid.map((row, index) => (
                      <th key={index} className="category-header">
                        {row[0]?.category}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3, 4].map((pointIndex) => (
                    <tr key={pointIndex}>
                      {questionGrid.map((row, catIndex) => {
                        const cell = row[pointIndex]
                        if (!cell) return <td key={catIndex}></td>

                        return (
                          <td key={catIndex}>
                            <button
                              className={`question-cell ${cell.used ? 'used' : ''} ${cell.isRisiko ? 'risiko' : ''}`}
                              onClick={() => handleQuestionSelect(cell.id)}
                              disabled={cell.used || (!isMyTurn && !isAuthenticated)}
                              title={cell.isRisiko ? 'RISIKO Frage!' : (!isMyTurn && !isAuthenticated ? 'Nicht dein Zug' : '')}
                            >
                              {!cell.used && <div className="cell-points">{cell.points}</div>}
                              {cell.isRisiko && !cell.used && <span className="risiko-badge">⚡ RISIKO</span>}
                              {cell.used && <span className="used-check">✓</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Question Display */
        <div className="question-display">
          <div className="question-header">
            <span className="q-badge q-category">{currentQuestion.category}</span>
            <span className="q-badge q-points">
              {currentQuestion.points} Punkte{activeJokerEffects.doublePoints && currentTeam && ' ×2'}
            </span>
            {currentQuestion.isRisiko && <span className="q-badge q-risiko">⚡ RISIKO</span>}
          </div>

          <h2 className="question-text">{currentQuestion.text}</h2>

          <div className="options-grid">
            {currentQuestion.options.map((option, index) => {
              const isEliminated = eliminatedOptions.includes(option.id)

              return (
                <button
                  key={option.id}
                  className={`option-button ${selectedAnswer === option.id ? 'selected' : ''} ${showResults ? 'disabled' : ''} ${isEliminated ? 'eliminated' : ''}`}
                  onClick={() => handleAnswerSelect(option.id)}
                  disabled={showResults || timeRemaining === 0 || isEliminated}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">
                    {isEliminated ? '—' : option.text}
                  </span>
                </button>
              )
            })}
          </div>

          {!showResults && selectedAnswer !== null && timeRemaining > 0 && isMyTurn && (
            <button className="submit-answer" onClick={handleAnswerSubmit}>
              Antwort abgeben
              {activeJokerEffects.doublePoints && currentTeam && ' (Doppelte Punkte!)'}
            </button>
          )}

          {!showResults && !isMyTurn && timeRemaining > 0 && (
            <div className="waiting-for-turn">
              Warte auf {activeTeam?.name ?? 'das aktive Team'}…
            </div>
          )}

          {timeRemaining === 0 && !showResults && (
            <div className="time-up">
              <h3>Zeit abgelaufen!</h3>
            </div>
          )}

          {/* Joker Buttons */}
          {currentTeam && currentTeam.jokersRemaining > 0 && !showResults && timeRemaining > 0 && isMyTurn && (
            <div className="joker-controls">
              <h4>Joker verwenden ({currentTeam.jokersRemaining} verfügbar)</h4>
              <div className="joker-buttons">
                <button
                  className="joker-btn"
                  onClick={() => handleJokerUse('double_points')}
                  disabled={activeJokerEffects.doublePoints}
                >
                  Doppelte Punkte {activeJokerEffects.doublePoints && '(aktiv)'}
                </button>
                <button
                  className="joker-btn"
                  onClick={() => handleJokerUse('extra_time')}
                >
                  Extra Zeit (+20s)
                </button>
                <button
                  className="joker-btn"
                  onClick={() => handleJokerUse('50_50')}
                  disabled={activeJokerEffects.fiftyFifty}
                >
                  50/50 {activeJokerEffects.fiftyFifty && '(aktiv)'}
                </button>
              </div>
            </div>
          )}

          {/* Results Display */}
          {showResults && (
            <div className="results-display">
              <h3>Ergebnisse</h3>
              <button
                className="continue-btn"
                onClick={() => updateGameState({ currentQuestion: null, showResults: false, selectedAnswer: null })}
              >
                Weiter zur nächsten Frage
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GameScreen
