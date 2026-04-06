import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import fs from 'fs'
import { config } from './config.js'
import { pool } from './database/connection.js'
import { GameEngine } from './models/GameEngine.js'
import { createAdminRouter } from './routes/admin.js'
import { createGamemasterRouter } from './routes/gamemaster.js'
import { authenticateToken } from './middleware/auth.js'
import { errorHandler } from './middleware/errorHandler.js'
import { escapeHtml } from './utils/sanitize.js'
import { sendVerificationEmail, sendPasswordResetEmail } from './services/email.js'
import { logAudit } from './utils/audit.js'

const app = express()
const httpServer = createServer(app)

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for SPA compatibility
}))

// Trust proxy (behind Nginx in Docker)
app.set('trust proxy', 1)

const corsOptions = {
  origin: config.CLIENT_URL,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}
app.use(cors(corsOptions))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))

// Cookie options for the auth token
const AUTH_COOKIE = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: config.NODE_ENV === 'production',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
}

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Zu viele Versuche. Bitte warte eine Minute.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', generalLimiter)

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

// Initialize Game Engine
const io = new Server(httpServer, { cors: corsOptions })

const gameEngine = new GameEngine(pool, io)

// Parse cookies from a cookie header string
function parseCookies(cookieStr: string): Record<string, string> {
  const out: Record<string, string> = {}
  cookieStr.split(';').forEach(part => {
    const [key, ...rest] = part.trim().split('=')
    if (key) out[key.trim()] = decodeURIComponent(rest.join('=').trim())
  })
  return out
}

// Socket.IO authentication middleware
io.use((socket, next) => {
  // Cookie-based auth (httpOnly cookie sent with upgrade request)
  const cookies = parseCookies(socket.handshake.headers.cookie || '')
  const token = cookies['authToken'] || socket.handshake.auth?.token // legacy fallback

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any
      socket.data.userId = decoded.userId
      socket.data.role = decoded.role
      socket.data.authenticated = true
    } catch {
      socket.data.authenticated = false
    }
  } else {
    socket.data.authenticated = false
  }

  next()
})

// AUTH ROUTES

// Check if setup is required
app.get('/api/auth/setup-status', async (req, res, next) => {
  try {
    const result = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    const adminCount = parseInt(result.rows[0].count)

    res.json({
      setupRequired: adminCount === 0,
      hasAdmins: adminCount > 0
    })
  } catch (error) {
    next(error)
  }
})

// Initial admin setup
app.post('/api/auth/setup-admin', loginLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body

    // Check if any admin already exists
    const adminCheck = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
    if (parseInt(adminCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Admin existiert bereits. Setup nicht erlaubt.' })
    }

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, Email und Passwort sind erforderlich' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username oder Email existiert bereits' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, true) RETURNING id, username, email, role",
      [escapeHtml(username), email, hashedPassword, 'admin']
    )

    const user = result.rows[0]
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    )

    console.log(`Initial admin created: ${username}`)
    res.cookie('authToken', token, AUTH_COOKIE)
    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// Login for all users
app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username und Passwort sind erforderlich' })
    }

    const result = await pool.query(
      "SELECT id, username, email, password_hash, role, is_active, email_verified FROM users WHERE username = $1",
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account ist deaktiviert' })
    }

    if (!user.email_verified) {
      return res.status(401).json({ error: 'Email wurde noch nicht bestätigt' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' })
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Track session
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 64)
    const ip = req.ip || req.socket.remoteAddress || ''
    const ua = req.headers['user-agent'] || ''
    await pool.query(
      'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
      [user.id, tokenHash, ip, ua]
    ).catch(() => {}) // Don't fail login if session tracking fails

    logAudit(user.id, user.username, 'login', 'user', user.id, null, ip)

    res.cookie('authToken', token, AUTH_COOKIE)
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    next(error)
  }
})

// Logout
app.post('/api/auth/logout', async (req: any, res, next) => {
  try {
    const token = req.cookies?.authToken
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex').substring(0, 64)
      await pool.query('DELETE FROM user_sessions WHERE token_hash = $1', [tokenHash]).catch(() => {})
    }
    res.clearCookie('authToken', { path: '/' })
    res.json({ message: 'Erfolgreich abgemeldet' })
  } catch (error) {
    next(error)
  }
})

// Register new user (only admins can create users)
app.post('/api/auth/register', authenticateToken, requireAdmin, async (req: any, res, next) => {
  try {
    const { username, email, password, role = 'user' } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, Email und Passwort sind erforderlich' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
    }

    if (!['admin', 'gamemaster', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Ungültige Rolle' })
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username oder Email existiert bereits' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, $4, true) RETURNING id, username, email, role, created_at",
      [escapeHtml(username), email, hashedPassword, role]
    )

    const newUser = result.rows[0]
    console.log(`New ${role} created: ${username} by admin ${req.userId}`)

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
    next(error)
  }
})

// Gamemaster self-registration via email
app.post('/api/auth/register-gamemaster', loginLimiter, async (req, res, next) => {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, Email und Passwort sind erforderlich' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE username = $1 OR email = $2",
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username oder Email existiert bereits' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const hashedPassword = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, email_verified, verification_token)
       VALUES ($1, $2, $3, 'gamemaster', false, $4)
       RETURNING id, username, email, role`,
      [escapeHtml(username), email, hashedPassword, verificationToken]
    )

    const emailSent = await sendVerificationEmail(email, username, verificationToken)

    res.json({
      message: emailSent
        ? 'Registrierung erfolgreich. Bitte prüfe dein Email-Postfach und bestätige deine Adresse.'
        : 'Registrierung erfolgreich. Email-Versand ist nicht konfiguriert - bitte kontaktiere den Administrator.',
      emailSent,
      user: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Email verification
app.get('/api/auth/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification-Token fehlt' })
    }

    const result = await pool.query(
      "UPDATE users SET email_verified = true, verification_token = NULL WHERE verification_token = $1 AND email_verified = false RETURNING id, username, email, role",
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Verification-Link' })
    }

    res.json({
      message: 'Email erfolgreich bestätigt. Du kannst dich jetzt einloggen.',
      user: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
})

// Forgot password - request reset link
app.post('/api/auth/forgot-password', loginLimiter, async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email-Adresse ist erforderlich' })
    }

    const result = await pool.query(
      "SELECT id, username, email FROM users WHERE email = $1 AND is_active = true",
      [email]
    )

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'Falls ein Account mit dieser Email existiert, wurde ein Reset-Link gesendet.' })
    }

    const user = result.rows[0]
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await pool.query(
      "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
      [resetToken, expires, user.id]
    )

    await sendPasswordResetEmail(user.email, user.username, resetToken)

    res.json({ message: 'Falls ein Account mit dieser Email existiert, wurde ein Reset-Link gesendet.' })
  } catch (error) {
    next(error)
  }
})

// Reset password with token
app.post('/api/auth/reset-password', loginLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
    }

    const result = await pool.query(
      "SELECT id, username FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()",
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordere einen neuen an.' })
    }

    const user = result.rows[0]
    const hashedPassword = await bcrypt.hash(password, 12)

    await pool.query(
      "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2",
      [hashedPassword, user.id]
    )

    console.log(`🔑 Password reset completed for user ${user.username}`)
    res.json({ message: 'Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.' })
  } catch (error) {
    next(error)
  }
})

// Change password (logged in)
app.post('/api/auth/change-password', authenticateToken, async (req: any, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Aktuelles und neues Passwort sind erforderlich' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 8 Zeichen lang sein' })
    }

    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.userId])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' })
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [hashedPassword, req.userId])

    res.json({ message: 'Passwort erfolgreich geändert' })
  } catch (error) {
    next(error)
  }
})

// Update profile (logged in)
app.put('/api/auth/profile', authenticateToken, async (req: any, res, next) => {
  try {
    const { username, email } = req.body

    if (!username && !email) {
      return res.status(400).json({ error: 'Username oder Email muss angegeben werden' })
    }

    // Check for conflicts
    if (username || email) {
      const conflicts = await pool.query(
        "SELECT id FROM users WHERE id != $1 AND (($2::varchar IS NOT NULL AND username = $2) OR ($3::varchar IS NOT NULL AND email = $3))",
        [req.userId, username || null, email || null]
      )
      if (conflicts.rows.length > 0) {
        return res.status(400).json({ error: 'Username oder Email ist bereits vergeben' })
      }
    }

    const current = await pool.query("SELECT username, email FROM users WHERE id = $1", [req.userId])
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' })
    }

    const newUsername = username ? escapeHtml(username) : current.rows[0].username
    const newEmail = email || current.rows[0].email

    await pool.query(
      "UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE id = $3",
      [newUsername, newEmail, req.userId]
    )

    res.json({
      message: 'Profil erfolgreich aktualisiert',
      user: { id: req.userId, username: newUsername, email: newEmail }
    })
  } catch (error) {
    next(error)
  }
})

// Get own profile (logged in)
app.get('/api/auth/profile', authenticateToken, async (req: any, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, username, email, role, created_at FROM users WHERE id = $1",
      [req.userId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' })
    }
    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
})

// List own sessions
app.get('/api/auth/sessions', authenticateToken, async (req: any, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, ip_address, user_agent, created_at, last_active
       FROM user_sessions WHERE user_id = $1 ORDER BY last_active DESC`,
      [req.userId]
    )

    // Mark current session
    const currentToken = req.cookies?.authToken
    const currentHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex').substring(0, 64)
      : null

    const sessions = await Promise.all(result.rows.map(async (s: any) => {
      const isCurrentResult = currentHash
        ? await pool.query('SELECT token_hash FROM user_sessions WHERE id = $1', [s.id])
        : null
      return {
        ...s,
        isCurrent: isCurrentResult?.rows[0]?.token_hash === currentHash
      }
    }))

    res.json(sessions)
  } catch (error) {
    next(error)
  }
})

// Revoke a session
app.delete('/api/auth/sessions/:id', authenticateToken, async (req: any, res, next) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM user_sessions WHERE id = $1 AND user_id = $2', [id, req.userId])
    res.json({ message: 'Session beendet' })
  } catch (error) {
    next(error)
  }
})

// Revoke all other sessions
app.delete('/api/auth/sessions', authenticateToken, async (req: any, res, next) => {
  try {
    const currentToken = req.cookies?.authToken
    const currentHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex').substring(0, 64)
      : null

    if (currentHash) {
      await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1 AND token_hash != $2',
        [req.userId, currentHash]
      )
    }
    res.json({ message: 'Alle anderen Sessions beendet' })
  } catch (error) {
    next(error)
  }
})

// Audit log (admin only)
app.get('/api/admin/audit-log', authenticateToken, async (req: any, res, next) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Nur Admins' })
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
    const offset = parseInt(req.query.offset as string) || 0

    const result = await pool.query(
      `SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    const countResult = await pool.query('SELECT COUNT(*) FROM audit_log')

    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count)
    })
  } catch (error) {
    next(error)
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
app.use('/api/admin', createAdminRouter(gameEngine, io))

// Gamemaster routes
app.use('/api/gamemaster', createGamemasterRouter(gameEngine))

// Public routes
app.get('/api/games/public', (req, res) => {
  const games = gameEngine.getAllGames()
    .filter(game => game.status === 'waiting')
    .map(game => ({
      gameCode: game.gameCode,
      name: game.name,
      teams: game.teams.size,
      maxTeams: game.maxTeams,
      gameMode: game.gameMode
    }))
  res.json(games)
})

// WebSocket Event Handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id} (authenticated: ${socket.data.authenticated})`)

  // Join existing game
  socket.on('join_game', async (data) => {
    try {
      const { gameCode, teamName, teamColor } = data

      if (!gameCode || !teamName) {
        socket.emit('error', { message: 'Spielcode und Teamname sind erforderlich.' })
        return
      }

      let game = gameEngine.getGame(gameCode)

      // Try to load from DB if not in memory
      if (!game) {
        game = await gameEngine.loadGame(gameCode) ?? undefined
      }

      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden.' })
        return
      }

      const teamId = gameEngine.addTeam(gameCode, escapeHtml(teamName), teamColor)

      if (!teamId) {
        socket.emit('error', { message: 'Konnte dem Spiel nicht beitreten.' })
        return
      }

      socket.join(gameCode)
      socket.join(`team-${teamId}`)
      socket.data.gameCode = gameCode
      socket.data.teamId = teamId

      socket.emit('joined_game', { teamId, gameCode })

      const gameState = {
        teams: Array.from(game.teams.values()),
        status: game.status,
        questionGrid: game.questionGrid,
        gameMode: game.gameMode
      }

      io.to(gameCode).emit('game_state_updated', gameState)

      console.log(`Team ${teamName} joined game ${gameCode}`)
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Beitreten' })
    }
  })

  // Spectate game (read-only, no team)
  socket.on('spectate_game', async (data) => {
    try {
      const { gameCode } = data

      if (!gameCode) {
        socket.emit('error', { message: 'Spielcode ist erforderlich.' })
        return
      }

      let game = gameEngine.getGame(gameCode)
      if (!game) {
        game = await gameEngine.loadGame(gameCode) ?? undefined
      }

      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden.' })
        return
      }

      socket.join(gameCode)
      socket.data.gameCode = gameCode
      socket.data.spectator = true

      socket.emit('spectate_joined', {
        teams: Array.from(game.teams.values()),
        status: game.status,
        questionGrid: game.questionGrid,
        gameMode: game.gameMode
      })

      console.log(`Spectator joined game ${gameCode}`)
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Zuschauen' })
    }
  })

  // Start game (admin/gamemaster only)
  socket.on('start_game', async (data) => {
    try {
      if (!socket.data.authenticated) {
        socket.emit('error', { message: 'Nicht autorisiert' })
        return
      }

      const { gameCode } = data
      await gameEngine.startGame(gameCode)

      const game = gameEngine.getGame(gameCode)
      if (game) {
        io.to(gameCode).emit('game_started', {
          status: 'active',
          teams: Array.from(game.teams.values()),
          questionGrid: game.questionGrid,
          gameMode: game.gameMode
        })
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Starten' })
    }
  })

  // Select question
  socket.on('select_question', async (data) => {
    try {
      const { gameCode, questionId } = data
      const game = gameEngine.getGame(gameCode)

      if (!game) {
        socket.emit('error', { message: 'Spiel nicht gefunden' })
        return
      }

      // In quizmaster mode, only admin/gamemaster can select
      if (game.gameMode === 'quizmaster' && !socket.data.authenticated) {
        socket.emit('error', { message: 'Nur der Spielleiter kann Fragen auswählen' })
        return
      }

      const question = await gameEngine.selectQuestion(gameCode, questionId)

      if (question) {
        io.to(gameCode).emit('question_selected', {
          question: {
            id: question.id,
            text: question.questionText,
            category: question.category,
            points: question.points,
            isRisiko: question.isRisiko,
            timeLimit: question.timeLimit,
            options: question.options.map(opt => ({
              id: opt.id,
              text: opt.text
              // NOTE: is_correct is NOT sent to clients
            }))
          },
          questionGrid: game.questionGrid
        })

        // Start server-side timer
        gameEngine.startQuestionTimer(gameCode, question.timeLimit, () => {
          io.to(gameCode).emit('time_up', { gameCode })
        })
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler bei Fragenwahl' })
    }
  })

  // Submit answer
  socket.on('submit_answer', async (data) => {
    try {
      const { gameCode, teamId, answerId, timeRemaining } = data

      const result = await gameEngine.submitAnswer(gameCode, teamId, answerId, timeRemaining)

      if (result) {
        const game = gameEngine.getGame(gameCode)
        io.to(gameCode).emit('answer_result', {
          teamId,
          teamName: result.teamName,
          isCorrect: result.isCorrect,
          pointsAwarded: result.pointsAwarded,
          wasRisiko: result.wasRisiko,
          wasDoublePoints: result.wasDoublePoints,
          correctOptionId: result.correctOptionId,
          teams: game ? Array.from(game.teams.values()) : []
        })
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Antworten' })
    }
  })

  // Use joker
  socket.on('use_joker', async (data) => {
    try {
      const { gameCode, teamId, jokerType } = data

      const effect = await gameEngine.useJoker(gameCode, teamId, jokerType)

      if (effect) {
        const game = gameEngine.getGame(gameCode)
        const team = game?.teams.get(teamId)

        io.to(gameCode).emit('joker_used', {
          teamId,
          teamName: team?.name || 'Unknown',
          jokerType,
          effect
        })
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Joker' })
    }
  })

  // End game (admin/gamemaster only)
  socket.on('end_game', async (data) => {
    try {
      if (!socket.data.authenticated) {
        socket.emit('error', { message: 'Nicht autorisiert' })
        return
      }

      const { gameCode } = data
      const results = await gameEngine.endGame(gameCode)

      if (results) {
        io.to(gameCode).emit('game_finished', results)
      }
    } catch (error: any) {
      socket.emit('error', { message: error.message || 'Fehler beim Beenden' })
    }
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Error handler (must be last middleware)
app.use(errorHandler)

// Start server
const startServer = async () => {
  // Reload active games from DB on startup
  try {
    await gameEngine.loadActiveGames()
  } catch (err) {
    console.error('Warning: Could not reload active games:', err)
  }

  httpServer.listen(config.PORT, () => {
    console.log(`Quiz Arena Server running on port ${config.PORT}`)
    console.log(`Frontend URL: ${config.CLIENT_URL}`)
    console.log(`Environment: ${config.NODE_ENV}`)
    console.log(`SMTP: ${config.SMTP_HOST ? 'configured' : 'not configured (verification links logged to console)'}`)
  })
}

startServer()
