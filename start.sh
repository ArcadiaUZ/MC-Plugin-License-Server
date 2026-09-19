#!/bin/bash
# EpicServer License Server - Start Script
# Usage: ./start.sh [port]

PORT=${1:-3001}
echo "==========================================="
echo " EpicServer License Server v1.0"
echo "==========================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

echo "Starting License Server on port $PORT..."
echo "Admin panel: http://localhost:$PORT"
echo "API: http://localhost:$PORT/api"
echo ""

# Update port in config
CONFIG_FILE="$(dirname "$0")/config.json"
if [ -f "$CONFIG_FILE" ]; then
    # Use node to update port
    node -e "
        const fs = require('fs');
        const cfg = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
        cfg.port = $PORT;
        fs.writeFileSync('$CONFIG_FILE', JSON.stringify(cfg, null, 2));
        console.log('Port set to $PORT');
    "
fi

# Start server
export PORT=$PORT
node server.js