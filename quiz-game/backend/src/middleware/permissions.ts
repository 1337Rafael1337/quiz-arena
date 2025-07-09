import { Request, Response, NextFunction } from 'express'
import { pool } from '../database/connection.js'

interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

// Check if user can access a question (read or write)
export const canAccessQuestion = async (userId: number, questionId: number, requiredPermission: 'read' | 'write' = 'read'): Promise<boolean> => {
  try {
    // Admins can access everything
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
    if (userResult.rows[0]?.role === 'admin') {
      return true
    }

    // Check if user owns the question
    const ownerResult = await pool.query('SELECT creator_id FROM questions WHERE id = $1', [questionId])
    if (ownerResult.rows[0]?.creator_id === userId) {
      return true
    }

    // Check if user has explicit permission
    const permissionResult = await pool.query(`
      SELECT permission_type FROM question_permissions 
      WHERE question_id = $1 AND user_id = $2
    `, [questionId, userId])

    if (permissionResult.rows.length > 0) {
      const userPermission = permissionResult.rows[0].permission_type
      if (requiredPermission === 'read') {
        return userPermission === 'read' || userPermission === 'write'
      } else {
        return userPermission === 'write'
      }
    }

    return false
  } catch (error) {
    console.error('Error checking question access:', error)
    return false
  }
}

// Check if user can access a game (read or write)
export const canAccessGame = async (userId: number, gameId: number, requiredPermission: 'read' | 'write' = 'read'): Promise<boolean> => {
  try {
    // Admins can access everything
    const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId])
    if (userResult.rows[0]?.role === 'admin') {
      return true
    }

    // Check if user owns the game
    const ownerResult = await pool.query('SELECT creator_id FROM game_sessions WHERE id = $1', [gameId])
    if (ownerResult.rows[0]?.creator_id === userId) {
      return true
    }

    // Check if user has explicit permission
    const permissionResult = await pool.query(`
      SELECT permission_type FROM game_permissions 
      WHERE game_id = $1 AND user_id = $2
    `, [gameId, userId])

    if (permissionResult.rows.length > 0) {
      const userPermission = permissionResult.rows[0].permission_type
      if (requiredPermission === 'read') {
        return userPermission === 'read' || userPermission === 'write'
      } else {
        return userPermission === 'write'
      }
    }

    return false
  } catch (error) {
    console.error('Error checking game access:', error)
    return false
  }
}

// Middleware to check question access
export const requireQuestionAccess = (permission: 'read' | 'write' = 'read') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const questionId = parseInt(req.params.id || req.params.questionId || req.body.questionId)
      
      if (!questionId) {
        return res.status(400).json({ error: 'Question ID required' })
      }

      const hasAccess = await canAccessQuestion(req.userId!, questionId, permission)
      
      if (!hasAccess) {
        return res.status(403).json({ error: `Insufficient permissions to ${permission} this question` })
      }

      next()
    } catch (error) {
      res.status(500).json({ error: 'Error checking permissions' })
    }
  }
}

// Middleware to check game access
export const requireGameAccess = (permission: 'read' | 'write' = 'read') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const gameId = parseInt(req.params.id || req.params.gameId || req.body.gameId)
      
      if (!gameId) {
        return res.status(400).json({ error: 'Game ID required' })
      }

      const hasAccess = await canAccessGame(req.userId!, gameId, permission)
      
      if (!hasAccess) {
        return res.status(403).json({ error: `Insufficient permissions to ${permission} this game` })
      }

      next()
    } catch (error) {
      res.status(500).json({ error: 'Error checking permissions' })
    }
  }
}

// Get user's accessible questions with permission levels
export const getUserAccessibleQuestions = async (userId: number) => {
  try {
    const result = await pool.query(`
      SELECT q.id, q.question_text, q.points, q.time_limit, q.is_risiko, q.created_at,
             c.name as category_name, c.id as category_id, c.color as category_color,
             u.username as creator_name,
             CASE 
               WHEN q.creator_id = $1 THEN 'owner'
               WHEN qp.permission_type = 'write' THEN 'write'
               WHEN qp.permission_type = 'read' THEN 'read'
               WHEN u_current.role = 'admin' THEN 'admin'
               ELSE NULL
             END as access_level,
             array_agg(json_build_object(
               'id', qo.id, 
               'text', qo.option_text, 
               'is_correct', qo.is_correct,
               'sort_order', qo.sort_order
             ) ORDER BY qo.sort_order) as options
      FROM questions q
      JOIN question_categories c ON q.category_id = c.id
      LEFT JOIN users u ON q.creator_id = u.id
      LEFT JOIN users u_current ON u_current.id = $1
      LEFT JOIN question_permissions qp ON q.id = qp.question_id AND qp.user_id = $1
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE q.creator_id = $1 
         OR qp.user_id = $1 
         OR u_current.role = 'admin'
      GROUP BY q.id, c.name, c.id, c.color, u.username, qp.permission_type, u_current.role
      ORDER BY c.name, q.points
    `, [userId])
    
    return result.rows
  } catch (error) {
    console.error('Error getting user accessible questions:', error)
    throw error
  }
}

// Get user's accessible games with permission levels
export const getUserAccessibleGames = async (userId: number) => {
  try {
    const result = await pool.query(`
      SELECT gs.*, u.username as creator_name,
             COUNT(t.id) as team_count,
             CASE 
               WHEN gs.creator_id = $1 THEN 'owner'
               WHEN gp.permission_type = 'write' THEN 'write'
               WHEN gp.permission_type = 'read' THEN 'read'
               WHEN u_current.role = 'admin' THEN 'admin'
               ELSE NULL
             END as access_level
      FROM game_sessions gs
      LEFT JOIN users u ON gs.creator_id = u.id
      LEFT JOIN users u_current ON u_current.id = $1
      LEFT JOIN game_permissions gp ON gs.id = gp.game_id AND gp.user_id = $1
      LEFT JOIN teams t ON gs.id = t.game_session_id
      WHERE gs.creator_id = $1 
         OR gp.user_id = $1 
         OR u_current.role = 'admin'
      GROUP BY gs.id, u.username, gp.permission_type, u_current.role
      ORDER BY gs.created_at DESC
    `, [userId])
    
    return result.rows
  } catch (error) {
    console.error('Error getting user accessible games:', error)
    throw error
  }
}