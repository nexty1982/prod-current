/**
 * App workflow catalog — read-only loaders from orthodoxmetrics_db.app_workflow_*.
 * Single source of truth for workflow definitions (steps, routes, components).
 */
const { getAppPool } = require('../config/db');

function parseJson(val, fallback = null) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

async function fetchWorkflowList() {
  const pool = getAppPool();
  const [rows] = await pool.query(
    `SELECT w.workflow_key, w.workflow_name, w.description, w.primary_app, w.entry_type,
            w.system_level_key, w.workflow_sequence, w.lifecycle_status, w.completion_state,
            v.version AS active_version, v.route_entrypoints, v.runtime_state_source
     FROM app_workflows w
     LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
     ORDER BY w.workflow_sequence, w.workflow_name`
  );
  return rows.map((r) => ({
    ...r,
    route_entrypoints: parseJson(r.route_entrypoints, []),
  }));
}

async function fetchWorkflowDetail(workflowKey) {
  const pool = getAppPool();
  const [wfRows] = await pool.query(
    `SELECT w.*, sl.level_name AS system_level_name,
            v.id AS version_id, v.version, v.route_entrypoints, v.runtime_state_source
     FROM app_workflows w
     LEFT JOIN app_workflow_system_levels sl ON sl.level_key = w.system_level_key
     LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
     WHERE w.workflow_key = ?`,
    [workflowKey]
  );
  if (!wfRows.length) return null;
  const wf = wfRows[0];
  const versionId = wf.version_id;
  if (!versionId) {
    return {
      workflow_key: wf.workflow_key,
      workflow_name: wf.workflow_name,
      description: wf.description,
      primary_app: wf.primary_app,
      entry_type: wf.entry_type,
      completion_state: wf.completion_state,
      active_version: null,
      route_entrypoints: [],
      runtime_state_source: wf.runtime_state_source,
      steps: [],
    };
  }

  const [steps] = await pool.query(
    `SELECT s.*, p.pipeline_key, p.pipeline_name, p.runtime_state_source AS pipeline_runtime_source,
            p.step_definitions AS pipeline_step_definitions
     FROM app_workflow_steps s
     LEFT JOIN app_workflow_pipelines p ON p.pipeline_key = s.pipeline_key
     WHERE s.workflow_version_id = ?
     ORDER BY s.step_sequence`,
    [versionId]
  );

  const stepIds = steps.map((s) => s.id);
  let components = [];
  if (stepIds.length) {
    const [compRows] = await pool.query(
      `SELECT * FROM app_workflow_step_components
       WHERE workflow_step_id IN (?)
       ORDER BY workflow_step_id, component_sequence`,
      [stepIds]
    );
    components = compRows;
  }
  const byStep = new Map();
  for (const c of components) {
    if (!byStep.has(c.workflow_step_id)) byStep.set(c.workflow_step_id, []);
    byStep.get(c.workflow_step_id).push(c);
  }

  return {
    workflow_key: wf.workflow_key,
    workflow_name: wf.workflow_name,
    description: wf.description,
    primary_app: wf.primary_app,
    entry_type: wf.entry_type,
    system_level_key: wf.system_level_key,
    system_level_name: wf.system_level_name,
    completion_state: wf.completion_state,
    active_version: wf.version,
    route_entrypoints: parseJson(wf.route_entrypoints, []),
    runtime_state_source: wf.runtime_state_source,
    steps: steps.map((s) => ({
      step_key: s.step_key,
      step_name: s.step_name,
      step_sequence: s.step_sequence,
      step_kind: s.step_kind,
      pipeline_key: s.pipeline_key,
      pipeline_name: s.pipeline_name,
      runtime_status_field: s.runtime_status_field,
      runtime_status_values: parseJson(s.runtime_status_values, []),
      required_components: byStep.get(s.id) || [],
    })),
  };
}

module.exports = {
  parseJson,
  fetchWorkflowList,
  fetchWorkflowDetail,
};
