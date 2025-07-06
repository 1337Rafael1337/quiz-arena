#!/usr/bin/env bun
import { pool } from './connection.js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')
  
  try {
    // Clear existing data (be careful in production!)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Clearing existing data...')
      await pool.query('TRUNCATE TABLE game_answers, question_options, questions, teams, game_sessions, question_categories RESTART IDENTITY CASCADE')
    }
    
    // Insert categories
    console.log('📝 Inserting categories...')
    await pool.query(`
      INSERT INTO question_categories (name, description, color) VALUES
      ('Geographie', 'Länder, Städte, Kontinente', '#e74c3c'),
      ('Geschichte', 'Historische Ereignisse', '#9b59b6'),
      ('Wissenschaft', 'Physik, Chemie, Biologie', '#3498db'),
      ('Sport', 'Fußball, Olympia, etc.', '#e67e22'),
      ('Unterhaltung', 'Filme, Musik, TV', '#f39c12'),
      ('Allgemeinwissen', 'Verschiedenes', '#27ae60')
    `)
    
    // Insert sample questions
    console.log('📝 Inserting sample questions...')
    const questionsPath = join(import.meta.dir, 'sample-questions.sql')
    const questions = readFileSync(questionsPath, 'utf-8')
    await pool.query(questions)
    
    // Insert sample answers
    console.log('📝 Inserting sample answers...')
    const answersPath = join(import.meta.dir, 'sample-answers.sql')
    const answers = readFileSync(answersPath, 'utf-8')
    await pool.query(answers)
    
    // Verify data
    const categoriesResult = await pool.query('SELECT COUNT(*) FROM question_categories')
    const questionsResult = await pool.query('SELECT COUNT(*) FROM questions')
    const optionsResult = await pool.query('SELECT COUNT(*) FROM question_options')
    
    console.log(`✅ Seeding completed:`)
    console.log(`   - ${categoriesResult.rows[0].count} categories`)
    console.log(`   - ${questionsResult.rows[0].count} questions`)
    console.log(`   - ${optionsResult.rows[0].count} answer options`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run seeding if this file is executed directly
if (import.meta.main) {
  seedDatabase()
}