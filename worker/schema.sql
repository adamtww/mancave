-- Man cave planner: accounts, shared layouts, version history.
-- Safe to run on every deploy (only creates what is missing).

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw         TEXT NOT NULL,              -- pbkdf2$iterations$salt$hash
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,           -- sha-256 of the bearer token; the token itself is never stored
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS layouts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,              -- JSON: lot, rooms, objects, object definitions
  based_on   INTEGER,                    -- layout this one was copied from (may be gone)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS versions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  layout_id  INTEGER NOT NULL REFERENCES layouts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS login_fails (
  username   TEXT NOT NULL COLLATE NOCASE,
  at         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Shared object library (owner_id NULL: only admins edit) plus each user's own objects.
CREATE TABLE IF NOT EXISTS objects (
  r          TEXT PRIMARY KEY,           -- object id, same as the catalog key; personal ones start with u<user id>-
  owner_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,              -- JSON definition: same fields as src/catalog.js, plus req (requirements)
  deleted    INTEGER NOT NULL DEFAULT 0, -- a shared object an admin removed (kept so the built-in stays hidden)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Space Planner: saved rooms
CREATE TABLE IF NOT EXISTS spaces (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       TEXT NOT NULL,              -- JSON: room size, settings, objects with positions, object definitions
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_layouts_owner   ON layouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_objects_owner   ON objects(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_owner    ON spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_versions_layout ON versions(layout_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fails_user      ON login_fails(username, at);
