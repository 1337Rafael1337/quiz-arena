import express from 'express'
import { pool } from '../database/connection.js'
import { authenticateToken, requireGamemaster } from '../middleware/auth.js'
import { escapeHtml } from '../utils/sanitize.js'
import type { GameEngine } from '../models/GameEngine.js'

export function createGamemasterRouter(gameEngine: GameEngine) {
  const router = express.Router()

  router.use(authenticateToken)
  router.use(requireGamemaster)

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
      const { name, maxTeams, jokerCount, risikoEnabled, gameMode } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Spielname ist erforderlich' })
      }

      const gameCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const result = await pool.query(`
        INSERT INTO game_sessions (name, game_code, creator_id, max_teams, joker_count, risiko_enabled, game_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, game_code
      `, [
        escapeHtml(name),
        gameCode,
        (req as any).userId,
        maxTeams || 4,
        jokerCount ?? 3,
        risikoEnabled ?? true,
        gameMode || 'self_service'
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

  // Get available categories (read-only, from admin-managed pool)
  router.get('/categories', async (req, res, next) => {
    try {
      const result = await pool.query(`
        SELECT c.id, c.name, c.description, c.color, COUNT(q.id) as question_count
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

  return router
}
