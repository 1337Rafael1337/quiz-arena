-- Users Tabelle für Authentifizierung hinzufügen
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'player',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admin User erstellen (Passwort wird vom Backend gesetzt)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@quiz-arena.local', 'placeholder', 'admin');

-- game_sessions Tabelle erweitern für created_by
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

-- Index für bessere Performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
