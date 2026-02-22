const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database path. Use environment variable or fallback to local ./data directory
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');

// Ensure the directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath, { verbose: console.log });

// Initialize database
function initDb() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            is_deleted INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

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
    `);

    try {
        // Attempt to add category_id column if it doesn't exist
        db.exec("ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES categories(id)");
    } catch (err) {
        // Ignore if column already exists
    }

    try {
        // Attempt to add created_at column if it doesn't exist
        db.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT DEFAULT (DATETIME('now', 'localtime'))");
    } catch (err) {
        // Ignore if column already exists
    }

    // Recover orphaned tasks from deleted categories
    try {
        db.exec("UPDATE tasks SET category_id = NULL WHERE category_id IN (SELECT id FROM categories WHERE is_deleted = 1)");
    } catch (err) {
        console.error('Failed to recover orphaned tasks:', err.message);
    }

    // Insert default user if not exists
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        db.prepare('INSERT INTO users (name) VALUES (?)').run('Default User');
    }
}

initDb();

module.exports = db;
