-- Admin User erstellen
UPDATE users SET role = 'admin' WHERE username = 'admin';

-- Falls admin User nicht existiert, erstellen
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@quiz-arena.local', '$2b$10$placeholder', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Admin kann mehrere Spiele gleichzeitig hosten
ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
