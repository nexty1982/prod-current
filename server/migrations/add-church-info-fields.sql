-- Migration: Create and expand church_info table with comprehensive church management fields
-- Date: July 13, 2025
-- Purpose: Create church_info table with all frontend form fields to support complete church profile management

-- Create church_info table with all required fields
CREATE TABLE IF NOT EXISTS church_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id VARCHAR(50) UNIQUE,
    
    -- Core church information
    name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) DEFAULT NULL,
    website VARCHAR(255) DEFAULT NULL,
    
    -- Address information
    address TEXT DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state_province VARCHAR(100) DEFAULT NULL,
    postal_code VARCHAR(20) DEFAULT NULL,
    country VARCHAR(100) DEFAULT NULL,
    
    -- Church details
    description TEXT DEFAULT NULL,
    founded_year INT DEFAULT NULL,
    
    -- Preferences and settings
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    
    -- Administrative
    tax_id VARCHAR(50) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_test_church BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create indexes for better performance (only if table exists)
CREATE INDEX IF NOT EXISTS idx_church_info_name ON church_info(name);
CREATE INDEX IF NOT EXISTS idx_church_info_email ON church_info(email);
CREATE INDEX IF NOT EXISTS idx_church_info_active ON church_info(is_active);
CREATE INDEX IF NOT EXISTS idx_church_info_country ON church_info(country);
CREATE INDEX IF NOT EXISTS idx_church_info_test ON church_info(is_test_church);

-- Add unique constraint on email to prevent duplicates
-- Note: Using INSERT IGNORE for MySQL/MariaDB compatibility with unique constraints
ALTER TABLE church_info ADD CONSTRAINT uk_church_info_email UNIQUE (email);

-- Insert sample church data if table is empty (for testing)
INSERT IGNORE INTO church_info (
    church_id, name, email, phone, website, 
    address, city, state_province, postal_code, country,
    description, founded_year, language_preference, timezone, currency, is_active
) VALUES (
    'SSPPOC_001', 
    'Saints Peter and Paul Orthodox Church',
    'admin@ssppoc.org',
    '(555) 123-4567',
    'https://ssppoc.org',
    '123 Orthodox Way',
    'Springfield',
    'Illinois',
    '62701',
    'United States',
    'A traditional Orthodox church serving the Springfield community since 1952.',
    1952,
    'en',
    'America/Chicago',
    'USD',
    TRUE
);

-- Verify migration completed successfully
SELECT 'Migration completed successfully - church_info table created' AS status;
SELECT COUNT(*) AS total_churches FROM church_info;
