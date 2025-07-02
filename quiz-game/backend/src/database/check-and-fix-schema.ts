#!/usr/bin/env bun
import { pool } from './connection.js'

async function checkAndFixSchema() {
  try {
    console.log('🔍 Checking database schema...')
    
    // Check if users table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      )
    `)
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Users table does not exist!')
      console.log('🔧 Please run the full schema setup first:')
      console.log('   psql -d quiz_arena -f src/database/schema.sql')
      return
    }
    
    // Check for missing columns
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `)
    
    const existingColumns = columns.rows.map(row => row.column_name)
    const requiredColumns = ['id', 'username', 'email', 'password_hash', 'role', 'is_active', 'created_at', 'updated_at']
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.length > 0) {
      console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`)
      console.log('🔧 Fixing schema...')
      
      for (const column of missingColumns) {
        let sql = ''
        switch (column) {
          case 'is_active':
            sql = 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true'
            break
          case 'updated_at':
            sql = 'ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()'
            break
          default:
            console.log(`❌ Don't know how to add column: ${column}`)
            continue
        }
        
        try {
          await pool.query(sql)
          console.log(`✅ Added column: ${column}`)
        } catch (error) {
          console.error(`❌ Failed to add column ${column}:`, error.message)
        }
      }
      
      // Update existing records
      await pool.query('UPDATE users SET is_active = true WHERE is_active IS NULL')
      await pool.query('UPDATE users SET updated_at = created_at WHERE updated_at IS NULL')
      
    } else {
      console.log('✅ All required columns exist!')
    }
    
    // Show final schema
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Final users table schema:')
    finalColumns.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : ''} ${row.column_default || ''}`)
    })
    
    // Test a simple query
    const testQuery = await pool.query('SELECT id, username, role, is_active FROM users LIMIT 1')
    console.log('\n🧪 Test query successful!')
    
    if (testQuery.rows.length > 0) {
      console.log('👤 Sample user:', testQuery.rows[0])
    } else {
      console.log('📝 No users found. Create one via setup wizard.')
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message)
    
    if (error.message.includes('does not exist')) {
      console.log('\n🔧 Quick fix options:')
      console.log('1. Run full schema setup:')
      console.log('   cd quiz-game/backend')
      console.log('   psql -d quiz_arena -f src/database/schema.sql')
      console.log('')
      console.log('2. Or create database and run schema:')
      console.log('   createdb quiz_arena')
      console.log('   psql -d quiz_arena -f src/database/schema.sql')
    }
  } finally {
    await pool.end()
  }
}

if (import.meta.main) {
  checkAndFixSchema()
}