-- Comprehensive Notifications System Schema
-- This schema provides a complete notification system with support for:
-- - Real-time notifications
-- - Email notifications
-- - Push notifications
-- - Notification preferences
-- - Notification history and tracking

-- ============================================================================
-- Notification Types Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category ENUM('system', 'user', 'admin', 'billing', 'backup', 'security', 'certificates', 'reminders') DEFAULT 'system',
    is_active BOOLEAN DEFAULT TRUE,
    default_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================================
-- Notification Templates Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_type_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    title VARCHAR(255),
    body_text TEXT,
    body_html TEXT,
    template_variables JSON,
    language VARCHAR(10) DEFAULT 'en',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_type_language (notification_type_id, language)
);

-- ============================================================================
-- User Notification Preferences Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type_id INT NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    frequency ENUM('immediate', 'daily', 'weekly', 'monthly', 'disabled') DEFAULT 'immediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_type (user_id, notification_type_id)
);

-- ============================================================================
-- Notifications Table (In-App Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    action_url VARCHAR(500),
    action_text VARCHAR(100),
    icon VARCHAR(100),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_user_created (user_id, created_at),
    INDEX idx_expires (expires_at),
    INDEX idx_priority (priority)
);

-- ============================================================================
-- Notification Queue Table (For scheduled/batched notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type_id INT NOT NULL,
    template_id INT,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    subject VARCHAR(255),
    title VARCHAR(255),
    message TEXT,
    html_message TEXT,
    data JSON,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    delivery_method ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    status ENUM('pending', 'processing', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    failed_at TIMESTAMP NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL,
    INDEX idx_status_scheduled (status, scheduled_at),
    INDEX idx_user_status (user_id, status),
    INDEX idx_delivery_method (delivery_method)
);

-- ============================================================================
-- Notification History Table (For tracking sent notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    notification_type_id INT NOT NULL,
    template_id INT,
    delivery_method ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status ENUM('sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked') DEFAULT 'sent',
    metadata JSON,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_type_id) REFERENCES notification_types(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES notification_templates(id) ON DELETE SET NULL,
    INDEX idx_user_sent (user_id, sent_at),
    INDEX idx_type_sent (notification_type_id, sent_at),
    INDEX idx_delivery_method (delivery_method),
    INDEX idx_status (status)
);

-- ============================================================================
-- Push Notification Subscriptions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    p256dh VARCHAR(255),
    auth VARCHAR(255),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_endpoint (user_id, endpoint),
    INDEX idx_user_active (user_id, is_active)
);

-- ============================================================================
-- Insert Default Notification Types
-- ============================================================================
INSERT INTO notification_types (name, description, category, default_enabled) VALUES
('welcome', 'Welcome message for new users', 'user', TRUE),
('password_reset', 'Password reset notifications', 'security', TRUE),
('login_alert', 'Login alert notifications', 'security', TRUE),
('profile_updated', 'Profile update confirmations', 'user', TRUE),
('backup_completed', 'Backup completion notifications', 'backup', TRUE),
('backup_failed', 'Backup failure notifications', 'backup', TRUE),
('certificate_ready', 'Certificate ready notifications', 'certificates', TRUE),
('certificate_expiring', 'Certificate expiring reminders', 'certificates', TRUE),
('invoice_created', 'New invoice notifications', 'billing', TRUE),
('invoice_paid', 'Invoice payment confirmations', 'billing', TRUE),
('invoice_overdue', 'Overdue invoice reminders', 'billing', TRUE),
('system_maintenance', 'System maintenance notifications', 'system', TRUE),
('system_alert', 'System alert notifications', 'system', TRUE),
('user_activity', 'User activity notifications', 'admin', FALSE),
('data_export_ready', 'Data export ready notifications', 'system', TRUE),
('reminder_baptism', 'Baptism anniversary reminders', 'reminders', TRUE),
('reminder_marriage', 'Marriage anniversary reminders', 'reminders', TRUE),
('reminder_funeral', 'Memorial service reminders', 'reminders', TRUE),
('note_shared', 'Note sharing notifications', 'user', TRUE),
('note_comment', 'Note comment notifications', 'user', TRUE),
('church_invitation', 'Church invitation notifications', 'user', TRUE),
('role_changed', 'Role change notifications', 'admin', TRUE),
('account_locked', 'Account security notifications', 'security', TRUE),
('weekly_digest', 'Weekly activity digest', 'user', FALSE),
('monthly_report', 'Monthly report notifications', 'admin', FALSE);

-- ============================================================================
-- Insert Default Templates
-- ============================================================================
INSERT INTO notification_templates (notification_type_id, name, subject, title, body_text, body_html, template_variables) VALUES
(
    (SELECT id FROM notification_types WHERE name = 'welcome'),
    'Welcome Email',
    'Welcome to Orthodox Metrics!',
    'Welcome to Orthodox Metrics!',
    'Dear {{user_name}},\n\nWelcome to Orthodox Metrics! We are excited to have you join our community.\n\nYour account has been successfully created and you can now access all the features of our platform.\n\nIf you have any questions, please don''t hesitate to contact our support team.\n\nBest regards,\nThe Orthodox Metrics Team',
    '<h2>Welcome to Orthodox Metrics!</h2><p>Dear {{user_name}},</p><p>Welcome to Orthodox Metrics! We are excited to have you join our community.</p><p>Your account has been successfully created and you can now access all the features of our platform.</p><p>If you have any questions, please don''t hesitate to contact our support team.</p><p>Best regards,<br>The Orthodox Metrics Team</p>',
    '{"user_name": "User''s full name", "email": "User''s email address", "church_name": "Church name if applicable"}'
),
(
    (SELECT id FROM notification_types WHERE name = 'backup_completed'),
    'Backup Completed',
    'Backup Completed Successfully',
    'Backup Completed',
    'Your backup has been completed successfully.\n\nBackup Details:\n- Size: {{backup_size}}\n- Duration: {{backup_duration}}\n- Files: {{file_count}}\n- Date: {{backup_date}}\n\nThe backup is now available in your backup storage.',
    '<h3>Backup Completed Successfully</h3><p>Your backup has been completed successfully.</p><h4>Backup Details:</h4><ul><li>Size: {{backup_size}}</li><li>Duration: {{backup_duration}}</li><li>Files: {{file_count}}</li><li>Date: {{backup_date}}</li></ul><p>The backup is now available in your backup storage.</p>',
    '{"backup_size": "Backup file size", "backup_duration": "Time taken for backup", "file_count": "Number of files backed up", "backup_date": "Date of backup"}'
),
(
    (SELECT id FROM notification_types WHERE name = 'certificate_ready'),
    'Certificate Ready',
    'Your Certificate is Ready',
    'Certificate Ready for Download',
    'Your certificate for {{certificate_type}} is now ready for download.\n\nCertificate Details:\n- Type: {{certificate_type}}\n- Name: {{person_name}}\n- Date: {{certificate_date}}\n\nYou can download your certificate from the certificates section.',
    '<h3>Certificate Ready for Download</h3><p>Your certificate for {{certificate_type}} is now ready for download.</p><h4>Certificate Details:</h4><ul><li>Type: {{certificate_type}}</li><li>Name: {{person_name}}</li><li>Date: {{certificate_date}}</li></ul><p>You can download your certificate from the certificates section.</p>',
    '{"certificate_type": "Type of certificate", "person_name": "Person name on certificate", "certificate_date": "Date on certificate"}'
);

-- ============================================================================
-- Create indexes for better performance
-- ============================================================================
CREATE INDEX idx_notifications_user_priority ON notifications(user_id, priority, created_at DESC);
CREATE INDEX idx_notifications_type_created ON notifications(notification_type_id, created_at DESC);
CREATE INDEX idx_queue_priority_scheduled ON notification_queue(priority, scheduled_at);
CREATE INDEX idx_history_user_type ON notification_history(user_id, notification_type_id, sent_at DESC);

-- ============================================================================
-- Create triggers for automatic cleanup
-- ============================================================================
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS cleanup_old_notifications
AFTER INSERT ON notifications
FOR EACH ROW
BEGIN
    -- Delete notifications older than 90 days for regular users
    DELETE FROM notifications 
    WHERE user_id = NEW.user_id 
    AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
    AND is_read = TRUE;
    
    -- Delete expired notifications
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END$$

CREATE TRIGGER IF NOT EXISTS cleanup_notification_history
AFTER INSERT ON notification_history
FOR EACH ROW
BEGIN
    -- Delete history older than 1 year
    DELETE FROM notification_history 
    WHERE user_id = NEW.user_id 
    AND sent_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
END$$

DELIMITER ;

-- ============================================================================
-- Create stored procedures for common operations
-- ============================================================================
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS CreateNotification(
    IN p_user_id INT,
    IN p_type_name VARCHAR(100),
    IN p_title VARCHAR(255),
    IN p_message TEXT,
    IN p_data JSON,
    IN p_priority ENUM('low', 'normal', 'high', 'urgent'),
    IN p_action_url VARCHAR(500),
    IN p_action_text VARCHAR(100),
    IN p_expires_at TIMESTAMP
)
BEGIN
    DECLARE v_type_id INT;
    
    -- Get notification type ID
    SELECT id INTO v_type_id FROM notification_types WHERE name = p_type_name AND is_active = TRUE;
    
    IF v_type_id IS NOT NULL THEN
        INSERT INTO notifications (
            user_id, notification_type_id, title, message, data, 
            priority, action_url, action_text, expires_at
        ) VALUES (
            p_user_id, v_type_id, p_title, p_message, p_data, 
            p_priority, p_action_url, p_action_text, p_expires_at
        );
    END IF;
END$$

CREATE PROCEDURE IF NOT EXISTS GetUserNotifications(
    IN p_user_id INT,
    IN p_limit INT,
    IN p_offset INT,
    IN p_unread_only BOOLEAN
)
BEGIN
    IF p_unread_only THEN
        SELECT n.*, nt.name as type_name, nt.category
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        WHERE n.user_id = p_user_id 
        AND n.is_read = FALSE 
        AND n.is_dismissed = FALSE
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        ORDER BY n.priority DESC, n.created_at DESC
        LIMIT p_limit OFFSET p_offset;
    ELSE
        SELECT n.*, nt.name as type_name, nt.category
        FROM notifications n
        JOIN notification_types nt ON n.notification_type_id = nt.id
        WHERE n.user_id = p_user_id 
        AND n.is_dismissed = FALSE
        AND (n.expires_at IS NULL OR n.expires_at > NOW())
        ORDER BY n.priority DESC, n.created_at DESC
        LIMIT p_limit OFFSET p_offset;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- Grant permissions (adjust as needed for your setup)
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_types TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_templates TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_notification_preferences TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_queue TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_history TO 'your_app_user'@'localhost';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO 'your_app_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE CreateNotification TO 'your_app_user'@'localhost';
-- GRANT EXECUTE ON PROCEDURE GetUserNotifications TO 'your_app_user'@'localhost';
