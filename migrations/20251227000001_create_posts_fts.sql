-- Create FTS5 virtual table for posts full-text search
CREATE VIRTUAL TABLE posts_fts USING fts5(
  id UNINDEXED,
  content,
  author_name
);

-- Populate FTS index with existing posts
INSERT INTO posts_fts(id, content, author_name)
SELECT posts.id, posts.content, COALESCE(users.name, 'Unknown')
FROM posts
LEFT JOIN users ON posts.author_id = users.id;

-- Create trigger to keep FTS index in sync with posts table (INSERT)
CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(id, content, author_name) 
  SELECT NEW.id, NEW.content, (SELECT name FROM users WHERE users.id = NEW.author_id LIMIT 1);
END;

-- Create trigger to keep FTS index in sync with posts table (DELETE)
CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
  DELETE FROM posts_fts WHERE id = OLD.id;
END;

-- Create trigger to keep FTS index in sync with posts table (UPDATE)
CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
  DELETE FROM posts_fts WHERE id = OLD.id;
  INSERT INTO posts_fts(id, content, author_name)
  SELECT NEW.id, NEW.content, (SELECT name FROM users WHERE users.id = NEW.author_id LIMIT 1);
END;
