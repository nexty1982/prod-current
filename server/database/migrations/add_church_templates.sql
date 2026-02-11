-- Multi-tenant Template System Database Migration
-- Add church_id support to templates table

-- First, add the church_id column to the templates table
ALTER TABLE templates 
ADD COLUMN church_id INT NULL,
ADD COLUMN is_global BOOLEAN DEFAULT FALSE;

-- Add foreign key constraint
ALTER TABLE templates
ADD CONSTRAINT fk_templates_church 
  FOREIGN KEY (church_id) REFERENCES churches(id) 
  ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX idx_templates_church_id ON templates(church_id);
CREATE INDEX idx_templates_global ON templates(is_global);
CREATE INDEX idx_templates_church_type ON templates(church_id, record_type);

-- Update existing templates to be global (since they don't have church_id)
-- This allows backward compatibility
UPDATE templates SET is_global = TRUE WHERE church_id IS NULL;

-- Optional: Create a view for easy template access
CREATE VIEW v_templates_with_church AS
SELECT 
    t.*,
    c.name as church_name,
    c.email as church_email,
    CASE 
        WHEN t.is_global = TRUE THEN 'Global Template'
        ELSE c.name 
    END as display_scope
FROM templates t
LEFT JOIN churches c ON t.church_id = c.id;
