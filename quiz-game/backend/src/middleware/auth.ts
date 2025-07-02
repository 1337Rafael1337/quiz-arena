import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Access token required' })
  }

  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET environment variable not set!')
    return res.status(500).json({ error: 'Server configuration error' })
  }
  
  jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
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
