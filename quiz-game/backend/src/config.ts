// Zentrale Konfiguration - alle Environment-Variablen werden hier validiert

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Set it in your .env file.`)
  }
  return value
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue
}

// In development, allow defaults for DB connection
const isDev = process.env.NODE_ENV !== 'production'

export const config = {
  // Required in production, defaults in dev
  JWT_SECRET: isDev
    ? optionalEnv('JWT_SECRET', 'dev-secret-PLEASE-SET-JWT_SECRET-in-env-file')
    : requireEnv('JWT_SECRET'),

  DB_HOST: optionalEnv('DB_HOST', 'localhost'),
  DB_PORT: parseInt(optionalEnv('DB_PORT', '5432')),
  DB_NAME: optionalEnv('DB_NAME', 'quiz_arena'),
  DB_USER: isDev
    ? optionalEnv('DB_USER', 'quiz_user')
    : requireEnv('DB_USER'),
  DB_PASSWORD: isDev
    ? optionalEnv('DB_PASSWORD', 'quiz_password_123')
    : requireEnv('DB_PASSWORD'),

  PORT: parseInt(optionalEnv('PORT', '3001')),
  CLIENT_URL: optionalEnv('CLIENT_URL', 'http://localhost:5173'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),

  // SMTP (optional - falls nicht gesetzt, wird Verification-Link nur geloggt)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(optionalEnv('SMTP_PORT', '587')),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: optionalEnv('SMTP_FROM', 'Quiz Arena <noreply@quiz-arena.de>'),
} as const

// Warn in dev mode about insecure defaults
if (isDev) {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set - using random dev secret. Set it in .env for stable sessions.')
  }
  if (!process.env.DB_PASSWORD) {
    console.warn('⚠️  DB_PASSWORD not set - using dev default. Set it in .env for production.')
  }
}
