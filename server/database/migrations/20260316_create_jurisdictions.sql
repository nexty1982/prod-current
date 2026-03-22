-- Migration: Create jurisdictions reference table + add FK columns to churches/us_churches
-- Date: 2026-03-16

CREATE TABLE jurisdictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  abbreviation VARCHAR(20) NOT NULL,
  calendar_type ENUM('Julian', 'Revised Julian') NOT NULL DEFAULT 'Revised Julian',
  parent_church VARCHAR(255) DEFAULT NULL,
  country VARCHAR(100) DEFAULT NULL,
  canonical_territory TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_abbreviation (abbreviation)
);

-- Seed common Orthodox jurisdictions in the US
INSERT INTO jurisdictions (name, abbreviation, calendar_type, parent_church, country, sort_order) VALUES
('Greek Orthodox Archdiocese of America', 'GOARCH', 'Revised Julian', 'Ecumenical Patriarchate', 'United States', 1),
('Orthodox Church in America', 'OCA', 'Revised Julian', NULL, 'United States', 2),
('Antiochian Orthodox Christian Archdiocese', 'AOCANA', 'Revised Julian', 'Patriarchate of Antioch', 'United States', 3),
('Russian Orthodox Church Outside Russia', 'ROCOR', 'Julian', 'Moscow Patriarchate', 'United States', 4),
('Serbian Orthodox Church in USA', 'SOC', 'Julian', 'Serbian Patriarchate', 'United States', 5),
('Romanian Orthodox Archdiocese', 'ROEA', 'Revised Julian', 'Romanian Patriarchate', 'United States', 6),
('Bulgarian Eastern Orthodox Diocese', 'BEOD', 'Revised Julian', 'Bulgarian Patriarchate', 'United States', 7),
('Ukrainian Orthodox Church of USA', 'UOC-USA', 'Revised Julian', 'Ecumenical Patriarchate', 'United States', 8),
('Albanian Orthodox Archdiocese', 'AOA', 'Revised Julian', 'Ecumenical Patriarchate', 'United States', 9),
('Georgian Orthodox Church', 'GOC', 'Julian', NULL, 'United States', 10),
('Carpatho-Russian Orthodox Diocese', 'ACROD', 'Revised Julian', 'Ecumenical Patriarchate', 'United States', 11);

-- Add jurisdiction_id FK to churches table
ALTER TABLE churches
  ADD COLUMN jurisdiction_id INT DEFAULT NULL,
  ADD COLUMN calendar_type ENUM('Julian', 'Revised Julian') DEFAULT NULL,
  ADD CONSTRAINT fk_churches_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL;

-- Add jurisdiction_id FK to us_churches (CRM) table
ALTER TABLE us_churches
  ADD COLUMN jurisdiction_id INT DEFAULT NULL,
  ADD CONSTRAINT fk_us_churches_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE SET NULL;
