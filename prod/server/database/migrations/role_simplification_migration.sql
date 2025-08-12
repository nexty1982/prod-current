-- ===============================================
-- Orthodox Metrics - Role Simplification Migration
-- ===============================================
-- This migration simplifies the role system from 40+ roles to 8 canonical roles
-- and introduces user profile attributes for contextual titles/ministries

-- Phase 1: Backup existing role data
-- ===============================================
CREATE TABLE IF NOT EXISTS role_migration_backup (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  original_role VARCHAR(50),
  original_table_name VARCHAR(50),
  backup_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backup existing user roles
INSERT INTO role_migration_backup (user_id, original_role, original_table_name)
SELECT id, role, 'users' FROM users WHERE role IS NOT NULL;

-- Phase 2: Add temporary column for new canonical roles
-- ===============================================
ALTER TABLE users ADD COLUMN new_role ENUM(
  'super_admin', 'admin', 'church_admin', 
  'priest', 'deacon', 'editor', 'viewer', 'guest'
) DEFAULT 'viewer';

-- Phase 3: Map legacy roles to canonical roles
-- ===============================================

-- Super Admin (no change)
UPDATE users SET new_role = 'super_admin' WHERE role IN ('super_admin');

-- Admin roles (include system/AI roles)
UPDATE users SET new_role = 'admin' WHERE role IN (
  'admin', 'dev_admin', 'system', 'ai_agent', 'omai'
);

-- Church Admin roles (consolidate manager, owner, etc.)
UPDATE users SET new_role = 'church_admin' WHERE role IN (
  'manager', 'church_admin', 'owner', 'administrator'
);

-- Clergy roles (no change)
UPDATE users SET new_role = 'priest' WHERE role IN ('priest');
UPDATE users SET new_role = 'deacon' WHERE role IN ('deacon');

-- Editor roles (consolidate user, secretary, treasurer, etc.)
UPDATE users SET new_role = 'editor' WHERE role IN (
  'user', 'secretary', 'treasurer', 'volunteer', 'member', 
  'moderator', 'assistant', 'editor'
);

-- Viewer roles (no change)
UPDATE users SET new_role = 'viewer' WHERE role IN ('viewer');

-- Guest roles (include nulls)
UPDATE users SET new_role = 'guest' WHERE role IN ('guest') OR role IS NULL;

-- Phase 4: Add user profile attributes for contextual titles
-- ===============================================
ALTER TABLE users ADD COLUMN profile_attributes JSON DEFAULT '{}';

-- Initialize profile attributes with empty structure
UPDATE users SET profile_attributes = JSON_OBJECT(
  'titles', JSON_ARRAY(),
  'ministries', JSON_ARRAY(),
  'isParishCouncilMember', false,
  'specializations', JSON_ARRAY(),
  'certifications', JSON_ARRAY()
) WHERE profile_attributes = '{}' OR profile_attributes IS NULL;

-- Migrate contextual information based on original roles
-- Add titles based on legacy roles that indicate function
UPDATE users SET profile_attributes = JSON_SET(
  profile_attributes,
  '$.titles',
  JSON_ARRAY('Secretary')
) WHERE role = 'secretary';

UPDATE users SET profile_attributes = JSON_SET(
  profile_attributes,
  '$.titles',
  JSON_ARRAY('Treasurer')
) WHERE role = 'treasurer';

UPDATE users SET profile_attributes = JSON_SET(
  profile_attributes,
  '$.specializations',
  JSON_ARRAY('Volunteer Coordination')
) WHERE role = 'volunteer';

UPDATE users SET profile_attributes = JSON_SET(
  profile_attributes,
  '$.titles',
  JSON_ARRAY('Forum Moderator')
) WHERE role = 'moderator';

-- Phase 5: Update other tables with role references
-- ===============================================

-- Church admin panels
UPDATE church_admin_panel SET role = 'church_admin' 
WHERE role IN ('owner', 'manager');

UPDATE church_admin_panel SET role = 'viewer' 
WHERE role = 'viewer';

-- Kanban board members
UPDATE kanban_board_members SET role = 'church_admin' 
WHERE role IN ('owner', 'admin');

UPDATE kanban_board_members SET role = 'editor' 
WHERE role = 'member';

UPDATE kanban_board_members SET role = 'viewer' 
WHERE role = 'viewer';

-- Phase 6: Drop old role column and rename new_role
-- ===============================================

-- First, ensure all users have a new_role assigned
UPDATE users SET new_role = 'viewer' WHERE new_role IS NULL;

-- Drop the old role column
ALTER TABLE users DROP COLUMN role;

-- Rename new_role to role
ALTER TABLE users CHANGE new_role role ENUM(
  'super_admin', 'admin', 'church_admin',
  'priest', 'deacon', 'editor', 'viewer', 'guest'
) NOT NULL DEFAULT 'viewer';

-- Phase 7: Update table constraints and indexes
-- ===============================================

-- Add index on role for performance
CREATE INDEX idx_users_role ON users(role);

-- Add index on profile_attributes for JSON queries
CREATE INDEX idx_users_profile_attrs ON users((JSON_EXTRACT(profile_attributes, '$.titles')));

-- Phase 8: Validation and verification
-- ===============================================

-- Create a view to check migration results
CREATE OR REPLACE VIEW role_migration_summary AS
SELECT 
  r.role AS canonical_role,
  COUNT(*) as user_count,
  GROUP_CONCAT(DISTINCT rmb.original_role) as legacy_roles_mapped
FROM users r
LEFT JOIN role_migration_backup rmb ON r.id = rmb.user_id
GROUP BY r.role
ORDER BY 
  CASE r.role
    WHEN 'super_admin' THEN 8
    WHEN 'admin' THEN 7
    WHEN 'church_admin' THEN 6
    WHEN 'priest' THEN 5
    WHEN 'deacon' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'viewer' THEN 2
    WHEN 'guest' THEN 1
    ELSE 0
  END DESC;

-- Verify no invalid roles exist
SELECT 'Migration Check: Invalid roles found' as status, COUNT(*) as count
FROM users 
WHERE role NOT IN ('super_admin', 'admin', 'church_admin', 'priest', 'deacon', 'editor', 'viewer', 'guest');

-- Verify super_admin count (should be small)
SELECT 'Migration Check: Super admin count' as status, COUNT(*) as count
FROM users 
WHERE role = 'super_admin';

-- Show migration summary
SELECT * FROM role_migration_summary;

-- Phase 9: Create rollback script (commented out)
-- ===============================================
/*
-- ROLLBACK SCRIPT (Use only if migration needs to be reversed)

-- Step 1: Add back original role column
ALTER TABLE users ADD COLUMN original_role VARCHAR(50);

-- Step 2: Restore original roles from backup
UPDATE users u
JOIN role_migration_backup rmb ON u.id = rmb.user_id
SET u.original_role = rmb.original_role;

-- Step 3: Drop canonical role column (CAUTION!)
-- ALTER TABLE users DROP COLUMN role;

-- Step 4: Rename original_role back to role
-- ALTER TABLE users CHANGE original_role role VARCHAR(50);

-- Step 5: Clean up migration tables
-- DROP TABLE role_migration_backup;
-- DROP VIEW role_migration_summary;
*/

-- ===============================================
-- Migration Complete
-- ===============================================
SELECT 
  'Role Simplification Migration Complete' as status,
  NOW() as completed_at,
  (SELECT COUNT(DISTINCT role) FROM users) as canonical_roles_count,
  (SELECT COUNT(*) FROM users) as total_users;