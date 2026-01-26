-- Kanban Database Schema
-- This schema supports a full-featured kanban board with boards, columns, tasks, and user permissions

-- Kanban Boards (multiple boards per user/organization)
CREATE TABLE kanban_boards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    board_color VARCHAR(7) DEFAULT '#1976d2',
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_created_at (created_at)
);

-- Kanban Columns/Categories (Todo, In Progress, Done, etc.)
CREATE TABLE kanban_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#1976d2',
    wip_limit INT DEFAULT NULL, -- Work In Progress limit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    INDEX idx_board_id (board_id),
    INDEX idx_position (position),
    UNIQUE KEY unique_board_column_position (board_id, position)
);

-- Kanban Tasks/Cards
CREATE TABLE kanban_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    column_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    due_date DATE DEFAULT NULL,
    assigned_to INT DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    estimated_hours DECIMAL(5,2) DEFAULT NULL,
    actual_hours DECIMAL(5,2) DEFAULT NULL,
    task_color VARCHAR(7) DEFAULT NULL,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_board_id (board_id),
    INDEX idx_column_id (column_id),
    INDEX idx_position (position),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_by (created_by),
    INDEX idx_due_date (due_date),
    UNIQUE KEY unique_column_task_position (column_id, position)
);

-- Task Labels/Tags (many-to-many relationship)
CREATE TABLE kanban_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#1976d2',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    INDEX idx_board_id (board_id),
    UNIQUE KEY unique_board_label (board_id, name)
);

-- Task-Label relationship
CREATE TABLE kanban_task_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES kanban_labels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_label (task_id, label_id)
);

-- Task Comments
CREATE TABLE kanban_task_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Task Attachments
CREATE TABLE kanban_task_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_uploaded_by (uploaded_by)
);

-- Board Members/Permissions
CREATE TABLE kanban_board_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    board_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member', 'viewer') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INT DEFAULT NULL,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_board_member (board_id, user_id),
    INDEX idx_board_id (board_id),
    INDEX idx_user_id (user_id)
);

-- Task Activity Log
CREATE TABLE kanban_task_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    action_type ENUM('created', 'updated', 'moved', 'assigned', 'commented', 'completed', 'archived', 'deleted') NOT NULL,
    description TEXT,
    old_value JSON DEFAULT NULL,
    new_value JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_action_type (action_type)
);

-- Insert default kanban data
INSERT INTO kanban_boards (name, description, created_by) VALUES
('Project Management', 'Main project tracking board', 1),
('Bug Tracking', 'Software bug tracking and resolution', 1),
('Feature Requests', 'New feature ideas and development', 1);

INSERT INTO kanban_columns (board_id, name, position, color) VALUES
(1, 'Backlog', 0, '#6c757d'),
(1, 'Todo', 1, '#007bff'),
(1, 'In Progress', 2, '#ffc107'),
(1, 'Review', 3, '#fd7e14'),
(1, 'Done', 4, '#28a745'),
(2, 'New Bugs', 0, '#dc3545'),
(2, 'Investigating', 1, '#ffc107'),
(2, 'Fixed', 2, '#28a745'),
(3, 'Ideas', 0, '#6f42c1'),
(3, 'Planning', 1, '#17a2b8'),
(3, 'Development', 2, '#fd7e14'),
(3, 'Released', 3, '#28a745');

INSERT INTO kanban_labels (board_id, name, color) VALUES
(1, 'High Priority', '#dc3545'),
(1, 'Bug', '#fd7e14'),
(1, 'Feature', '#28a745'),
(1, 'Enhancement', '#17a2b8'),
(2, 'Critical', '#dc3545'),
(2, 'UI/UX', '#6f42c1'),
(2, 'Backend', '#343a40'),
(3, 'User Request', '#007bff'),
(3, 'Internal', '#6c757d');

-- Grant board ownership to the creator
INSERT INTO kanban_board_members (board_id, user_id, role) VALUES
(1, 1, 'owner'),
(2, 1, 'owner'),
(3, 1, 'owner');
