-- Database Permissions Fix for Orthodox Metrics OCR System
-- Run this as MySQL root user: mysql -u root -p < fix-church-permissions.sql

-- Grant full permissions to orthodoxapps user for all church databases
GRANT ALL PRIVILEGES ON `saints_peter_and_paul_orthodox_church_db`.* TO 'orthodoxapps'@'localhost';

-- Grant permissions for future church databases (wildcard pattern)
GRANT ALL PRIVILEGES ON `*_db`.* TO 'orthodoxapps'@'localhost';

-- Grant specific permissions needed for OCR functionality
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON `saints_peter_and_paul_orthodox_church_db`.* TO 'orthodoxapps'@'localhost';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Show current grants for orthodoxapps user
SHOW GRANTS FOR 'orthodoxapps'@'localhost';

-- Test connection to church database
USE saints_peter_and_paul_orthodox_church_db;
SHOW TABLES;
SELECT COUNT(*) as ocr_jobs_count FROM ocr_jobs;
SELECT COUNT(*) as ocr_settings_count FROM ocr_settings;
SELECT COUNT(*) as ocr_queue_count FROM ocr_queue;
