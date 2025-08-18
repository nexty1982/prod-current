-- Populate test data for OMAI Logger
USE omai_error_tracking_db;

-- Insert test errors
INSERT INTO errors (hash, type, source, message, first_seen, last_seen, occurrences, status, severity, log_level, source_component) VALUES
('hash001', 'frontend', 'React Component', 'Cannot read property "map" of undefined', NOW() - INTERVAL 2 HOUR, NOW(), 15, 'pending', 'high', 'ERROR', 'UserList'),
('hash002', 'backend', 'API Gateway', 'Database connection timeout', NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 1 HOUR, 8, 'in-progress', 'critical', 'ERROR', 'system'),
('hash003', 'api', 'Authentication Service', 'Invalid JWT token', NOW() - INTERVAL 24 HOUR, NOW() - INTERVAL 30 MINUTE, 42, 'pending', 'medium', 'WARN', 'auth'),
('hash004', 'backend', 'File Upload Service', 'File size exceeds maximum limit', NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 HOUR, 5, 'resolved', 'low', 'INFO', 'upload'),
('hash005', 'db', 'MySQL', 'Deadlock found when trying to get lock', NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 10 MINUTE, 3, 'pending', 'high', 'ERROR', 'database'),
('hash006', 'frontend', 'Menu Configuration', 'Failed to load menu items', NOW() - INTERVAL 30 MINUTE, NOW() - INTERVAL 5 MINUTE, 2, 'pending', 'medium', 'ERROR', 'menu'),
('hash007', 'backend', 'Session Manager', 'Session expired for user', NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 3 HOUR, 25, 'ignored', 'low', 'INFO', 'system'),
('hash008', 'api', 'OMAI Logger', 'WebSocket connection failed', NOW() - INTERVAL 45 MINUTE, NOW() - INTERVAL 15 MINUTE, 6, 'pending', 'medium', 'WARN', 'logger'),
('hash009', 'frontend', 'Dashboard', 'Chart rendering failed', NOW() - INTERVAL 90 MINUTE, NOW() - INTERVAL 20 MINUTE, 4, 'pending', 'medium', 'ERROR', 'charts'),
('hash010', 'backend', 'Email Service', 'SMTP server unreachable', NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 1 HOUR, 12, 'in-progress', 'high', 'ERROR', 'system');

-- Add some error events for each error
INSERT INTO error_events (error_id, occurred_at, user_agent, session_id, additional_context)
SELECT 
  e.id,
  e.last_seen - INTERVAL FLOOR(RAND() * 60) MINUTE,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  CONCAT('session_', SUBSTRING(MD5(RAND()), 1, 8)),
  JSON_OBJECT(
    'user_id', FLOOR(RAND() * 10) + 1,
    'church_id', FLOOR(RAND() * 5) + 1,
    'ip_address', CONCAT('192.168.1.', FLOOR(RAND() * 255)),
    'url', '/dashboard',
    'method', 'GET'
  )
FROM errors e;

-- Add more events for high occurrence errors
INSERT INTO error_events (error_id, occurred_at, user_agent, session_id, additional_context)
SELECT 
  e.id,
  e.last_seen - INTERVAL FLOOR(RAND() * 120) MINUTE,
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  CONCAT('session_', SUBSTRING(MD5(RAND()), 1, 8)),
  JSON_OBJECT(
    'user_id', FLOOR(RAND() * 10) + 1,
    'church_id', FLOOR(RAND() * 5) + 1,
    'ip_address', CONCAT('10.0.0.', FLOOR(RAND() * 255)),
    'url', '/api/menu-permissions',
    'method', 'POST'
  )
FROM errors e
WHERE e.occurrences > 10;

-- Display summary
SELECT 'Test data populated successfully!' as message;
SELECT COUNT(*) as total_errors, SUM(occurrences) as total_occurrences FROM errors;
SELECT severity, COUNT(*) as count FROM errors GROUP BY severity;
SELECT log_level, COUNT(*) as count FROM errors GROUP BY log_level;
