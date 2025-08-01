-- Add advanced config columns to churches table
ALTER TABLE churches
ADD COLUMN records_database_name VARCHAR(255),
ADD COLUMN avatar_dir VARCHAR(255),
ADD COLUMN ocr_upload_dir VARCHAR(255),
ADD COLUMN calendar_type ENUM('Julian', 'Revised Julian') DEFAULT 'Revised Julian',
ADD COLUMN show_fast_days BOOLEAN DEFAULT TRUE,
ADD COLUMN show_local_saints BOOLEAN DEFAULT TRUE,
ADD COLUMN feast_overrides_path VARCHAR(255),
ADD COLUMN theme_color VARCHAR(50),
ADD COLUMN logo_path VARCHAR(255),
ADD COLUMN banner_path VARCHAR(255),
ADD COLUMN favicon_path VARCHAR(255),
ADD COLUMN enable_ocr BOOLEAN DEFAULT TRUE,
ADD COLUMN enable_certificates BOOLEAN DEFAULT TRUE,
ADD COLUMN enable_liturgical_calendar BOOLEAN DEFAULT TRUE,
ADD COLUMN enable_invoicing BOOLEAN DEFAULT FALSE,
ADD COLUMN enable_audit_logs BOOLEAN DEFAULT FALSE;

-- Create church_users junction table if not exists
CREATE TABLE IF NOT EXISTS church_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT,
  user_id INT,
  role ENUM('priest', 'deacon', 'viewer', 'admin'),
  FOREIGN KEY (church_id) REFERENCES churches(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
); 