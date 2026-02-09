/**
 * Database Migration: Add Indexes for Power Search
 * 
 * Purpose: Optimize search performance for baptism records
 * These indexes support the Power Search feature with field-scoped queries
 * 
 * IMPORTANT: Run this on EACH church database (om_church_{id})
 * 
 * Usage:
 *   mysql -u root -p om_church_1 < add-search-indexes.sql
 *   mysql -u root -p om_church_2 < add-search-indexes.sql
 *   etc.
 * 
 * Or use a script to apply to all church databases
 */

-- Check if we're in a church database
SELECT DATABASE() as current_database;

-- Add indexes for frequently searched fields
-- These are "IF NOT EXISTS" safe - won't error if index already exists

-- Index for church_id + last name (most common search pattern)
CREATE INDEX IF NOT EXISTS idx_church_lastname 
ON baptism_records(church_id, person_last);

-- Index for church_id + first name
CREATE INDEX IF NOT EXISTS idx_church_firstname 
ON baptism_records(church_id, person_first);

-- Index for church_id + full name
CREATE INDEX IF NOT EXISTS idx_church_fullname 
ON baptism_records(church_id, person_full);

-- Index for church_id + birth date (date range queries)
CREATE INDEX IF NOT EXISTS idx_church_birthdate 
ON baptism_records(church_id, birth_date);

-- Index for church_id + baptism date (most common sort/filter)
CREATE INDEX IF NOT EXISTS idx_church_baptismdate 
ON baptism_records(church_id, baptism_date);

-- Index for church_id + reception date
CREATE INDEX IF NOT EXISTS idx_church_receptiondate 
ON baptism_records(church_id, reception_date);

-- Index for clergy/officiant searches
CREATE INDEX IF NOT EXISTS idx_church_officiant 
ON baptism_records(church_id, officiant_name);

-- Index for place/location searches
CREATE INDEX IF NOT EXISTS idx_church_place 
ON baptism_records(church_id, place_name);

-- Composite index for common query pattern: church + date range + name
CREATE INDEX IF NOT EXISTS idx_church_date_name 
ON baptism_records(church_id, baptism_date, person_last, person_first);

-- Index for certificate number lookups
CREATE INDEX IF NOT EXISTS idx_church_certificate 
ON baptism_records(church_id, certificate_no);

-- Index for entry number lookups
CREATE INDEX IF NOT EXISTS idx_church_entry 
ON baptism_records(church_id, entry_no);

-- Show all indexes on baptism_records table
SHOW INDEXES FROM baptism_records;

-- Analyze table to update statistics for query optimizer
ANALYZE TABLE baptism_records;

-- Display index usage statistics (optional, for monitoring)
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX,
    COLUMN_NAME,
    CARDINALITY,
    INDEX_TYPE
FROM 
    information_schema.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'baptism_records'
ORDER BY 
    INDEX_NAME, SEQ_IN_INDEX;

-- Success message
SELECT 'Power Search indexes created successfully!' as status;
