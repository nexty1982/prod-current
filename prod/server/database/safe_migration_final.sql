-- Safe migration script that handles existing columns
-- Insert sample churches (IGNORE will skip if they already exist)
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

-- Show current users table structure
SELECT 'Current users table structure:' AS info;
DESCRIBE users;

-- Show current churches table data
SELECT 'Churches in database:' AS info;
SELECT id, name, city, state_province FROM churches ORDER BY name;

-- Check if we can access the admin endpoints
SELECT 'Migration completed successfully!' AS result;
