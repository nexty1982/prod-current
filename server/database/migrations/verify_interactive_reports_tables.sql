-- Verification query for interactive reports tables (MySQL)
-- Run this after migration to confirm all tables exist

SELECT 
  TABLE_NAME as table_name,
  (SELECT COUNT(*) FROM information_schema.COLUMNS 
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = t.TABLE_NAME) as column_count
FROM information_schema.TABLES t
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME LIKE 'interactive_report%'
ORDER BY TABLE_NAME;

-- Expected output: 6 tables
-- interactive_report_assignments
-- interactive_report_audit
-- interactive_report_patches
-- interactive_report_recipients
-- interactive_report_submissions
-- interactive_reports
