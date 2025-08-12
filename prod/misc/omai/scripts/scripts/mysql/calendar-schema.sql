-- OrthodoxMetrics Calendar System Schema
-- AI Task Management and Kanban Integration

USE orthodoxmetrics_db;

-- =============================================================================
-- AI TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_tasks (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100),
    status ENUM('pending', 'in_progress', 'completed', 'blocked') DEFAULT 'pending',
    due_date DATE NOT NULL,
    start_date DATE,
    tags JSON,
    linked_kanban_id VARCHAR(100),
    agent ENUM('Ninja', 'Claude', 'Cursor', 'OM-AI', 'Junie', 'GitHub Copilot') NOT NULL,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    logs JSON,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_agent (agent),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_linked_kanban (linked_kanban_id),
    INDEX idx_created_at (created_at),
    INDEX idx_updated_at (updated_at)
);

-- =============================================================================
-- AI AGENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_agents (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('online', 'offline', 'busy', 'error') DEFAULT 'offline',
    current_task_id VARCHAR(100),
    queue_length INT DEFAULT 0,
    performance JSON,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    capabilities JSON,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_status (status),
    INDEX idx_current_task (current_task_id),
    FOREIGN KEY (current_task_id) REFERENCES ai_tasks(id) ON DELETE SET NULL
);

-- =============================================================================
-- TASK NOTIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_notifications (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    type ENUM('status_change', 'due_date', 'assignment', 'comment', 'kanban_sync') NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `read` BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    metadata JSON,
    
    INDEX idx_task_id (task_id),
    INDEX idx_type (type),
    INDEX idx_read (`read`),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- NOTIFICATION SUBSCRIPTIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    task_id VARCHAR(100),
    type VARCHAR(50) NOT NULL,
    channels JSON NOT NULL,
    filters JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_task_id (task_id),
    INDEX idx_type (type),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- TASK FILES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_files (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    type ENUM('markdown', 'json', 'attachment', 'report') NOT NULL,
    size BIGINT NOT NULL,
    url VARCHAR(500) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    
    INDEX idx_task_id (task_id),
    INDEX idx_type (type),
    INDEX idx_uploaded_at (uploaded_at),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- TASK REPORTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_reports (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    format ENUM('pdf', 'markdown', 'json', 'csv') NOT NULL,
    filename VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(100) NOT NULL,
    content TEXT,
    metadata JSON,
    
    INDEX idx_task_id (task_id),
    INDEX idx_format (format),
    INDEX idx_generated_at (generated_at),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- CHATGPT SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatgpt_sessions (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message_count INT DEFAULT 0,
    context TEXT,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    INDEX idx_last_activity (last_activity),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- CHATGPT MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS chatgpt_messages (
    id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    
    INDEX idx_session_id (session_id),
    INDEX idx_role (role),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (session_id) REFERENCES chatgpt_sessions(session_id) ON DELETE CASCADE
);

-- =============================================================================
-- TASK ACTIVITY LOG TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS task_activity_log (
    id VARCHAR(100) PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (task_id) REFERENCES ai_tasks(id) ON DELETE CASCADE
);

-- =============================================================================
-- KANBAN INTEGRATION TABLES
-- =============================================================================

-- Kanban Boards (if not already exists)
CREATE TABLE IF NOT EXISTS kanban_boards (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- Kanban Columns (if not already exists)
CREATE TABLE IF NOT EXISTS kanban_columns (
    id VARCHAR(100) PRIMARY KEY,
    board_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INT NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_board_id (board_id),
    INDEX idx_position (position),
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);

-- Kanban Tasks (if not already exists)
CREATE TABLE IF NOT EXISTS kanban_tasks (
    id VARCHAR(100) PRIMARY KEY,
    board_id VARCHAR(100) NOT NULL,
    column_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(100),
    position INT NOT NULL,
    assignee VARCHAR(100),
    priority VARCHAR(50),
    due_date DATE,
    tags JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_board_id (board_id),
    INDEX idx_column_id (column_id),
    INDEX idx_status (status),
    INDEX idx_position (position),
    INDEX idx_assignee (assignee),
    INDEX idx_due_date (due_date),
    UNIQUE KEY unique_column_task_position (column_id, position),
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE
);

-- =============================================================================
-- CALENDAR SETTINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_settings (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    default_view ENUM('month', 'week', 'day') DEFAULT 'month',
    working_hours JSON,
    weekends BOOLEAN DEFAULT TRUE,
    holidays JSON,
    color_scheme ENUM('agent', 'priority', 'status') DEFAULT 'agent',
    show_task_details BOOLEAN DEFAULT TRUE,
    auto_refresh BOOLEAN DEFAULT TRUE,
    refresh_interval INT DEFAULT 30000,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    UNIQUE KEY unique_user_settings (user_id)
);

-- =============================================================================
-- INSERT DEFAULT DATA
-- =============================================================================

-- Insert default AI agents
INSERT IGNORE INTO ai_agents (id, name, status, capabilities, settings) VALUES
('agent-ninja', 'Ninja', 'online', 
 '["code_review", "bug_fixes", "feature_development", "documentation"]',
 '{"maxConcurrentTasks": 3, "autoAssign": true, "preferredTaskTypes": ["development", "review"], "workingHours": {"start": "09:00", "end": "17:00", "timezone": "UTC"}, "notifications": {"email": true, "slack": false, "webhook": true}}'),
 
('agent-claude', 'Claude', 'online',
 '["analysis", "planning", "research", "writing"]',
 '{"maxConcurrentTasks": 2, "autoAssign": true, "preferredTaskTypes": ["analysis", "planning"], "workingHours": {"start": "08:00", "end": "18:00", "timezone": "UTC"}, "notifications": {"email": true, "slack": true, "webhook": false}}'),
 
('agent-cursor', 'Cursor', 'online',
 '["code_generation", "refactoring", "testing", "optimization"]',
 '{"maxConcurrentTasks": 4, "autoAssign": true, "preferredTaskTypes": ["development", "testing"], "workingHours": {"start": "10:00", "end": "16:00", "timezone": "UTC"}, "notifications": {"email": false, "slack": true, "webhook": true}}'),
 
('agent-om-ai', 'OM-AI', 'online',
 '["full_stack", "integration", "deployment", "monitoring"]',
 '{"maxConcurrentTasks": 5, "autoAssign": true, "preferredTaskTypes": ["full_stack", "integration"], "workingHours": {"start": "00:00", "end": "23:59", "timezone": "UTC"}, "notifications": {"email": true, "slack": true, "webhook": true}}'),
 
('agent-junie', 'Junie', 'offline',
 '["design", "ui_ux", "prototyping", "user_research"]',
 '{"maxConcurrentTasks": 2, "autoAssign": false, "preferredTaskTypes": ["design", "ui_ux"], "workingHours": {"start": "09:00", "end": "17:00", "timezone": "UTC"}, "notifications": {"email": true, "slack": false, "webhook": false}}'),
 
('agent-github-copilot', 'GitHub Copilot', 'online',
 '["code_completion", "suggestions", "documentation", "examples"]',
 '{"maxConcurrentTasks": 10, "autoAssign": true, "preferredTaskTypes": ["development", "documentation"], "workingHours": {"start": "00:00", "end": "23:59", "timezone": "UTC"}, "notifications": {"email": false, "slack": false, "webhook": true}}');

-- Insert default Kanban board
INSERT IGNORE INTO kanban_boards (id, name, description, created_by) VALUES
('board-main', 'OrthodoxMetrics Main Board', 'Main development board for OrthodoxMetrics project', 'system');

-- Insert default Kanban columns
INSERT IGNORE INTO kanban_columns (id, board_id, name, position, color) VALUES
('col-backlog', 'board-main', 'Backlog', 1, '#6c757d'),
('col-todo', 'board-main', 'To Do', 2, '#007bff'),
('col-in-progress', 'board-main', 'In Progress', 3, '#ffc107'),
('col-review', 'board-main', 'Review', 4, '#17a2b8'),
('col-done', 'board-main', 'Done', 5, '#28a745');

-- Insert sample AI tasks
INSERT IGNORE INTO ai_tasks (id, title, description, assigned_to, status, due_date, agent, priority, estimated_hours, tags) VALUES
('OM-AI-TASK-001', 'Build OM AI Learning Component', 'Create a machine learning component for OrthodoxMetrics AI system', 'Ninja', 'in_progress', '2025-01-25', 'Ninja', 'high', 8.0, '["AI", "Machine Learning", "Frontend"]'),
('OM-AI-TASK-002', 'Implement Real-time Notifications', 'Add real-time notification system using WebSockets', 'Claude', 'pending', '2025-01-28', 'Claude', 'medium', 6.0, '["Backend", "WebSockets", "Real-time"]'),
('OM-AI-TASK-003', 'Design User Dashboard', 'Create modern dashboard design for OrthodoxMetrics', 'Junie', 'pending', '2025-01-30', 'Junie', 'medium', 4.0, '["Design", "UI/UX", "Dashboard"]'),
('OM-AI-TASK-004', 'Database Optimization', 'Optimize database queries and add indexes', 'Cursor', 'completed', '2025-01-20', 'Cursor', 'high', 5.0, '["Database", "Performance", "Optimization"]'),
('OM-AI-TASK-005', 'API Documentation', 'Generate comprehensive API documentation', 'GitHub Copilot', 'in_progress', '2025-01-27', 'GitHub Copilot', 'low', 3.0, '["Documentation", "API", "Swagger"]'),
('OM-AI-TASK-006', 'Security Audit', 'Perform comprehensive security audit of the system', 'OM-AI', 'blocked', '2025-02-01', 'OM-AI', 'critical', 12.0, '["Security", "Audit", "Compliance"]');

-- =============================================================================
-- CREATE VIEWS FOR EASY QUERYING
-- =============================================================================

-- View for task statistics
CREATE OR REPLACE VIEW task_stats_view AS
SELECT 
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_tasks,
    AVG(estimated_hours) as avg_estimated_hours,
    AVG(actual_hours) as avg_actual_hours
FROM ai_tasks;

-- View for agent performance
CREATE OR REPLACE VIEW agent_performance_view AS
SELECT 
    agent,
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
    AVG(estimated_hours) as avg_estimated_hours,
    AVG(actual_hours) as avg_actual_hours,
    AVG(DATEDIFF(due_date, created_at)) as avg_days_to_complete
FROM ai_tasks
GROUP BY agent;

-- View for Kanban sync status
CREATE OR REPLACE VIEW kanban_sync_view AS
SELECT 
    COUNT(*) as total_tasks,
    SUM(CASE WHEN linked_kanban_id IS NOT NULL THEN 1 ELSE 0 END) as synced_tasks,
    SUM(CASE WHEN linked_kanban_id IS NULL THEN 1 ELSE 0 END) as unsynced_tasks
FROM ai_tasks;

-- =============================================================================
-- CREATE STORED PROCEDURES
-- =============================================================================

DELIMITER //

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS CreateAITask;
DROP PROCEDURE IF EXISTS UpdateTaskStatus;
DROP PROCEDURE IF EXISTS SyncTaskWithKanban;

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

-- =============================================================================
-- CREATE TRIGGERS
-- =============================================================================

DELIMITER //

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS after_task_status_update;
DROP TRIGGER IF EXISTS after_task_insert;

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

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions to the application user (using current user)
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.ai_tasks TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.ai_agents TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.task_notifications TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.notification_subscriptions TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.task_files TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.task_reports TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.chatgpt_sessions TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.chatgpt_messages TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.task_activity_log TO CURRENT_USER();
GRANT SELECT, INSERT, UPDATE, DELETE ON orthodoxmetrics_db.calendar_settings TO CURRENT_USER();

-- Grant permissions for views
GRANT SELECT ON orthodoxmetrics_db.task_stats_view TO CURRENT_USER();
GRANT SELECT ON orthodoxmetrics_db.agent_performance_view TO CURRENT_USER();
GRANT SELECT ON orthodoxmetrics_db.kanban_sync_view TO CURRENT_USER();

-- Grant permissions for stored procedures
GRANT EXECUTE ON PROCEDURE orthodoxmetrics_db.CreateAITask TO CURRENT_USER();
GRANT EXECUTE ON PROCEDURE orthodoxmetrics_db.UpdateTaskStatus TO CURRENT_USER();
GRANT EXECUTE ON PROCEDURE orthodoxmetrics_db.SyncTaskWithKanban TO CURRENT_USER();

FLUSH PRIVILEGES; 