-- Database schema for CMS pages and image uploads
-- Run this SQL script to create the required tables

-- Table: pages (for page content management)
CREATE TABLE IF NOT EXISTS pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    content LONGTEXT,
    meta_description TEXT,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_status (status),
    INDEX idx_updated_at (updated_at)
);

-- Table: images (for tracking uploaded images)
CREATE TABLE IF NOT EXISTS images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_filename (filename),
    INDEX idx_upload_date (upload_date)
);

-- Optional: Add some sample data
INSERT INTO pages (slug, title, content, meta_description, status) VALUES
('home', 'Home Page', '<h1>Welcome to Our Church</h1><p>This is the home page content.</p>', 'Welcome to our Orthodox church community', 'published'),
('about', 'About Us', '<h1>About Our Church</h1><p>Learn about our church history and mission.</p>', 'Learn about our Orthodox church history and mission', 'published'),
('services', 'Services', '<h1>Our Services</h1><p>Information about our worship services.</p>', 'Information about our worship services and schedule', 'published')
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    content = VALUES(content),
    meta_description = VALUES(meta_description),
    status = VALUES(status);

-- Check if tables were created successfully
SELECT 'Tables created successfully' as status;
SHOW TABLES LIKE 'pages';
SHOW TABLES LIKE 'images';
