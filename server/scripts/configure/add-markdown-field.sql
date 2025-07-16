-- Add markdown content field to kanban_tasks table
ALTER TABLE kanban_tasks 
ADD COLUMN markdown_content LONGTEXT AFTER description,
ADD COLUMN markdown_filename VARCHAR(255) AFTER markdown_content;
