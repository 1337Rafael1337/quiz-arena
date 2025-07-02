#!/usr/bin/env bun
import { pool } from './connection.js'
import fs from 'fs'
import path from 'path'

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...')
    
    // Read migration file
    const migrationPath = path.join(import.meta.dir, 'migrate-add-missing-columns.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute migration
    await pool.query(migrationSQL)
    
    console.log('✅ Migration completed successfully!')
    console.log('📊 Checking table structure...')
    
    // Verify the migration worked
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    console.log('\n📋 Users table structure:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`)
    })
    
    // Check if there are any users
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users')
    console.log(`\n👥 Total users in database: ${userCount.rows[0].count}`)
    
    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('\n⚠️  No users found. You may need to run the setup wizard first.')
      console.log('   Go to http://localhost:5173/setup to create the first admin user.')
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\n🔧 Troubleshooting:')
    console.error('   1. Make sure PostgreSQL is running')
    console.error('   2. Check database connection settings in .env')
    console.error('   3. Ensure the database exists')
    console.error('   4. Check if you have proper permissions')
  } finally {
    await pool.end()
  }
}

// Run migration if this file is executed directly
if (import.meta.main) {
  runMigration()
}