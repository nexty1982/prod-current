-- Backup Management Schema for Orthodox Metrics
-- This schema handles backup settings and file tracking

-- Table to store backup configuration settings
CREATE TABLE IF NOT EXISTS backup_settings (
    id INT PRIMARY KEY DEFAULT 1,
    settings JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table to track backup files
CREATE TABLE IF NOT EXISTS backup_files (
    id VARCHAR(255) PRIMARY KEY,
    filename VARCHAR(500) NOT NULL,
    type ENUM('full', 'database', 'files') NOT NULL DEFAULT 'full',
    status ENUM('in_progress', 'completed', 'failed') NOT NULL DEFAULT 'in_progress',
    size BIGINT UNSIGNED DEFAULT 0,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_backup_files_type (type),
    INDEX idx_backup_files_status (status),
    INDEX idx_backup_files_created (created_at)
);

-- Table to track backup restore operations
CREATE TABLE IF NOT EXISTS backup_restores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_file_id VARCHAR(255) NOT NULL,
    requested_by INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    restore_type ENUM('full', 'database_only', 'files_only') NOT NULL DEFAULT 'full',
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (backup_file_id) REFERENCES backup_files(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_backup_restores_status (status),
    INDEX idx_backup_restores_requested_by (requested_by),
    INDEX idx_backup_restores_created (created_at)
);

-- Table to store backup schedules and history
CREATE TABLE IF NOT EXISTS backup_schedule_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_file_id VARCHAR(255) NULL,
    schedule_type ENUM('manual', 'scheduled') NOT NULL DEFAULT 'manual',
    triggered_by INT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status ENUM('running', 'completed', 'failed') NOT NULL DEFAULT 'running',
    duration_seconds INT NULL,
    backup_size BIGINT UNSIGNED DEFAULT 0,
    error_message TEXT NULL,
    
    FOREIGN KEY (backup_file_id) REFERENCES backup_files(id) ON DELETE SET NULL,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_schedule_history_status (status),
    INDEX idx_schedule_history_type (schedule_type),
    INDEX idx_schedule_history_started (started_at)
);

-- Insert default backup settings if none exist
INSERT IGNORE INTO backup_settings (id, settings) VALUES (
    1,
    JSON_OBJECT(
        'enabled', true,
        'schedule', '0 2 * * *',
        'retention_days', 30,
        'include_database', true,
        'include_files', true,
        'include_uploads', true,
        'compression', true,
        'email_notifications', false,
        'notification_email', '',
        'backup_location', '/opt/backups/orthodox-metrics',
        'max_backups', 50
    )
);

-- Create index for faster backup file queries
CREATE INDEX IF NOT EXISTS idx_backup_files_created_desc ON backup_files(created_at DESC);

-- Add some sample backup entries (for testing - remove in production)
-- INSERT INTO backup_files (id, filename, type, status, size, created_at) VALUES
-- ('backup_2025-01-01_sample_full', 'backup_2025-01-01_sample_full.tar.gz', 'full', 'completed', 1073741824, '2025-01-01 02:00:00'),
-- ('backup_2025-01-02_sample_database', 'backup_2025-01-02_sample_database.tar.gz', 'database', 'completed', 104857600, '2025-01-02 02:00:00');

-- View for backup statistics
CREATE OR REPLACE VIEW backup_statistics AS
SELECT 
    COUNT(*) as total_backups,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_backups,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
    COUNT(CASE WHEN type = 'full' THEN 1 END) as full_backups,
    COUNT(CASE WHEN type = 'database' THEN 1 END) as database_backups,
    COUNT(CASE WHEN type = 'files' THEN 1 END) as files_backups,
    SUM(CASE WHEN status = 'completed' THEN size ELSE 0 END) as total_backup_size,
    AVG(CASE WHEN status = 'completed' THEN size ELSE NULL END) as average_backup_size,
    MAX(created_at) as latest_backup,
    MIN(created_at) as oldest_backup
FROM backup_files;

-- View for recent backup activity
CREATE OR REPLACE VIEW recent_backup_activity AS
SELECT 
    bf.id,
    bf.filename,
    bf.type,
    bf.status,
    bf.size,
    bf.created_at,
    bf.completed_at,
    bsh.schedule_type,
    bsh.triggered_by,
    u.email as triggered_by_email,
    u.first_name as triggered_by_name
FROM backup_files bf
LEFT JOIN backup_schedule_history bsh ON bf.id = bsh.backup_file_id
LEFT JOIN users u ON bsh.triggered_by = u.id
ORDER BY bf.created_at DESC
LIMIT 50;

-- Stored procedure to cleanup old backups
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupOldBackups(IN retention_days INT, IN max_backups INT)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE backup_id VARCHAR(255);
    DECLARE backup_filename VARCHAR(500);
    
    -- Cursor for old backups based on retention days
    DECLARE old_backups_cursor CURSOR FOR
        SELECT id, filename FROM backup_files 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL retention_days DAY)
        AND status = 'completed';
    
    -- Cursor for excess backups beyond max_backups limit
    DECLARE excess_backups_cursor CURSOR FOR
        SELECT id, filename FROM backup_files 
        WHERE status = 'completed'
        ORDER BY created_at DESC 
        LIMIT max_backups, 999999;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Delete old backups
    OPEN old_backups_cursor;
    old_backup_loop: LOOP
        FETCH old_backups_cursor INTO backup_id, backup_filename;
        IF done THEN
            LEAVE old_backup_loop;
        END IF;
        
        DELETE FROM backup_files WHERE id = backup_id;
    END LOOP;
    CLOSE old_backups_cursor;
    
    -- Reset done flag for second cursor
    SET done = FALSE;
    
    -- Delete excess backups
    OPEN excess_backups_cursor;
    excess_backup_loop: LOOP
        FETCH excess_backups_cursor INTO backup_id, backup_filename;
        IF done THEN
            LEAVE excess_backup_loop;
        END IF;
        
        DELETE FROM backup_files WHERE id = backup_id;
    END LOOP;
    CLOSE excess_backups_cursor;
    
    COMMIT;
END //
DELIMITER ;

-- Function to get backup storage statistics
DELIMITER //
CREATE FUNCTION IF NOT EXISTS GetBackupStorageUsed() RETURNS BIGINT READS SQL DATA
BEGIN
    DECLARE total_size BIGINT DEFAULT 0;
    
    SELECT COALESCE(SUM(size), 0) INTO total_size 
    FROM backup_files 
    WHERE status = 'completed';
    
    RETURN total_size;
END //
DELIMITER ;

-- Trigger to update completed_at timestamp when status changes to completed
DELIMITER //
CREATE TRIGGER IF NOT EXISTS backup_files_status_update
    BEFORE UPDATE ON backup_files
    FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SET NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
END //
DELIMITER ;
