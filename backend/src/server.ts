import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { pool } from './database/connection.js'
import { GameEngine } from './models/GameEngine.js'

const app = express()
const httpServer = createServer(app)

// Load environment variables
const PORT = process.env.PORT || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// Middleware
app.use(cors({ origin: CLIENT_URL }))
app.use(express.json())

// Initialize Game Engine
const gameEngine = new GameEngine()

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
})

// REST API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Quiz Arena Backend läuft!',
    games: gameEngine.getAllGames().length
  })
})

app.get('/api/games', (req, res) => {
  const games = gameEngine.getAllGames().map(game => ({
    gameCode: game.gameCode,
    name: game.name,
    status: game.status,
    teams: game.teams.size,
    maxTeams: game.maxTeams
  }))
  res.json(games)
})

// WebSocket Event Handlers
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)
  
  // Create Game
  socket.on('create_game', async (data) => {
    try {
      const { gameName, settings } = data
      const gameCode = gameEngine.createGame(gameName, settings)
      
      // Save to database
      await pool.query(
        `INSERT INTO game_sessions (name, game_code, max_teams, joker_count, risiko_enabled) 
         VALUES ($1, $2, $3, $4, $5)`,
        [gameName, gameCode, settings.maxTeams, settings.jokerCount, settings.risikoEnabled]
      )
      
      socket.join(gameCode)
      socket.emit('game_created', { gameCode })
      
      console.log(`🎮 Game ${gameCode} created: ${gameName}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })
  
  // Join Game
  socket.on('join_game', async (data) => {
    try {
      const { gameCode, teamName, teamColor } = data
      const game = gameEngine.getGame(gameCode)
      
      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden' })
        return
      }
      
      const teamId = gameEngine.addTeam(gameCode, teamName, teamColor)
      
      socket.join(gameCode)
      socket.join(`team-${teamId}`)
      
      // Send team info to joiner
      socket.emit('joined_game', { teamId, gameCode })
      
      // Broadcast updated game state to all players
      const gameState = {
        teams: Array.from(game.teams.values()),
        status: game.status,
        questionGrid: game.questionGrid
      }
      
      io.to(gameCode).emit('game_state_updated', gameState)
      
      console.log(`👥 Team ${teamName} joined game ${gameCode}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })
  
  // Select Question
  socket.on('select_question', async (data) => {
    try {
      const { gameCode, questionId } = data
      const game = gameEngine.getGame(gameCode)
      
      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden' })
        return
      }
      
      const [catIndex, pointIndex] = questionId.split('-').map(Number)
      const cell = game.questionGrid[catIndex][pointIndex]
      
      if (cell.used) {
        socket.emit('error', { message: 'Frage bereits verwendet' })
        return
      }
      
      cell.used = true
      
      // Get random question from database
      const result = await pool.query(
        `SELECT q.*, array_agg(json_build_object('id', qo.id, 'text', qo.option_text, 'is_correct', qo.is_correct) ORDER BY qo.sort_order) as options
         FROM questions q
         JOIN question_options qo ON q.id = qo.question_id
         WHERE q.category_id = $1 AND q.points = $2
         GROUP BY q.id
         ORDER BY RANDOM()
         LIMIT 1`,
        [catIndex + 1, cell.points]
      )
      
      if (result.rows.length === 0) {
        // Fallback question
        const question = {
          id: Date.now(),
          question_text: `${cell.category} Frage für ${cell.points} Punkte`,
          points: cell.points,
          time_limit: 30,
          is_risiko: cell.isRisiko,
          options: [
            { id: 1, text: 'Antwort A', is_correct: true },
            { id: 2, text: 'Antwort B', is_correct: false },
            { id: 3, text: 'Antwort C', is_correct: false },
            { id: 4, text: 'Antwort D', is_correct: false }
          ]
        }
        game.currentQuestion = question
      } else {
        const dbQuestion = result.rows[0]
        game.currentQuestion = {
          ...dbQuestion,
          is_risiko: cell.isRisiko // Override with grid setting
        }
      }
      
      // Reset active jokers
      game.activeJokers = {
        doublePoints: false,
        extraTime: false,
        fiftyFifty: false
      }
      
      // Send question to all players
      io.to(gameCode).emit('question_selected', {
        question: {
          id: game.currentQuestion.id,
          text: game.currentQuestion.question_text,
          category: cell.category,
          points: cell.points,
          isRisiko: game.currentQuestion.is_risiko,
          timeLimit: game.currentQuestion.time_limit || 30,
          options: game.currentQuestion.options.map(opt => ({ 
            id: opt.id, 
            text: opt.text 
          }))
        },
        questionGrid: game.questionGrid
      })
      
      console.log(`❓ Question selected in game ${gameCode}: ${cell.category} ${cell.points}`)
    } catch (error) {
      console.error('Question selection error:', error)
      socket.emit('error', { message: 'Fehler beim Laden der Frage' })
    }
  })
  
  // Submit Answer
  socket.on('submit_answer', (data) => {
    try {
      const { gameCode, teamId, answerId, timeRemaining } = data
      const game = gameEngine.getGame(gameCode)
      
      if (!game || !game.currentQuestion) {
        socket.emit('error', { message: 'Keine aktive Frage' })
        return
      }
      
      const team = game.teams.get(teamId)
      if (!team) {
        socket.emit('error', { message: 'Team nicht gefunden' })
        return
      }
      
      const correctOption = game.currentQuestion.options.find(opt => opt.is_correct)
      const isCorrect = answerId === correctOption.id
      
      let pointsAwarded = 0
      if (isCorrect) {
        pointsAwarded = game.currentQuestion.points
        
        // Apply double points joker
        if (game.activeJokers?.doublePoints) {
          pointsAwarded *= 2
          console.log(`🃏 Double points applied! ${pointsAwarded} points`)
        }
        
        // Time bonus (only if no extra time joker was used)
        if (timeRemaining > 20 && !game.activeJokers?.extraTime) {
          const timeBonus = Math.floor(game.currentQuestion.points * 0.2)
          pointsAwarded += timeBonus
          console.log(`⏰ Time bonus: +${timeBonus} points`)
        }
        
        // Risiko multiplier
        if (game.currentQuestion.is_risiko) {
          pointsAwarded *= 2
          console.log(`🎯 RISIKO! Points doubled to ${pointsAwarded}`)
        }
        
        team.score += pointsAwarded
      } else if (game.currentQuestion.is_risiko) {
        // Lose points on wrong risiko answer
        const pointsLost = Math.floor(game.currentQuestion.points / 2)
        team.score = Math.max(0, team.score - pointsLost)
        pointsAwarded = -pointsLost
        console.log(`💥 RISIKO failed! Lost ${pointsLost} points`)
      }
      
      // Broadcast result
      io.to(gameCode).emit('answer_result', {
        teamId,
        teamName: team.name,
        isCorrect,
        pointsAwarded,
        correctAnswerId: correctOption.id,
        newScore: team.score,
        teams: Array.from(game.teams.values()),
        wasRisiko: game.currentQuestion.is_risiko,
        wasDoublePoints: game.activeJokers?.doublePoints || false
      })
      
      // Clear current question and jokers
      game.currentQuestion = null
      game.activeJokers = {
        doublePoints: false,
        extraTime: false,
        fiftyFifty: false
      }
      
      console.log(`💯 Answer submitted: ${team.name} ${isCorrect ? 'correct' : 'wrong'} (${pointsAwarded >= 0 ? '+' : ''}${pointsAwarded})`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })
  
  // Use Joker - ENHANCED
  socket.on('use_joker', (data) => {
    try {
      const { gameCode, teamId, jokerType } = data
      const game = gameEngine.getGame(gameCode)
      const team = game?.teams.get(teamId)
      
      if (!team || team.jokersRemaining <= 0) {
        socket.emit('error', { message: 'Keine Joker verfügbar' })
        return
      }
      
      if (!game.currentQuestion) {
        socket.emit('error', { message: 'Joker nur während einer Frage verwendbar' })
        return
      }
      
      team.jokersRemaining--
      
      let effect = {}
      switch (jokerType) {
        case 'double_points':
          game.activeJokers = game.activeJokers || {}
          game.activeJokers.doublePoints = true
          effect = { 
            type: 'double_points', 
            message: 'Nächste richtige Antwort zählt doppelt!',
            teamEffect: true
          }
          break
          
        case 'extra_time':
          game.activeJokers = game.activeJokers || {}
          game.activeJokers.extraTime = true
          effect = { 
            type: 'extra_time', 
            message: '+20 Sekunden für alle Teams!',
            globalEffect: true,
            timeBonus: 20
          }
          break
          
        case '50_50':
          game.activeJokers = game.activeJokers || {}
          game.activeJokers.fiftyFifty = true
          
          // Find two wrong answers to eliminate
          const wrongOptions = game.currentQuestion.options.filter(opt => !opt.is_correct)
          const toEliminate = wrongOptions.slice(0, 2).map(opt => opt.id)
          
          effect = { 
            type: '50_50', 
            message: 'Zwei falsche Antworten eliminiert!',
            globalEffect: true,
            eliminatedOptions: toEliminate
          }
          break
      }
      
      io.to(gameCode).emit('joker_used', {
        teamId,
        teamName: team.name,
        jokerType,
        effect,
        jokersRemaining: team.jokersRemaining
      })
      
      console.log(`🃏 Joker used: ${team.name} - ${jokerType}`)
    } catch (error) {
      socket.emit('error', { message: error.message })
    }
  })
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Quiz Arena Server running on port ${PORT}`)
  console.log(`📊 Frontend URL: ${CLIENT_URL}`)
})
