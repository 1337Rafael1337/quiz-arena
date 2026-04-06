import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

function extractToken(req: Request): string | null {
  // httpOnly cookie takes priority (XSS-safe)
  if ((req as any).cookies?.authToken) return (req as any).cookies.authToken
  // Fallback: Authorization header (e.g. for direct API calls)
  const authHeader = req.headers['authorization']
  return authHeader?.split(' ')[1] || null
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' })
    }

    req.userId = decoded.userId
    req.userRole = decoded.role
    next()
  })
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

export const requireGamemaster = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'admin' && req.userRole !== 'gamemaster') {
    return res.status(403).json({ error: 'Gamemaster or admin access required' })
  }
  next()
}
