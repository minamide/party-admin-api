-- Add group_id to posts so application schema and DB match
-- D1/Workers does not allow raw BEGIN/COMMIT or PRAGMA in migrations executed via the API.
-- Keep statements simple: ALTER TABLE and CREATE INDEX only.
ALTER TABLE posts ADD COLUMN group_id TEXT;

-- Index to support queries filtering by group
CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON posts (group_id, created_at);
