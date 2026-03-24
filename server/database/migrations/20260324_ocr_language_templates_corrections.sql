-- Migration: OCR language support, template management, correction dictionaries
-- Date: 2026-03-24
-- Addresses OM Daily items: #39, #40, #41, #42, #43, #44, #51, #79, #80, #101, #102, #109, #110, #119, #375, #383

-- #39-#44: OCR language configuration registry
CREATE TABLE IF NOT EXISTS ocr_language_config (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  language_code VARCHAR(10) NOT NULL COMMENT 'ISO 639-1 or custom code',
  language_name VARCHAR(64) NOT NULL,
  script_type VARCHAR(32) NOT NULL DEFAULT 'latin' COMMENT 'latin, cyrillic, greek, arabic, mixed',
  vision_api_hints JSON NULL COMMENT 'Language hints for Google Vision API',
  anchor_phrases JSON NULL COMMENT 'Common record field labels in this language',
  character_mapping JSON NULL COMMENT 'OCR character substitution map',
  transliteration_rules JSON NULL COMMENT 'Script-to-Latin transliteration rules',
  date_formats JSON NULL COMMENT 'Common date format patterns',
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order SMALLINT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_lang_code (language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed core languages
INSERT IGNORE INTO ocr_language_config (language_code, language_name, script_type, vision_api_hints, anchor_phrases, sort_order) VALUES
('en', 'English', 'latin', '["en"]', '{"baptism":"Baptism,Christening,Name,Date of Birth,Godparents,Sponsors","marriage":"Marriage,License,Groom,Bride,Witnesses","funeral":"Funeral,Burial,Death,Deceased,Cemetery"}', 1),
('el', 'Greek', 'greek', '["el"]', '{"baptism":"Βάπτισμα,Όνομα,Ημερομηνία Γέννησης,Ανάδοχοι","marriage":"Γάμος,Γαμπρός,Νύφη,Μάρτυρες","funeral":"Κηδεία,Θάνατος,Κοιμηθείς"}', 2),
('ru', 'Russian/Church Slavonic', 'cyrillic', '["ru","cu"]', '{"baptism":"Крещение,Имя,Дата рождения,Восприемники","marriage":"Венчание,Жених,Невеста,Свидетели","funeral":"Отпевание,Погребение,Усопший"}', 3),
('ar', 'Arabic/Antiochian', 'arabic', '["ar"]', '{"baptism":"المعمودية,الاسم,تاريخ الميلاد","marriage":"الزواج,العريس,العروس","funeral":"الجنازة,المتوفى"}', 4),
('ro', 'Romanian', 'latin', '["ro"]', '{"baptism":"Botez,Nume,Data nașterii,Nași","marriage":"Cununie,Mire,Mireasă,Martori","funeral":"Înmormântare,Decedat"}', 5),
('sr', 'Serbian', 'mixed', '["sr-Cyrl","sr-Latn"]', '{"baptism":"Крштење,Име,Датум рођења","marriage":"Венчање,Младожења,Невеста","funeral":"Сахрана,Преминули"}', 6),
('bg', 'Bulgarian', 'cyrillic', '["bg"]', '{"baptism":"Кръщение,Име","marriage":"Венчание","funeral":"Погребение"}', 7),
('uk', 'Ukrainian', 'cyrillic', '["uk"]', '{"baptism":"Хрещення,Ім\'я","marriage":"Вінчання","funeral":"Похорон"}', 8);

-- #44: Language auto-detection column
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10) NULL COMMENT 'Auto-detected language from Vision API response';
ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS language_confidence DECIMAL(5,3) NULL COMMENT 'Language detection confidence 0-1';

-- #79 + #80: Template sharing and accuracy tracking
ALTER TABLE ocr_global_settings ADD COLUMN IF NOT EXISTS shared_templates_enabled TINYINT(1) NOT NULL DEFAULT 0;

-- Per-template accuracy tracking columns
CREATE TABLE IF NOT EXISTS ocr_template_accuracy (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  template_id INT NOT NULL,
  church_id INT NOT NULL,
  record_type VARCHAR(32) NOT NULL,
  total_extractions INT UNSIGNED NOT NULL DEFAULT 0,
  successful_extractions INT UNSIGNED NOT NULL DEFAULT 0,
  total_corrections INT UNSIGNED NOT NULL DEFAULT 0,
  field_accuracy_json JSON NULL COMMENT 'Per-field accuracy breakdown',
  avg_confidence DECIMAL(5,2) NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_template_church (template_id, church_id, record_type),
  INDEX idx_template (template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #101: Global correction dictionary (cross-church)
CREATE TABLE IF NOT EXISTS ocr_global_corrections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  record_type VARCHAR(64) NOT NULL,
  field_name VARCHAR(64) NOT NULL,
  incorrect_value VARCHAR(255) NOT NULL,
  correct_value VARCHAR(255) NOT NULL,
  correction_count INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'How many times this correction was applied',
  source VARCHAR(32) NOT NULL DEFAULT 'promoted' COMMENT 'promoted, manual, ai_suggested',
  promoted_from_church_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_lookup (record_type, field_name, incorrect_value),
  INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #102: Name dictionary from committed records
CREATE TABLE IF NOT EXISTS ocr_name_dictionary (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_type VARCHAR(16) NOT NULL COMMENT 'first, last, patronymic, title',
  name_value VARCHAR(128) NOT NULL,
  normalized_value VARCHAR(128) NULL COMMENT 'Standardized form',
  language VARCHAR(10) NULL,
  frequency INT UNSIGNED NOT NULL DEFAULT 1,
  source VARCHAR(32) NOT NULL DEFAULT 'committed_records',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_name_type_value (name_type, name_value),
  INDEX idx_normalized (normalized_value),
  INDEX idx_frequency (frequency DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #109: Name normalization suggestions
INSERT IGNORE INTO ocr_name_dictionary (name_type, name_value, normalized_value, language, frequency, source) VALUES
('first', 'Jno.', 'John', 'en', 100, 'historical'),
('first', 'Wm.', 'William', 'en', 100, 'historical'),
('first', 'Chas.', 'Charles', 'en', 100, 'historical'),
('first', 'Thos.', 'Thomas', 'en', 100, 'historical'),
('first', 'Jas.', 'James', 'en', 100, 'historical'),
('first', 'Robt.', 'Robert', 'en', 100, 'historical'),
('first', 'Geo.', 'George', 'en', 100, 'historical'),
('first', 'Edw.', 'Edward', 'en', 100, 'historical'),
('first', 'Saml.', 'Samuel', 'en', 100, 'historical'),
('first', 'Danl.', 'Daniel', 'en', 100, 'historical'),
('first', 'Benj.', 'Benjamin', 'en', 100, 'historical'),
('first', 'Jos.', 'Joseph', 'en', 100, 'historical'),
('first', 'Nathl.', 'Nathaniel', 'en', 100, 'historical'),
('first', 'Eliz.', 'Elizabeth', 'en', 100, 'historical'),
('first', 'Margt.', 'Margaret', 'en', 100, 'historical'),
('first', 'Cath.', 'Catherine', 'en', 100, 'historical'),
('title', 'Fr.', 'Father', 'en', 100, 'historical'),
('title', 'Rev.', 'Reverend', 'en', 100, 'historical'),
('title', 'Dn.', 'Deacon', 'en', 100, 'historical'),
('title', 'Abp.', 'Archbishop', 'en', 100, 'historical'),
('title', 'Bp.', 'Bishop', 'en', 100, 'historical'),
('title', 'Archdn.', 'Archdeacon', 'en', 100, 'historical'),
('title', 'о.', 'отец', 'ru', 100, 'historical'),
('title', 'прот.', 'протоиерей', 'ru', 100, 'historical'),
('title', 'диак.', 'диакон', 'ru', 100, 'historical');

-- #110: Date format patterns registry
CREATE TABLE IF NOT EXISTS ocr_date_formats (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pattern VARCHAR(64) NOT NULL COMMENT 'Regex pattern to match',
  format_key VARCHAR(32) NOT NULL COMMENT 'us_mdy, eu_dmy, iso, slavic_month, etc.',
  language VARCHAR(10) NULL,
  example VARCHAR(64) NULL,
  parse_template VARCHAR(64) NOT NULL COMMENT 'Template for parsing: %m/%d/%Y, %d.%m.%Y, etc.',
  priority SMALLINT NOT NULL DEFAULT 50,
  PRIMARY KEY (id),
  INDEX idx_language (language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ocr_date_formats (pattern, format_key, language, example, parse_template, priority) VALUES
('^\\d{1,2}/\\d{1,2}/\\d{4}$', 'us_mdy', 'en', '01/15/1923', '%m/%d/%Y', 10),
('^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$', 'eu_dmy', NULL, '15.01.1923', '%d.%m.%Y', 20),
('^\\d{4}-\\d{2}-\\d{2}$', 'iso', NULL, '1923-01-15', '%Y-%m-%d', 5),
('^\\d{1,2}\\s+\\w+\\s+\\d{4}$', 'long_dmy', 'en', '15 January 1923', '%d %B %Y', 30),
('^\\w+\\s+\\d{1,2},?\\s+\\d{4}$', 'long_mdy', 'en', 'January 15, 1923', '%B %d, %Y', 25),
('^\\d{1,2}/\\d{1,2}/\\d{2}$', 'us_mdy_short', 'en', '01/15/23', '%m/%d/%y', 40),
('^\\d{1,2}\\.\\d{1,2}\\.\\d{2}$', 'eu_dmy_short', NULL, '15.01.23', '%d.%m.%y', 45);

-- #119: Extraction result caching
CREATE TABLE IF NOT EXISTS ocr_extraction_cache (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  image_hash VARCHAR(64) NOT NULL COMMENT 'SHA-256 of source image',
  church_id INT NOT NULL,
  template_id INT NULL,
  language VARCHAR(10) NULL,
  vision_result_json LONGTEXT NULL,
  extraction_result_json LONGTEXT NULL,
  cached_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  hit_count INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE INDEX idx_hash_church (image_hash, church_id),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- #383: Batch scheduling config
CREATE TABLE IF NOT EXISTS ocr_batch_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  church_id INT NOT NULL,
  schedule_name VARCHAR(128) NOT NULL,
  cron_expression VARCHAR(64) NOT NULL DEFAULT '0 2 * * *' COMMENT 'Default: 2 AM daily',
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  max_concurrent SMALLINT NOT NULL DEFAULT 3,
  last_run_at TIMESTAMP NULL,
  next_run_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_church (church_id),
  INDEX idx_next_run (next_run_at, enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
