#!/bin/bash

# OrthodoxMetrics Calendar System Database Schema - Simple Version
echo "🔧 Running OrthodoxMetrics Calendar Database Schema (Simple Version)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if schema file exists
if [ ! -f "server/calendar-schema.sql" ]; then
    print_error "Calendar schema file not found: server/calendar-schema.sql"
    exit 1
fi

print_status "Calendar schema file found. Creating database schema..."

# Get database credentials
read -p "Enter MySQL username (default: orthodoxapps): " DB_USER
DB_USER=${DB_USER:-orthodoxapps}

read -s -p "Enter MySQL password: " DB_PASS
echo ""

read -p "Enter MySQL host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database name (default: orthodoxmetrics_db): " DB_NAME
DB_NAME=${DB_NAME:-orthodoxmetrics_db}

print_status "Creating calendar database schema (tables and data only)..."

# Create a temporary file with just the tables and data (no procedures/triggers)
TEMP_SCHEMA="/tmp/calendar_schema_temp.sql"

# Extract everything up to the stored procedures section
sed '/^-- =============================================================================$/,/^-- CREATE STORED PROCEDURES$/!d;/^-- CREATE STORED PROCEDURES$/d' server/calendar-schema.sql > "$TEMP_SCHEMA"

# Add the USE statement at the beginning
echo "USE $DB_NAME;" | cat - "$TEMP_SCHEMA" > temp && mv temp "$TEMP_SCHEMA"

# Run the simplified schema
mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" < "$TEMP_SCHEMA"

if [ $? -eq 0 ]; then
    print_success "Database tables and data created successfully!"
    
    # Now try to add the stored procedures and triggers
    print_status "Adding stored procedures and triggers..."
    
    # Create procedures and triggers separately
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" "$DB_NAME" << 'EOF'
-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS CreateAITask;
DROP PROCEDURE IF EXISTS UpdateTaskStatus;
DROP PROCEDURE IF EXISTS SyncTaskWithKanban;

DELIMITER //

-- Procedure to create a new AI task
CREATE PROCEDURE CreateAITask(
    IN p_title VARCHAR(255),
    IN p_description TEXT,
    IN p_assigned_to VARCHAR(100),
    IN p_status ENUM('pending', 'in_progress', 'completed', 'blocked'),
    IN p_due_date DATE,
    IN p_agent ENUM('Ninja', 'Claude', 'Cursor', 'OM-AI', 'Junie', 'GitHub Copilot'),
    IN p_priority ENUM('low', 'medium', 'high', 'critical'),
    IN p_estimated_hours DECIMAL(5,2)
)
BEGIN
    DECLARE task_id VARCHAR(100);
    SET task_id = CONCAT('OM-AI-TASK-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000));
    
    INSERT INTO ai_tasks (
        id, title, description, assigned_to, status, due_date, 
        agent, priority, estimated_hours, created_at, updated_at
    ) VALUES (
        task_id, p_title, p_description, p_assigned_to, p_status, p_due_date,
        p_agent, p_priority, p_estimated_hours, NOW(), NOW()
    );
    
    SELECT task_id as new_task_id;
END //

-- Procedure to update task status
CREATE PROCEDURE UpdateTaskStatus(
    IN p_task_id VARCHAR(100),
    IN p_status ENUM('pending', 'in_progress', 'completed', 'blocked')
)
BEGIN
    UPDATE ai_tasks 
    SET status = p_status, updated_at = NOW()
    WHERE id = p_task_id;
    
    -- Log the activity
    INSERT INTO task_activity_log (id, task_id, user_id, action, details)
    VALUES (
        CONCAT('log-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
        p_task_id,
        'system',
        'status_update',
        JSON_OBJECT('old_status', (SELECT status FROM ai_tasks WHERE id = p_task_id), 'new_status', p_status)
    );
END //

-- Procedure to sync task with Kanban
CREATE PROCEDURE SyncTaskWithKanban(
    IN p_task_id VARCHAR(100),
    IN p_kanban_id VARCHAR(100)
)
BEGIN
    UPDATE ai_tasks 
    SET linked_kanban_id = p_kanban_id, updated_at = NOW()
    WHERE id = p_task_id;
    
    -- Log the sync activity
    INSERT INTO task_activity_log (id, task_id, user_id, action, details)
    VALUES (
        CONCAT('log-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
        p_task_id,
        'system',
        'kanban_sync',
        JSON_OBJECT('kanban_id', p_kanban_id)
    );
END //

DELIMITER ;
EOF

    if [ $? -eq 0 ]; then
        print_success "Stored procedures created successfully!"
    else
        print_warning "Failed to create stored procedures, but tables are ready"
    fi
    
    # Now try to add triggers
    print_status "Adding triggers..."
    
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" "$DB_NAME" << 'EOF'
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS after_task_status_update;
DROP TRIGGER IF EXISTS after_task_insert;

DELIMITER //

-- Trigger to update agent queue length when task is assigned
CREATE TRIGGER after_task_status_update
AFTER UPDATE ON ai_tasks
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        -- Update agent queue length
        UPDATE ai_agents 
        SET queue_length = (
            SELECT COUNT(*) 
            FROM ai_tasks 
            WHERE agent = NEW.agent AND status = 'pending'
        )
        WHERE name = NEW.agent;
        
        -- Create notification for status change
        INSERT INTO task_notifications (id, task_id, type, message, priority)
        VALUES (
            CONCAT('notif-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
            NEW.id,
            'status_change',
            CONCAT('Task "', NEW.title, '" status changed from ', OLD.status, ' to ', NEW.status),
            NEW.priority
        );
    END IF;
END //

-- Trigger to create activity log when task is created
CREATE TRIGGER after_task_insert
AFTER INSERT ON ai_tasks
FOR EACH ROW
BEGIN
    INSERT INTO task_activity_log (id, task_id, user_id, action, details)
    VALUES (
        CONCAT('log-', UNIX_TIMESTAMP(), '-', FLOOR(RAND() * 1000000)),
        NEW.id,
        COALESCE(NEW.assigned_to, 'system'),
        'task_created',
        JSON_OBJECT('title', NEW.title, 'agent', NEW.agent, 'priority', NEW.priority)
    );
END //

DELIMITER ;
EOF

    if [ $? -eq 0 ]; then
        print_success "Triggers created successfully!"
    else
        print_warning "Failed to create triggers, but tables are ready"
    fi
    
    # Verify the tables were created
    print_status "Verifying tables..."
    mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" "$DB_NAME" -e "
    SHOW TABLES LIKE 'ai_%';
    SHOW TABLES LIKE 'task_%';
    SHOW TABLES LIKE 'kanban_%';
    SHOW TABLES LIKE 'calendar_%';
    SHOW TABLES LIKE 'chatgpt_%';
    " 2>/dev/null
    
    # Clean up temp file
    rm -f "$TEMP_SCHEMA"
    
    print_success "Calendar database schema setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Run the full setup: ./setup-calendar-system.sh"
    echo "2. Or start the system: ./start-calendar-system.sh (if it exists)"
else
    print_error "Failed to create database schema"
    rm -f "$TEMP_SCHEMA"
    exit 1
fi 