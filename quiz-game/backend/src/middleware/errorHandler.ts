import { Request, Response, NextFunction } from 'express'

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err)

  // Don't leak internal error details to the client
  const statusCode = err.statusCode || 500
  const message = statusCode === 500
    ? 'Interner Serverfehler'
    : err.clientMessage || 'Ein Fehler ist aufgetreten'

  res.status(statusCode).json({ error: message })
}

// Helper to create errors with client-safe messages
export class AppError extends Error {
  statusCode: number
  clientMessage: string

  constructor(statusCode: number, clientMessage: string, internalMessage?: string) {
    super(internalMessage || clientMessage)
    this.statusCode = statusCode
    this.clientMessage = clientMessage
  }
}
