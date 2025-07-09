-- Migration 002: Add Permission System
-- This migration adds the role-based permission system

-- Add creator_id to questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'questions' AND column_name = 'creator_id') THEN
        ALTER TABLE questions ADD COLUMN creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create question_permissions table for sharing questions between users
CREATE TABLE IF NOT EXISTS question_permissions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    permission_type VARCHAR(20) DEFAULT 'read' CHECK (permission_type IN ('read', 'write')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(question_id, user_id)
);

-- Create game_permissions table for sharing games between users
CREATE TABLE IF NOT EXISTS game_permissions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    permission_type VARCHAR(20) DEFAULT 'read' CHECK (permission_type IN ('read', 'write')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(game_id, user_id)
);

-- Update existing questions to have creator_id (set to first admin if no creator)
UPDATE questions 
SET creator_id = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE creator_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_creator ON questions(creator_id);
CREATE INDEX IF NOT EXISTS idx_question_permissions_user ON question_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_permissions_question ON question_permissions(question_id);
CREATE INDEX IF NOT EXISTS idx_game_permissions_user ON game_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_permissions_game ON game_permissions(game_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active_admins ON users(role) WHERE is_active = true AND role = 'admin';

-- Create migration tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- Record this migration
INSERT INTO schema_migrations (version) VALUES ('002_add_permissions') 
ON CONFLICT (version) DO NOTHING;