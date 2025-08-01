
-- OrthodoxMetrics Setup User Creation Script
-- Creates user 'omsetup'@'localhost' with full setup privileges

CREATE USER IF NOT EXISTS 'omsetup'@'localhost' IDENTIFIED BY 'Summerof82@!';
GRANT ALL PRIVILEGES ON orthodoxmetrics_db.* TO 'omsetup'@'localhost' WITH GRANT OPTION;
GRANT RELOAD ON *.* TO 'omsetup'@'localhost';
FLUSH PRIVILEGES;
