-- Quiz Arena Database Schema
-- This file is automatically executed when the PostgreSQL container starts

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Game sessions
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    game_code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    max_teams INTEGER DEFAULT 4,
    joker_count INTEGER DEFAULT 3,
    risiko_enabled BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    game_session_id INTEGER REFERENCES game_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL,
    current_score INTEGER DEFAULT 0,
    jokers_remaining INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Question categories
CREATE TABLE question_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3498db'
);

-- Questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES question_categories(id),
    question_text TEXT NOT NULL,
    points INTEGER DEFAULT 100,
    time_limit INTEGER DEFAULT 30,
    is_risiko BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Answer options
CREATE TABLE question_options (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
);

-- Insert default categories
INSERT INTO question_categories (name, description, color) VALUES
('Geographie', 'Länder, Städte, Kontinente', '#e74c3c'),
('Geschichte', 'Historische Ereignisse', '#9b59b6'),
('Wissenschaft', 'Physik, Chemie, Biologie', '#3498db'),
('Sport', 'Fußball, Olympia, etc.', '#e67e22'),
('Unterhaltung', 'Filme, Musik, TV', '#f39c12'),
('Allgemeinwissen', 'Verschiedenes', '#27ae60');