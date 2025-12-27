-- Add redirect_uri column to oauth_states table
ALTER TABLE oauth_states ADD COLUMN redirect_uri TEXT;
