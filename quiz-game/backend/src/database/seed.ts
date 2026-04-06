import fs from 'fs'
import path from 'path'
import { pool } from './connection.js'

async function seed() {
  console.log('Seeding database...')

  try {
    const baseDir = import.meta.dir || path.dirname(new URL(import.meta.url).pathname)

    // Insert sample questions if they exist
    const sampleQuestionsPath = path.join(baseDir, 'sample-questions.sql')
    if (fs.existsSync(sampleQuestionsPath)) {
      const sql = fs.readFileSync(sampleQuestionsPath, 'utf-8')
      await pool.query(sql)
      console.log('✅ Sample questions inserted')
    }

    // Insert sample answers if they exist
    const sampleAnswersPath = path.join(baseDir, 'sample-answers.sql')
    if (fs.existsSync(sampleAnswersPath)) {
      const sql = fs.readFileSync(sampleAnswersPath, 'utf-8')
      await pool.query(sql)
      console.log('✅ Sample answers inserted')
    }

    console.log('✅ Seeding complete')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
