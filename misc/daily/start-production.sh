#!/bin/bash

echo "🚀 Starting Orthodox Metrics in Production Mode (FIXED SESSION CONFIG)"
echo "====================================================================="

# Set production environment FIRST
export NODE_ENV=production
export SESSION_SECRET="orthodox-metrics-production-secret-2025"
export TRUST_PROXY=true

# Database settings
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=orthodoxapps
export DB_PASSWORD="Summerof1982@!"
export DB_NAME=orthodoxmetrics_db

# Server settings
export PORT=3001
export HOST=0.0.0.0

# Production security settings
export BCRYPT_ROUNDS=12
export SESSION_SECURE=true  # Temporarily disabled for debugging

echo "✅ Environment variables set for production"
echo "NODE_ENV: $NODE_ENV"
echo "SESSION_SECRET: SET"
echo "DB_NAME: $DB_NAME"
echo "DB_HOST: $DB_HOST"
echo "PORT: $PORT"

echo ""
echo "🔧 Starting server with FIXED session configuration..."
echo "Using: node index.js"
echo ""

# Clear any cached session data
echo "🧹 Clearing any cached session data..."
rm -f /tmp/sessions.* 2>/dev/null || true

# Start the server
node index.js 
