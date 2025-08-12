-- Insert Saints Peter and Paul Orthodox Church into ssppoc_records_db.church_info table
-- This ensures the church appears in the dropdown for user management

USE ssppoc_records_db;

-- Insert the church if it doesn't already exist
INSERT IGNORE INTO church_info (
  church_id, 
  church_name, 
  location, 
  church_rector, 
  church_plan, 
  contact_method, 
  admin_user, 
  default_language, 
  supported_languages, 
  church_ocr_id, 
  discount, 
  supported_record_types
) VALUES 
(1, 'Saints Peter and Paul Orthodox Church', 'Location TBD', 'Fr. Rector Name', 'premium', 'email', 'admin@ssppoc.org', 'en', 'en,gr', 'ssppoc_main_ocr', 0.00, 'baptism,marriage,funeral');

-- Verify the insertion
SELECT * FROM church_info WHERE church_name LIKE '%Saints Peter%';
