-- Create t_activity_groups table
CREATE TABLE IF NOT EXISTS t_activity_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color_code TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create rel_group_members table
CREATE TABLE IF NOT EXISTS rel_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  volunteer_id TEXT NOT NULL,
  role TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES t_activity_groups(id) ON DELETE CASCADE
);

-- Create index on group_id for faster queries
CREATE INDEX IF NOT EXISTS idx_rel_group_members_group_id ON rel_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_rel_group_members_volunteer_id ON rel_group_members(volunteer_id);
