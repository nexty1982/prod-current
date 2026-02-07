-- Add Editable Menu Columns
-- Extends the menus table to support super_admin editable navigation
-- Date: 2026-02-05

USE orthodoxmetrics_db;

-- Add columns for flat hierarchical menu structure
ALTER TABLE menus 
  ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL AFTER id,
  ADD COLUMN IF NOT EXISTS key_name VARCHAR(128) NULL AFTER version,
  ADD COLUMN IF NOT EXISTS label VARCHAR(256) NULL AFTER key_name,
  ADD COLUMN IF NOT EXISTS icon VARCHAR(128) NULL AFTER label,
  ADD COLUMN IF NOT EXISTS path VARCHAR(512) NULL AFTER icon,
  ADD COLUMN IF NOT EXISTS roles LONGTEXT NULL AFTER role,
  ADD COLUMN IF NOT EXISTS order_index INT NOT NULL DEFAULT 0 AFTER is_active,
  ADD COLUMN IF NOT EXISTS meta LONGTEXT NULL AFTER order_index,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR(128) NULL AFTER created_by;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_key_name ON menus(key_name);
CREATE INDEX IF NOT EXISTS idx_parent_id ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_order_index ON menus(order_index);
CREATE INDEX IF NOT EXISTS idx_role_active ON menus(role, is_active);

-- Add unique constraint on key_name (NULL values allowed)
ALTER TABLE menus ADD CONSTRAINT unique_key_name UNIQUE (key_name);

-- Add foreign key for parent_id (self-referencing)
ALTER TABLE menus ADD CONSTRAINT fk_menu_parent
  FOREIGN KEY (parent_id) REFERENCES menus(id) ON DELETE CASCADE;

-- Create audit table for menu changes
CREATE TABLE IF NOT EXISTS menu_audit (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  menu_id BIGINT NULL,
  action ENUM('create', 'update', 'delete', 'seed', 'reset') NOT NULL,
  changed_by VARCHAR(128) NOT NULL,
  changes JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu_id (menu_id),
  INDEX idx_action (action),
  INDEX idx_changed_by (changed_by),
  INDEX idx_created_at (created_at)
);
