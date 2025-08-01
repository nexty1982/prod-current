-- Robust Fix for Kanban Task Position Conflicts
-- This script safely handles existing duplicate positions

USE orthodoxmetrics_db;

-- =============================================================================
-- 1. CHECK CURRENT STATE
-- =============================================================================

SELECT 'CURRENT DUPLICATE POSITIONS:' as section;
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
-- 2. SAFE POSITION FIX USING TEMPORARY TABLE
-- =============================================================================

-- Drop any existing temporary table
DROP TEMPORARY TABLE IF EXISTS temp_task_positions;

-- Create a temporary table with proper ordering
CREATE TEMPORARY TABLE temp_task_positions AS
SELECT 
    id,
    board_id,
    column_id,
    position,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY board_id, column_id 
        ORDER BY position ASC, created_at ASC, id ASC
    ) as new_position
FROM kanban_tasks;

-- Show what we're about to update
SELECT 'POSITIONS TO BE UPDATED:' as section;
SELECT 
    ttp.id,
    ttp.board_id,
    ttp.column_id,
    ttp.position as old_position,
    ttp.new_position,
    ttp.created_at
FROM temp_task_positions ttp
WHERE ttp.position != ttp.new_position
ORDER BY ttp.board_id, ttp.column_id, ttp.new_position;

-- =============================================================================
-- 3. UPDATE POSITIONS IN BATCHES
-- =============================================================================

-- First, set all positions to a high temporary value to avoid conflicts
UPDATE kanban_tasks kt
JOIN temp_task_positions ttp ON kt.id = ttp.id
SET kt.position = ttp.new_position + 10000
WHERE ttp.position != ttp.new_position;

-- Now set them to the correct final values
UPDATE kanban_tasks kt
JOIN temp_task_positions ttp ON kt.id = ttp.id
SET kt.position = ttp.new_position
WHERE kt.position = ttp.new_position + 10000;

-- =============================================================================
-- 4. VERIFY THE FIX
-- =============================================================================

SELECT 'VERIFICATION - NO DUPLICATES SHOULD EXIST:' as section;
SELECT 
    board_id,
    column_id,
    position,
    COUNT(*) as task_count
FROM kanban_tasks 
GROUP BY board_id, column_id, position 
HAVING COUNT(*) > 1
ORDER BY board_id, column_id, position;

-- Show final state
SELECT 'FINAL POSITION RANGES:' as section;
SELECT 
    board_id,
    column_id,
    MIN(position) as min_position,
    MAX(position) as max_position,
    COUNT(*) as total_tasks
FROM kanban_tasks 
GROUP BY board_id, column_id
ORDER BY board_id, column_id;

-- =============================================================================
-- 5. CREATE SAFE POSITION UPDATE FUNCTION
-- =============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS SafeUpdateTaskPosition;

DELIMITER $$

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
    DECLARE v_max_position INT;
    
    -- Get the maximum position in the column
    SELECT COALESCE(MAX(position), 0) INTO v_max_position
    FROM kanban_tasks 
    WHERE board_id = p_board_id AND column_id = p_column_id;
    
    -- Validate new position
    IF p_new_position < 1 OR p_new_position > v_max_position + 1 THEN
        RETURN FALSE;
    END IF;
    
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
-- 6. CLEANUP
-- =============================================================================

-- Drop the temporary table
DROP TEMPORARY TABLE IF EXISTS temp_task_positions;

-- =============================================================================
-- 7. FINAL VERIFICATION
-- =============================================================================

SELECT 'FUNCTION CREATED:' as section;
SHOW FUNCTION STATUS WHERE Name = 'SafeUpdateTaskPosition';

SELECT 'FINAL CHECK - NO DUPLICATES:' as section;
SELECT COUNT(*) as duplicate_count
FROM (
    SELECT board_id, column_id, position
    FROM kanban_tasks 
    GROUP BY board_id, column_id, position 
    HAVING COUNT(*) > 1
) as duplicates;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT '✅ KANBAN POSITION CONFLICTS FIXED!' as status;
SELECT 'The SafeUpdateTaskPosition function is now available for safe position updates.' as next_step; 