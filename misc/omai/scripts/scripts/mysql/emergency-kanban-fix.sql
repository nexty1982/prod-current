-- Emergency Kanban Position Fix
-- This script temporarily removes the unique constraint, fixes positions, then adds it back

USE orthodoxmetrics_db;

-- =============================================================================
-- 1. TEMPORARILY REMOVE THE UNIQUE CONSTRAINT
-- =============================================================================

SELECT 'REMOVING UNIQUE CONSTRAINT...' as step;
ALTER TABLE kanban_tasks DROP INDEX unique_column_task_position;

-- =============================================================================
-- 2. FIX DUPLICATE POSITIONS
-- =============================================================================

SELECT 'FIXING DUPLICATE POSITIONS...' as step;

-- Create a temporary table with correct positions
CREATE TEMPORARY TABLE temp_fix_positions AS
SELECT 
    id,
    board_id,
    column_id,
    ROW_NUMBER() OVER (
        PARTITION BY board_id, column_id 
        ORDER BY position ASC, created_at ASC, id ASC
    ) as new_position
FROM kanban_tasks;

-- Update all positions
UPDATE kanban_tasks kt
JOIN temp_fix_positions tfp ON kt.id = tfp.id
SET kt.position = tfp.new_position;

-- =============================================================================
-- 3. VERIFY NO DUPLICATES
-- =============================================================================

SELECT 'VERIFYING NO DUPLICATES...' as step;
SELECT 
    board_id,
    column_id,
    position,
    COUNT(*) as task_count
FROM kanban_tasks 
GROUP BY board_id, column_id, position 
HAVING COUNT(*) > 1
ORDER BY board_id, column_id, position;

-- =============================================================================
-- 4. RE-ADD THE UNIQUE CONSTRAINT
-- =============================================================================

SELECT 'RE-ADDING UNIQUE CONSTRAINT...' as step;
ALTER TABLE kanban_tasks ADD UNIQUE KEY unique_column_task_position (column_id, position);

-- =============================================================================
-- 5. FINAL VERIFICATION
-- =============================================================================

SELECT 'FINAL VERIFICATION...' as step;
SELECT 'CONSTRAINT STATUS:' as info;
SHOW INDEX FROM kanban_tasks WHERE Key_name = 'unique_column_task_position';

SELECT 'POSITION RANGES:' as info;
SELECT 
    board_id,
    column_id,
    MIN(position) as min_pos,
    MAX(position) as max_pos,
    COUNT(*) as total_tasks
FROM kanban_tasks 
GROUP BY board_id, column_id
ORDER BY board_id, column_id;

-- =============================================================================
-- CLEANUP
-- =============================================================================

DROP TEMPORARY TABLE IF EXISTS temp_fix_positions;

-- =============================================================================
-- COMPLETION
-- =============================================================================

SELECT '✅ EMERGENCY KANBAN FIX COMPLETED!' as status;
SELECT 'All duplicate positions have been resolved and the unique constraint is restored.' as message; 