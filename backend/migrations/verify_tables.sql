-- Verification query for interactive reports tables
-- Run this after migration to confirm all tables exist

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'interactive_report%'
ORDER BY table_name;

-- Expected output: 6 tables
-- interactive_report_assignments
-- interactive_report_audit
-- interactive_report_patches
-- interactive_report_recipients
-- interactive_report_submissions
-- interactive_reports
