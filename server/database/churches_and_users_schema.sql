-- Create churches table if it doesn't exist
CREATE TABLE IF NOT EXISTS churches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    location VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    priest_name VARCHAR(255),
    priest_phone VARCHAR(50),
    priest_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add sample churches if table is empty
INSERT IGNORE INTO churches (name, location, address, phone, email, priest_name, is_active) VALUES
('St. George Orthodox Church', 'New York, NY', '123 Main St, New York, NY 10001', '(555) 123-4567', 'info@stgeorgeny.org', 'Father John Doe', TRUE),
('Holy Trinity Cathedral', 'Boston, MA', '456 Church Ave, Boston, MA 02101', '(555) 234-5678', 'contact@holytrinity.org', 'Father Michael Smith', TRUE),
('St. Nicholas Orthodox Church', 'Chicago, IL', '789 Orthodox Blvd, Chicago, IL 60601', '(555) 345-6789', 'office@stnicholaschicago.org', 'Father Peter Johnson', TRUE),
('Annunciation Greek Orthodox Church', 'Los Angeles, CA', '321 Greek Way, Los Angeles, CA 90210', '(555) 456-7890', 'info@annunciationla.org', 'Father Nicholas Brown', TRUE),
('St. Demetrios Orthodox Church', 'Seattle, WA', '654 Orthodox St, Seattle, WA 98101', '(555) 567-8901', 'contact@stdemetrios.org', 'Father George Wilson', TRUE);

-- Add church_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS church_id INT,
ADD CONSTRAINT fk_users_church FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE SET NULL;

-- Create index on church_id for better performance
CREATE INDEX IF NOT EXISTS idx_users_church_id ON users(church_id);

-- Update users table to add missing columns if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP NULL;
