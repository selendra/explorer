# Create necessary directories
echo "Creating directories..."
mkdir -p data

# Set correct permissions
echo "Setting permissions..."
chmod -R 777 data

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
SURREALDB_URL=ws://localhost:8000
SURREALDB_USER=root
SURREALDB_PASS=root
EOF
fi

# Start SurrealDB
echo "Starting SurrealDB..."
docker-compose down
docker-compose up -d

# Wait for container to start
echo "Waiting for container to start..."
sleep 5

# Check container status
if docker ps | grep -q surrealdb; then
    echo "✅ SurrealDB container is running"
else
    echo "❌ SurrealDB container failed to start"
    docker-compose logs
    exit 1
fi

# Final health check
echo "Performing health check..."
./scripts/healthcheck.sh

echo "Setup completed!"
