-- Orthodox Church Records Database Schema
-- Tables for storing baptism, marriage, and funeral records

-- Baptism Records Table
CREATE TABLE IF NOT EXISTS baptism_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT DEFAULT 1, -- For multi-church support
    birth_date DATE,
    reception_date DATE, -- Same as ceremony_date
    ceremony_date DATE GENERATED ALWAYS AS (reception_date) VIRTUAL, -- Virtual column for compatibility
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    child_first_name VARCHAR(255) GENERATED ALWAYS AS (first_name) VIRTUAL, -- Virtual column for compatibility
    child_last_name VARCHAR(255) GENERATED ALWAYS AS (last_name) VIRTUAL, -- Virtual column for compatibility
    birthplace VARCHAR(255),
    entry_type VARCHAR(100),
    sponsors TEXT, -- Can store multiple sponsors
    parents TEXT, -- Parents' names
    clergy VARCHAR(255) NOT NULL,
    date_entered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    -- Indexes
    INDEX idx_ceremony_date (reception_date),
    INDEX idx_child_name (first_name, last_name),
    INDEX idx_church_id (church_id),
    INDEX idx_date_entered (date_entered),
    INDEX idx_clergy (clergy),
    -- Foreign Keys
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Marriage Records Table  
CREATE TABLE IF NOT EXISTS marriage_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT DEFAULT 1, -- For multi-church support
    mdate DATE, -- Marriage date
    ceremony_date DATE GENERATED ALWAYS AS (mdate) VIRTUAL, -- Virtual column for compatibility
    fname_groom VARCHAR(255) NOT NULL,
    lname_groom VARCHAR(255) NOT NULL,
    groom_first_name VARCHAR(255) GENERATED ALWAYS AS (fname_groom) VIRTUAL, -- Virtual column for compatibility
    groom_last_name VARCHAR(255) GENERATED ALWAYS AS (lname_groom) VIRTUAL, -- Virtual column for compatibility
    parentsg TEXT, -- Groom's parents
    fname_bride VARCHAR(255) NOT NULL,
    lname_bride VARCHAR(255) NOT NULL,
    bride_first_name VARCHAR(255) GENERATED ALWAYS AS (fname_bride) VIRTUAL, -- Virtual column for compatibility
    bride_last_name VARCHAR(255) GENERATED ALWAYS AS (lname_bride) VIRTUAL, -- Virtual column for compatibility
    parentsb TEXT, -- Bride's parents
    witness TEXT, -- Wedding witnesses
    mlicense VARCHAR(255), -- Marriage license details
    clergy VARCHAR(255) NOT NULL,
    date_entered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    -- Indexes
    INDEX idx_ceremony_date (mdate),
    INDEX idx_groom_name (fname_groom, lname_groom),
    INDEX idx_bride_name (fname_bride, lname_bride),
    INDEX idx_church_id (church_id),
    INDEX idx_date_entered (date_entered),
    INDEX idx_clergy (clergy),
    -- Foreign Keys
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Funeral Records Table
CREATE TABLE IF NOT EXISTS funeral_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    church_id INT DEFAULT 1, -- For multi-church support
    deceased_date DATE,
    burial_date DATE,
    ceremony_date DATE GENERATED ALWAYS AS (burial_date) VIRTUAL, -- Virtual column for compatibility
    name VARCHAR(255) NOT NULL, -- First name
    lastname VARCHAR(255) NOT NULL, -- Last name
    deceased_first_name VARCHAR(255) GENERATED ALWAYS AS (name) VIRTUAL, -- Virtual column for compatibility
    deceased_last_name VARCHAR(255) GENERATED ALWAYS AS (lastname) VIRTUAL, -- Virtual column for compatibility
    age INT,
    clergy VARCHAR(255) NOT NULL,
    burial_location VARCHAR(255),
    date_entered TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    -- Indexes
    INDEX idx_ceremony_date (burial_date),
    INDEX idx_deceased_name (name, lastname),
    INDEX idx_church_id (church_id),
    INDEX idx_date_entered (date_entered),
    INDEX idx_clergy (clergy),
    -- Foreign Keys
    FOREIGN KEY (church_id) REFERENCES churches(id) ON DELETE CASCADE
);

-- Insert some sample data for testing
INSERT INTO baptism_records (first_name, last_name, birth_date, reception_date, clergy, sponsors, parents) VALUES
('John', 'Smith', '2024-01-15', '2024-02-15', 'Fr. Michael', 'George and Maria Papadopoulos', 'James and Sarah Smith'),
('Mary', 'Johnson', '2024-03-10', '2024-04-10', 'Fr. Peter', 'Nicholas and Helen Kostas', 'David and Lisa Johnson');

INSERT INTO marriage_records (fname_groom, lname_groom, fname_bride, lname_bride, mdate, clergy, witness, parentsg, parentsb) VALUES
('Alexander', 'Thompson', 'Sofia', 'Petrov', '2024-06-15', 'Fr. Michael', 'John Smith, Mary Johnson', 'Robert and Catherine Thompson', 'Dimitri and Elena Petrov'),
('Nicholas', 'Brown', 'Anna', 'Kostas', '2024-08-20', 'Fr. Peter', 'Alexander Thompson, Sofia Thompson', 'William and Margaret Brown', 'George and Maria Kostas');

INSERT INTO funeral_records (name, lastname, deceased_date, burial_date, age, clergy, burial_location) VALUES
('Peter', 'Anderson', '2024-05-10', '2024-05-13', 78, 'Fr. Michael', 'Holy Cross Cemetery'),
('Helen', 'Williams', '2024-07-22', '2024-07-25', 82, 'Fr. Peter', 'St. Nicholas Cemetery');
