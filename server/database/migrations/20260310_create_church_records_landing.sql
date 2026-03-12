-- Church Records Landing Page Branding Settings
-- Each church can customize their records landing header:
--   logo, background image, title, subtitle, welcome text, accent color,
--   default view preference, and analytics highlight toggle.

CREATE TABLE IF NOT EXISTS orthodoxmetrics_db.church_records_landing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  logo_path VARCHAR(500) DEFAULT NULL,
  background_image_path VARCHAR(500) DEFAULT NULL,
  title VARCHAR(255) DEFAULT NULL,
  subtitle VARCHAR(255) DEFAULT NULL,
  welcome_text TEXT DEFAULT NULL,
  accent_color VARCHAR(7) DEFAULT NULL,
  default_view ENUM('table', 'card', 'timeline', 'analytics') DEFAULT 'table',
  show_analytics_highlights BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_church_records_landing (church_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
