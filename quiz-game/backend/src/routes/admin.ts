import express from 'express'
import { pool } from '../database/connection.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import multer from 'multer'
import csvParser from 'csv-parser'
import fs from 'fs'
import bcrypt from 'bcrypt'

const router = express.Router()

// Multer für CSV Upload
const upload = multer({ dest: 'uploads/' })

// Alle Admin Routes benötigen Authentication
router.use(authenticateToken)
router.use(requireAdmin)

// QUESTIONS MANAGEMENT

// Get all questions with categories
router.get('/questions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT q.id, q.question_text, q.points, q.time_limit, q.is_risiko, q.created_at,
             c.name as category_name, c.id as category_id,
             array_agg(json_build_object(
               'id', qo.id, 
               'text', qo.option_text, 
               'is_correct', qo.is_correct,
               'sort_order', qo.sort_order
             ) ORDER BY qo.sort_order) as options
      FROM questions q
      JOIN question_categories c ON q.category_id = c.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      GROUP BY q.id, c.name, c.id
      ORDER BY c.name, q.points
    `)
    
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create new question
router.post('/questions', async (req, res) => {
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
    
    // Insert question
    const questionResult = await pool.query(`
      INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko)
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id
    `, [categoryId, questionText, points || 100, timeLimit || 30, isRisiko || false])
    
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

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body
    
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

// Delete question
router.delete('/questions/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    await pool.query('DELETE FROM questions WHERE id = $1', [id])
    res.json({ message: 'Question deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CATEGORIES MANAGEMENT

// Get all categories
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

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, color } = req.body
    
    const result = await pool.query(`
      INSERT INTO question_categories (name, description, color)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [name, description || '', color || '#3498db'])
    
    res.json({ id: result.rows[0].id, message: 'Category created successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// CSV IMPORT

// Import questions from CSV
router.post('/import-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' })
    }
    
    const results: any[] = []
    const filePath = req.file.path
    
    // Parse CSV
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          let imported = 0
          let errors = 0
          
          for (const row of results) {
            try {
              // Expected CSV format: category,question,answer1,answer2,answer3,answer4,correct_answer,points,time_limit,is_risiko
              const {
                category,
                question,
                answer1,
                answer2,
                answer3,
                answer4,
                correct_answer,
                points = 100,
                time_limit = 30,
                is_risiko = false
              } = row
              
              // Find or create category
              let categoryResult = await pool.query(
                'SELECT id FROM question_categories WHERE name = $1',
                [category]
              )
              
              let categoryId
              if (categoryResult.rows.length === 0) {
                const newCategory = await pool.query(
                  'INSERT INTO question_categories (name) VALUES ($1) RETURNING id',
                  [category]
                )
                categoryId = newCategory.rows[0].id
              } else {
                categoryId = categoryResult.rows[0].id
              }
              
              // Insert question
              const questionResult = await pool.query(`
                INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko)
                VALUES ($1, $2, $3, $4, $5) RETURNING id
              `, [categoryId, question, parseInt(points) || 100, parseInt(time_limit) || 30, is_risiko === 'true'])
              
              const questionId = questionResult.rows[0].id
              
              // Insert options
              const answers = [answer1, answer2, answer3, answer4].filter(Boolean)
              const correctIndex = parseInt(correct_answer) - 1
              
              for (const [index, answer] of answers.entries()) {
                await pool.query(`
                  INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
                  VALUES ($1, $2, $3, $4)
                `, [questionId, answer, index === correctIndex, index])
              }
              
              imported++
            } catch (error) {
              console.error('Error importing row:', error)
              errors++
            }
          }
          
          // Clean up uploaded file
          fs.unlinkSync(filePath)
          
          res.json({ 
            message: `Import completed: ${imported} questions imported, ${errors} errors`,
            imported,
            errors
          })
        } catch (error) {
          fs.unlinkSync(filePath)
          res.status(500).json({ error: error.message })
        }
      })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// GAME MANAGEMENT

// Get all games
router.get('/games', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gs.*, u.username as creator_name,
             COUNT(t.id) as team_count
      FROM game_sessions gs
      LEFT JOIN users u ON gs.creator_id = u.id
      LEFT JOIN teams t ON gs.id = t.game_session_id
      GROUP BY gs.id, u.username
      ORDER BY gs.created_at DESC
    `)
    
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create game (only from admin)
router.post('/games', async (req, res) => {
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

// USER MANAGEMENT (Admin only)

// Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, role, is_active, created_at,
             (SELECT COUNT(*) FROM game_sessions WHERE creator_id = users.id) as games_created
      FROM users
      ORDER BY created_at DESC
    `)
    
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { username, email, role, is_active } = req.body
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' })
    }
    
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    
    // Check if username or email already exists (excluding current user)
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3",
      [username, email, id]
    )
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' })
    }
    
    // Prevent deactivating the last admin
    if (role === 'admin' && is_active === false) {
      const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND id != $1", [id])
      if (parseInt(adminCount.rows[0].count) === 0) {
        return res.status(400).json({ error: 'Cannot deactivate the last admin user' })
      }
    }
    
    await pool.query(`
      UPDATE users 
      SET username = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()
      WHERE id = $5
    `, [username, email, role, is_active, id])
    
    res.json({ message: 'User updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Prevent deleting yourself
    if (parseInt(id) === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }
    
    // Check if user is admin and prevent deleting last admin
    const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [id])
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    if (userCheck.rows[0].role === 'admin') {
      const adminCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != $1", [id])
      if (parseInt(adminCount.rows[0].count) === 0) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' })
      }
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Reset user password (Admin only)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id])
    
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// STATISTICS

// Get game statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query('SELECT COUNT(*) as total_questions FROM questions'),
      pool.query('SELECT COUNT(*) as total_categories FROM question_categories'),
      pool.query('SELECT COUNT(*) as total_games FROM game_sessions'),
      pool.query('SELECT COUNT(*) as active_games FROM game_sessions WHERE status = $1', ['active']),
      pool.query('SELECT COUNT(*) as total_users FROM users'),
      pool.query('SELECT COUNT(*) as admin_users FROM users WHERE role = $1', ['admin']),
      pool.query(`
        SELECT c.name, COUNT(q.id) as question_count
        FROM question_categories c
        LEFT JOIN questions q ON c.id = q.category_id
        GROUP BY c.id, c.name
        ORDER BY question_count DESC
      `)
    ])
    
    res.json({
      totalQuestions: parseInt(stats[0].rows[0].total_questions),
      totalCategories: parseInt(stats[1].rows[0].total_categories),
      totalGames: parseInt(stats[2].rows[0].total_games),
      activeGames: parseInt(stats[3].rows[0].active_games),
      totalUsers: parseInt(stats[4].rows[0].total_users),
      adminUsers: parseInt(stats[5].rows[0].admin_users),
      categoriesStats: stats[6].rows
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

// Update category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, color } = req.body
    
    await pool.query(`
      UPDATE question_categories 
      SET name = $1, description = $2, color = $3
      WHERE id = $4
    `, [name, description || '', color || '#3498db', id])
    
    res.json({ message: 'Category updated successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if category has questions
    const questionCheck = await pool.query(
      'SELECT COUNT(*) as count FROM questions WHERE category_id = $1',
      [id]
    )
    
    if (parseInt(questionCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing questions' 
      })
    }
    
    await pool.query('DELETE FROM question_categories WHERE id = $1', [id])
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
