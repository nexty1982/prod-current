-- Add translation columns to existing OCR tables for all churches
-- Run this for each church database

-- Add translation columns to ocr_jobs table
ALTER TABLE ocr_jobs ADD COLUMN ocr_result_translation LONGTEXT AFTER ocr_result;
ALTER TABLE ocr_jobs ADD COLUMN translation_confidence DECIMAL(3,2) AFTER ocr_result_translation;
ALTER TABLE ocr_jobs ADD COLUMN detected_language VARCHAR(10) AFTER translation_confidence;

-- Add translation settings to ocr_settings table
ALTER TABLE ocr_settings ADD COLUMN enable_translation BOOLEAN DEFAULT TRUE AFTER confidence_threshold;
ALTER TABLE ocr_settings ADD COLUMN target_language VARCHAR(10) DEFAULT 'en' AFTER enable_translation;

-- Update indexes for better performance
ALTER TABLE ocr_jobs ADD INDEX idx_language (language);
ALTER TABLE ocr_jobs ADD INDEX idx_detected_language (detected_language);
