-- Add translation support to OCR system
-- Run this SQL to add translation fields to existing church databases

USE saints_peter_and_paul_orthodox_church_db;

-- Add translation fields to ocr_jobs table
ALTER TABLE ocr_jobs 
ADD COLUMN translated_text LONGTEXT AFTER ocr_result,
ADD COLUMN translation_language VARCHAR(10) DEFAULT 'en' AFTER translated_text,
ADD COLUMN translation_confidence DECIMAL(3,2) AFTER translation_language;

-- Update ocr_settings to include translation preferences
ALTER TABLE ocr_settings 
ADD COLUMN enable_translation BOOLEAN DEFAULT TRUE,
ADD COLUMN target_translation_language VARCHAR(10) DEFAULT 'en',
ADD COLUMN translation_threshold DECIMAL(3,2) DEFAULT 0.50;

-- Add index for translation queries
ALTER TABLE ocr_jobs ADD INDEX idx_translated (translated_text(100));

DESCRIBE ocr_jobs;
DESCRIBE ocr_settings;
