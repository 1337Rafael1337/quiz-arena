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
import userRoutes from './routes/user.js'
import { sanitizeInput, isValidEmail, isValidUsername } from './utils/sanitize.js'

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

// Check if setup is required
app.get('/api/auth/setup-status', async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    const adminCount = parseInt(result.rows[0].count)
    
    res.json({ 
      setupRequired: adminCount === 0,
      hasAdmins: adminCount > 0
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Initial admin setup
app.post('/api/auth/setup-admin', async (req, res) => {
  try {
    const { username, email, password } = req.body
    
    // Check if any admin already exists
    const adminCheck = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    if (parseInt(adminCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Admin already exists. Setup not allowed.' })
    }
    
    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username)
    const sanitizedEmail = sanitizeInput(email)
    
    // Validate input
    if (!sanitizedUsername || !sanitizedEmail || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' })
    }
    
    if (!isValidUsername(sanitizedUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens' })
    }
    
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }
    
    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      })
    }
    
    // Check if username or email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [sanitizedUsername, sanitizedEmail]
    )
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' })
    }
    
    // Create admin user
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role",
      [sanitizedUsername, sanitizedEmail, hashedPassword, 'admin']
    )
    
    const user = result.rows[0]
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable not set!')
      return res.status(500).json({ error: 'Server configuration error' })
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    )
    
    console.log(`🔐 Initial admin created: ${username}`)
    res.json({ user, token })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Login for all users (admin and regular users)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    
    // Get user from database
    const result = await pool.query(
      "SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = $1",
      [username]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const user = result.rows[0]
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' })
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable not set!')
      return res.status(500).json({ error: 'Server configuration error' })
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    )
    
    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        role: user.role 
      }, 
      token 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Register new user (only admins can create users)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body
    const authHeader = req.headers.authorization
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' })
    }
    
    const token = authHeader.split(' ')[1]
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET environment variable not set!')
      return res.status(500).json({ error: 'Server configuration error' })
    }
    
    const decoded = jwt.verify(token, jwtSecret)
    
    // Only admins can create new users
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create new users' })
    }
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' })
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }
    
    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return res.status(400).json({ 
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
      })
    }
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    
    // Check if username or email already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    )
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' })
    }
    
    // Create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at",
      [username, email, hashedPassword, role]
    )
    
    const newUser = result.rows[0]
    console.log(`👤 New ${role} created: ${username} by admin ${decoded.userId}`)
    
    res.json({ 
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at
      }
    })
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
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

// User routes
app.use('/api/user', userRoutes)

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
