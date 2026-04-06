import fs from 'fs'
import path from 'path'
import { pool } from './connection.js'

async function migrate() {
  console.log('Running database migrations...')

  try {
    // Run main schema
    const schemaPath = path.join(import.meta.dir || path.dirname(new URL(import.meta.url).pathname), 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    await pool.query(schema)
    console.log('✅ Schema applied successfully')

    // Run migration files if they exist
    const migrationsDir = path.join(path.dirname(schemaPath), 'migrations')
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()

      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
        try {
          await pool.query(sql)
          console.log(`✅ Migration applied: ${file}`)
        } catch (err: any) {
          // Skip if already applied (e.g. column already exists)
          if (err.code === '42701' || err.code === '42P07') {
            console.log(`⏭️  Migration already applied: ${file}`)
          } else {
            throw err
          }
        }
      }
    }

    console.log('✅ All migrations complete')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
