-- scripts/clientDatabaseTemplate.sql
USE {DATABASE_NAME};

-- Church information
CREATE TABLE church_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL DEFAULT '{CLIENT_NAME}',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255) DEFAULT '{CONTACT_EMAIL}',
    website VARCHAR(255),
    primary_color VARCHAR(7) DEFAULT '#1976d2',
    secondary_color VARCHAR(7) DEFAULT '#dc004e',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default church info
INSERT INTO church_info (name, email) VALUES ('{CLIENT_NAME}', '{CONTACT_EMAIL}');

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role ENUM('admin', 'priest', 'deacon', 'secretary', 'viewer') DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Baptism records
CREATE TABLE baptism_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    reception_date DATE NOT NULL,
    birthplace VARCHAR(150),
    entry_type VARCHAR(50),
    sponsors TEXT,
    parents TEXT NOT NULL,
    clergy VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Marriage records  
CREATE TABLE marriage_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    groom_first_name VARCHAR(100) NOT NULL,
    groom_last_name VARCHAR(100) NOT NULL,
    bride_first_name VARCHAR(100) NOT NULL,
    bride_last_name VARCHAR(100) NOT NULL,
    marriage_date DATE NOT NULL,
    marriage_place VARCHAR(150),
    witnesses TEXT,
    clergy VARCHAR(150) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Funeral records
CREATE TABLE funeral_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    birth_date DATE,
    death_date DATE NOT NULL,
    funeral_date DATE,
    burial_place VARCHAR(150),
    clergy VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add sample data for testing
INSERT INTO baptism_records (first_name, last_name, reception_date, parents, clergy) VALUES
('John', 'Smith', '2024-01-15', 'Michael and Sarah Smith', 'Fr. Peter'),
('Mary', 'Johnson', '2024-02-20', 'David and Anna Johnson', 'Fr. Paul');
