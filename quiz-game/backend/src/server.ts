import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import path from 'path'
import { pool } from './database/connection.js'
import { GameEngine } from './models/GameEngine.js'
import adminRoutes from './routes/admin.js'

const app = express()
const httpServer = createServer(app)

// Load environment variables
const PORT = process.env.PORT || 3001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// Middleware
app.use(cors({ origin: CLIENT_URL }))
app.use(express.json())

// Create uploads directory
import fs from 'fs'
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// Initialize Game Engine
const gameEngine = new GameEngine()

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
})

// AUTH ROUTES

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    // Default admin credentials for first setup
    if (username === 'admin' && password === 'admin123') {
      // Check if admin exists in database
      let result = await pool.query(
        "SELECT id, username, role FROM users WHERE username = 'admin'"
      )
      
      if (result.rows.length === 0) {
        // Create default admin
        const hashedPassword = await bcrypt.hash('admin123', 10)
        result = await pool.query(
          "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role",
          ['admin', 'admin@quiz-arena.local', hashedPassword, 'admin']
        )
      }
      
      const user = result.rows[0]
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '24h' }
      )
      
      return res.json({ user, token })
    }
    
    // Regular database authentication
    const result = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1 AND role = 'admin'",
      [username]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid admin credentials' })
    }
    
    const user = result.rows[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' })
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    )
    
    res.json({ 
      user: { id: user.id, username: user.username, role: user.role }, 
      token 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
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

// Admin routes
app.use('/api/admin', adminRoutes)

// Public routes (limited)
app.get('/api/games/public', (req, res) => {
  const games = gameEngine.getAllGames()
    .filter(game => game.status === 'waiting')
    .map(game => ({
      gameCode: game.gameCode,
      name: game.name,
      teams: game.teams.size,
      maxTeams: game.maxTeams
    }))
  res.json(games)
})

// WebSocket Event Handlers - SIMPLIFIED (no game creation here)
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`)
  
  // Join existing game only
  socket.on('join_game', async (data) => {
    try {
      const { gameCode, teamName, teamColor } = data
      const game = gameEngine.getGame(gameCode)
      
      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden. Spiel muss vom Admin erstellt werden.' })
        return
      }
      
      const teamId = gameEngine.addTeam(gameCode, teamName, teamColor)
      
      socket.join(gameCode)
      socket.join(`team-${teamId}`)
      
      socket.emit('joined_game', { teamId, gameCode })
      
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
  
  // Rest of the socket handlers (select_question, submit_answer, use_joker) stay the same
  // ... (previous socket implementation)
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`)
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Quiz Arena Server running on port ${PORT}`)
  console.log(`📊 Frontend URL: ${CLIENT_URL}`)
  console.log(`🔐 Admin login: admin / admin123`)
})
