-- Simple migration script for MariaDB
-- Run this line by line if needed

-- First, let's see what columns exist in churches table
-- DESCRIBE churches;

-- Add missing columns to churches table (ignore errors if columns exist)
ALTER TABLE churches ADD COLUMN location VARCHAR(255);
ALTER TABLE churches ADD COLUMN address TEXT;
ALTER TABLE churches ADD COLUMN priest_name VARCHAR(255);
ALTER TABLE churches ADD COLUMN priest_phone VARCHAR(50);
ALTER TABLE churches ADD COLUMN priest_email VARCHAR(255);
ALTER TABLE churches ADD COLUMN website VARCHAR(255);

-- Add missing columns to users table (ignore errors if columns exist)
ALTER TABLE users ADD COLUMN church_id INT;
ALTER TABLE users ADD COLUMN phone VARCHAR(50);
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL;

-- Add foreign key constraint (ignore error if it exists)
ALTER TABLE users ADD CONSTRAINT fk_users_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;

-- Create index (ignore error if it exists)
CREATE INDEX idx_users_church_id ON users(church_id);

-- Insert sample churches (IGNORE will skip if name already exists)
INSERT IGNORE INTO churches (name, location, address, phone, email, priest_name, is_active) VALUES
('St. George Orthodox Church', 'New York, NY', '123 Main St, New York, NY 10001', '(555) 123-4567', 'info@stgeorgeny.org', 'Father John Doe', TRUE),
('Holy Trinity Cathedral', 'Boston, MA', '456 Church Ave, Boston, MA 02101', '(555) 234-5678', 'contact@holytrinity.org', 'Father Michael Smith', TRUE),
('St. Nicholas Orthodox Church', 'Chicago, IL', '789 Orthodox Blvd, Chicago, IL 60601', '(555) 345-6789', 'office@stnicholaschicago.org', 'Father Peter Johnson', TRUE),
('Annunciation Greek Orthodox Church', 'Los Angeles, CA', '321 Greek Way, Los Angeles, CA 90210', '(555) 456-7890', 'info@annunciationla.org', 'Father Nicholas Brown', TRUE),
('St. Demetrios Orthodox Church', 'Seattle, WA', '654 Orthodox St, Seattle, WA 98101', '(555) 567-8901', 'contact@stdemetrios.org', 'Father George Wilson', TRUE);
