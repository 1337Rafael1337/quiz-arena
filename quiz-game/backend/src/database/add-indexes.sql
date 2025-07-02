-- Performance Indexes for Quiz Arena Database
-- Run this after schema.sql to improve query performance

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_category_id ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_points ON questions(points);
CREATE INDEX IF NOT EXISTS idx_questions_is_risiko ON questions(is_risiko);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

-- Question options indexes
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_is_correct ON question_options(is_correct);
CREATE INDEX IF NOT EXISTS idx_question_options_sort_order ON question_options(sort_order);

-- Game sessions indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_code ON game_sessions(game_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_creator_id ON game_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON game_sessions(created_at);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_game_session_id ON teams(game_session_id);
CREATE INDEX IF NOT EXISTS idx_teams_current_score ON teams(current_score);

-- Question categories indexes
CREATE INDEX IF NOT EXISTS idx_question_categories_name ON question_categories(name);

-- Users indexes (if not already created)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_questions_category_points ON questions(category_id, points);
CREATE INDEX IF NOT EXISTS idx_questions_category_risiko ON questions(category_id, is_risiko);
CREATE INDEX IF NOT EXISTS idx_teams_game_score ON teams(game_session_id, current_score DESC);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_users_active_admins ON users(role) WHERE is_active = true AND role = 'admin';
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(created_at) WHERE status = 'active';

ANALYZE;