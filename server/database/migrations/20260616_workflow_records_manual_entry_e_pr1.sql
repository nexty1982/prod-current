-- E-PR1 — workflow #7 records.manual.entry
-- Manual sacramental record entry (baptism, marriage, funeral) via parish portal.

INSERT INTO app_workflows (
  workflow_key, workflow_name, description, primary_app, entry_type, system_level_key,
  app_family_key, workflow_sequence, lifecycle_status, completion_state, feature_registry_ids
) VALUES (
  'records.manual.entry',
  'Manual Sacramental Record Entry',
  'Parish staff enter baptism, marriage, and funeral records through the records portal.',
  'om', 'hybrid', 'records', 'records_sacraments', 5, 'active', 'near_complete',
  JSON_ARRAY('parish-management-hub', 'records-centralized')
) ON DUPLICATE KEY UPDATE
  workflow_name = VALUES(workflow_name),
  description = VALUES(description),
  app_family_key = VALUES(app_family_key);

SET @wf_manual_id = (SELECT id FROM app_workflows WHERE workflow_key = 'records.manual.entry');

INSERT INTO app_workflow_versions (
  workflow_id, version, version_status, change_summary, route_entrypoints, runtime_state_source, published_at
) VALUES (
  @wf_manual_id, '1.0.0', 'active', 'Portal record entry pages for baptism, marriage, funeral.',
  JSON_ARRAY('/portal/records', '/portal/records/baptism/new', '/portal/records/marriage/new', '/portal/records/funeral/new'),
  'church_records', NOW()
) ON DUPLICATE KEY UPDATE version_status = 'active';

SET @wf_manual_ver_id = (SELECT id FROM app_workflow_versions WHERE workflow_id = @wf_manual_id AND version = '1.0.0');
UPDATE app_workflows SET active_version_id = @wf_manual_ver_id WHERE id = @wf_manual_id;

INSERT INTO app_workflow_steps (workflow_version_id, step_key, step_name, step_sequence, step_kind, description) VALUES
(@wf_manual_ver_id, 'select_record_type', 'Choose Record Type', 10, 'human', 'Select baptism, marriage, or funeral'),
(@wf_manual_ver_id, 'open_entry_form', 'Open Entry Form', 20, 'human', 'Navigate to record entry screen'),
(@wf_manual_ver_id, 'validate_fields', 'Validate Fields', 30, 'human', 'Required fields and sacramental rules'),
(@wf_manual_ver_id, 'save_record', 'Save Record', 40, 'system', 'Persist to tenant record tables'),
(@wf_manual_ver_id, 'audit_complete', 'Audit Complete', 50, 'audit', 'Record entry logged')
ON DUPLICATE KEY UPDATE step_name = VALUES(step_name);

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, implementation_state)
SELECT s.id, 'records.portal.hub', 'ui', 10, 'om', 'front-end/src/features/portal/PortalRecordsPage.tsx', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'records.manual.entry' AND s.step_key = 'select_record_type'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, implementation_state)
SELECT s.id, 'records.baptism.entry', 'ui', 10, 'om', 'front-end/src/features/records-centralized/baptism/BaptismRecordEntryPage.tsx', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'records.manual.entry' AND s.step_key = 'open_entry_form'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, implementation_state)
SELECT s.id, 'records.marriage.entry', 'ui', 20, 'om', 'front-end/src/features/records-centralized/marriage/MarriageRecordEntryPage.tsx', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'records.manual.entry' AND s.step_key = 'open_entry_form'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, implementation_state)
SELECT s.id, 'records.funeral.entry', 'ui', 30, 'om', 'front-end/src/features/records-centralized/funeral/FuneralRecordEntryPage.tsx', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'records.manual.entry' AND s.step_key = 'open_entry_form'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO app_workflow_step_components
  (workflow_step_id, component_key, component_type, component_sequence, source_app, source_path, data_table, implementation_state)
SELECT s.id, 'records.tenant.tables', 'data', 10, 'om', 'server/src/utils/dbSwitcher.js', 'baptism_records', 'exists'
FROM app_workflow_steps s
JOIN app_workflow_versions v ON v.id = s.workflow_version_id
JOIN app_workflows w ON w.id = v.workflow_id
WHERE w.workflow_key = 'records.manual.entry' AND s.step_key = 'save_record'
ON DUPLICATE KEY UPDATE implementation_state = 'exists';

INSERT INTO workflow_execution_summary (workflow_key, app_family_key, executions_total, stale)
SELECT 'records.manual.entry', 'records_sacraments', 0, 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_execution_summary WHERE workflow_key = 'records.manual.entry'
);

INSERT INTO omstudio_workflow_refs (app_key, workflow_key, app_family_key, workflow_name, active_version, completion_state, entry_type)
SELECT w.primary_app, w.workflow_key, w.app_family_key, w.workflow_name, v.version, w.completion_state, w.entry_type
FROM app_workflows w
LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
WHERE w.workflow_key = 'records.manual.entry'
ON DUPLICATE KEY UPDATE
  workflow_name = VALUES(workflow_name),
  active_version = VALUES(active_version),
  completion_state = VALUES(completion_state),
  last_synced_at = CURRENT_TIMESTAMP;

SELECT 'records.manual.entry workflow filed (E-PR1)' AS message;
