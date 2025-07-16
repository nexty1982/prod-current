-- Migration script for existing churches table structure
-- Churches table already has comprehensive structure

-- Insert sample churches using the existing table structure
INSERT IGNORE INTO churches (
    name, 
    email, 
    phone, 
    address, 
    city, 
    state_province, 
    postal_code, 
    country, 
    website, 
    preferred_language, 
    timezone, 
    currency, 
    is_active
) VALUES
('St. George Orthodox Church', 'info@stgeorgeny.org', '(555) 123-4567', '123 Main St', 'New York', 'NY', '10001', 'USA', 'https://stgeorgeny.org', 'en', 'America/New_York', 'USD', TRUE),
('Holy Trinity Cathedral', 'contact@holytrinity.org', '(555) 234-5678', '456 Church Ave', 'Boston', 'MA', '02101', 'USA', 'https://holytrinity.org', 'en', 'America/New_York', 'USD', TRUE),
('St. Nicholas Orthodox Church', 'office@stnicholaschicago.org', '(555) 345-6789', '789 Orthodox Blvd', 'Chicago', 'IL', '60601', 'USA', 'https://stnicholaschicago.org', 'en', 'America/Chicago', 'USD', TRUE),
('Annunciation Greek Orthodox Church', 'info@annunciationla.org', '(555) 456-7890', '321 Greek Way', 'Los Angeles', 'CA', '90210', 'USA', 'https://annunciationla.org', 'en', 'America/Los_Angeles', 'USD', TRUE),
('St. Demetrios Orthodox Church', 'contact@stdemetrios.org', '(555) 567-8901', '654 Orthodox St', 'Seattle', 'WA', '98101', 'USA', 'https://stdemetrios.org', 'en', 'America/Los_Angeles', 'USD', TRUE);

-- Add church_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN church_id INT;

-- Add foreign key constraint if it doesn't exist
-- Note: This might fail if the constraint already exists, but that's ok
ALTER TABLE users ADD CONSTRAINT fk_users_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;

-- Create index on church_id for better performance
CREATE INDEX idx_users_church_id ON users(church_id);

-- Update users table to add missing columns if they don't exist
ALTER TABLE users 
ADD COLUMN phone VARCHAR(50),
ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN last_login TIMESTAMP NULL;
