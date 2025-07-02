-- Migration: Add missing columns to existing database
-- Run this if you get "column does not exist" errors

-- Check if is_active column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to users table';
    ELSE
        RAISE NOTICE 'is_active column already exists in users table';
    END IF;
END $$;

-- Check if updated_at column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to users table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in users table';
    END IF;
END $$;

-- Update all existing users to be active
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Make sure all existing users have updated_at
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;

COMMIT;