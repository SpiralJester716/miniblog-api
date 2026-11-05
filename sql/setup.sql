BEGIN;
CREATE TABLE IF NOT EXISTS authors (
 id SERIAL PRIMARY KEY,
 name TEXT NOT NULL CHECK (length(trim(name)) > 0),
 email TEXT NOT NULL CHECK (length(trim(email)) > 0),
 bio TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS authors_email_unique ON authors (lower(email));
CREATE TABLE IF NOT EXISTS posts (
 id SERIAL PRIMARY KEY,
 author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK (length(trim(title)) > 0),
 content TEXT NOT NULL CHECK (length(trim(content)) > 0),
 published BOOLEAN NOT NULL DEFAULT FALSE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE TABLE IF NOT EXISTS comments (
 id SERIAL PRIMARY KEY,
 post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
 content TEXT NOT NULL CHECK (length(trim(content)) > 0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments(author_id);
COMMIT;
