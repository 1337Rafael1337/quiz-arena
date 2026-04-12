-- Migration 004: Gamemaster-owned questions and categories
-- NULL created_by = admin/global (available to all games)
-- Non-null created_by = owned by that gamemaster (only used in their games)

-- Add ownership column to categories
ALTER TABLE question_categories
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add ownership column to questions
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Indexes for ownership lookups
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON question_categories(created_by);

-- Drop the existing global unique constraint on category name
-- so gamemasters can create categories with the same name as admin categories
ALTER TABLE question_categories DROP CONSTRAINT IF EXISTS question_categories_name_key;

-- Admin categories: unique by name (global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_global
  ON question_categories(name) WHERE created_by IS NULL;

-- Gamemaster categories: unique per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_per_owner
  ON question_categories(name, created_by) WHERE created_by IS NOT NULL;
