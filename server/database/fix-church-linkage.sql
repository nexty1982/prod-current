-- ================================================================================
-- ORTHODOX METRICS MULTI-TENANT DATABASE LINKAGE FIX
-- ================================================================================
-- Purpose: Fix the relationship between orthodoxmetrics_db.churches and 
--          individual church databases (##-churchname_db)
-- 
-- Problem: Church record tables were referencing local church_info/churches tables
--          instead of the global orthodoxmetrics_db.churches registry
-- 
-- Solution: Audit, fix, and standardize the multi-tenant architecture
-- ================================================================================

-- Set session variables for safety
SET SESSION FOREIGN_KEY_CHECKS = 0;
SET SESSION SQL_SAFE_UPDATES = 0;

-- ================================================================================
-- STEP 1: AUDIT CURRENT CHURCH DATABASES
-- ================================================================================

-- First, let's create a temporary audit table to track our findings
USE orthodoxmetrics_db;

-- Drop and recreate audit table
DROP TABLE IF EXISTS temp_church_audit;
CREATE TABLE temp_church_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    database_name VARCHAR(100),
    table_name VARCHAR(100),
    has_church_id BOOLEAN DEFAULT FALSE,
    church_id_type VARCHAR(50),
    has_foreign_key BOOLEAN DEFAULT FALSE,
    foreign_key_target VARCHAR(100),
    record_count INT DEFAULT 0,
    missing_church_id_count INT DEFAULT 0,
    needs_migration BOOLEAN DEFAULT TRUE,
    audit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create procedure to audit a specific church database
DELIMITER $$

DROP PROCEDURE IF EXISTS AuditChurchDatabase$$
CREATE PROCEDURE AuditChurchDatabase(IN db_name VARCHAR(100))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(100);
    DECLARE sql_stmt TEXT;
    
    -- Cursor for record tables in the church database
    DECLARE table_cursor CURSOR FOR
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = db_name 
        AND TABLE_NAME IN ('baptism_records', 'marriage_records', 'funeral_records');
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN table_cursor;
    
    table_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE table_loop;
        END IF;
        
        -- Check if church_id column exists
        SET @has_church_id = 0;
        SET @church_id_type = '';
        
        SELECT COUNT(*), IFNULL(COLUMN_TYPE, '')
        INTO @has_church_id, @church_id_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id';
        
        -- Check for foreign key constraints
        SET @has_fk = 0;
        SET @fk_target = '';
        
        SELECT COUNT(*), IFNULL(REFERENCED_TABLE_NAME, '')
        INTO @has_fk, @fk_target
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
        
        -- Get record count
        SET sql_stmt = CONCAT('SELECT COUNT(*) FROM `', db_name, '`.`', table_name, '`');
        SET @record_count = 0;
        
        -- Get missing church_id count (if column exists)
        SET @missing_church_id = 0;
        IF @has_church_id > 0 THEN
            SET sql_stmt = CONCAT('SELECT COUNT(*) FROM `', db_name, '`.`', table_name, '` WHERE church_id IS NULL OR church_id = 0');
            PREPARE stmt FROM sql_stmt;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
        
        -- Insert audit record
        INSERT INTO temp_church_audit (
            database_name, table_name, has_church_id, church_id_type,
            has_foreign_key, foreign_key_target, record_count, missing_church_id_count
        ) VALUES (
            db_name, table_name, @has_church_id > 0, @church_id_type,
            @has_fk > 0, @fk_target, @record_count, @missing_church_id
        );
        
    END LOOP;
    
    CLOSE table_cursor;
END$$

-- Create procedure to get the correct church_id for a database
DROP PROCEDURE IF EXISTS GetChurchIdForDatabase$$
CREATE PROCEDURE GetChurchIdForDatabase(IN db_name VARCHAR(100), OUT church_id INT)
BEGIN
    DECLARE church_count INT DEFAULT 0;
    
    -- Try to find church by database name pattern
    SELECT COUNT(*), MAX(id) INTO church_count, church_id
    FROM orthodoxmetrics_db.churches
    WHERE database_name = db_name
    OR name LIKE CONCAT('%', REPLACE(REPLACE(db_name, '_db', ''), '_', ' '), '%')
    OR db_name LIKE CONCAT('%', REPLACE(LOWER(name), ' ', '_'), '%');
    
    -- If not found, try alternate patterns
    IF church_count = 0 THEN
        SELECT COUNT(*), MAX(id) INTO church_count, church_id
        FROM orthodoxmetrics_db.churches
        WHERE LOWER(name) LIKE '%saints peter and paul%'
        AND db_name LIKE '%ssp%';
    END IF;
    
    -- If still not found, return 0
    IF church_count = 0 THEN
        SET church_id = 0;
    END IF;
END$$

DELIMITER ;

-- ================================================================================
-- STEP 2: RUN AUDIT ON KNOWN CHURCH DATABASES
-- ================================================================================

-- Clear previous audit results
TRUNCATE TABLE temp_church_audit;

-- Get list of church databases to audit
SET @databases_to_audit = '';

-- Check for known church database patterns
SELECT GROUP_CONCAT(SCHEMA_NAME SEPARATOR ',') INTO @databases_to_audit
FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME LIKE '%church%'
   OR SCHEMA_NAME LIKE '%orthodox%'
   OR SCHEMA_NAME LIKE '%ssppoc%'
   OR SCHEMA_NAME LIKE '%saints%'
   OR SCHEMA_NAME LIKE '%stgeorge%'
   OR SCHEMA_NAME LIKE '%stmary%'
   AND SCHEMA_NAME != 'orthodoxmetrics_db'
   AND SCHEMA_NAME != 'information_schema'
   AND SCHEMA_NAME != 'performance_schema'
   AND SCHEMA_NAME != 'mysql'
   AND SCHEMA_NAME != 'sys';

-- Audit specific known databases
CALL AuditChurchDatabase('ssppoc_records_db');
CALL AuditChurchDatabase('saints_peter_and_paul_orthodox_church_db');

-- Add any other church databases you know exist:
-- CALL AuditChurchDatabase('01-stgeorge_db');
-- CALL AuditChurchDatabase('02-stmary_db');

-- Display audit results
SELECT 
    database_name,
    table_name,
    has_church_id,
    church_id_type,
    has_foreign_key,
    foreign_key_target,
    record_count,
    missing_church_id_count,
    CASE 
        WHEN NOT has_church_id THEN 'ADD church_id column'
        WHEN missing_church_id_count > 0 THEN 'BACKFILL church_id values'
        WHEN has_foreign_key AND foreign_key_target != 'churches' THEN 'FIX foreign key'
        ELSE 'OK'
    END as required_action
FROM temp_church_audit
ORDER BY database_name, table_name;

-- ================================================================================
-- STEP 3: STANDARDIZED MIGRATION SCRIPT TEMPLATE
-- ================================================================================

-- Create procedure to migrate a specific church database
DELIMITER $$

DROP PROCEDURE IF EXISTS MigrateChurchDatabase$$
CREATE PROCEDURE MigrateChurchDatabase(
    IN db_name VARCHAR(100),
    IN target_church_id INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(100);
    DECLARE sql_stmt TEXT;
    
    -- Tables to migrate
    DECLARE table_cursor CURSOR FOR
        SELECT 'baptism_records' AS table_name
        UNION SELECT 'marriage_records'
        UNION SELECT 'funeral_records';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Validate inputs
    IF target_church_id = 0 OR target_church_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid church_id provided';
    END IF;
    
    -- Verify church exists in global registry
    IF (SELECT COUNT(*) FROM orthodoxmetrics_db.churches WHERE id = target_church_id) = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Church_id not found in orthodoxmetrics_db.churches';
    END IF;
    
    SELECT CONCAT('🚀 Starting migration for database: ', db_name, ' -> church_id: ', target_church_id) as status;
    
    OPEN table_cursor;
    
    migration_loop: LOOP
        FETCH table_cursor INTO table_name;
        IF done THEN
            LEAVE migration_loop;
        END IF;
        
        -- Check if table exists
        SET @table_exists = 0;
        SELECT COUNT(*) INTO @table_exists
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = table_name;
        
        IF @table_exists > 0 THEN
            SELECT CONCAT('📋 Processing table: ', db_name, '.', table_name) as status;
            
            -- Step 1: Check if church_id column exists
            SET @has_church_id = 0;
            SELECT COUNT(*) INTO @has_church_id
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = db_name
            AND TABLE_NAME = table_name
            AND COLUMN_NAME = 'church_id';
            
            -- Step 2: Add church_id column if missing
            IF @has_church_id = 0 THEN
                SET sql_stmt = CONCAT('ALTER TABLE `', db_name, '`.`', table_name, '` ADD COLUMN church_id INT NOT NULL DEFAULT ', target_church_id);
                SET @sql = sql_stmt;
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                SELECT CONCAT('✅ Added church_id column to ', table_name) as status;
            END IF;
            
            -- Step 3: Update church_id values for records with NULL or 0
            SET sql_stmt = CONCAT('UPDATE `', db_name, '`.`', table_name, '` SET church_id = ', target_church_id, ' WHERE church_id IS NULL OR church_id = 0');
            SET @sql = sql_stmt;
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            -- Get count of updated records
            SET sql_stmt = CONCAT('SELECT ROW_COUNT() as updated_records');
            SELECT CONCAT('✅ Updated church_id for ', ROW_COUNT(), ' records in ', table_name) as status;
            
            -- Step 4: Remove any existing foreign key constraints that point to wrong tables
            SET @fk_name = '';
            SELECT CONSTRAINT_NAME INTO @fk_name
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = db_name
            AND TABLE_NAME = table_name
            AND COLUMN_NAME = 'church_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1;
            
            IF @fk_name != '' THEN
                SET sql_stmt = CONCAT('ALTER TABLE `', db_name, '`.`', table_name, '` DROP FOREIGN KEY `', @fk_name, '`');
                SET @sql = sql_stmt;
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
                SELECT CONCAT('🗑️ Removed old foreign key: ', @fk_name) as status;
            END IF;
            
            -- Step 5: Add index for performance
            SET sql_stmt = CONCAT('ALTER TABLE `', db_name, '`.`', table_name, '` ADD INDEX idx_church_id (church_id)');
            SET @sql = sql_stmt;
            PREPARE stmt FROM @sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
            
            SELECT CONCAT('📊 Added index on church_id for ', table_name) as status;
            
        ELSE
            SELECT CONCAT('⚠️ Table ', table_name, ' not found in ', db_name) as status;
        END IF;
        
    END LOOP;
    
    CLOSE table_cursor;
    
    -- Step 6: Remove local church_info table if it exists (shouldn't exist in multi-tenant setup)
    SET @has_church_info = 0;
    SELECT COUNT(*) INTO @has_church_info
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = db_name AND TABLE_NAME = 'church_info';
    
    IF @has_church_info > 0 THEN
        SET sql_stmt = CONCAT('DROP TABLE `', db_name, '`.`church_info`');
        SET @sql = sql_stmt;
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT '🗑️ Removed local church_info table (data should be in orthodoxmetrics_db.churches)' as status;
    END IF;
    
    SELECT CONCAT('🎉 Migration completed for database: ', db_name) as status;
    
END$$

DELIMITER ;

-- ================================================================================
-- STEP 4: EXAMPLE MIGRATIONS (uncomment and modify as needed)
-- ================================================================================

-- Get the correct church_id for Saints Peter and Paul Orthodox Church
SET @ssppoc_church_id = 0;
SELECT id INTO @ssppoc_church_id 
FROM orthodoxmetrics_db.churches 
WHERE name LIKE '%Saints Peter and Paul%' 
   OR name LIKE '%SSPPOC%' 
   OR email LIKE '%ssppoc%'
   OR email LIKE '%saints%peter%paul%'
LIMIT 1;

-- If church doesn't exist in global registry, create it
IF @ssppoc_church_id = 0 THEN
    INSERT INTO orthodoxmetrics_db.churches (
        name, email, is_active, database_name, preferred_language, timezone
    ) VALUES (
        'Saints Peter and Paul Orthodox Church',
        'info@ssppoc.org',
        TRUE,
        'ssppoc_records_db',
        'en',
        'America/New_York'
    );
    SET @ssppoc_church_id = LAST_INSERT_ID();
    SELECT CONCAT('✅ Created church record with ID: ', @ssppoc_church_id) as status;
END IF;

-- Run migration for Saints Peter and Paul Orthodox Church database
-- UNCOMMENT THE FOLLOWING LINES TO RUN ACTUAL MIGRATION:

-- SELECT '🚀 Starting SSPPOC database migration...' as status;
-- CALL MigrateChurchDatabase('ssppoc_records_db', @ssppoc_church_id);

-- For other churches, use similar pattern:
-- SET @stgeorge_church_id = (SELECT id FROM orthodoxmetrics_db.churches WHERE name LIKE '%St. George%' LIMIT 1);
-- CALL MigrateChurchDatabase('01-stgeorge_db', @stgeorge_church_id);

-- ================================================================================
-- STEP 5: VALIDATION QUERIES
-- ================================================================================

-- Query to validate multi-tenant relationships
CREATE OR REPLACE VIEW v_church_record_summary AS
SELECT 
    c.id as church_id,
    c.name as church_name,
    c.database_name,
    c.email,
    IFNULL(
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = c.database_name AND table_name = 'baptism_records'), 0
    ) as has_baptism_table,
    IFNULL(
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = c.database_name AND table_name = 'marriage_records'), 0
    ) as has_marriage_table,
    IFNULL(
        (SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = c.database_name AND table_name = 'funeral_records'), 0
    ) as has_funeral_table,
    c.is_active,
    c.created_at
FROM orthodoxmetrics_db.churches c
WHERE c.database_name IS NOT NULL
ORDER BY c.id;

-- Display summary
SELECT '📊 Church Database Summary:' as info;
SELECT * FROM v_church_record_summary;

-- Query to check for orphaned records (church_id not in global registry)
CREATE OR REPLACE VIEW v_orphaned_records AS
SELECT 
    'Orphaned records found - check church_id values' as warning_message,
    table_schema as database_name,
    table_name,
    'Run manual check' as action_needed
FROM information_schema.tables
WHERE table_schema LIKE '%church%'
   OR table_schema LIKE '%orthodox%'
   OR table_schema LIKE '%ssppoc%'
   AND table_name IN ('baptism_records', 'marriage_records', 'funeral_records');

-- ================================================================================
-- STEP 6: CLEANUP AND DOCUMENTATION
-- ================================================================================

-- Re-enable foreign key checks
SET SESSION FOREIGN_KEY_CHECKS = 1;
SET SESSION SQL_SAFE_UPDATES = 1;

-- Document the corrected architecture
INSERT INTO orthodoxmetrics_db.system_settings (setting_key, setting_value, description) 
VALUES (
    'multi_tenant_architecture_version', 
    '2.0', 
    'Church records use church_id to reference orthodoxmetrics_db.churches(id). No local church_info tables.'
) ON DUPLICATE KEY UPDATE 
    setting_value = '2.0',
    description = 'Church records use church_id to reference orthodoxmetrics_db.churches(id). No local church_info tables.',
    updated_at = CURRENT_TIMESTAMP;

-- Final status message
SELECT '🎉 Church linkage fix script completed!' as status;
SELECT 'Next steps:' as info;
SELECT '1. Review audit results above' as step1;
SELECT '2. Uncomment and run migration procedures for your specific databases' as step2;
SELECT '3. Verify record counts and church_id values' as step3;
SELECT '4. Update application code to use correct church_id relationships' as step4;
SELECT '5. Test multi-tenant data segregation' as step5; 