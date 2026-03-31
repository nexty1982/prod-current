-- Task Runner hardening: add cancellation attribution columns
-- Run after 20260328_omai_tasks.sql

ALTER TABLE omai_tasks
  ADD COLUMN cancelled_by INT DEFAULT NULL AFTER cancel_requested_at,
  ADD COLUMN cancelled_by_name VARCHAR(100) DEFAULT NULL AFTER cancelled_by;
