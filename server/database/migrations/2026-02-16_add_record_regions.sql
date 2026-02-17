-- Add record_regions JSON column to ocr_extractors for storing
-- manually-drawn record bounding boxes in layout templates.
ALTER TABLE ocr_extractors ADD COLUMN record_regions JSON NULL AFTER header_y_threshold;
