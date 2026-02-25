#!/bin/bash

# Service name in docker-compose.yml
SERVICE_NAME="app"

echo "Initializing database..."

# Run the initialization using 'docker compose run' which works even if the container is stopped.
# The --rm flag ensures the temporary container is removed after the command.
sudo docker compose run --rm $SERVICE_NAME npm run init-db

if [ $? -eq 0 ]; then
    echo "Done."
else
    echo "Database initialization failed."
    exit 1
fi
