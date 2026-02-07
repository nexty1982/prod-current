-- ===============================================================================
-- Menu Items Dedupe and Unique Constraint
-- Created: 2026-02-07
-- Purpose: Fix duplicate menu items and enforce uniqueness
-- ===============================================================================

USE orthodoxmetrics_db;

-- ============================================================================
-- PHASE 1: ADD key_name COLUMN
-- ============================================================================

-- Check if key_name column exists, add if not
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
    AND TABLE_NAME = 'router_menu_items' 
    AND COLUMN_NAME = 'key_name'
);

SET @sql_add_col = IF(
  @col_exists = 0,
  'ALTER TABLE router_menu_items ADD COLUMN key_name VARCHAR(255) NULL AFTER menu_id',
  'SELECT "key_name column already exists" AS info'
);

PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Phase 1 complete: key_name column added/verified' AS status;

-- ============================================================================
-- PHASE 2: POPULATE key_name FOR EXISTING ROWS
-- ============================================================================

-- Generate key_name for rows that don't have one
-- Strategy: use label slugified + id to ensure uniqueness during migration
UPDATE router_menu_items
SET key_name = CONCAT(
  'menu-',
  LOWER(REPLACE(REPLACE(REPLACE(label, ' ', '-'), '/', '-'), '.', '-')),
  '-',
  id
)
WHERE key_name IS NULL OR key_name = '';

SELECT '✅ Phase 2 complete: key_name populated for existing rows' AS status;

-- ============================================================================
-- PHASE 3: LOG DUPLICATES BEFORE REMOVAL
-- ============================================================================

-- Show duplicates (based on menu_id + label + path)
SELECT 
  menu_id, 
  label, 
  COALESCE(path, '<NULL>') AS path,
  COUNT(*) AS duplicate_count,
  GROUP_CONCAT(id ORDER BY id) AS duplicate_ids
FROM router_menu_items
GROUP BY menu_id, label, COALESCE(path, '')
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, menu_id, label;

-- Create a backup log of duplicates
CREATE TABLE IF NOT EXISTS router_menu_items_dupes_backup_20260207 AS
SELECT rm1.*
FROM router_menu_items rm1
INNER JOIN router_menu_items rm2
  ON rm1.menu_id = rm2.menu_id
 AND rm1.label = rm2.label
 AND COALESCE(rm1.path,'') = COALESCE(rm2.path,'')
 AND rm1.id > rm2.id;

SELECT 
  COUNT(*) AS total_duplicates_to_remove,
  '(backed up to router_menu_items_dupes_backup_20260207)' AS note
FROM router_menu_items_dupes_backup_20260207;

-- ============================================================================
-- PHASE 4: REMOVE DUPLICATES (keep lowest id)
-- ============================================================================

-- Delete duplicates while keeping the row with lowest id
DELETE rm1
FROM router_menu_items rm1
INNER JOIN router_menu_items rm2
  ON rm1.menu_id = rm2.menu_id
 AND rm1.label = rm2.label
 AND COALESCE(rm1.path,'') = COALESCE(rm2.path,'')
 AND rm1.id > rm2.id;

SELECT ROW_COUNT() AS duplicates_removed;
SELECT '✅ Phase 4 complete: Duplicates removed' AS status;

-- ============================================================================
-- PHASE 5: VERIFY NO DUPLICATES REMAIN
-- ============================================================================

-- This should return 0 rows
SELECT 
  menu_id, 
  label, 
  COALESCE(path, '<NULL>') AS path,
  COUNT(*) AS duplicate_count
FROM router_menu_items
GROUP BY menu_id, label, COALESCE(path, '')
HAVING COUNT(*) > 1;

SELECT '✅ Phase 5 complete: Verified no duplicates remain' AS status;

-- ============================================================================
-- PHASE 6: ADD UNIQUE CONSTRAINT
-- ============================================================================

-- First, make key_name NOT NULL (now that all rows have values)
ALTER TABLE router_menu_items MODIFY COLUMN key_name VARCHAR(255) NOT NULL;

-- Check if unique key already exists
SET @uk_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
    AND TABLE_NAME = 'router_menu_items' 
    AND INDEX_NAME = 'uk_router_menu_items_key'
);

SET @sql_add_uk = IF(
  @uk_exists = 0,
  'ALTER TABLE router_menu_items ADD UNIQUE KEY uk_router_menu_items_key (menu_id, key_name)',
  'SELECT "Unique key already exists" AS info'
);

PREPARE stmt FROM @sql_add_uk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Phase 6 complete: Unique constraint added' AS status;

-- ============================================================================
-- PHASE 7: ADD INDEX FOR PERFORMANCE
-- ============================================================================

-- Check if index on key_name exists
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
    AND TABLE_NAME = 'router_menu_items' 
    AND INDEX_NAME = 'idx_key_name'
);

SET @sql_add_idx = IF(
  @idx_exists = 0,
  'ALTER TABLE router_menu_items ADD INDEX idx_key_name (key_name)',
  'SELECT "Index on key_name already exists" AS info'
);

PREPARE stmt FROM @sql_add_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ Phase 7 complete: Performance index added' AS status;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Show updated schema
DESCRIBE router_menu_items;

-- Show indexes
SHOW INDEXES FROM router_menu_items WHERE Key_name IN ('uk_router_menu_items_key', 'idx_key_name');

-- Show row counts
SELECT 
  'Total menu items' AS metric,
  COUNT(*) AS count
FROM router_menu_items
UNION ALL
SELECT 
  'Unique menu_id+key_name combinations',
  COUNT(DISTINCT menu_id, key_name)
FROM router_menu_items
UNION ALL
SELECT 
  'Backup duplicates',
  COUNT(*)
FROM router_menu_items_dupes_backup_20260207;

SELECT '✅✅✅ MIGRATION COMPLETE ✅✅✅' AS status;

-- ============================================================================
-- ROLLBACK PLAN (if needed)
-- ============================================================================
-- To restore duplicates (NOT RECOMMENDED, only for emergency):
-- INSERT INTO router_menu_items SELECT * FROM router_menu_items_dupes_backup_20260207;
-- 
-- To remove unique constraint:
-- ALTER TABLE router_menu_items DROP INDEX uk_router_menu_items_key;
-- 
-- To remove key_name column:
-- ALTER TABLE router_menu_items DROP COLUMN key_name;
-- ============================================================================
