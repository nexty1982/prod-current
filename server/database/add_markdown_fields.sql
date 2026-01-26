-- Add markdown support to kanban_tasks table
ALTER TABLE kanban_tasks 
ADD COLUMN markdown_content LONGTEXT DEFAULT NULL,
ADD COLUMN markdown_filename VARCHAR(255) DEFAULT NULL;

-- Create uploads directory structure for markdown files
-- This will be handled by the application code
