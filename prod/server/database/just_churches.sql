-- Simple script to just add sample churches
-- This assumes the tables already exist with the correct structure

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

-- Show what we have
SELECT 'Sample churches added successfully!' AS result;
SELECT id, name, city, state_province FROM churches ORDER BY name;
