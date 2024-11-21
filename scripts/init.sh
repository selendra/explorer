# Stop and remove everything
docker-compose down -v

# Remove any existing data
sudo rm -rf data
sudo rm -rf database

# Create database directory for schema
mkdir -p database

# Create init script
cat > database/init.sh << 'EOF'
#!/bin/sh
echo "Waiting for SurrealDB to be ready..."
sleep 5
echo "Applying database schema..."
surreal sql --conn http://surrealdb:8000 --user root --pass root --ns blockchain --db mainnet < /app/database/schema.surql
echo "Schema initialization completed"
EOF

# Create schema file
cat > database/schema.surql << 'EOF'
-- Define namespace and database
DEFINE NAMESPACE blockchain;
USE NS blockchain;

-- Define databases for different networks
DEFINE DATABASE mainnet;
USE NS blockchain DB mainnet;

-- Define the blocks table
DEFINE TABLE blocks SCHEMAFULL;

-- Define fields with validations
DEFINE FIELD block_number ON blocks TYPE number ASSERT $value >= 0;
DEFINE FIELD block_hash ON blocks TYPE string ASSERT $value != NONE;
DEFINE FIELD timestamp ON blocks TYPE number ASSERT $value > 0;

-- Define indexes for better query performance
DEFINE INDEX block_number ON blocks FIELDS block_number UNIQUE;
DEFINE INDEX block_timestamp ON blocks FIELDS timestamp;
EOF

# Set permissions
chmod +x database/init.sh
chmod 644 database/schema.surql

# Start the containers
docker-compose up -d

# Check logs
docker-compose logs -f