-- Add ownership and permission system to existing schema

-- Add creator_id to questions table to track ownership
ALTER TABLE questions ADD COLUMN IF NOT EXISTS creator_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

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
WHERE creator_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_creator ON questions(creator_id);
CREATE INDEX IF NOT EXISTS idx_question_permissions_user ON question_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_permissions_question ON question_permissions(question_id);
CREATE INDEX IF NOT EXISTS idx_game_permissions_user ON game_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_permissions_game ON game_permissions(game_id);

-- Add some helpful views for easier querying
CREATE OR REPLACE VIEW user_accessible_questions AS
SELECT DISTINCT q.*, c.name as category_name, c.color as category_color,
       u.username as creator_name,
       CASE 
         WHEN q.creator_id = u_access.id THEN 'owner'
         WHEN qp.permission_type = 'write' THEN 'write'
         WHEN qp.permission_type = 'read' THEN 'read'
         WHEN u_access.role = 'admin' THEN 'admin'
         ELSE NULL
       END as access_level
FROM questions q
JOIN question_categories c ON q.category_id = c.id
LEFT JOIN users u ON q.creator_id = u.id
CROSS JOIN users u_access
LEFT JOIN question_permissions qp ON q.id = qp.question_id AND qp.user_id = u_access.id
WHERE q.creator_id = u_access.id 
   OR qp.user_id = u_access.id 
   OR u_access.role = 'admin';

CREATE OR REPLACE VIEW user_accessible_games AS
SELECT DISTINCT gs.*, u.username as creator_name,
       CASE 
         WHEN gs.creator_id = u_access.id THEN 'owner'
         WHEN gp.permission_type = 'write' THEN 'write'
         WHEN gp.permission_type = 'read' THEN 'read'
         WHEN u_access.role = 'admin' THEN 'admin'
         ELSE NULL
       END as access_level
FROM game_sessions gs
LEFT JOIN users u ON gs.creator_id = u.id
CROSS JOIN users u_access
LEFT JOIN game_permissions gp ON gs.id = gp.game_id AND gp.user_id = u_access.id
WHERE gs.creator_id = u_access.id 
   OR gp.user_id = u_access.id 
   OR u_access.role = 'admin';