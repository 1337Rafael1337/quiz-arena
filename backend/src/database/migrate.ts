#!/usr/bin/env bun
import { pool } from './connection.js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function runMigrations() {
  console.log('🚀 Starting database migrations...')
  
  try {
    // Read and execute schema
    const schemaPath = join(import.meta.dir, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    
    await pool.query(schema)
    console.log('✅ Schema migration completed')
    
    // Check if categories exist
    const categoriesResult = await pool.query('SELECT COUNT(*) FROM question_categories')
    const categoriesCount = parseInt(categoriesResult.rows[0].count)
    
    if (categoriesCount === 0) {
      console.log('📝 Seeding initial data...')
      
      // Insert categories
      const categoriesPath = join(import.meta.dir, 'sample-categories.sql')
      try {
        const categories = readFileSync(categoriesPath, 'utf-8')
        await pool.query(categories)
        console.log('✅ Categories seeded')
      } catch (error) {
        console.log('⚠️  Categories file not found, using default categories')
        await pool.query(`
          INSERT INTO question_categories (name, description, color) VALUES
          ('Geographie', 'Länder, Städte, Kontinente', '#e74c3c'),
          ('Geschichte', 'Historische Ereignisse', '#9b59b6'),
          ('Wissenschaft', 'Physik, Chemie, Biologie', '#3498db'),
          ('Sport', 'Fußball, Olympia, etc.', '#e67e22'),
          ('Unterhaltung', 'Filme, Musik, TV', '#f39c12'),
          ('Allgemeinwissen', 'Verschiedenes', '#27ae60')
          ON CONFLICT DO NOTHING
        `)
      }
      
      // Insert sample questions if available
      try {
        const questionsPath = join(import.meta.dir, 'sample-questions.sql')
        const questions = readFileSync(questionsPath, 'utf-8')
        await pool.query(questions)
        console.log('✅ Sample questions seeded')
        
        // Insert sample answers if available
        const answersPath = join(import.meta.dir, 'sample-answers.sql')
        const answers = readFileSync(answersPath, 'utf-8')
        await pool.query(answers)
        console.log('✅ Sample answers seeded')
      } catch (error) {
        console.log('⚠️  Sample questions/answers not found, skipping...')
      }
    } else {
      console.log('✅ Database already contains data, skipping seeding')
    }
    
    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations()
}