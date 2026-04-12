import express from 'express'
import { pool } from '../database/connection.js'
import { authenticateToken, requireGamemaster } from '../middleware/auth.js'
import { escapeHtml } from '../utils/sanitize.js'
import type { GameEngine } from '../models/GameEngine.js'

export function createGamemasterRouter(gameEngine: GameEngine) {
  const router = express.Router()

  router.use(authenticateToken)
  router.use(requireGamemaster)

  // ─────────────────────────── GAME ROUTES ────────────────────────────

  // Get own games only
  router.get('/games', async (req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT gs.*, COUNT(t.id) as team_count
        FROM game_sessions gs
        LEFT JOIN teams t ON gs.id = t.game_session_id
        WHERE gs.creator_id = $1
        GROUP BY gs.id
        ORDER BY gs.created_at DESC
      `, [(req as any).userId])

      res.json(result.rows)
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

  // Get own game results
  router.get('/games/:id/results', async (req, res, next) => {
    try {
      const { id } = req.params

      const game = await pool.query(
        'SELECT * FROM game_sessions WHERE id = $1 AND creator_id = $2',
        [id, (req as any).userId]
      )
      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Spiel nicht gefunden' })
      }

      const teams = await pool.query(
        'SELECT * FROM teams WHERE game_session_id = $1 ORDER BY current_score DESC',
        [id]
      )

      const answers = await pool.query(`
        SELECT ga.*, t.name as team_name, q.question_text
        FROM game_answers ga
        JOIN teams t ON ga.team_id = t.id
        LEFT JOIN questions q ON ga.question_id = q.id
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

  // Delete own game (only if not active)
  router.delete('/games/:id', async (req, res, next) => {
    try {
      const { id } = req.params

      const game = await pool.query(
        'SELECT game_code, status FROM game_sessions WHERE id = $1 AND creator_id = $2',
        [id, (req as any).userId]
      )
      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Spiel nicht gefunden' })
      }

      if (game.rows[0].status === 'active') {
        return res.status(400).json({ error: 'Aktives Spiel kann nicht gelöscht werden. Bitte zuerst beenden.' })
      }

      gameEngine.removeGame(game.rows[0].game_code)
      await pool.query('DELETE FROM game_sessions WHERE id = $1', [id])
      res.json({ message: 'Spiel erfolgreich gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // ─────────────────────────── CATEGORY ROUTES ────────────────────────

  // Get own + global categories (with is_global flag)
  router.get('/categories', async (req, res, next) => {
    try {
      const userId = (req as any).userId
      const result = await pool.query(`
        SELECT c.id, c.name, c.description, c.color,
               COUNT(q.id) as question_count,
               (c.created_by IS NULL) as is_global
        FROM question_categories c
        LEFT JOIN questions q ON c.id = q.category_id
          AND (q.created_by IS NULL OR q.created_by = $1)
        WHERE c.created_by IS NULL OR c.created_by = $1
        GROUP BY c.id
        ORDER BY c.created_by IS NULL DESC, c.name
      `, [userId])

      res.json(result.rows)
    } catch (error) {
      next(error)
    }
  })

  // Create own category
  router.post('/categories', async (req, res, next) => {
    try {
      const { name, description, color } = req.body
      const userId = (req as any).userId

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Kategoriename ist erforderlich' })
      }

      const result = await pool.query(`
        INSERT INTO question_categories (name, description, color, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [escapeHtml(name.trim()), escapeHtml(description || ''), color || '#3498db', userId])

      res.json({ id: result.rows[0].id, message: 'Kategorie erstellt' })
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Du hast bereits eine Kategorie mit diesem Namen' })
      }
      next(error)
    }
  })

  // Update own category
  router.put('/categories/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { name, description, color } = req.body
      const userId = (req as any).userId

      const check = await pool.query(
        'SELECT id FROM question_categories WHERE id = $1 AND created_by = $2',
        [id, userId]
      )
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Kategorie nicht gefunden oder keine Berechtigung' })
      }

      await pool.query(`
        UPDATE question_categories SET name = $1, description = $2, color = $3
        WHERE id = $4 AND created_by = $5
      `, [escapeHtml(name), escapeHtml(description || ''), color || '#3498db', id, userId])

      res.json({ message: 'Kategorie aktualisiert' })
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Du hast bereits eine Kategorie mit diesem Namen' })
      }
      next(error)
    }
  })

  // Delete own category
  router.delete('/categories/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = (req as any).userId

      const check = await pool.query(
        'SELECT id FROM question_categories WHERE id = $1 AND created_by = $2',
        [id, userId]
      )
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Kategorie nicht gefunden oder keine Berechtigung' })
      }

      const qCount = await pool.query(
        'SELECT COUNT(*) FROM questions WHERE category_id = $1 AND created_by = $2',
        [id, userId]
      )
      if (parseInt(qCount.rows[0].count) > 0) {
        return res.status(400).json({ error: 'Kategorie enthält noch Fragen. Bitte zuerst alle Fragen löschen.' })
      }

      await pool.query('DELETE FROM question_categories WHERE id = $1 AND created_by = $2', [id, userId])
      res.json({ message: 'Kategorie gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  // ─────────────────────────── QUESTION ROUTES ────────────────────────

  // Get own questions
  router.get('/questions', async (req, res, next) => {
    try {
      const userId = (req as any).userId
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
        WHERE q.created_by = $1
        GROUP BY q.id, c.name, c.id
        ORDER BY c.name, q.points
      `, [userId])

      res.json(result.rows)
    } catch (error) {
      next(error)
    }
  })

  // Create own question
  router.post('/questions', async (req, res, next) => {
    try {
      const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body
      const userId = (req as any).userId

      if (!questionText || !options || options.length < 2) {
        return res.status(400).json({ error: 'Ungültige Fragendaten' })
      }

      const validOptions = options.filter((opt: any) => opt.text?.trim())
      if (validOptions.length < 2) {
        return res.status(400).json({ error: 'Mindestens 2 Antwort-Optionen erforderlich' })
      }

      const correctAnswers = validOptions.filter((opt: any) => opt.isCorrect)
      if (correctAnswers.length !== 1) {
        return res.status(400).json({ error: 'Genau eine richtige Antwort erforderlich' })
      }

      // Verify the category is accessible (global or own)
      const catCheck = await pool.query(
        'SELECT id FROM question_categories WHERE id = $1 AND (created_by IS NULL OR created_by = $2)',
        [categoryId, userId]
      )
      if (catCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Kategorie nicht gefunden' })
      }

      await pool.query('BEGIN')

      const questionResult = await pool.query(`
        INSERT INTO questions (category_id, question_text, points, time_limit, is_risiko, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [categoryId, escapeHtml(questionText), points || 100, timeLimit || 30, isRisiko || false, userId])

      const questionId = questionResult.rows[0].id

      for (const [index, option] of validOptions.entries()) {
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

  // Update own question
  router.put('/questions/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const { categoryId, questionText, points, timeLimit, isRisiko, options } = req.body
      const userId = (req as any).userId

      const check = await pool.query(
        'SELECT id FROM questions WHERE id = $1 AND created_by = $2',
        [id, userId]
      )
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Frage nicht gefunden oder keine Berechtigung' })
      }

      const validOptions = options.filter((opt: any) => opt.text?.trim())
      if (validOptions.length < 2) {
        return res.status(400).json({ error: 'Mindestens 2 Antwort-Optionen erforderlich' })
      }

      const correctAnswers = validOptions.filter((opt: any) => opt.isCorrect)
      if (correctAnswers.length !== 1) {
        return res.status(400).json({ error: 'Genau eine richtige Antwort erforderlich' })
      }

      await pool.query('BEGIN')

      await pool.query(`
        UPDATE questions
        SET category_id = $1, question_text = $2, points = $3, time_limit = $4, is_risiko = $5
        WHERE id = $6 AND created_by = $7
      `, [categoryId, escapeHtml(questionText), points || 100, timeLimit || 30, isRisiko || false, id, userId])

      await pool.query('DELETE FROM question_options WHERE question_id = $1', [id])

      for (const [index, option] of validOptions.entries()) {
        await pool.query(`
          INSERT INTO question_options (question_id, option_text, is_correct, sort_order)
          VALUES ($1, $2, $3, $4)
        `, [id, escapeHtml(option.text), option.isCorrect, index])
      }

      await pool.query('COMMIT')
      res.json({ message: 'Frage aktualisiert' })
    } catch (error) {
      await pool.query('ROLLBACK')
      next(error)
    }
  })

  // Delete own question
  router.delete('/questions/:id', async (req, res, next) => {
    try {
      const { id } = req.params
      const userId = (req as any).userId

      const check = await pool.query(
        'SELECT id FROM questions WHERE id = $1 AND created_by = $2',
        [id, userId]
      )
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Frage nicht gefunden oder keine Berechtigung' })
      }

      await pool.query('DELETE FROM questions WHERE id = $1 AND created_by = $2', [id, userId])
      res.json({ message: 'Frage gelöscht' })
    } catch (error) {
      next(error)
    }
  })

  return router
}
