-- Audit-only version of the church linkage fix script
SET SESSION FOREIGN_KEY_CHECKS = 0;
SET SESSION SQL_SAFE_UPDATES = 0;

USE orthodoxmetrics_db;

-- Create audit table
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

-- Audit procedure (simplified for standalone execution)
DELIMITER $$
DROP PROCEDURE IF EXISTS AuditChurchDatabase$$
CREATE PROCEDURE AuditChurchDatabase(IN db_name VARCHAR(100))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE table_name VARCHAR(100);
    
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
        
        SET @has_church_id = 0;
        SET @church_id_type = '';
        SET @has_fk = 0;
        SET @fk_target = '';
        SET @record_count = 0;
        SET @missing_church_id = 0;
        
        -- Check if church_id column exists
        SELECT COUNT(*), IFNULL(COLUMN_TYPE, '')
        INTO @has_church_id, @church_id_type
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id';
        
        -- Check for foreign key constraints
        SELECT COUNT(*), IFNULL(REFERENCED_TABLE_NAME, '')
        INTO @has_fk, @fk_target
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = db_name
        AND TABLE_NAME = table_name
        AND COLUMN_NAME = 'church_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
        
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
DELIMITER ;

-- Run audits for known databases
CALL AuditChurchDatabase('ssppoc_records_db');
CALL AuditChurchDatabase('saints_peter_and_paul_orthodox_church_db');

-- Display results
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

-- Re-enable safety checks
SET SESSION FOREIGN_KEY_CHECKS = 1;
SET SESSION SQL_SAFE_UPDATES = 1;
