/**
 * Workflow catalog sync — production readiness assessment + omstudio_workflow_refs.
 * Used by deploy hook (C-PR9), CLI script, and OMAI platform-workflows API.
 */
const fs = require('fs');
const path = require('path');
const catalog = require('./workflowCatalogService');

const OM_PROD_ROOT = process.env.OM_PROD_ROOT || path.resolve(__dirname, '../..');
const OMAI_ROOT = process.env.OMAI_ROOT || '/var/www/omai';

function resolveSourceAbs(sourceApp, sourcePath) {
  if (!sourcePath) return null;
  const rel = String(sourcePath).replace(/^\/+/, '');
  if (sourceApp === 'om') {
    if (rel.startsWith('front-end/') || rel.startsWith('server/')) return path.join(OM_PROD_ROOT, rel);
    return path.join(OM_PROD_ROOT, 'front-end/src', rel);
  }
  if (sourceApp === 'omai') {
    if (rel.startsWith('berry/') || rel.startsWith('_runtime/')) return path.join(OMAI_ROOT, rel);
    return path.join(OMAI_ROOT, 'berry/src', rel);
  }
  return null;
}

function assessComponentDrift(component) {
  const abs = resolveSourceAbs(component.source_app, component.source_path);
  if (!abs) {
    if (component.data_table && component.implementation_state === 'exists') {
      return { ...component, drift_status: 'ok', drift_detail: `table: ${component.data_table}` };
    }
    return { ...component, drift_status: 'unknown', drift_detail: 'no source_path' };
  }
  const exists = fs.existsSync(abs);
  return {
    ...component,
    drift_status: exists ? 'ok' : 'missing_source',
    drift_detail: exists ? abs : `missing: ${abs}`,
  };
}

/** Production-ready = every step has components on disk with no drift. */
async function assessWorkflowReadiness(pool, workflowKey) {
  const wf = await catalog.fetchWorkflowDetail(workflowKey, pool);
  if (!wf) return null;

  const steps = wf.steps || [];
  const issues = [];
  let stepsReady = 0;

  for (const step of steps) {
    const raw = step.required_components || [];
    if (!raw.length) {
      issues.push({ code: 'step_no_components', step_key: step.step_key });
      continue;
    }
    const comps = raw.map((c) => assessComponentDrift(c));
    const partial = comps.filter((c) => c.implementation_state && c.implementation_state !== 'exists');
    const driftMiss = comps.filter((c) => c.drift_status === 'missing_source');
    if (partial.length) {
      issues.push({ code: 'partial_implementation', step_key: step.step_key, components: partial.map((c) => c.component_key) });
    }
    if (driftMiss.length) {
      issues.push({ code: 'source_drift', step_key: step.step_key, components: driftMiss.map((c) => c.component_key) });
    }
    if (!partial.length && !driftMiss.length) stepsReady += 1;
  }

  const routes = wf.route_entrypoints || [];
  if (!routes.length) {
    issues.push({ code: 'no_entry_routes', message: 'No route_entrypoints on active version' });
  }

  const stepsTotal = steps.length;
  const readinessPct = stepsTotal ? Math.round((stepsReady / stepsTotal) * 100) : 0;
  const productionReady = stepsTotal > 0 && stepsReady === stepsTotal && issues.length === 0;

  return {
    workflow_key: workflowKey,
    workflow_name: wf.workflow_name,
    completion_state: wf.completion_state,
    production_ready: productionReady,
    readiness_pct: readinessPct,
    steps_ready: stepsReady,
    steps_total: stepsTotal,
    criteria: {
      every_step_has_components: steps.every((s) => (s.required_components || []).length > 0),
      all_components_exist: !issues.some((i) => i.code === 'partial_implementation'),
      drift_clear: !issues.some((i) => i.code === 'source_drift'),
      has_entry_routes: routes.length > 0,
    },
    issues,
  };
}

async function syncWorkflowRefs(pool) {
  await pool.query(
    `INSERT INTO omstudio_workflow_refs (
       app_key, workflow_key, app_family_key, workflow_name, active_version, completion_state, entry_type
     )
     SELECT w.primary_app, w.workflow_key, w.app_family_key, w.workflow_name,
            v.version, w.completion_state, w.entry_type
     FROM app_workflows w
     LEFT JOIN app_workflow_versions v ON v.id = w.active_version_id
     ON DUPLICATE KEY UPDATE
       app_family_key = VALUES(app_family_key),
       workflow_name = VALUES(workflow_name),
       active_version = VALUES(active_version),
       completion_state = VALUES(completion_state),
       entry_type = VALUES(entry_type),
       last_synced_at = CURRENT_TIMESTAMP`
  );
}

const COMPLETION_STATE_RANK = {
  identified: 0,
  mapped: 1,
  near_complete: 2,
  production: 3,
};

function completionStateFromReadiness(r) {
  if (r.production_ready) return 'production';
  if (r.readiness_pct >= 60) return 'near_complete';
  if (r.readiness_pct > 0) return 'mapped';
  return 'identified';
}

function isStatePromotion(fromState, toState) {
  const from = COMPLETION_STATE_RANK[fromState] ?? 0;
  const to = COMPLETION_STATE_RANK[toState] ?? 0;
  return to > from;
}

/** Refresh completion_state from disk readiness + sync omstudio_workflow_refs. */
async function syncProductionStates(pool, { allowDowngrade = false } = {}) {
  const workflows = await catalog.fetchEnrichedWorkflowList(pool);
  const updates = [];
  const skipped = [];

  for (const w of workflows) {
    const r = await assessWorkflowReadiness(pool, w.workflow_key);
    if (!r) continue;
    const nextState = completionStateFromReadiness(r);
    if (nextState === r.completion_state) continue;

    if (!allowDowngrade && !isStatePromotion(r.completion_state, nextState)) {
      skipped.push({ workflow_key: w.workflow_key, from: r.completion_state, assessed: nextState, reason: 'downgrade_blocked' });
      continue;
    }

    await pool.query(
      'UPDATE app_workflows SET completion_state = ? WHERE workflow_key = ?',
      [nextState, w.workflow_key]
    );
    updates.push({ workflow_key: w.workflow_key, from: r.completion_state, to: nextState });
  }

  await syncWorkflowRefs(pool);

  return {
    success: true,
    updates,
    skipped,
    allow_downgrade: allowDowngrade,
    workflows_checked: workflows.length,
    synced_at: new Date().toISOString(),
  };
}

module.exports = {
  assessComponentDrift,
  assessWorkflowReadiness,
  syncWorkflowRefs,
  syncProductionStates,
  completionStateFromReadiness,
};
