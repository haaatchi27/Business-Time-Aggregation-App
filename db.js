const path = require('path');
const fs = require('fs');

// Determine database path. Use environment variable or fallback to local ./data directory
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'database.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Wrapper for sql.js to perfectly mimic better-sqlite3 synchronous API
class BetterSqlite3Wrapper {
    constructor(db, dbPath) {
        this.db = db;
        this.dbPath = dbPath;
    }

    save() {
        const data = this.db.export();
        fs.writeFileSync(this.dbPath, Buffer.from(data));
    }

    prepare(sql) {
        const self = this;
        return {
            all: function (...args) {
                const stmt = self.db.prepare(sql);
                stmt.bind(args);
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            },
            get: function (...args) {
                const stmt = self.db.prepare(sql);
                stmt.bind(args);
                let result = undefined;
                if (stmt.step()) {
                    result = stmt.getAsObject();
                }
                stmt.free();
                return result;
            },
            run: function (...args) {
                const stmt = self.db.prepare(sql);
                stmt.run(args); // sql.js run accepts an array of bound params
                stmt.free();
                self.save(); // auto-save modifications to disk
                return { changes: 1, lastInsertRowid: undefined };
            }
        };
    }

    exec(sql) {
        this.db.run(sql);
        this.save();
    }

    transaction(fn) {
        return function (...args) {
            try {
                return fn(...args);
            } catch (err) {
                throw err;
            }
        };
    }
}

async function initDb() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    let dbInstance;

    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        dbInstance = new SQL.Database(filebuffer);
    } else {
        dbInstance = new SQL.Database();
    }

    const wrapper = new BetterSqlite3Wrapper(dbInstance, dbPath);

    // Initialize Schema
    wrapper.exec(`
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

    // Migrations
    try { wrapper.exec("ALTER TABLE tasks ADD COLUMN category_id INTEGER REFERENCES categories(id)"); } catch (err) { }
    try { wrapper.exec("ALTER TABLE tasks ADD COLUMN created_at TEXT DEFAULT (DATETIME('now', 'localtime'))"); } catch (err) { }

    // Recover orphaned tasks from deleted categories
    try { wrapper.exec("UPDATE tasks SET category_id = NULL WHERE category_id IN (SELECT id FROM categories WHERE is_deleted = 1)"); } catch (err) { }

    // Insert default user if not exists
    const userCount = wrapper.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount && userCount.count === 0) {
        wrapper.prepare('INSERT INTO users (name) VALUES (?)').run('Default User');
    }

    return wrapper;
}

module.exports = { init: initDb };
