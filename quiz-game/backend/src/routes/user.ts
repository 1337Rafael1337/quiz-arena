import express from 'express'
import { pool } from '../database/connection.js'
import { authenticateToken } from '../middleware/auth.js'
import { getUserAccessibleQuestions, getUserAccessibleGames, canAccessQuestion, canAccessGame } from '../middleware/permissions.js'

const router = express.Router()

// All user routes require authentication
router.use(authenticateToken)

interface AuthRequest extends express.Request {
  userId?: number
  userRole?: string
}

// Get user's accessible questions (own + shared)
router.get('/questions', async (req: AuthRequest, res) => {
  try {
    const questions = await getUserAccessibleQuestions(req.userId!)
    res.json(questions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's accessible games (own + shared)
router.get('/games', async (req: AuthRequest, res) => {
  try {
    const games = await getUserAccessibleGames(req.userId!)
    res.json(games)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new question (user becomes owner)
router.post('/questions', async (req: AuthRequest, res) => {
  try {
    const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body
    
    // Validate input
    if (!questionText || !options || options.length < 2) {
      return res.status(400).json({ error: 'Invalid question data' })
    }
    
    // Check if exactly one correct answer
    const correctAnswers = options.filter(opt => opt.isCorrect)
    if (correctAnswers.length !== 1) {
      return res.status(400).json({ error: 'Exactly one correct answer required' })
    }
    
    await pool.query('BEGIN')
    
    // Insert question with creator_id
    const questionResult = await pool.query(`
      INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko, creator_id)
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id
    `, [categoryId, questionText, points || 100, timeLimit || 30, isRisiko || false, req.userId])
    
    const questionId = questionResult.rows[0].id
    
    // Insert options
    for (const [index, option] of options.entries()) {
      await pool.query(`
        INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [questionId, option.text, option.isCorrect, index])
    }
    
    await pool.query('COMMIT')
    res.json({ id: questionId, message: 'Question created successfully' })
  } catch (error) {
    await pool.query('ROLLBACK')
    res.status(500).json({ error: error.message })
  }
})

// Update question (only if user has write access)
router.put('/questions/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body
    
    // Check if user can write to this question
    const hasAccess = await canAccessQuestion(req.userId!, parseInt(id), 'write')
    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions to edit this question' })
    }
    
    await pool.query('BEGIN')
    
    // Update question
    await pool.query(`
      UPDATE questions 
      SET category_id = $1, question_text = $2, points = $3, time_limit = $4, is_risiko = $5
      WHERE id = $6
    `, [categoryId, questionText, points, timeLimit, isRisiko, id])
    
    // Delete old options
    await pool.query('DELETE FROM question_options WHERE question_id = $1', [id])
    
    // Insert new options
    for (const [index, option] of options.entries()) {
      await pool.query(`
        INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
        VALUES ($1, $2, $3, $4)
      `, [id, option.text, option.isCorrect, index])
    }
    
    await pool.query('COMMIT')
    res.json({ message: 'Question updated successfully' })
  } catch (error) {
    await pool.query('ROLLBACK')
    res.status(500).json({ error: error.message })
  }
})

// Delete question (only if user owns it)
router.delete('/questions/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    
    // Check if user owns this question
    const ownerResult = await pool.query('SELECT creator_id FROM questions WHERE id = $1', [id])
    if (ownerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' })
    }
    
    if (ownerResult.rows[0].creator_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Only the question owner can delete it' })
    }
    
    await pool.query('DELETE FROM questions WHERE id = $1', [id])
    res.json({ message: 'Question deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new game (user becomes owner)
router.post('/games', async (req: AuthRequest, res) => {
  try {
    const { name, maxTeams, jokerCount, risikoEnabled } = req.body
    const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    const result = await pool.query(`
      INSERT INTO game_sessions (name, game_code, creator_id, max_teams, joker_count, risiko_enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, game_code
    `, [name, gameCode, req.userId, maxTeams || 4, jokerCount || 3, risikoEnabled || true])
    
    res.json({ 
      id: result.rows[0].id,
      gameCode: result.rows[0].game_code,
      message: 'Game created successfully' 
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get categories (all users can see categories)
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(q.id) as question_count
      FROM question_categories c
      LEFT JOIN questions q ON c.id = q.category_id
      GROUP BY c.id
      ORDER BY c.name
    `)
    
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const stats = await Promise.all([
      // User's own questions
      pool.query('SELECT COUNT(*) as own_questions FROM questions WHERE creator_id = $1', [req.userId]),
      // User's accessible questions (including shared)
      pool.query(`
        SELECT COUNT(DISTINCT q.id) as accessible_questions 
        FROM questions q
        LEFT JOIN question_permissions qp ON q.id = qp.question_id AND qp.user_id = $1
        WHERE q.creator_id = $1 OR qp.user_id = $1
      `, [req.userId]),
      // User's own games
      pool.query('SELECT COUNT(*) as own_games FROM game_sessions WHERE creator_id = $1', [req.userId]),
      // User's accessible games (including shared)
      pool.query(`
        SELECT COUNT(DISTINCT gs.id) as accessible_games 
        FROM game_sessions gs
        LEFT JOIN game_permissions gp ON gs.id = gp.game_id AND gp.user_id = $1
        WHERE gs.creator_id = $1 OR gp.user_id = $1
      `, [req.userId]),
      // Recent games
      pool.query(`
        SELECT gs.id, gs.name, gs.status, gs.created_at
        FROM game_sessions gs
        LEFT JOIN game_permissions gp ON gs.id = gp.game_id AND gp.user_id = $1
        WHERE gs.creator_id = $1 OR gp.user_id = $1
        ORDER BY gs.created_at DESC
        LIMIT 5
      `, [req.userId])
    ])
    
    res.json({
      ownQuestions: parseInt(stats[0].rows[0].own_questions),
      accessibleQuestions: parseInt(stats[1].rows[0].accessible_questions),
      ownGames: parseInt(stats[2].rows[0].own_games),
      accessibleGames: parseInt(stats[3].rows[0].accessible_games),
      recentGames: stats[4].rows
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router