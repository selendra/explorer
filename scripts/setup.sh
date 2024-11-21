# Check for required tools
echo "Checking required tools..."

MISSING_TOOLS=0
for tool in docker curl; do
    if ! command_exists $tool; then
        echo "❌ $tool is not installed"
        MISSING_TOOLS=1
    else
        echo "✅ $tool is installed"
    fi
done

if [ $MISSING_TOOLS -eq 1 ]; then
    echo "Installing missing tools..."
    install_dependencies
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p data
mkdir -p database

# Set correct permissions
echo "Setting permissions..."
chmod -R 777 data
chmod -R 777 database

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