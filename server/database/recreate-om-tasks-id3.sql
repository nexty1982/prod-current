-- Recreate deleted om_tasks row (id 3)
-- Title: OM-tasks rev7
-- Based on the pattern from existing tasks

INSERT INTO om_tasks (
  id,
  title,
  category,
  importance,
  details,
  tags,
  attachments,
  status,
  type,
  visibility,
  date_created,
  date_completed,
  assigned_to,
  assigned_by,
  notes,
  remind_me,
  revisions,
  created_by,
  created_at,
  updated_at
) VALUES (
  3,
  'OM-tasks rev7',
  'analytics-intelligence',
  'high',
  'Title: OM-tasks rev7\n\nA) BUGFIX: Email settings "password not entered"\nB) FEATURE: View internal OMAI tasks on /church/om-spec using existing OMSpecDocumentation page',
  '["document-ai"]',
  NULL,
  2,
  'documentation',
  'admin',
  NOW(),
  NULL,
  NULL,
  'system',
  NULL,
  0,
  NULL,
  'system',
  NOW(),
  NOW()
);

