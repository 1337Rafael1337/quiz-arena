-- Remove duplicate categories (keep lowest id)
DELETE FROM question_categories a
USING question_categories b
WHERE a.id > b.id AND a.name = b.name;

-- Add unique constraint on name
ALTER TABLE question_categories ADD CONSTRAINT question_categories_name_unique UNIQUE (name);
