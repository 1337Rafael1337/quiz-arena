import express from 'express'
import { pool } from '../database/connection.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { escapeHtml } from '../utils/sanitize.js'
import multer from 'multer'
import csvParser from 'csv-parser'
import fs from 'fs'
import bcrypt from 'bcrypt'
import type { GameEngine } from '../models/GameEngine.js'
import type { Server } from 'socket.io'
import { logAudit } from '../utils/audit.js'

// Multer with file type validation and size limit
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Nur CSV-Dateien sind erlaubt'))
    }
  }
})

export function createAdminRouter(gameEngine: GameEngine, io?: Server) {
  const router = express.Router()

  // Alle Admin Routes benötigen Authentication
  router.use(authenticateToken)
  router.use(requireAdmin)

  // QUESTIONS MANAGEMENT

  // Get all questions with categories
  router.get('/questions', async (req, res, next) => {
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
      next(error)
    }
  })

  // Create new question
  router.post('/questions', async (req, res, next) => {
    try {
      const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body

      if (!questionText || !options || options.length < 2) {
        return res.status(400).json({ error: 'Ungültige Fragendaten' })
      }

      const correctAnswers = options.filter((opt: any) => opt.isCorrect)
      if (correctAnswers.length !== 1) {
        return res.status(400).json({ error: 'Genau eine richtige Antwort erforderlich' })
      }

      await pool.query('BEGIN')

      const questionResult = await pool.query(`
        INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [categoryId, escapeHtml(questionText), points || 100, timeLimit || 30, isRisiko || false])

      const questionId = questionResult.rows[0].id

      for (const [index, option] of options.entries()) {
        await pool.query(`
          INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [questionId, escapeHtml(option.text), option.isCorrect, index])
      }

      await pool.query('COMMIT')
      res.json({ id: questionId, message: 'Frage erfolgreich erstellt' })
    } catch (error) {
      await pool.query('ROLLBACK')
      next(error)
    }
  })

  // Update question
  router.put('/questions/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body

      await pool.query('BEGIN')

      await pool.query(`
        UPDATE questions
        SET category_id = $1, question_text = $2, points = $3, time_limit = $4, is_risiko = $5
        WHERE id = $6
      `, [categoryId, escapeHtml(questionText), points, timeLimit, isRisiko, id])

      await pool.query('DELETE FROM question_options WHERE question_id = $1', [id])

      for (const [index, option] of options.entries()) {
        await pool.query(`
          INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [id, escapeHtml(option.text), option.isCorrect, index])
      }

      await pool.query('COMMIT')
      res.json({ message: 'Frage erfolgreich aktualisiert' })
    } catch (error) {
      await pool.query('ROLLBACK')
      next(error)
    }
  })

  // Delete question
  router.delete('/questions/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      await pool.query('DELETE FROM questions WHERE id = $1', [id])
      res.json({ message: 'Frage erfolgreich gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // Bulk delete questions
  router.post('/questions/bulk-delete', async (req, res, next) => {
    try {
      const { ids } = req.body
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Keine Fragen ausgewählt' })
      }
      await pool.query('DELETE FROM questions WHERE id = ANY($1::int[])', [ids])
      logAudit((req as any).userId, '', 'bulk_delete_questions', 'question', null, `${ids.length} Fragen gelöscht`, req.ip)
      res.json({ message: `${ids.length} Fragen gelöscht`, deleted: ids.length })
    } catch (error) {
      next(error)
    }
  })

  // Bulk change category
  router.post('/questions/bulk-category', async (req, res, next) => {
    try {
      const { ids, categoryId } = req.body
      if (!Array.isArray(ids) || ids.length === 0 || !categoryId) {
        return res.status(400).json({ error: 'Fragen-IDs und Kategorie erforderlich' })
      }
      await pool.query('UPDATE questions SET category_id = $1 WHERE id = ANY($2::int[])', [categoryId, ids])
      logAudit((req as any).userId, '', 'bulk_move_questions', 'question', categoryId, `${ids.length} Fragen in Kategorie ${categoryId}`, req.ip)
      res.json({ message: `${ids.length} Fragen verschoben`, updated: ids.length })
    } catch (error) {
      next(error)
    }
  })

  // CATEGORIES MANAGEMENT

  // Get all categories
  router.get('/categories', async (req, res, next) => {
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
      next(error)
    }
  })

  // Create category
  router.post('/categories', async (req, res, next) => {
    try {
      const { name, description, color } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Kategoriename ist erforderlich' })
      }

      const result = await pool.query(`
        INSERT INTO question_categories (name, description, color)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [escapeHtml(name), escapeHtml(description || ''), color || '#3498db'])

      res.json({ id: result.rows[0].id, message: 'Kategorie erfolgreich erstellt' })
    } catch (error) {
      next(error)
    }
  })

  // Update category
  router.put('/categories/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { name, description, color } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Kategoriename ist erforderlich' })
      }

      await pool.query(`
        UPDATE question_categories
        SET name = $1, description = $2, color = $3
        WHERE id = $4
      `, [escapeHtml(name), escapeHtml(description || ''), color || '#3498db', id])

      res.json({ message: 'Kategorie erfolgreich aktualisiert' })
    } catch (error) {
      next(error)
    }
  })

  // Delete category
  router.delete('/categories/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const questionCheck = await pool.query(
        'SELECT COUNT(*) as count FROM questions WHERE category_id = $1',
        [id]
      )

      if (parseInt(questionCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Kategorie mit existierenden Fragen kann nicht gelöscht werden'
        })
      }

      await pool.query('DELETE FROM question_categories WHERE id = $1', [id])
      res.json({ message: 'Kategorie erfolgreich gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // CSV IMPORT (with transaction)
  router.post('/import-csv', upload.single('csvFile'), async (req: any, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Keine CSV-Datei hochgeladen' })
      }

      const results: any[] = []
      const filePath = req.file.path

      // Datei einlesen und Encoding erkennen/korrigieren
      let fileBuffer = fs.readFileSync(filePath)

      // UTF-8 BOM entfernen falls vorhanden
      if (fileBuffer[0] === 0xEF && fileBuffer[1] === 0xBB && fileBuffer[2] === 0xBF) {
        fileBuffer = fileBuffer.subarray(3)
      }

      // Prüfen ob der Inhalt gültiges UTF-8 ist, sonst als Latin-1 (Windows-1252) interpretieren
      let csvText: string
      try {
        csvText = new TextDecoder('utf-8', { fatal: true }).decode(fileBuffer)
      } catch {
        // Fallback: Latin-1 (kompatibel mit Windows-1252 für deutsche Umlaute)
        csvText = new TextDecoder('latin1').decode(fileBuffer)
      }

      // Als UTF-8 Datei neu schreiben damit csv-parser korrekt liest
      const utf8Path = filePath + '.utf8.csv'
      fs.writeFileSync(utf8Path, csvText, 'utf-8')

      fs.createReadStream(utf8Path, { encoding: 'utf-8' })
        .pipe(csvParser())
        .on('data', (data: any) => results.push(data))
        .on('end', async () => {
          try {
            await pool.query('BEGIN')

            let imported = 0
            let errors = 0

            for (const row of results) {
              try {
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

                if (!category || !question || !answer1 || !answer2) {
                  errors++
                  continue
                }

                // Find or create category
                let categoryResult = await pool.query(
                  'SELECT id FROM question_categories WHERE name = $1',
                  [category]
                )

                let categoryId
                if (categoryResult.rows.length === 0) {
                  const newCategory = await pool.query(
                    'INSERT INTO question_categories (name) VALUES ($1) RETURNING id',
                    [escapeHtml(category)]
                  )
                  categoryId = newCategory.rows[0].id
                } else {
                  categoryId = categoryResult.rows[0].id
                }

                const questionResult = await pool.query(`
                  INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko)
                  VALUES ($1, $2, $3, $4, $5) RETURNING id
                `, [categoryId, escapeHtml(question), parseInt(points) || 100, parseInt(time_limit) || 30, is_risiko === 'true'])

                const questionId = questionResult.rows[0].id

                const answers = [answer1, answer2, answer3, answer4].filter(Boolean)
                const correctIndex = parseInt(correct_answer) - 1

                for (const [index, answer] of answers.entries()) {
                  await pool.query(`
                    INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
                    VALUES ($1, $2, $3, $4)
                  `, [questionId, escapeHtml(answer), index === correctIndex, index])
                }

                imported++
              } catch (error) {
                console.error('Error importing row:', error)
                errors++
              }
            }

            if (errors > 0 && imported === 0) {
              await pool.query('ROLLBACK')
            } else {
              await pool.query('COMMIT')
            }

            // Clean up uploaded files
            fs.unlinkSync(filePath)
            try { fs.unlinkSync(utf8Path) } catch {}

            res.json({
              message: `Import abgeschlossen: ${imported} Fragen importiert, ${errors} Fehler`,
              imported,
              errors
            })
          } catch (error) {
            await pool.query('ROLLBACK')
            fs.unlinkSync(filePath)
            try { fs.unlinkSync(utf8Path) } catch {}
            next(error)
          }
        })
        .on('error', (error: any) => {
          fs.unlinkSync(filePath)
          try { fs.unlinkSync(utf8Path) } catch {}
          next(error)
        })
    } catch (error) {
      next(error)
    }
  })

  // GAME MANAGEMENT

  // Get all games
  router.get('/games', async (req, res, next) => {
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
      next(error)
    }
  })

  // Get game results
  router.get('/games/:id/results', async (req, res, next) => {
    try {
      const { id } = req.params

      const game = await pool.query('SELECT * FROM game_sessions WHERE id = $1', [id])
      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Spiel nicht gefunden' })
      }

      const teams = await pool.query(
        'SELECT * FROM teams WHERE game_session_id = $1 ORDER BY current_score DESC',
        [id]
      )

      const answers = await pool.query(`
        SELECT ga.*, t.name as team_name, q.question_text, qo.option_text as selected_answer
        FROM game_answers ga
        JOIN teams t ON ga.team_id = t.id
        LEFT JOIN questions q ON ga.question_id = q.id
        LEFT JOIN question_options qo ON ga.selected_option_id = qo.id
        WHERE ga.game_session_id = $1
        ORDER BY ga.answered_at
      `, [id])

      res.json({
        game: game.rows[0],
        teams: teams.rows,
        answers: answers.rows
      })
    } catch (error) {
      next(error)
    }
  })

  // Create game
  router.post('/games', async (req, res, next) => {
    try {
      const { name, maxTeams, jokerCount, risikoEnabled, gameMode, answerMode } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Spielname ist erforderlich' })
      }

      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const result = await pool.query(`
        INSERT INTO game_sessions (name, game_code, creator_id, max_teams, joker_count, risiko_enabled, game_mode, answer_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, game_code
      `, [
        escapeHtml(name),
        gameCode,
        (req as any).userId,
        maxTeams || 4,
        jokerCount ?? 3,
        risikoEnabled ?? true,
        gameMode || 'self_service',
        answerMode || 'competitive'
      ])

      // Load game into engine
      await gameEngine.loadGame(gameCode)

      res.json({
        id: result.rows[0].id,
        gameCode: result.rows[0].game_code,
        message: 'Spiel erfolgreich erstellt'
      })
    } catch (error) {
      next(error)
    }
  })

  // Delete game
  router.delete('/games/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const game = await pool.query('SELECT game_code, status FROM game_sessions WHERE id = $1', [id])
      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Spiel nicht gefunden' })
      }

      // Remove from engine if loaded
      gameEngine.removeGame(game.rows[0].game_code)

      await pool.query('DELETE FROM game_sessions WHERE id = $1', [id])
      res.json({ message: 'Spiel erfolgreich gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // Force-finish a game (cancel)
  router.patch('/games/:id/cancel', async (req, res, next) => {
    try {
      const { id } = req.params

      const game = await pool.query('SELECT game_code FROM game_sessions WHERE id = $1', [id])
      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Spiel nicht gefunden' })
      }

      const gameCode = game.rows[0].game_code
      const engineGame = gameEngine.getGame(gameCode)

      if (engineGame && engineGame.status !== 'finished') {
        const results = await gameEngine.endGame(gameCode)
        if (results) {
          io.to(gameCode).emit('game_finished', results)
        }
      } else {
        await pool.query(
          "UPDATE game_sessions SET status = 'finished', finished_at = NOW() WHERE id = $1",
          [id]
        )
      }

      res.json({ message: 'Spiel wurde beendet' })
    } catch (error) {
      next(error)
    }
  })

  // USER MANAGEMENT

  // Get all users
  router.get('/users', async (req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT id, username, email, role, is_active, email_verified, created_at,
               (SELECT COUNT(*) FROM game_sessions WHERE creator_id = users.id) as games_created
        FROM users
        ORDER BY created_at DESC
      `)

      res.json(result.rows)
    } catch (error) {
      next(error)
    }
  })

  // Update user
  router.put('/users/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { username, email, role, is_active } = req.body

      if (!username || !email) {
        return res.status(400).json({ error: 'Username und Email sind erforderlich' })
      }

      if (!['admin', 'gamemaster'].includes(role)) {
        return res.status(400).json({ error: 'Ungültige Rolle' })
      }

      const existingUser = await pool.query(
        "SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3",
        [username, email, id]
      )

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Username oder Email existiert bereits' })
      }

      // Prevent deactivating or demoting the last admin
      const currentUser = await pool.query("SELECT role FROM users WHERE id = $1", [id])
      if (currentUser.rows.length > 0 && currentUser.rows[0].role === 'admin') {
        if (role !== 'admin' || is_active === false) {
          const adminCount = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = true AND id != $1",
            [id]
          )
          if (parseInt(adminCount.rows[0].count) === 0) {
            return res.status(400).json({ error: 'Letzter Admin kann nicht deaktiviert oder herabgestuft werden' })
          }
        }
      }

      await pool.query(`
        UPDATE users
        SET username = $1, email = $2, role = $3, is_active = $4, updated_at = NOW()
        WHERE id = $5
      `, [escapeHtml(username), email, role, is_active, id])

      res.json({ message: 'Benutzer erfolgreich aktualisiert' })
    } catch (error) {
      next(error)
    }
  })

  // Delete user
  router.delete('/users/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      if (parseInt(id) === (req as any).userId) {
        return res.status(400).json({ error: 'Eigenen Account kann nicht gelöscht werden' })
      }

      const userCheck = await pool.query("SELECT role FROM users WHERE id = $1", [id])
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden' })
      }

      if (userCheck.rows[0].role === 'admin') {
        const adminCount = await pool.query(
          "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != $1",
          [id]
        )
        if (parseInt(adminCount.rows[0].count) === 0) {
          return res.status(400).json({ error: 'Letzter Admin kann nicht gelöscht werden' })
        }
      }

      await pool.query('DELETE FROM users WHERE id = $1', [id])
      res.json({ message: 'Benutzer erfolgreich gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // Reset user password
  router.post('/users/:id/reset-password', async (req, res, next) => {
    try {
      const { id } = req.params
      const { newPassword } = req.body

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12)
      await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, id])

      res.json({ message: 'Passwort erfolgreich zurückgesetzt' })
    } catch (error) {
      next(error)
    }
  })

  // STATISTICS

  router.get('/stats', async (req, res, next) => {
    try {
      const stats = await Promise.all([
        pool.query('SELECT COUNT(*) as total_questions FROM questions'),
        pool.query('SELECT COUNT(*) as total_categories FROM question_categories'),
        pool.query('SELECT COUNT(*) as total_games FROM game_sessions'),
        pool.query('SELECT COUNT(*) as active_games FROM game_sessions WHERE status = $1', ['active']),
        pool.query('SELECT COUNT(*) as total_users FROM users'),
        pool.query('SELECT COUNT(*) as admin_users FROM users WHERE role = $1', ['admin']),
        pool.query('SELECT COUNT(*) as gamemaster_users FROM users WHERE role = $1', ['gamemaster']),
        pool.query("SELECT COUNT(*) as pending_gamemasters FROM users WHERE role = 'gamemaster' AND email_verified = false"),
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
        gamemasterUsers: parseInt(stats[6].rows[0].gamemaster_users),
        pendingGamemasters: parseInt(stats[7].rows[0].pending_gamemasters),
        categoriesStats: stats[8].rows
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
