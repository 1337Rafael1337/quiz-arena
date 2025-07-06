import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'

const GameScreen: React.FC = () => {
  const navigate = useNavigate()
  const {
    socket,
    gameCode,
    teamId,
    teams,
    currentQuestion,
    questionGrid,
    selectedAnswer,
    timeRemaining,
    showResults,
    updateGameState
  } = useGameStore()
  
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([])
  const [activeJokerEffects, setActiveJokerEffects] = useState({
    doublePoints: false,
    extraTime: false,
    fiftyFifty: false
  })
  
  useEffect(() => {
    if (!gameCode || !socket) {
      navigate('/')
      return
    }
    
    // Enhanced socket listeners for joker effects
    socket.on('joker_used', (data) => {
      console.log('🃏 Joker effect received:', data)
      
      if (data.effect.type === 'extra_time' && data.effect.globalEffect) {
        // Add 20 seconds to timer
        updateGameState({ timeRemaining: timeRemaining + (data.effect.timeBonus || 20) })
        setActiveJokerEffects(prev => ({ ...prev, extraTime: true }))
        
        // Show notification
        showNotification(`⏰ ${data.teamName} gab allen +20 Sekunden!`, 'joker')
      }
      
      if (data.effect.type === '50_50' && data.effect.globalEffect) {
        setEliminatedOptions(data.effect.eliminatedOptions || [])
        setActiveJokerEffects(prev => ({ ...prev, fiftyFifty: true }))
        
        showNotification(`✂️ ${data.teamName} eliminierte 2 falsche Antworten!`, 'joker')
      }
      
      if (data.effect.type === 'double_points' && data.teamId === teamId) {
        setActiveJokerEffects(prev => ({ ...prev, doublePoints: true }))
        showNotification(`🎯 Doppelte Punkte aktiviert!`, 'success')
      }
    })
    
    socket.on('answer_result', (data) => {
      console.log('💯 Answer result with effects:', data)
      
      updateGameState({ 
        teams: data.teams,
        showResults: true
      })
      
      // Show result notification
      const isMyTeam = data.teamId === teamId
      const resultText = data.isCorrect ? 'Richtig!' : 'Falsch!'
      const pointsText = data.pointsAwarded !== 0 ? ` (${data.pointsAwarded >= 0 ? '+' : ''}${data.pointsAwarded} Punkte)` : ''
      
      let message = `${data.teamName}: ${resultText}${pointsText}`
      
      if (data.wasRisiko) {
        message += data.isCorrect ? ' 🎯 RISIKO gewonnen!' : ' 💥 RISIKO verloren!'
      }
      
      if (data.wasDoublePoints && data.isCorrect) {
        message += ' 🃏 Doppelte Punkte!'
      }
      
      showNotification(message, isMyTeam ? (data.isCorrect ? 'success' : 'error') : 'info')
    })
    
    return () => {
      socket.off('joker_used')
      socket.off('answer_result')
    }
  }, [socket, gameCode, teamId, timeRemaining, navigate, updateGameState])
  
  useEffect(() => {
    // Timer countdown
    let timer: number
    if (currentQuestion && timeRemaining > 0 && !showResults) {
      timer = setTimeout(() => {
        updateGameState({ timeRemaining: timeRemaining - 1 })
      }, 1000)
    }
    
    return () => clearTimeout(timer)
  }, [currentQuestion, timeRemaining, showResults, updateGameState])
  
  // Reset joker effects when new question starts
  useEffect(() => {
    if (currentQuestion) {
      setEliminatedOptions([])
      setActiveJokerEffects({
        doublePoints: false,
        extraTime: false,
        fiftyFifty: false
      })
    }
  }, [currentQuestion])
  
  const [notifications, setNotifications] = useState<Array<{
    id: number,
    message: string,
    type: 'success' | 'error' | 'info' | 'joker'
  }>>([])
  
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'joker') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 5000)
  }
  
  const handleQuestionSelect = (questionId: string) => {
    if (!socket || currentQuestion) return
    
    console.log('📝 Selecting question:', questionId)
    socket.emit('select_question', {
      gameCode,
      questionId,
      teamId
    })
  }
  
  const handleAnswerSelect = (answerId: number) => {
    if (!showResults && !eliminatedOptions.includes(answerId)) {
      updateGameState({ selectedAnswer: answerId })
    }
  }
  
  const handleAnswerSubmit = () => {
    if (!socket || selectedAnswer === null) return
    
    console.log('📤 Submitting answer:', selectedAnswer)
    socket.emit('submit_answer', {
      gameCode,
      teamId,
      answerId: selectedAnswer,
      timeRemaining
    })
  }
  
  const handleJokerUse = (jokerType: string) => {
    if (!socket) return
    
    console.log('🃏 Using joker:', jokerType)
    socket.emit('use_joker', {
      gameCode,
      teamId,
      jokerType
    })
  }
  
  const currentTeam = teams.find(team => team.id === teamId)
  
  // Show waiting screen if no teams yet
  if (teams.length === 0) {
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
          <h2>🎮 Warte auf Teams...</h2>
          <p>Spielcode: <strong>{gameCode}</strong></p>
          <p>Teile den Code mit anderen Spielern!</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="game-screen">
      {/* Notifications */}
      <div className="notifications">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`notification ${notification.type}`}
          >
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
            <div className={`timer ${timeRemaining <= 10 ? 'danger' : ''} ${activeJokerEffects.extraTime ? 'bonus' : ''}`}>
              {timeRemaining}s
              {activeJokerEffects.extraTime && <span className="timer-bonus">+⏰</span>}
            </div>
          )}
        </div>
        
        <div className="active-effects">
          {activeJokerEffects.doublePoints && currentTeam && (
            <span className="effect-badge double-points">🎯 2x Punkte</span>
          )}
          {activeJokerEffects.fiftyFifty && (
            <span className="effect-badge fifty-fifty">✂️ 50/50</span>
          )}
        </div>
        
        <button className="leave-btn" onClick={() => navigate('/')}>
          Verlassen
        </button>
      </div>
      
      {/* Teams Display */}
      <div className="teams-display">
        {teams.map((team) => (
          <div 
            key={team.id} 
            className={`team-card ${team.id === teamId ? 'current-team' : ''}`}
            style={{ borderColor: team.color }}
          >
            <h3 style={{ color: team.color }}>{team.name}</h3>
            <div className="score">{team.score}</div>
            <div className="jokers">
              <span className="joker-label">Joker:</span>
              {Array.from({ length: team.jokersRemaining }).map((_, i) => (
                <span key={i} className="joker-icon">🃏</span>
              ))}
              {team.jokersRemaining === 0 && <span className="no-jokers">❌</span>}
            </div>
          </div>
        ))}
      </div>
      
      {/* Main Game Area */}
      {!currentQuestion ? (
        /* Question Grid */
        <div className="question-grid">
          <div className="grid-header">
            <h2>Wähle eine Kategorie und Punkte</h2>
            {questionGrid.length === 0 && (
              <p>Lade Fragen-Grid...</p>
            )}
          </div>
          
          <div className="grid-container">
            {questionGrid.length > 0 && (
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
                              disabled={cell.used}
                              title={cell.isRisiko ? 'RISIKO Frage!' : ''}
                            >
                              <div className="points">{cell.points}</div>
                              {cell.isRisiko && <span className="risiko-badge">RISIKO</span>}
                              {cell.used && <span className="used-badge">✓</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Question Display */
        <div className="question-display">
          <div className="question-header">
            <span className="category">{currentQuestion.category}</span>
            <span className="points">
              {currentQuestion.points} Punkte
              {activeJokerEffects.doublePoints && currentTeam && ' × 2'}
            </span>
            {currentQuestion.isRisiko && <span className="risiko-label">🎯 RISIKO</span>}
          </div>
          
          <h2 className="question-text">{currentQuestion.text}</h2>
          
          <div className="options-grid">
            {currentQuestion.options.map((option, index) => {
              const isEliminated = eliminatedOptions.includes(option.id)
              
              return (
                <button
                  key={option.id}
                  className={`option-button ${selectedAnswer === option.id ? 'selected' : ''} ${showResults ? (option.id === selectedAnswer ? 'revealed' : 'disabled') : ''} ${isEliminated ? 'eliminated' : ''}`}
                  onClick={() => handleAnswerSelect(option.id)}
                  disabled={showResults || timeRemaining === 0 || isEliminated}
                  style={{ opacity: isEliminated ? 0.3 : 1 }}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">
                    {isEliminated ? '❌ Eliminiert' : option.text}
                  </span>
                </button>
              )
            })}
          </div>
          
          {!showResults && selectedAnswer !== null && timeRemaining > 0 && (
            <button className="submit-answer" onClick={handleAnswerSubmit}>
              Antwort abgeben
              {activeJokerEffects.doublePoints && currentTeam && ' (🎯 Doppelte Punkte!)'}
            </button>
          )}
          
          {timeRemaining === 0 && !showResults && (
            <div className="time-up">
              <h3>⏰ Zeit abgelaufen!</h3>
              <p>Warte auf andere Teams...</p>
            </div>
          )}
          
          {/* Joker Buttons */}
          {currentTeam && currentTeam.jokersRemaining > 0 && !showResults && timeRemaining > 0 && (
            <div className="joker-controls">
              <h4>🃏 Joker verwenden ({currentTeam.jokersRemaining} verfügbar)</h4>
              <div className="joker-buttons">
                <button 
                  className="joker-btn"
                  onClick={() => handleJokerUse('double_points')}
                  title="Nächste richtige Antwort zählt doppelt"
                  disabled={activeJokerEffects.doublePoints}
                >
                  🎯 Doppelte Punkte
                  {activeJokerEffects.doublePoints && ' ✓'}
                </button>
                <button 
                  className="joker-btn"
                  onClick={() => handleJokerUse('extra_time')}
                  title="20 Sekunden extra Zeit für alle"
                >
                  ⏰ Extra Zeit (+20s)
                </button>
                <button 
                  className="joker-btn"
                  onClick={() => handleJokerUse('50_50')}
                  title="Zwei falsche Antworten eliminieren"
                  disabled={activeJokerEffects.fiftyFifty}
                >
                  ✂️ 50/50
                  {activeJokerEffects.fiftyFifty && ' ✓'}
                </button>
              </div>
            </div>
          )}
          
          {/* Results Display */}
          {showResults && (
            <div className="results-display">
              <h3>📊 Ergebnisse</h3>
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
