-- Email Settings Database Migration
-- Creates email_settings table for SMTP configuration
-- Created: January 2025

-- Create email_settings table
DROP TABLE IF EXISTS email_settings;
CREATE TABLE email_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider VARCHAR(50) NOT NULL DEFAULT 'Custom',
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INT NOT NULL DEFAULT 587,
    smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_pass VARCHAR(255) NOT NULL,
    sender_name VARCHAR(255) NOT NULL DEFAULT 'OMAI Task System',
    sender_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_is_active (is_active),
    INDEX idx_provider (provider)
);

-- Insert default configuration (GoDaddy SMTP with info@orthodoxmetrics.com)
INSERT INTO email_settings (
    provider, 
    smtp_host, 
    smtp_port, 
    smtp_secure, 
    smtp_user, 
    smtp_pass, 
    sender_name, 
    sender_email, 
    is_active
) VALUES (
    'GoDaddy', 
    'smtpout.secureserver.net', 
    465, 
    TRUE, 
    'info@orthodoxmetrics.com', 
    'your-app-password', 
    'Orthodox Metrics AI', 
    'info@orthodoxmetrics.com',
    TRUE
);

-- Success message
SELECT 'Email settings table created successfully' as status; 