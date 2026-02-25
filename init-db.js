const db = require('./db.js');

console.log('Initializing database...');
try {
    // db.js initializes the schema on import/load, 
    // but we can explicitly call any logic if needed.
    // In this app, require('./db.js') is sufficient for setup.

    console.log('Database initialized successfully.');
    process.exit(0);
} catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
}
