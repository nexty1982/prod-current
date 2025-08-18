-- Churches table schema
CREATE TABLE IF NOT EXISTS churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add sample churches if the table is empty
INSERT IGNORE INTO churches (name, location, address, phone, email, is_active) VALUES 
('St. Nicholas Orthodox Church', 'New York, NY', '123 Main St, New York, NY 10001', '(555) 123-4567', 'info@stnicholasny.org', true),
('Holy Trinity Cathedral', 'Chicago, IL', '456 Church Ave, Chicago, IL 60601', '(555) 987-6543', 'contact@holytrinitychi.org', true),
('St. John the Baptist Church', 'Los Angeles, CA', '789 Orthodox Blvd, Los Angeles, CA 90001', '(555) 456-7890', 'welcome@stjohnla.org', true),
('Assumption of the Virgin Mary', 'Boston, MA', '321 Faith St, Boston, MA 02101', '(555) 789-0123', 'parish@assumptionboston.org', true),
('St. George Orthodox Church', 'Houston, TX', '654 Cross Way, Houston, TX 77001', '(555) 321-6547', 'office@stgeorgehouston.org', true);
