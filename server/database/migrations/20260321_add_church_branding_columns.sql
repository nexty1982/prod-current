-- Migration: Add church branding columns to churches table
-- Date: 2026-03-21
-- Purpose: Support church identity branding in Account Hub

ALTER TABLE churches
  ADD COLUMN IF NOT EXISTS logo_path VARCHAR(512) DEFAULT NULL AFTER seal_image_path,
  ADD COLUMN IF NOT EXISTS logo_dark_path VARCHAR(512) DEFAULT NULL AFTER logo_path,
  ADD COLUMN IF NOT EXISTS favicon_path VARCHAR(512) DEFAULT NULL AFTER logo_dark_path,
  ADD COLUMN IF NOT EXISTS short_name VARCHAR(50) DEFAULT NULL AFTER favicon_path,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT NULL AFTER short_name,
  ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7) DEFAULT NULL AFTER primary_color;
