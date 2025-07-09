#!/usr/bin/env bun
import { pool } from './connection.js'
import fs from 'fs'
import path from 'path'

interface Migration {
  version: string
  filename: string
  sql: string
}

class DatabaseMigrator {
  private migrationsPath: string

  constructor() {
    this.migrationsPath = path.join(import.meta.dir, 'migrations')
  }

  async ensureMigrationsTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(50) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `)
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const result = await pool.query('SELECT version FROM schema_migrations ORDER BY version')
      return result.rows.map(row => row.version)
    } catch (error) {
      // If table doesn't exist, return empty array
      return []
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations()
    const allMigrations = this.getAllMigrations()
    
    return allMigrations.filter(migration => 
      !appliedMigrations.includes(migration.version)
    )
  }

  getAllMigrations(): Migration[] {
    if (!fs.existsSync(this.migrationsPath)) {
      console.log('📁 No migrations directory found')
      return []
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort()

    return files.map(filename => {
      const version = filename.replace('.sql', '')
      const sql = fs.readFileSync(path.join(this.migrationsPath, filename), 'utf8')
      
      return {
        version,
        filename,
        sql
      }
    })
  }

  async runMigration(migration: Migration): Promise<void> {
    console.log(`🔄 Running migration: ${migration.filename}`)
    
    try {
      await pool.query('BEGIN')
      
      // Execute the migration SQL
      await pool.query(migration.sql)
      
      // Record the migration as applied
      await pool.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [migration.version]
      )
      
      await pool.query('COMMIT')
      console.log(`✅ Migration completed: ${migration.filename}`)
    } catch (error) {
      await pool.query('ROLLBACK')
      throw new Error(`Migration ${migration.filename} failed: ${error.message}`)
    }
  }

  async migrate(): Promise<void> {
    try {
      console.log('🚀 Starting database migration...')
      
      // Ensure migrations table exists
      await this.ensureMigrationsTable()
      
      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations()
      
      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date - no migrations to run')
        return
      }
      
      console.log(`📋 Found ${pendingMigrations.length} pending migration(s):`)
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration.filename}`)
      })
      
      // Run each pending migration
      for (const migration of pendingMigrations) {
        await this.runMigration(migration)
      }
      
      console.log('🎉 All migrations completed successfully!')
      
      // Show current database status
      await this.showStatus()
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message)
      throw error
    }
  }

  async showStatus(): Promise<void> {
    console.log('\n📊 Database Status:')
    
    try {
      const appliedMigrations = await this.getAppliedMigrations()
      console.log(`   Applied migrations: ${appliedMigrations.length}`)
      
      if (appliedMigrations.length > 0) {
        console.log('   Latest migrations:')
        appliedMigrations.slice(-3).forEach(version => {
          console.log(`     - ${version}`)
        })
      }
      
      // Check table counts
      const tables = ['users', 'questions', 'game_sessions', 'question_categories']
      for (const table of tables) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`)
          console.log(`   ${table}: ${result.rows[0].count} records`)
        } catch (error) {
          console.log(`   ${table}: table not found`)
        }
      }
      
    } catch (error) {
      console.error('   Error getting status:', error.message)
    }
  }

  async rollback(targetVersion?: string): Promise<void> {
    console.log('⚠️  Rollback functionality not implemented yet')
    console.log('   For now, you need to manually revert database changes')
    
    if (targetVersion) {
      console.log(`   Target version: ${targetVersion}`)
    }
  }
}

// CLI interface
async function main() {
  const migrator = new DatabaseMigrator()
  const command = process.argv[2] || 'migrate'
  
  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await migrator.migrate()
        break
        
      case 'status':
        await migrator.ensureMigrationsTable()
        await migrator.showStatus()
        break
        
      case 'rollback':
      case 'down':
        const targetVersion = process.argv[3]
        await migrator.rollback(targetVersion)
        break
        
      default:
        console.log('Usage:')
        console.log('  bun migrator.ts migrate    - Run pending migrations')
        console.log('  bun migrator.ts status     - Show migration status')
        console.log('  bun migrator.ts rollback   - Rollback migrations (not implemented)')
        break
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if this file is executed directly
if (import.meta.main) {
  main()
}

export { DatabaseMigrator }