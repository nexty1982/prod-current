-- SQL script to create tables for the liturgical calendar system

-- Table for local commemorations (custom church-specific saints or events)
CREATE TABLE IF NOT EXISTS local_commemorations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_translations JSON,
    date DATE NOT NULL,
    description TEXT,
    description_translations JSON,
    is_recurring BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Table for saint information (expandable saint database)
CREATE TABLE IF NOT EXISTS saints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_translations JSON,
    saint_type ENUM('martyr', 'confessor', 'bishop', 'monk', 'virgin', 'apostle', 'prophet', 'unmercenary') NOT NULL,
    feast_day DATE NOT NULL,
    icon_path VARCHAR(500),
    biography TEXT,
    biography_translations JSON,
    birth_date DATE,
    death_date DATE,
    location VARCHAR(255),
    patron_of JSON, -- Array of things they are patron of
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_feast_day (feast_day),
    INDEX idx_saint_type (saint_type),
    INDEX idx_name (name)
);

-- Table for feast days (major liturgical feasts)
CREATE TABLE IF NOT EXISTS feasts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_translations JSON,
    feast_type ENUM('major', 'minor', 'local') NOT NULL,
    rank INT NOT NULL DEFAULT 1, -- 1-12 for liturgical precedence
    is_movable BOOLEAN DEFAULT FALSE,
    fixed_date DATE, -- For fixed feasts
    offset_from_pascha INT, -- For movable feasts (days from Pascha)
    liturgical_color ENUM('gold', 'white', 'red', 'green', 'purple', 'blue', 'black', 'silver') DEFAULT 'green',
    icon_path VARCHAR(500),
    description TEXT,
    description_translations JSON,
    troparia JSON, -- Liturgical texts in different languages
    kondakia JSON, -- Liturgical texts in different languages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_fixed_date (fixed_date),
    INDEX idx_feast_type (feast_type),
    INDEX idx_rank (rank)
);

-- Table for fasting periods
CREATE TABLE IF NOT EXISTS fasting_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_translations JSON,
    fast_type ENUM('strict', 'wine-oil', 'fish', 'dairy') NOT NULL,
    is_movable BOOLEAN DEFAULT FALSE,
    start_date DATE, -- For fixed fasts
    end_date DATE, -- For fixed fasts
    start_offset_from_pascha INT, -- For movable fasts
    end_offset_from_pascha INT, -- For movable fasts
    description TEXT,
    description_translations JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_start_date (start_date),
    INDEX idx_end_date (end_date)
);

-- Table for associating records with liturgical dates
CREATE TABLE IF NOT EXISTS liturgical_record_associations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_type ENUM('baptism', 'marriage', 'funeral') NOT NULL,
    record_id INT NOT NULL,
    liturgical_date DATE NOT NULL,
    saint_id INT,
    feast_id INT,
    commemoration_id INT,
    association_type ENUM('name_day', 'feast_day', 'custom') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_record (record_type, record_id),
    INDEX idx_liturgical_date (liturgical_date),
    INDEX idx_saint_id (saint_id),
    INDEX idx_feast_id (feast_id),
    INDEX idx_commemoration_id (commemoration_id),
    FOREIGN KEY (saint_id) REFERENCES saints(id) ON DELETE CASCADE,
    FOREIGN KEY (feast_id) REFERENCES feasts(id) ON DELETE CASCADE,
    FOREIGN KEY (commemoration_id) REFERENCES local_commemorations(id) ON DELETE CASCADE
);

-- Insert sample saints data
INSERT INTO saints (name, name_translations, saint_type, feast_day, biography, birth_date, death_date, location, patron_of) VALUES
('St. Basil the Great', '{"en": "St. Basil the Great", "gr": "Άγιος Βασίλειος ο Μέγας", "ru": "Святитель Василий Великий", "ro": "Sfântul Vasile cel Mare"}', 'bishop', '2024-01-01', 'Archbishop of Caesarea, theologian and Doctor of the Church', '0329-01-01', '0379-01-01', 'Caesarea, Cappadocia', '["Liturgy", "Monasticism", "Education"]'),
('St. John Chrysostom', '{"en": "St. John Chrysostom", "gr": "Άγιος Ιωάννης ο Χρυσόστομος", "ru": "Святитель Иоанн Златоуст", "ro": "Sfântul Ioan Gură de Aur"}', 'bishop', '2024-01-27', 'Archbishop of Constantinople, known for his eloquent preaching', '0349-01-01', '0407-09-14', 'Constantinople', '["Preaching", "Liturgy"]'),
('St. Anthony the Great', '{"en": "St. Anthony the Great", "gr": "Άγιος Αντώνιος ο Μέγας", "ru": "Преподобный Антоний Великий", "ro": "Sfântul Antonie cel Mare"}', 'monk', '2024-01-17', 'Father of monasticism, hermit in the Egyptian desert', '0251-01-01', '0356-01-17', 'Egypt', '["Monasticism", "Desert Fathers"]'),
('St. Nicholas the Wonderworker', '{"en": "St. Nicholas the Wonderworker", "gr": "Άγιος Νικόλαος ο Θαυματουργός", "ru": "Святитель Николай Чудотворец", "ro": "Sfântul Nicolae Făcătorul de Minuni"}', 'bishop', '2024-12-06', 'Bishop of Myra, known for his generosity and miracles', '0270-03-15', '0343-12-06', 'Myra, Lycia', '["Children", "Sailors", "Merchants"]');

-- Insert sample feasts data
INSERT INTO feasts (name, name_translations, feast_type, rank, is_movable, fixed_date, liturgical_color, description) VALUES
('Nativity of Our Lord', '{"en": "Nativity of Our Lord", "gr": "Γέννησις του Κυρίου", "ru": "Рождество Христово", "ro": "Nașterea Domnului"}', 'major', 12, FALSE, '2024-12-25', 'gold', 'The birth of Jesus Christ'),
('Theophany', '{"en": "Theophany", "gr": "Θεοφάνεια", "ru": "Богоявление", "ro": "Boboteaza"}', 'major', 12, FALSE, '2024-01-06', 'gold', 'Baptism of Jesus Christ'),
('Presentation of Our Lord', '{"en": "Presentation of Our Lord", "gr": "Υπαπαντή", "ru": "Сретение Господне", "ro": "Întâmpinarea Domnului"}', 'major', 10, FALSE, '2024-02-02', 'gold', 'Presentation of Jesus in the Temple'),
('Annunciation', '{"en": "Annunciation", "gr": "Ευαγγελισμός", "ru": "Благовещение", "ro": "Buna Vestire"}', 'major', 12, FALSE, '2024-03-25', 'blue', 'Annunciation to the Theotokos'),
('Pascha', '{"en": "Pascha", "gr": "Πάσχα", "ru": "Пасха", "ro": "Paștele"}', 'major', 12, TRUE, NULL, 'gold', 'Resurrection of Our Lord'),
('Pentecost', '{"en": "Pentecost", "gr": "Πεντηκοστή", "ru": "Пятидесятница", "ro": "Rusaliile"}', 'major', 12, TRUE, NULL, 'red', 'Descent of the Holy Spirit');

-- Insert sample fasting periods
INSERT INTO fasting_periods (name, name_translations, fast_type, is_movable, start_date, end_date, description) VALUES
('Nativity Fast', '{"en": "Nativity Fast", "gr": "Νηστεία των Χριστουγέννων", "ru": "Рождественский пост", "ro": "Postul Crăciunului"}', 'wine-oil', FALSE, '2024-11-15', '2024-12-24', 'Preparation for the Nativity of Christ'),
('Dormition Fast', '{"en": "Dormition Fast", "gr": "Νηστεία της Κοιμήσεως", "ru": "Успенский пост", "ro": "Postul Adormirii"}', 'wine-oil', FALSE, '2024-08-01', '2024-08-15', 'Preparation for the Dormition of the Theotokos');

-- Note: Indexes for baptism_records, marriage_records, and funeral_records
-- will be created in their respective schema files when those tables are created

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON liturgical_calendar.* TO 'your_app_user'@'localhost';
