-- Update Email Settings to GoDaddy Configuration
-- Updates existing email settings to use info@orthodoxmetrics.com with GoDaddy SMTP

UPDATE email_settings 
SET 
    provider = 'GoDaddy',
    smtp_host = 'smtpout.secureserver.net',
    smtp_port = 465,
    smtp_secure = TRUE,
    smtp_user = 'info@orthodoxmetrics.com',
    sender_name = 'Orthodox Metrics AI',
    sender_email = 'info@orthodoxmetrics.com',
    updated_at = CURRENT_TIMESTAMP
WHERE is_active = TRUE;

-- Verify the update
SELECT * FROM email_settings WHERE is_active = TRUE; 