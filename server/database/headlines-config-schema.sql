-- Headlines Configuration Database Schema
-- =========================================

-- Table for storing RSS sources and their configuration
CREATE TABLE IF NOT EXISTS headlines_sources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    feed_url TEXT NOT NULL,
    language VARCHAR(5) DEFAULT 'en',
    enabled BOOLEAN DEFAULT TRUE,
    categories JSON DEFAULT NULL,
    description TEXT DEFAULT NULL,
    last_fetch TIMESTAMP NULL,
    article_count INT DEFAULT 0,
    status ENUM('active', 'inactive', 'error') DEFAULT 'inactive',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_language (language),
    INDEX idx_enabled (enabled),
    INDEX idx_status (status),
    INDEX idx_last_fetch (last_fetch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing content categories
CREATE TABLE IF NOT EXISTS headlines_categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    keywords JSON DEFAULT NULL,
    priority INT DEFAULT 0,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_enabled (enabled),
    INDEX idx_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing user-specific scraping configuration
CREATE TABLE IF NOT EXISTS headlines_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    schedule VARCHAR(50) DEFAULT '0 */6 * * *',
    max_articles_per_source INT DEFAULT 20,
    languages JSON DEFAULT NULL,
    categories JSON DEFAULT NULL,
    sources JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_enabled (enabled),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Orthodox news sources
INSERT IGNORE INTO headlines_sources (id, name, feed_url, language, enabled, categories, description, status) VALUES
('orthodox_times', 'Orthodox Times', 'https://orthodoxtimes.com/feed/', 'en', TRUE, 
 JSON_ARRAY('Church News', 'Orthodox Christianity'), 
 'Leading Orthodox news publication covering global Orthodox Christianity', 'inactive'),

('romfea_gr', 'Romfea (Greek)', 'https://www.romfea.gr/feed', 'gr', TRUE, 
 JSON_ARRAY('Greek Orthodox', 'Church News'), 
 'Greek Orthodox news from the Ecumenical Patriarchate', 'inactive'),

('patriarchate_moscow', 'Patriarchate of Moscow', 'https://mospat.ru/en/rss/', 'en', TRUE, 
 JSON_ARRAY('Russian Orthodox', 'Church News'), 
 'Official news from the Russian Orthodox Church', 'inactive'),

('basilica_ro', 'Basilica.ro', 'https://basilica.ro/feed/', 'ro', TRUE, 
 JSON_ARRAY('Romanian Orthodox', 'Church News'), 
 'Romanian Orthodox Church news and updates', 'inactive'),

('orthochristian', 'OrthoChristian', 'https://orthochristian.com/rss.xml', 'en', TRUE, 
 JSON_ARRAY('Orthodox Christianity', 'Saints', 'Monasticism'), 
 'Comprehensive Orthodox Christian news and spiritual content', 'inactive'),

('goarch', 'Greek Orthodox Archdiocese', 'https://www.goarch.org/news/rss', 'en', TRUE, 
 JSON_ARRAY('Greek Orthodox', 'America', 'Archdiocese'), 
 'Greek Orthodox Archdiocese of America news', 'inactive'),

('oca', 'Orthodox Church in America', 'https://www.oca.org/news/rss', 'en', TRUE, 
 JSON_ARRAY('American Orthodox', 'Church News'), 
 'Orthodox Church in America official news', 'inactive'),

('pravoslavie_ru', 'Pravoslavie.ru', 'https://pravoslavie.ru/news.xml', 'ru', TRUE, 
 JSON_ARRAY('Russian Orthodox', 'Spirituality'), 
 'Russian Orthodox portal with news and spiritual content', 'inactive');

-- Insert default content categories
INSERT IGNORE INTO headlines_categories (id, name, enabled, keywords, priority, description) VALUES
('church_news', 'Church News', TRUE, 
 JSON_ARRAY('patriarch', 'bishop', 'archbishop', 'synod', 'diocese', 'parish'), 
 100, 'Official church announcements and hierarchical news'),

('orthodox_christianity', 'Orthodox Christianity', TRUE, 
 JSON_ARRAY('orthodox', 'eastern orthodox', 'byzantine', 'liturgy', 'theology'), 
 90, 'General Orthodox Christian content and teachings'),

('saints_martyrs', 'Saints & Martyrs', TRUE, 
 JSON_ARRAY('saint', 'martyr', 'holy', 'blessed', 'canonization', 'feast day'), 
 80, 'Stories and commemorations of Orthodox saints'),

('monasticism', 'Monasticism', TRUE, 
 JSON_ARRAY('monastery', 'monk', 'nun', 'abbot', 'abbess', 'monastic', 'mount athos'), 
 70, 'Monastic life and spiritual communities'),

('liturgy_worship', 'Liturgy & Worship', TRUE, 
 JSON_ARRAY('liturgy', 'divine liturgy', 'vespers', 'matins', 'worship', 'chanting'), 
 60, 'Liturgical celebrations and worship practices'),

('theology_education', 'Theology & Education', TRUE, 
 JSON_ARRAY('theology', 'seminary', 'education', 'theological', 'scripture', 'patristics'), 
 50, 'Theological education and scholarly content'),

('social_ministry', 'Social Ministry', TRUE, 
 JSON_ARRAY('charity', 'humanitarian', 'social service', 'outreach', 'ministry', 'community'), 
 40, 'Church social services and community outreach'),

('interfaith_dialogue', 'Interfaith Dialogue', TRUE, 
 JSON_ARRAY('ecumenical', 'interfaith', 'dialogue', 'unity', 'cooperation'), 
 30, 'Interfaith relations and ecumenical activities'),

('persecution_freedom', 'Religious Freedom', TRUE, 
 JSON_ARRAY('persecution', 'religious freedom', 'human rights', 'oppression', 'discrimination'), 
 20, 'Religious persecution and freedom issues'),

('pilgrimage_travel', 'Pilgrimage & Holy Sites', TRUE, 
 JSON_ARRAY('pilgrimage', 'holy land', 'jerusalem', 'constantinople', 'holy sites'), 
 10, 'Pilgrimage destinations and holy places');

-- Insert default global configuration
INSERT IGNORE INTO headlines_config (user_id, enabled, schedule, max_articles_per_source, languages, categories, sources) VALUES
(NULL, TRUE, '0 */6 * * *', 20, 
 JSON_ARRAY('en', 'gr'), 
 JSON_ARRAY('church_news', 'orthodox_christianity', 'saints_martyrs'),
 JSON_ARRAY('orthodox_times', 'orthochristian', 'goarch'));

-- Show success message
SELECT 'Headlines configuration schema created successfully!' as message;
SELECT 'Default sources and categories have been inserted' as status;

-- Show summary
SELECT COUNT(*) as total_sources FROM headlines_sources;
SELECT COUNT(*) as total_categories FROM headlines_categories;
SELECT COUNT(*) as total_configs FROM headlines_config; 