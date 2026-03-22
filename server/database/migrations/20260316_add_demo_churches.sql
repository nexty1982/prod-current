-- Migration: Add demo church support to churches table
-- Date: 2026-03-16

ALTER TABLE churches ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE churches ADD COLUMN demo_expires_at TIMESTAMP DEFAULT NULL;
CREATE INDEX idx_churches_is_demo ON churches (is_demo);
