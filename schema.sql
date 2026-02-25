-- Database schema for Activity Tracker
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);
-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    category_id INTEGER,
    name TEXT NOT NULL,
    is_deleted INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (DATETIME('now', 'localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
-- Records table
CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    task_id INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_sec INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);
-- Standardize migrations (matching db.js logic)
-- category_id column in tasks
-- Note: 'ALTER TABLE ADD COLUMN' is safe to run only if the column doesn't exist, 
-- but in pure SQL we usually handle this by checking table info or using a script.
-- For a simple init script, these CREATE TABLEs are sufficient.
-- Insert default user
INSERT
    OR IGNORE INTO users (id, name)
VALUES (1, 'Default User');