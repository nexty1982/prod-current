#!/bin/bash

echo "🔍 Checking Cursor AI database schema..."
echo "====================================="

# Check if ai_agents table exists
echo "[INFO] Checking if ai_agents table exists..."
TABLE_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SHOW TABLES LIKE 'ai_agents';" 2>/dev/null | grep -c "ai_agents")

if [ "$TABLE_EXISTS" -eq 0 ]; then
    echo "[WARNING] ai_agents table not found. Applying calendar schema..."
    
    # Apply the calendar schema
    mysql -u orthodoxapps -p'OrthodoxApps2024!' orthodoxmetrics_db < server/calendar-schema.sql
    
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] Calendar schema applied successfully"
    else
        echo "[ERROR] Failed to apply calendar schema"
        exit 1
    fi
else
    echo "[SUCCESS] ai_agents table already exists"
fi

# Check if ai_tasks table exists
echo "[INFO] Checking if ai_tasks table exists..."
TASKS_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SHOW TABLES LIKE 'ai_tasks';" 2>/dev/null | grep -c "ai_tasks")

if [ "$TASKS_EXISTS" -eq 0 ]; then
    echo "[WARNING] ai_tasks table not found. Applying calendar schema..."
    
    # Apply the calendar schema
    mysql -u orthodoxapps -p'OrthodoxApps2024!' orthodoxmetrics_db < server/calendar-schema.sql
    
    if [ $? -eq 0 ]; then
        echo "[SUCCESS] Calendar schema applied successfully"
    else
        echo "[ERROR] Failed to apply calendar schema"
        exit 1
    fi
else
    echo "[SUCCESS] ai_tasks table already exists"
fi

# Check if Cursor agent exists
echo "[INFO] Checking if Cursor agent exists..."
CURSOR_EXISTS=$(mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; SELECT COUNT(*) FROM ai_agents WHERE name = 'Cursor';" 2>/dev/null | tail -n 1)

if [ "$CURSOR_EXISTS" -eq 0 ]; then
    echo "[INFO] Creating Cursor agent..."
    mysql -u orthodoxapps -p'OrthodoxApps2024!' -e "USE orthodoxmetrics_db; INSERT INTO ai_agents (id, name, status, queue_length, last_activity) VALUES ('agent-cursor-$(date +%s)', 'Cursor', 'idle', 0, NOW());"
    echo "[SUCCESS] Cursor agent created"
else
    echo "[SUCCESS] Cursor agent already exists"
fi

echo ""
echo "[INFO] Database schema check completed!"
echo "[INFO] You can now test the Cursor AI endpoints:"
echo "[INFO] - GET /api/ai/cursor/status"
echo "[INFO] - POST /api/ai/cursor/assign"
echo "[INFO] - POST /api/ai/cursor/clear" 