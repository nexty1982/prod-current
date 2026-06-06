-- Migration: Add rotation column to ocr_feeder_pages in all tenant databases
-- Date: 2026-06-06
-- Description: Supports manual rotation persistence and auto-orientation detection
-- Applied via: node script (iterates all om_church_## databases)

-- For each tenant database (om_church_##):
ALTER TABLE ocr_feeder_pages 
  ADD COLUMN rotation SMALLINT DEFAULT 0 AFTER quality_score;

-- Values: 0 (normal), 90 (clockwise), 180 (upside-down), 270 (counter-clockwise)
-- Applied to 76 tenant databases on 2026-06-06
