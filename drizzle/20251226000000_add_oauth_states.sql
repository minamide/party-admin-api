-- Create table for OAuth state storage
CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    redirect_uri TEXT,
    expires_at TEXT NOT NULL
);
