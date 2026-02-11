-- Orthodox Headlines Database Schema
-- This creates the table structure and sample data for the Orthodox Headlines feature

-- Create orthodox_headlines table
CREATE TABLE IF NOT EXISTS orthodox_headlines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT,
    image_url VARCHAR(1000),
    article_url VARCHAR(1000) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    pub_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_source_name (source_name),
    INDEX idx_language (language),
    INDEX idx_pub_date (pub_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample Orthodox news headlines for testing
INSERT INTO orthodox_headlines (source_name, title, summary, image_url, article_url, language, pub_date) VALUES
-- GOARCH (Greek Orthodox) Headlines
('GOARCH', 'His Eminence Archbishop Elpidophoros Celebrates Feast of Theophany', 'The Archbishop led the traditional blessing of the waters ceremony at the Hudson River, continuing the ancient Orthodox tradition of Theophany celebrations.', 'https://www.goarch.org/images/theophany2025.jpg', 'https://www.goarch.org/news/theophany-2025', 'en', DATE_SUB(NOW(), INTERVAL 2 HOUR)),

('GOARCH', 'Orthodox Youth Conference Draws Record Attendance', 'Over 500 young Orthodox Christians gathered in Chicago for the annual youth conference, focusing on faith in the digital age.', 'https://www.goarch.org/images/youth-conference.jpg', 'https://www.goarch.org/youth/conference-2025', 'en', DATE_SUB(NOW(), INTERVAL 5 HOUR)),

('GOARCH', 'New Orthodox Church Consecrated in Texas', 'The community of Saints Constantine and Helen celebrated the consecration of their new church building after five years of construction.', 'https://www.goarch.org/images/texas-church.jpg', 'https://www.goarch.org/news/texas-consecration', 'en', DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- OCA (Orthodox Church in America) Headlines  
('OCA', 'His Beatitude Metropolitan Tikhon Issues Paschal Message', 'The Primate of the Orthodox Church in America released his annual Paschal message, emphasizing themes of renewal and hope.', 'https://www.oca.org/images/paschal-message.jpg', 'https://www.oca.org/news/paschal-message-2025', 'en', DATE_SUB(NOW(), INTERVAL 3 HOUR)),

('OCA', 'Orthodox Seminary Announces New Theology Program', 'St. Vladimir''s Seminary introduces a new Master of Arts program focused on Orthodox spirituality and counseling.', 'https://www.oca.org/images/seminary-program.jpg', 'https://www.oca.org/seminary/new-program', 'en', DATE_SUB(NOW(), INTERVAL 8 HOUR)),

('OCA', 'Monastery Celebrates 50th Anniversary', 'Holy Trinity Monastery in Jordanville marks its golden jubilee with special services and community celebrations.', 'https://www.oca.org/images/monastery-50th.jpg', 'https://www.oca.org/monasteries/anniversary', 'en', DATE_SUB(NOW(), INTERVAL 2 DAY)),

-- Antiochian Orthodox Headlines
('ANTIOCH', 'Metropolitan Joseph Visits West Coast Parishes', 'His Eminence Metropolitan Joseph of the Antiochian Orthodox Christian Archdiocese conducted pastoral visits across California parishes.', 'https://www.antiochian.org/images/visit-westcoast.jpg', 'https://www.antiochian.org/news/metropolitan-visit-2025', 'en', DATE_SUB(NOW(), INTERVAL 4 HOUR)),

('ANTIOCH', 'Orthodox Hospital Opens New Wing for Community Care', 'St. Mary Orthodox Hospital expanded its facilities to better serve the local community with a focus on holistic care.', 'https://www.antiochian.org/images/hospital-wing.jpg', 'https://www.antiochian.org/community/hospital-expansion', 'en', DATE_SUB(NOW(), INTERVAL 12 HOUR)),

-- Serbian Orthodox Headlines
('SERBIAN', 'Patriarch Porfirije Addresses European Orthodox Leaders', 'His Holiness spoke at the pan-Orthodox conference in Vienna about challenges facing Orthodox Christians in Europe.', 'https://www.spc.rs/images/patriarch-vienna.jpg', 'https://www.spc.rs/news/european-conference', 'en', DATE_SUB(NOW(), INTERVAL 6 HOUR)),

('SERBIAN', 'New Orthodox Cultural Center Opens in Chicago', 'The Serbian-American community celebrates the opening of a new cultural and educational center serving the Midwest region.', 'https://www.serbianorthodox.org/images/chicago-center.jpg', 'https://www.serbianorthodox.org/centers/chicago-opening', 'en', DATE_SUB(NOW(), INTERVAL 15 HOUR)),

-- Russian Orthodox Headlines
('RUSSIAN', 'Orthodox Patriarch Calls for Global Peace Initiative', 'His Holiness Patriarch Kirill issued a statement calling for renewed dialogue and peace efforts worldwide.', 'https://www.patriarchia.ru/images/peace-initiative.jpg', 'https://www.patriarchia.ru/en/news/peace-2025', 'en', DATE_SUB(NOW(), INTERVAL 7 HOUR)),

('RUSSIAN', 'Icon Restoration Project Completed at Historic Cathedral', 'The centuries-old iconostasis at the Cathedral of Christ the Savior has been fully restored using traditional techniques.', 'https://www.patriarchia.ru/images/icon-restoration.jpg', 'https://www.patriarchia.ru/en/restoration/cathedral-2025', 'en', DATE_SUB(NOW(), INTERVAL 20 HOUR)),

-- Romanian Orthodox Headlines
('ROMANIAN', 'Patriarch Daniel Blesses New Seminary Building', 'The Romanian Orthodox Church inaugurated a new seminary building dedicated to training future clergy.', 'https://www.patriarhia.ro/images/seminary-blessing.jpg', 'https://www.patriarhia.ro/en/seminary-inauguration', 'en', DATE_SUB(NOW(), INTERVAL 9 HOUR)),

-- Orthodox Times Headlines
('ORTHODOX_TIMES', 'Pan-Orthodox Council Discusses Modern Challenges', 'Orthodox leaders from around the world gathered to address contemporary issues facing the Church in the 21st century.', 'https://orthodoximes.com/images/pan-orthodox-council.jpg', 'https://orthodoximes.com/council-2025', 'en', DATE_SUB(NOW(), INTERVAL 11 HOUR)),

('ORTHODOX_TIMES', 'Youth Pilgrimage to Mount Athos Draws International Participants', 'Young Orthodox Christians from 15 countries participated in a special pilgrimage to the Holy Mountain.', 'https://orthodoximes.com/images/youth-athos.jpg', 'https://orthodoximes.com/athos-pilgrimage', 'en', DATE_SUB(NOW(), INTERVAL 1 DAY)),

-- Greek Language Headlines
('GOARCH', 'Εορτή της Θεοφάνειας στον Ύψωνα', 'Ο Αρχιεπίσκοπος Ελπιδοφόρος τέλεσε τη θεία λειτουργία και τον αγιασμό των υδάτων.', 'https://www.goarch.org/images/theophania-gr.jpg', 'https://www.goarch.org/el/theophania-2025', 'el', DATE_SUB(NOW(), INTERVAL 3 HOUR)),

('PEMPTOUSIA', 'Νέα Προγράμματα Θεολογικής Εκπαίδευσης', 'Η Θεολογική Σχολή ανακοίνωσε νέα προγράμματα για τη νέα ακαδημαϊκή χρονιά.', 'https://www.pemptousia.gr/images/theology-programs.jpg', 'https://www.pemptousia.gr/theologia/nea-programmata', 'el', DATE_SUB(NOW(), INTERVAL 14 HOUR)),

-- Russian Language Headlines  
('PRAVOSLAVIE', 'Патриарх Кирилл освятил новый храм в Москве', 'Его Святейшество совершил чин освящения нового храма в честь святых новомучеников российских.', 'https://www.pravoslavie.ru/images/new-temple.jpg', 'https://www.pravoslavie.ru/novosti/novyj-hram-moskva', 'ru', DATE_SUB(NOW(), INTERVAL 16 HOUR)),

('RUSSIAN', 'Православная молодежь приняла участие в международном форуме', 'Более 300 молодых православных христиан из разных стран собрались на форум в Санкт-Петербурге.', 'https://www.patriarchia.ru/images/youth-forum.jpg', 'https://www.patriarchia.ru/molodezh/forum-2025', 'ru', DATE_SUB(NOW(), INTERVAL 18 HOUR)),

-- Recent "New" Headlines (within 24 hours)
('GOARCH', 'Breaking: Orthodox Delegation Meets with Pope Francis', 'A high-level Orthodox delegation met with Pope Francis at the Vatican to discuss interfaith dialogue and cooperation.', 'https://www.goarch.org/images/vatican-meeting.jpg', 'https://www.goarch.org/news/vatican-meeting-2025', 'en', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),

('OCA', 'Orthodox Charity Launches Emergency Relief Program', 'International Orthodox Christian Charities announces new emergency response initiative for global humanitarian crises.', 'https://www.oca.org/images/emergency-relief.jpg', 'https://www.oca.org/charity/emergency-program', 'en', DATE_SUB(NOW(), INTERVAL 45 MINUTE)),

('ORTHODOX_TIMES', 'Live: Feast Day Celebrations Across Orthodox World', 'Orthodox communities worldwide celebrate the Feast of the Three Hierarchs with special services and cultural events.', 'https://orthodoximes.com/images/three-hierarchs.jpg', 'https://orthodoximes.com/three-hierarchs-2025', 'en', DATE_SUB(NOW(), INTERVAL 15 MINUTE));

-- Verify the data was inserted
SELECT 
    COUNT(*) as total_headlines,
    COUNT(DISTINCT source_name) as unique_sources,
    COUNT(DISTINCT language) as languages,
    MIN(pub_date) as oldest_article,
    MAX(pub_date) as newest_article
FROM orthodox_headlines; 