-- Clients table schema for MVP Client Creation System
-- This table stores information about different Orthodox church clients

CREATE TABLE IF NOT EXISTS clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    database_name VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'suspended', 'trial') DEFAULT 'trial',
    contact_email VARCHAR(255) NOT NULL,
    branding_config JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add sample clients
INSERT IGNORE INTO clients (name, slug, database_name, contact_email, branding_config) VALUES
('Saints Peter & Paul Orthodox Church', 'ssppoc', 'orthodox_ssppoc', 'admin@ssppoc.org', '{"primaryColor": "#1976d2", "secondaryColor": "#dc004e"}'),
('St. Mary Orthodox Church', 'stmary', 'orthodox_stmary', 'admin@stmary.org', '{"primaryColor": "#d32f2f", "secondaryColor": "#1976d2"}'),
('Holy Trinity Cathedral', 'holytrinity', 'orthodox_holytrinity', 'admin@holytrinity.org', '{"primaryColor": "#388e3c", "secondaryColor": "#d32f2f"}');

-- Create index for frequently queried columns
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_status ON clients(status);
