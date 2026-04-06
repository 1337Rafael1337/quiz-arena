import pkg from 'pg'
const { Pool } = pkg
import { config } from '../config.js'

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
})

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection error:', err.stack)
  } else {
    console.log('✅ Database connected successfully')
    release()
  }
})

export { pool }
