-- Quiz Arena Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'gamemaster', 'user')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    game_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    max_teams INTEGER DEFAULT 4,
    joker_count INTEGER DEFAULT 3,
    risiko_enabled BOOLEAN DEFAULT true,
    game_mode VARCHAR(20) DEFAULT 'self_service' CHECK (game_mode IN ('quizmaster', 'self_service')),
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    current_score INTEGER DEFAULT 0,
    jokers_remaining INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Question categories
CREATE TABLE IF NOT EXISTS question_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3498db'
);

-- Questions
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES question_categories(id) ON DELETE RESTRICT,
    question_text TEXT NOT NULL,
    points INTEGER DEFAULT 100,
    time_limit INTEGER DEFAULT 30,
    is_risiko BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Answer options
CREATE TABLE IF NOT EXISTS question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

-- Game answer history
CREATE TABLE IF NOT EXISTS game_answers (
    id SERIAL PRIMARY KEY,
    game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
    selected_option_id INTEGER REFERENCES question_options(id) ON DELETE SET NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    time_taken INTEGER,
    joker_used VARCHAR(20),
    answered_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for frequently queried FK columns
CREATE INDEX IF NOT EXISTS idx_teams_game_session ON teams(game_session_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_session ON game_answers(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_answers_team ON game_answers(team_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_creator ON game_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert default categories
INSERT INTO question_categories (name, description, color) VALUES
('Geographie', 'Länder, Städte, Kontinente', '#e74c3c'),
('Geschichte', 'Historische Ereignisse', '#9b59b6'),
('Wissenschaft', 'Physik, Chemie, Biologie', '#3498db'),
('Sport', 'Fußball, Olympia, etc.', '#e67e22'),
('Unterhaltung', 'Filme, Musik, TV', '#f39c12'),
('Allgemeinwissen', 'Verschiedenes', '#27ae60')
ON CONFLICT DO NOTHING;
