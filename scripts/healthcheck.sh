#!/bin/bash

echo "Checking SurrealDB Status..."

# Check if Docker container is running
if docker ps | grep -q surrealdb; then
    echo "✅ SurrealDB container is running"
else
    echo "❌ SurrealDB container is not running"
    exit 1
fi

# Check if port 8000 is listening
if netstat -tuln | grep -q ":8000 "; then
    echo "✅ Port 8000 is open"
else
    echo "❌ Port 8000 is not open"
    exit 1
fi

# Try HTTP health check
if curl -s -f http://localhost:8000/health > /dev/null; then
    echo "✅ HTTP health check passed"
else
    echo "❌ HTTP health check failed"
    exit 1
fi

# Check WebSocket connection
echo "Testing WebSocket connection..."
wscat -c ws://localhost:8000 </dev/null && {
    echo "✅ WebSocket connection successful"
} || {
    echo "❌ WebSocket connection failed"
    exit 1
}

echo "All checks completed!"