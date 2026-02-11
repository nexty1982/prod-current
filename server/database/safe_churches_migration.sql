-- Safe migration script for MariaDB
-- This script handles existing columns gracefully

-- First, let's create a procedure to safely add columns
DELIMITER $$

CREATE PROCEDURE AddColumnIfNotExists(
    IN table_name VARCHAR(255),
    IN column_name VARCHAR(255),
    IN column_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
    AND table_name = table_name 
    AND column_name = column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

DELIMITER ;

-- Add missing columns to churches table
CALL AddColumnIfNotExists('churches', 'location', 'VARCHAR(255)');
CALL AddColumnIfNotExists('churches', 'address', 'TEXT');
CALL AddColumnIfNotExists('churches', 'priest_name', 'VARCHAR(255)');
CALL AddColumnIfNotExists('churches', 'priest_phone', 'VARCHAR(50)');
CALL AddColumnIfNotExists('churches', 'priest_email', 'VARCHAR(255)');
CALL AddColumnIfNotExists('churches', 'website', 'VARCHAR(255)');

-- Add missing columns to users table
CALL AddColumnIfNotExists('users', 'church_id', 'INT');
CALL AddColumnIfNotExists('users', 'phone', 'VARCHAR(50)');
CALL AddColumnIfNotExists('users', 'preferred_language', 'VARCHAR(10) DEFAULT "en"');
CALL AddColumnIfNotExists('users', 'is_active', 'BOOLEAN DEFAULT TRUE');
CALL AddColumnIfNotExists('users', 'last_login', 'TIMESTAMP NULL');

-- Drop the procedure
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- Add foreign key constraint safely
-- First check if it exists
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND constraint_name = 'fk_users_church'
);

-- Add foreign key if it doesn't exist
SET @sql = IF(@constraint_exists = 0, 
    'ALTER TABLE users ADD CONSTRAINT fk_users_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL',
    'SELECT "Foreign key constraint already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index safely
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
    AND table_name = 'users' 
    AND index_name = 'idx_users_church_id'
);

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_users_church_id ON users(church_id)',
    'SELECT "Index already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert sample churches (this will only insert if name doesn't exist due to IGNORE)
INSERT IGNORE INTO churches (name, location, address, phone, email, priest_name, is_active) VALUES
('St. George Orthodox Church', 'New York, NY', '123 Main St, New York, NY 10001', '(555) 123-4567', 'info@stgeorgeny.org', 'Father John Doe', TRUE),
('Holy Trinity Cathedral', 'Boston, MA', '456 Church Ave, Boston, MA 02101', '(555) 234-5678', 'contact@holytrinity.org', 'Father Michael Smith', TRUE),
('St. Nicholas Orthodox Church', 'Chicago, IL', '789 Orthodox Blvd, Chicago, IL 60601', '(555) 345-6789', 'office@stnicholaschicago.org', 'Father Peter Johnson', TRUE),
('Annunciation Greek Orthodox Church', 'Los Angeles, CA', '321 Greek Way, Los Angeles, CA 90210', '(555) 456-7890', 'info@annunciationla.org', 'Father Nicholas Brown', TRUE),
('St. Demetrios Orthodox Church', 'Seattle, WA', '654 Orthodox St, Seattle, WA 98101', '(555) 567-8901', 'contact@stdemetrios.org', 'Father George Wilson', TRUE);

-- Show final table structures
SELECT 'Churches table structure:' AS info;
DESCRIBE churches;

SELECT 'Users table structure:' AS info;
DESCRIBE users;
