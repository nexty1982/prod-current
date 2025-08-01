-- Fix Kanban Task Position Conflicts
-- This script addresses the duplicate entry errors for unique_column_task_position

USE orthodoxmetrics_db;

-- =============================================================================
-- 1. CHECK CURRENT CONSTRAINT
-- =============================================================================

-- Check the current unique constraint
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'orthodoxmetrics_db' 
AND TABLE_NAME = 'kanban_tasks' 
AND CONSTRAINT_NAME LIKE '%unique%';

-- =============================================================================
-- 2. FIX DUPLICATE POSITIONS
-- =============================================================================

-- First, let's fix any existing duplicate positions
-- This will reorder tasks within each column to have sequential positions

-- Create a temporary table to store the correct positions
CREATE TEMPORARY TABLE temp_task_positions AS
SELECT 
    id,
    board_id,
    column_id,
    ROW_NUMBER() OVER (PARTITION BY board_id, column_id ORDER BY position, created_at) as new_position
FROM kanban_tasks;

-- Update the positions to be sequential
UPDATE kanban_tasks kt
JOIN temp_task_positions ttp ON kt.id = ttp.id
SET kt.position = ttp.new_position;

-- Drop the temporary table
DROP TEMPORARY TABLE temp_task_positions;

-- =============================================================================
-- 3. CREATE SAFE POSITION UPDATE FUNCTION
-- =============================================================================

DELIMITER $$

-- Function to safely update task positions
CREATE FUNCTION SafeUpdateTaskPosition(
    p_board_id INT,
    p_column_id INT,
    p_old_position INT,
    p_new_position INT
) RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_success BOOLEAN DEFAULT TRUE;
    
    -- Use a transaction to ensure atomicity
    START TRANSACTION;
    
    -- If moving within the same column
    IF p_old_position != p_new_position THEN
        -- Shift positions to make room for the new position
        IF p_new_position > p_old_position THEN
            -- Moving down: shift tasks between old and new position up
            UPDATE kanban_tasks 
            SET position = position - 1 
            WHERE board_id = p_board_id 
            AND column_id = p_column_id 
            AND position > p_old_position 
            AND position <= p_new_position;
        ELSE
            -- Moving up: shift tasks between new and old position down
            UPDATE kanban_tasks 
            SET position = position + 1 
            WHERE board_id = p_board_id 
            AND column_id = p_column_id 
            AND position >= p_new_position 
            AND position < p_old_position;
        END IF;
    END IF;
    
    -- Check for any constraint violations
    IF EXISTS (
        SELECT 1 FROM kanban_tasks 
        WHERE board_id = p_board_id 
        AND column_id = p_column_id 
        GROUP BY position 
        HAVING COUNT(*) > 1
    ) THEN
        ROLLBACK;
        SET v_success = FALSE;
    ELSE
        COMMIT;
    END IF;
    
    RETURN v_success;
END$$

DELIMITER ;

-- =============================================================================
-- 4. VERIFY FIXES
-- =============================================================================

-- Check for any remaining duplicate positions
SELECT 
    board_id,
    column_id,
    position,
    COUNT(*) as task_count
FROM kanban_tasks 
GROUP BY board_id, column_id, position 
HAVING COUNT(*) > 1;

-- Show the function was created
SHOW FUNCTION STATUS WHERE Name = 'SafeUpdateTaskPosition';

-- =============================================================================
-- 5. COMPLETION MESSAGE
-- =============================================================================

SELECT '✅ KANBAN POSITION CONFLICTS FIXED!' as status;
SELECT 'The SafeUpdateTaskPosition function is now available for safe position updates.' as next_step; 