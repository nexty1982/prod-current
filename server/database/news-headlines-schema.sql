-- News Headlines Database Schema (as specified in requirements)
-- =============================================================

-- Create news_headlines table with exact specification
CREATE TABLE IF NOT EXISTS news_headlines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title TEXT,
  url TEXT,
  language VARCHAR(5),
  source VARCHAR(255),
  summary TEXT,
  image_url TEXT,
  published_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_language (language),
  INDEX idx_source (source),
  INDEX idx_published_at (published_at),
  INDEX idx_created_at (created_at),
  
  -- Unique constraint to prevent duplicate URLs
  INDEX idx_url_unique (url(500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate data from orthodox_headlines if it exists
INSERT IGNORE INTO news_headlines 
(title, url, language, source, summary, image_url, published_at, created_at)
SELECT 
  title,
  article_url as url,
  language,
  source_name as source,
  summary,
  image_url,
  pub_date as published_at,
  created_at
FROM orthodox_headlines 
WHERE EXISTS (SELECT 1 FROM information_schema.tables 
              WHERE table_schema = DATABASE() 
              AND table_name = 'orthodox_headlines');

-- Show success message
SELECT 'news_headlines table created successfully!' as status;
SELECT COUNT(*) as total_headlines FROM news_headlines; 