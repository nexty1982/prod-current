-- Database schema for entity extraction features
-- File: database/migrations/add_entity_extraction_tables.sql

-- Table to store OCR extraction results for learning and analytics
CREATE TABLE IF NOT EXISTS ocr_extraction_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ocr_job_id INT NULL,
  record_type ENUM('baptism','marriage','funeral','death','custom') NOT NULL,
  extracted_fields JSON NOT NULL COMMENT 'Structured fields extracted from OCR text',
  confidence_score DECIMAL(5,2) NOT NULL COMMENT 'Overall extraction confidence (0.00-1.00)',
  source_text LONGTEXT COMMENT 'Original OCR text used for extraction',
  extraction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_church_record_type (church_id, record_type),
  INDEX idx_confidence (confidence_score),
  INDEX idx_extraction_date (extraction_date),
  
  -- Foreign key to OCR jobs if linked
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to log user corrections for machine learning improvement
CREATE TABLE IF NOT EXISTS ocr_correction_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  church_id INT NOT NULL,
  ocr_job_id INT NOT NULL,
  original_extraction JSON NOT NULL COMMENT 'Original AI-extracted fields',
  corrected_extraction JSON NOT NULL COMMENT 'User-corrected fields',
  correction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT NULL COMMENT 'User who made the correction',
  user_feedback TEXT COMMENT 'Optional feedback from user',
  correction_type ENUM('field_corrections','record_type_change','complete_override') DEFAULT 'field_corrections',
  
  -- Indexes
  INDEX idx_church_job (church_id, ocr_job_id),
  INDEX idx_correction_date (correction_date),
  INDEX idx_user_id (user_id),
  
  -- Foreign keys
  FOREIGN KEY (ocr_job_id) REFERENCES ocr_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store pattern improvements learned from corrections
CREATE TABLE IF NOT EXISTS ocr_pattern_improvements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  field_name VARCHAR(100) NOT NULL,
  pattern_type ENUM('regex','keyword','context') NOT NULL,
  original_pattern TEXT,
  improved_pattern TEXT,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  corrections JSON COMMENT 'Examples of corrections that led to this improvement',
  improvement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Indexes
  INDEX idx_field_name (field_name),
  INDEX idx_pattern_type (pattern_type),
  INDEX idx_success_rate (success_rate),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table to store Orthodox church-specific knowledge base
CREATE TABLE IF NOT EXISTS orthodox_knowledge_base (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('names','places','clergy_titles','terminology','date_formats') NOT NULL,
  language CHAR(2) NOT NULL COMMENT 'Language code (en, el, ru, sr, etc.)',
  term VARCHAR(255) NOT NULL,
  variants JSON COMMENT 'Alternative spellings and forms',
  context_hints JSON COMMENT 'Context clues for better recognition',
  confidence_weight DECIMAL(3,2) DEFAULT 1.00,
  usage_count INT DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  UNIQUE KEY unique_term_lang (category, language, term),
  INDEX idx_category_lang (category, language),
  INDEX idx_confidence_weight (confidence_weight),
  INDEX idx_usage_count (usage_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add entity extraction columns to existing ocr_jobs table
ALTER TABLE ocr_jobs 
ADD COLUMN IF NOT EXISTS extracted_entities JSON COMMENT 'AI-extracted structured data',
ADD COLUMN IF NOT EXISTS entity_confidence DECIMAL(5,2) COMMENT 'Entity extraction confidence score',
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE COMMENT 'Flags records needing human review',
ADD COLUMN IF NOT EXISTS reviewed_by INT NULL COMMENT 'User ID who reviewed the extraction',
ADD COLUMN IF NOT EXISTS review_date TIMESTAMP NULL COMMENT 'Date of human review',
ADD COLUMN IF NOT EXISTS review_notes TEXT COMMENT 'Notes from human review';

-- Add foreign key for reviewer
ALTER TABLE ocr_jobs 
ADD FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for entity extraction queries
ALTER TABLE ocr_jobs 
ADD INDEX idx_entity_confidence (entity_confidence),
ADD INDEX idx_needs_review (needs_review),
ADD INDEX idx_reviewed_by (reviewed_by);

-- Create view for extraction analytics
CREATE OR REPLACE VIEW ocr_extraction_analytics AS
SELECT 
    church_id,
    record_type,
    COUNT(*) as total_extractions,
    AVG(confidence_score) as avg_confidence,
    COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence_count,
    COUNT(CASE WHEN confidence_score < 0.5 THEN 1 END) as low_confidence_count,
    MAX(extraction_date) as last_extraction_date,
    COUNT(DISTINCT DATE(extraction_date)) as active_days
FROM ocr_extraction_results
GROUP BY church_id, record_type;

-- Insert sample Orthodox knowledge base entries
INSERT IGNORE INTO orthodox_knowledge_base (category, language, term, variants, context_hints) VALUES
-- Greek clergy titles
('clergy_titles', 'el', 'Πατήρ', '["Π.", "Πάτερ"]', '{"contexts": ["officiant", "priest"]}'),
('clergy_titles', 'el', 'Αρχιεπίσκοπος', '["Αρχιεπ."]', '{"contexts": ["senior_clergy", "archbishop"]}'),
('clergy_titles', 'el', 'Επίσκοπος', '["Επισκ."]', '{"contexts": ["bishop", "diocesan"]}'),

-- Russian clergy titles  
('clergy_titles', 'ru', 'Отец', '["о.", "отец"]', '{"contexts": ["officiant", "priest"]}'),
('clergy_titles', 'ru', 'Архиепископ', '["архиеп."]', '{"contexts": ["senior_clergy", "archbishop"]}'),
('clergy_titles', 'ru', 'Епископ', '["еп."]', '{"contexts": ["bishop", "diocesan"]}'),

-- English clergy titles
('clergy_titles', 'en', 'Father', '["Fr.", "Rev."]', '{"contexts": ["officiant", "priest"]}'),
('clergy_titles', 'en', 'Archbishop', '["Archb.", "Abp."]', '{"contexts": ["senior_clergy"]}'),
('clergy_titles', 'en', 'Bishop', '["Bp."]', '{"contexts": ["diocesan"]}'),

-- Orthodox terminology
('terminology', 'el', 'βάπτισμα', '["βαπτίζω", "βεβαιώ"]', '{"record_type": "baptism"}'),
('terminology', 'el', 'γάμος', '["στεφάνωση", "νυμφίος"]', '{"record_type": "marriage"}'),
('terminology', 'el', 'κηδεία', '["θάνατος", "ταφή"]', '{"record_type": "funeral"}'),

('terminology', 'ru', 'крещение', '["крестить", "крестн"]', '{"record_type": "baptism"}'),
('terminology', 'ru', 'венчание', '["брак", "жених"]', '{"record_type": "marriage"}'),
('terminology', 'ru', 'похороны', '["смерть", "погребение"]', '{"record_type": "funeral"}'),

('terminology', 'en', 'baptism', '["baptize", "christening"]', '{"record_type": "baptism"}'),
('terminology', 'en', 'marriage', '["wedding", "matrimony"]', '{"record_type": "marriage"}'),
('terminology', 'en', 'funeral', '["death", "burial"]', '{"record_type": "funeral"}');

-- Create indexes on JSON columns for better performance (MySQL 8.0+)
-- Uncomment if using MySQL 8.0 or higher:
-- ALTER TABLE ocr_extraction_results ADD INDEX idx_extracted_fields_type ((CAST(extracted_fields->'$.recordType' AS CHAR(20))));
-- ALTER TABLE ocr_jobs ADD INDEX idx_entities_confidence ((CAST(extracted_entities->'$.confidence' AS DECIMAL(5,2))));
