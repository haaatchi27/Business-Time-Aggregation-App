#!/bin/bash

# Service name defined in docker-compose.yml
SERVICE_NAME="Business-Time-Aggregation-App"

command -v docker || (echo "Docker is not installed" && exit 1)


# # root check
# USERID="$(sudo id -u 2>/dev/null)"
# if [ "$USERID" != "0" ]; then
#     echo "This script must be run as root"
#     exit 1
# fi  

docker ps > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Dockerはsudoなしで実行可能です。"  > /dev/null
else
    echo "Dockerの実行にsudoが必要です。"
fi





# Check for 'restart' argument
if [ "$1" == "restart" ]; then
    echo "Restarting containers with --build..."
    IS_RUNNING=$(docker compose ps --services --filter "status=running" | grep -w "$SERVICE_NAME")
    if [ -n "$IS_RUNNING" ]; then
        echo "Service '$SERVICE_NAME' is already running. Stopping and removing..."
        docker compose down
    fi  

    docker compose up -d --build
    exit 0
fi

# Check if the service is already running
# We use 'docker compose ps' and check if the service name is in the output with status 'running'
IS_RUNNING=$(docker compose ps --services --filter "status=running" | grep -w "$SERVICE_NAME")

if [ -n "$IS_RUNNING" ]; then
    echo "Service '$SERVICE_NAME' is already running. Doing nothing."
else
    echo "Service '$SERVICE_NAME' is not running. Starting now..."
     docker compose up -d
fi
