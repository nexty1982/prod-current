-- 📁 server/scrapers/schema/churches-schema.sql
-- Enhanced Database schema for Orthodox Church Directory - Step 2: Comprehensive Data Points

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS orthodox_churches;

-- Create the main churches table with comprehensive data points
CREATE TABLE orthodox_churches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Core required information
    name VARCHAR(255) NOT NULL,
    name_normalized VARCHAR(255), -- For duplicate detection
    jurisdiction VARCHAR(100) NOT NULL,
    
    -- Location information (required)
    address VARCHAR(255),
    city VARCHAR(100),
    state CHAR(2),
    zip_code VARCHAR(10),
    full_address TEXT, -- Computed field
    
    -- Primary contact information
    website VARCHAR(255),
    website_validated BOOLEAN DEFAULT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(20),
    
    -- Clergy and leadership information
    parish_priest VARCHAR(255),
    clergy_contact VARCHAR(255),
    dean VARCHAR(255),
    
    -- Church history and characteristics
    establishment_year YEAR,
    patron_saint VARCHAR(255),
    feast_day VARCHAR(100),
    
    -- Diocesan structure
    diocese VARCHAR(255),
    deanery VARCHAR(255),
    
    -- Service and community information
    parish_size VARCHAR(50),
    services_schedule TEXT,
    languages VARCHAR(255), -- Comma-separated list
    
    -- Social media and additional contacts
    facebook_url VARCHAR(255),
    instagram_url VARCHAR(255),
    youtube_url VARCHAR(255),
    
    -- Data quality and analytics (Step 3: Validation results)
    data_quality_score TINYINT DEFAULT 0, -- 0-100 scale
    is_validated BOOLEAN DEFAULT FALSE,
    validation_score TINYINT DEFAULT 0, -- 0-100 scale
    validation_flags JSON, -- Array of validation issues
    validation_date TIMESTAMP NULL,
    
    -- Step 4: Enhanced data management fields
    sync_status ENUM('pending', 'synced', 'conflict', 'error') DEFAULT 'pending',
    sync_hash VARCHAR(64), -- For change detection
    last_sync_date TIMESTAMP NULL,
    sync_source VARCHAR(100), -- Which system last updated this record
    
    -- Data lineage and versioning
    version_number INT DEFAULT 1,
    previous_version_id INT DEFAULT NULL,
    change_reason VARCHAR(255),
    
    -- Business intelligence fields
    parish_status ENUM('active', 'inactive', 'merged', 'closed') DEFAULT 'active',
    membership_size_category ENUM('small', 'medium', 'large', 'cathedral') DEFAULT NULL,
    founding_decade INT, -- Computed from establishment_year
    region VARCHAR(100), -- Computed from state
    metropolitan_area VARCHAR(255),
    
    -- Search and categorization
    search_keywords TEXT,
    
    -- Data source and quality tracking
    source_url VARCHAR(255),
    source_urls JSON, -- If merged from multiple sources
    scraper_version VARCHAR(20) DEFAULT '2.0.0',
    
    -- Duplicate handling
    merged_from INT DEFAULT NULL, -- Number of records merged
    merge_date DATETIME DEFAULT NULL,
    
    -- Timestamps
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Enhanced indexes for Step 4: Performance optimization
    INDEX idx_jurisdiction (jurisdiction),
    INDEX idx_state (state),
    INDEX idx_city (city),
    INDEX idx_zip_code (zip_code),
    INDEX idx_name (name),
    INDEX idx_name_normalized (name_normalized),
    INDEX idx_website (website),
    INDEX idx_last_updated (last_updated),
    INDEX idx_validation_score (validation_score),
    INDEX idx_sync_status (sync_status),
    INDEX idx_parish_status (parish_status),
    INDEX idx_diocese (diocese),
    INDEX idx_establishment_year (establishment_year),
    
    -- Composite indexes for common queries
    INDEX idx_jurisdiction_state (jurisdiction, state),
    INDEX idx_validation_status (is_validated, validation_score),
    INDEX idx_sync_management (sync_status, last_sync_date),
    
    -- Full-text search index
    FULLTEXT INDEX ft_search (name, city, address, clergy_contact, search_keywords),
    
    -- Foreign key constraints
    FOREIGN KEY (previous_version_id) REFERENCES orthodox_churches(id) ON DELETE SET NULL
);

-- Create table for scraping statistics
CREATE TABLE scraping_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_start DATETIME NOT NULL,
    session_end DATETIME,
    total_churches_scraped INT DEFAULT 0,
    total_churches_saved INT DEFAULT 0,
    duplicates_found INT DEFAULT 0,
    urls_validated INT DEFAULT 0,
    errors_count INT DEFAULT 0,
    jurisdiction_breakdown JSON,
    scraper_version VARCHAR(20),
    config_options JSON,
    status ENUM('running', 'completed', 'failed') DEFAULT 'running',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for scraping errors
CREATE TABLE scraping_errors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT,
    jurisdiction VARCHAR(100),
    error_type VARCHAR(50),
    error_message TEXT,
    url VARCHAR(255),
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES scraping_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_jurisdiction (jurisdiction),
    INDEX idx_error_type (error_type)
);

-- Create table for URL validation results
CREATE TABLE url_validations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT,
    url VARCHAR(255) NOT NULL,
    is_valid BOOLEAN NOT NULL,
    status_code INT,
    response_time INT, -- milliseconds
    redirect_url VARCHAR(255),
    error_message TEXT,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES orthodox_churches(id) ON DELETE CASCADE,
    INDEX idx_church_id (church_id),
    INDEX idx_url (url),
    INDEX idx_is_valid (is_valid),
    INDEX idx_validated_at (validated_at)
);

-- Create table for duplicate detection results
CREATE TABLE duplicate_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    group_id VARCHAR(36) NOT NULL, -- UUID for the group
    church_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- The record that was kept
    similarity_score DECIMAL(3,2),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (church_id) REFERENCES orthodox_churches(id) ON DELETE CASCADE,
    INDEX idx_group_id (group_id),
    INDEX idx_church_id (church_id),
    INDEX idx_is_primary (is_primary)
);

-- Step 4: Enhanced Data Management Tables

-- Create table for data synchronization tracking
CREATE TABLE sync_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('full_sync', 'incremental', 'validation_sync', 'manual_update') NOT NULL,
    source_system VARCHAR(100) NOT NULL,
    target_system VARCHAR(100) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
    records_processed INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    records_added INT DEFAULT 0,
    records_deleted INT DEFAULT 0,
    conflicts_detected INT DEFAULT 0,
    error_message TEXT,
    
    INDEX idx_operation_type (operation_type),
    INDEX idx_status (status),
    INDEX idx_started_at (started_at)
);

-- Create table for change tracking
CREATE TABLE church_changes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    church_id INT NOT NULL,
    change_type ENUM('insert', 'update', 'delete', 'merge') NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(100), -- System or user that made the change
    change_reason VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_operation_id INT,
    
    FOREIGN KEY (church_id) REFERENCES orthodox_churches(id) ON DELETE CASCADE,
    FOREIGN KEY (sync_operation_id) REFERENCES sync_operations(id) ON DELETE SET NULL,
    INDEX idx_church_id (church_id),
    INDEX idx_change_type (change_type),
    INDEX idx_changed_at (changed_at)
);

-- Create table for automated synchronization schedules
CREATE TABLE sync_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schedule_name VARCHAR(100) NOT NULL,
    operation_type ENUM('full_sync', 'incremental', 'validation_only') NOT NULL,
    cron_expression VARCHAR(100) NOT NULL, -- e.g., '0 2 * * *' for daily at 2 AM
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    next_run TIMESTAMP NULL,
    source_jurisdictions JSON, -- Array of jurisdictions to sync
    config_options JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_schedule_name (schedule_name),
    INDEX idx_is_active (is_active),
    INDEX idx_next_run (next_run)
);

-- Create views for easy querying
CREATE VIEW v_churches_by_jurisdiction AS
SELECT 
    jurisdiction,
    COUNT(*) as total_churches,
    COUNT(website) as churches_with_website,
    COUNT(contact_email) as churches_with_email,
    COUNT(contact_phone) as churches_with_phone,
    COUNT(full_address) as churches_with_full_address
FROM orthodox_churches
GROUP BY jurisdiction
ORDER BY total_churches DESC;

CREATE VIEW v_churches_by_state AS
SELECT 
    state,
    COUNT(*) as total_churches,
    COUNT(DISTINCT jurisdiction) as jurisdictions_count,
    GROUP_CONCAT(DISTINCT jurisdiction ORDER BY jurisdiction SEPARATOR ', ') as jurisdictions
FROM orthodox_churches
WHERE state IS NOT NULL
GROUP BY state
ORDER BY total_churches DESC;

CREATE VIEW v_recent_scraping_activity AS
SELECT 
    ss.id,
    ss.session_start,
    ss.session_end,
    ss.total_churches_scraped,
    ss.total_churches_saved,
    ss.duplicates_found,
    ss.status,
    COUNT(se.id) as error_count
FROM scraping_sessions ss
LEFT JOIN scraping_errors se ON ss.id = se.session_id
GROUP BY ss.id
ORDER BY ss.session_start DESC
LIMIT 10;

-- Create materialized view for jurisdiction statistics
CREATE VIEW jurisdiction_stats AS
SELECT 
    jurisdiction,
    COUNT(*) as total_churches,
    COUNT(CASE WHEN parish_status = 'active' THEN 1 END) as active_churches,
    COUNT(CASE WHEN website IS NOT NULL THEN 1 END) as churches_with_websites,
    COUNT(CASE WHEN is_validated = TRUE THEN 1 END) as validated_churches,
    AVG(validation_score) as avg_validation_score,
    AVG(data_quality_score) as avg_data_quality_score,
    COUNT(DISTINCT state) as states_present,
    MIN(establishment_year) as oldest_church_year,
    MAX(establishment_year) as newest_church_year,
    MAX(last_updated) as last_data_update
FROM orthodox_churches 
WHERE parish_status != 'deleted'
GROUP BY jurisdiction;

-- Create view for data quality dashboard
CREATE VIEW data_quality_dashboard AS
SELECT 
    DATE(last_updated) as update_date,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_validated = TRUE THEN 1 END) as validated_records,
    AVG(validation_score) as avg_validation_score,
    COUNT(CASE WHEN validation_flags IS NOT NULL AND JSON_LENGTH(validation_flags) > 0 THEN 1 END) as flagged_records,
    COUNT(CASE WHEN website IS NOT NULL AND website_validated = TRUE THEN 1 END) as valid_websites,
    COUNT(CASE WHEN sync_status = 'conflict' THEN 1 END) as sync_conflicts,
    COUNT(CASE WHEN parish_status = 'active' THEN 1 END) as active_parishes
FROM orthodox_churches
GROUP BY DATE(last_updated)
ORDER BY update_date DESC;

-- Create view for geographical distribution
CREATE VIEW geographical_distribution AS
SELECT 
    state,
    region,
    COUNT(*) as church_count,
    COUNT(DISTINCT jurisdiction) as jurisdictions_present,
    COUNT(DISTINCT city) as cities_with_churches,
    AVG(data_quality_score) as avg_data_quality,
    COUNT(CASE WHEN establishment_year IS NOT NULL THEN 1 END) as churches_with_founding_year,
    MIN(establishment_year) as oldest_establishment,
    MAX(establishment_year) as newest_establishment
FROM orthodox_churches 
WHERE parish_status = 'active'
GROUP BY state, region
ORDER BY church_count DESC;

-- Create view for sync status monitoring
CREATE VIEW sync_status_monitor AS
SELECT 
    sync_status,
    COUNT(*) as record_count,
    AVG(TIMESTAMPDIFF(HOUR, last_sync_date, NOW())) as hours_since_last_sync,
    COUNT(CASE WHEN last_sync_date IS NULL THEN 1 END) as never_synced,
    COUNT(CASE WHEN sync_status = 'conflict' THEN 1 END) as conflict_count,
    COUNT(CASE WHEN sync_status = 'error' THEN 1 END) as error_count
FROM orthodox_churches
GROUP BY sync_status;

-- Step 4: Stored Procedures for Data Management

DELIMITER //

CREATE PROCEDURE GetChurchesByJurisdiction(IN jurisdiction_name VARCHAR(100))
BEGIN
    SELECT * FROM orthodox_churches 
    WHERE jurisdiction = jurisdiction_name 
    ORDER BY state, city, name;
END //

CREATE PROCEDURE GetChurchesByLocation(IN state_code CHAR(2), IN city_name VARCHAR(100))
BEGIN
    SELECT * FROM orthodox_churches 
    WHERE state = state_code 
    AND (city_name IS NULL OR city = city_name)
    ORDER BY jurisdiction, name;
END //

CREATE PROCEDURE SearchChurches(IN search_term VARCHAR(255))
BEGIN
    SELECT *, 
           MATCH(name, city, address, clergy_contact, search_keywords) 
           AGAINST(search_term IN NATURAL LANGUAGE MODE) as relevance_score
    FROM orthodox_churches 
    WHERE MATCH(name, city, address, clergy_contact, search_keywords) 
          AGAINST(search_term IN NATURAL LANGUAGE MODE)
    ORDER BY relevance_score DESC;
END //

CREATE PROCEDURE GetScrapingStatistics()
BEGIN
    SELECT 
        COUNT(*) as total_churches,
        COUNT(DISTINCT jurisdiction) as total_jurisdictions,
        COUNT(website) as churches_with_websites,
        COUNT(CASE WHEN website_validated = 1 THEN 1 END) as validated_websites,
        COUNT(contact_email) as churches_with_email,
        COUNT(contact_phone) as churches_with_phone,
        AVG(CASE WHEN establishment_year IS NOT NULL THEN establishment_year END) as avg_establishment_year,
        MAX(last_updated) as last_scrape_update
    FROM orthodox_churches;
END //

-- Procedure to calculate sync hash for change detection
CREATE PROCEDURE CalculateSyncHash(IN church_id INT)
BEGIN
    DECLARE hash_input TEXT;
    DECLARE calculated_hash VARCHAR(64);
    
    SELECT CONCAT_WS('|', 
        COALESCE(name, ''),
        COALESCE(jurisdiction, ''),
        COALESCE(address, ''),
        COALESCE(city, ''),
        COALESCE(state, ''),
        COALESCE(zip_code, ''),
        COALESCE(website, ''),
        COALESCE(contact_email, ''),
        COALESCE(contact_phone, ''),
        COALESCE(parish_priest, ''),
        COALESCE(establishment_year, '')
    ) INTO hash_input
    FROM orthodox_churches
    WHERE id = church_id;
    
    SET calculated_hash = SHA2(hash_input, 256);
    
    UPDATE orthodox_churches 
    SET sync_hash = calculated_hash
    WHERE id = church_id;
END //

-- Procedure to detect changes for synchronization
CREATE PROCEDURE DetectChangesForSync()
BEGIN
    -- Mark records that have changed since last sync
    UPDATE orthodox_churches 
    SET sync_status = 'pending'
    WHERE (
        last_updated > last_sync_date 
        OR last_sync_date IS NULL
        OR sync_hash != SHA2(CONCAT_WS('|', 
            COALESCE(name, ''),
            COALESCE(jurisdiction, ''),
            COALESCE(address, ''),
            COALESCE(city, ''),
            COALESCE(state, ''),
            COALESCE(zip_code, ''),
            COALESCE(website, ''),
            COALESCE(contact_email, ''),
            COALESCE(contact_phone, ''),
            COALESCE(parish_priest, ''),
            COALESCE(establishment_year, '')
        ), 256)
    ) AND sync_status != 'conflict';
END //

-- Procedure to update computed fields
CREATE PROCEDURE UpdateComputedFields()
BEGIN
    -- Update founding decade
    UPDATE orthodox_churches 
    SET founding_decade = FLOOR(establishment_year / 10) * 10
    WHERE establishment_year IS NOT NULL;
    
    -- Update region based on state
    UPDATE orthodox_churches 
    SET region = CASE 
        WHEN state IN ('ME', 'NH', 'VT', 'MA', 'RI', 'CT') THEN 'New England'
        WHEN state IN ('NY', 'NJ', 'PA') THEN 'Mid-Atlantic'
        WHEN state IN ('OH', 'MI', 'IN', 'WI', 'IL', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS') THEN 'Midwest'
        WHEN state IN ('DE', 'MD', 'DC', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'AR', 'LA') THEN 'South'
        WHEN state IN ('MT', 'ID', 'WY', 'CO', 'NM', 'AZ', 'UT', 'NV', 'WA', 'OR', 'CA', 'AK', 'HI') THEN 'West'
        ELSE 'Other'
    END
    WHERE state IS NOT NULL;
    
    -- Update membership size category based on parish_size text
    UPDATE orthodox_churches 
    SET membership_size_category = CASE 
        WHEN parish_size LIKE '%small%' OR parish_size LIKE '%<50%' OR parish_size LIKE '%under 50%' THEN 'small'
        WHEN parish_size LIKE '%large%' OR parish_size LIKE '%200+%' OR parish_size LIKE '%over 200%' THEN 'large'
        WHEN parish_size LIKE '%cathedral%' OR name LIKE '%cathedral%' THEN 'cathedral'
        WHEN parish_size IS NOT NULL THEN 'medium'
        ELSE NULL
    END
    WHERE parish_size IS NOT NULL OR name LIKE '%cathedral%';
    
    -- Update search keywords
    UPDATE orthodox_churches 
    SET search_keywords = CONCAT_WS(' ', 
        name, 
        city, 
        state, 
        jurisdiction, 
        COALESCE(patron_saint, ''),
        COALESCE(diocese, ''),
        COALESCE(parish_priest, '')
    )
    WHERE search_keywords IS NULL OR search_keywords = '';
END //

DELIMITER ;

-- Insert some initial data for testing (optional)
-- This would be populated by the scraper
INSERT INTO scraping_sessions (session_start, status, scraper_version) 
VALUES (NOW(), 'running', '1.0.0');
