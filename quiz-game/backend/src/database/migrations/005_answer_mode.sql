-- Migration 005: Add answer_mode to game_sessions
-- 'competitive' = all teams answer simultaneously (original behavior)
-- 'turns'       = one team per round selects and answers; activeTeamIndex cycles

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS answer_mode VARCHAR(20) NOT NULL DEFAULT 'competitive';
