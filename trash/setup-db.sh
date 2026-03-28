#!/bin/bash

# Database file path
DB_DIR="./data"
DB_FILE="$DB_DIR/database.sqlite"
SCHEMA_FILE="./schema.sql"

echo "Setting up SQLite database using 'sqlite3' command..."

# Ensure data directory exists
if [ ! -d "$DB_DIR" ]; then
    echo "Creating directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo "Error: 'sqlite3' command not found. Please install it or use the Docker-based init-db.sh."
    exit 1
fi

# Execute the schema script
sqlite3 "$DB_FILE" < "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo "Database successfully initialized at $DB_FILE"
else
    echo "Error: Database initialization failed."
    exit 1
fi
