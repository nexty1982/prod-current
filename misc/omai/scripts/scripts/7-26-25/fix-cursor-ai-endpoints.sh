#!/bin/bash

echo "🔧 Fixing Cursor AI Endpoints..."
echo "================================="

# Check if server is running
echo "[INFO] Checking if server is running..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "[SUCCESS] Server is running on port 3001"
else
    echo "[ERROR] Server is not running on port 3001"
    echo "[INFO] Please start the server first: npm start"
    exit 1
fi

# Run the database schema check
echo "[INFO] Running database schema check..."
./check-cursor-ai-schema.sh

if [ $? -ne 0 ]; then
    echo "[ERROR] Database schema check failed"
    exit 1
fi

# Test the endpoints
echo ""
echo "[INFO] Testing Cursor AI endpoints..."

# Test status endpoint
echo "[INFO] Testing GET /api/ai/cursor/status..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:3001/api/ai/cursor/status)
if echo "$STATUS_RESPONSE" | grep -q "status"; then
    echo "[SUCCESS] Status endpoint working"
    echo "Response: $STATUS_RESPONSE"
else
    echo "[ERROR] Status endpoint failed"
    echo "Response: $STATUS_RESPONSE"
fi

# Test assign endpoint
echo ""
echo "[INFO] Testing POST /api/ai/cursor/assign..."
ASSIGN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/assign \
    -H "Content-Type: application/json" \
    -d '{"task": "Test task from script"}')
if echo "$ASSIGN_RESPONSE" | grep -q "success"; then
    echo "[SUCCESS] Assign endpoint working"
    echo "Response: $ASSIGN_RESPONSE"
else
    echo "[ERROR] Assign endpoint failed"
    echo "Response: $ASSIGN_RESPONSE"
fi

# Test clear endpoint
echo ""
echo "[INFO] Testing POST /api/ai/cursor/clear..."
CLEAR_RESPONSE=$(curl -s -X POST http://localhost:3001/api/ai/cursor/clear)
if echo "$CLEAR_RESPONSE" | grep -q "success"; then
    echo "[SUCCESS] Clear endpoint working"
    echo "Response: $CLEAR_RESPONSE"
else
    echo "[ERROR] Clear endpoint failed"
    echo "Response: $CLEAR_RESPONSE"
fi

echo ""
echo "[INFO] Cursor AI endpoint fix completed!"
echo "[INFO] You can now access the Cursor AI Status Panel at:"
echo "[INFO] https://orthodoxmetrics.com/admin/settings"
echo "[INFO] (Only visible to super_admin users)" 