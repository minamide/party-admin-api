-- Add group_id to posts so application schema and DB match
-- This migration adds a nullable `group_id` column and an index.
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
ALTER TABLE posts ADD COLUMN group_id TEXT;
COMMIT;
PRAGMA foreign_keys=on;

-- Index to support queries filtering by group
CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON posts (group_id, created_at);
