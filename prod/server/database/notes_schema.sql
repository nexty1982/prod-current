-- Notes Management Schema for Orthodox Metrics
-- This schema supports user-specific notes with categories, tags, and sharing

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    tags JSON DEFAULT NULL,
    color VARCHAR(20) DEFAULT '#ffffff',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_notes_created_by (created_by),
    INDEX idx_notes_category (category),
    INDEX idx_notes_created_at (created_at),
    INDEX idx_notes_is_pinned (is_pinned),
    INDEX idx_notes_is_archived (is_archived)
);

-- Create note_shares table for sharing notes with other users
CREATE TABLE IF NOT EXISTS note_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    note_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    permission ENUM('read', 'write') DEFAULT 'read',
    shared_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate shares
    UNIQUE KEY unique_note_share (note_id, shared_with_user_id),
    
    -- Indexes
    INDEX idx_note_shares_note_id (note_id),
    INDEX idx_note_shares_user_id (shared_with_user_id)
);

-- Create note_categories table for predefined categories
CREATE TABLE IF NOT EXISTS note_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#e3f2fd',
    icon VARCHAR(50) DEFAULT 'IconNote',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO note_categories (name, description, color, icon) VALUES
('General', 'General notes and reminders', '#e3f2fd', 'IconNote'),
('Meeting', 'Meeting notes and minutes', '#fff3e0', 'IconUsers'),
('Church', 'Church-related notes', '#f3e5f5', 'IconBuildingChurch'),
('Personal', 'Personal notes and thoughts', '#e8f5e8', 'IconUser'),
('Important', 'Important notes requiring attention', '#ffebee', 'IconAlertCircle'),
('Ideas', 'Ideas and brainstorming notes', '#fff9c4', 'IconBulb'),
('Tasks', 'Task-related notes', '#e1f5fe', 'IconCheckbox'),
('Scripture', 'Scripture study notes', '#fce4ec', 'IconBook')
ON DUPLICATE KEY UPDATE 
    description = VALUES(description),
    color = VALUES(color),
    icon = VALUES(icon);

-- Sample notes for testing (optional)
INSERT INTO notes (title, content, category, tags, color, is_pinned, created_by) VALUES
('Welcome to Notes', 'This is your first note! You can create, edit, and organize your notes here.', 'General', '["welcome", "getting-started"]', '#e3f2fd', TRUE, 1),
('Meeting Notes Template', 'Date: \nAttendees: \nAgenda: \n\nNotes: \n\nAction Items: \n', 'Meeting', '["template", "meetings"]', '#fff3e0', FALSE, 1),
('Scripture Study', 'Today''s reading: \n\nKey verses: \n\nReflections: \n\nApplications: \n', 'Scripture', '["bible", "study"]', '#fce4ec', FALSE, 1)
ON DUPLICATE KEY UPDATE title = title; -- Prevent duplicates if run multiple times
