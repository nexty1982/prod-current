#!/usr/bin/env node
/**
 * Backfill church_workflow_executions from domain reconcilers.
 * Usage: node scripts/backfill-workflow-executions.js [--dry-run] [--shadow] [--workflow=KEY]
 */
const path = require('path');
const fs = require('fs');

process.chdir(path.join(__dirname, '..'));

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const { getAppPool } = require('../src/config/db');
const execution = require('../src/services/workflowExecutionService');
const reconcilers = require('../src/services/workflowExecutionReconcilers');
const { generateReconcileRunId } = require('../src/utils/executionId');

const FILED_WORKFLOWS = [
  'church.enrollment',
  'church.ops.setup',
  'ocr.setup.wizard',
  'ocr.batch.review',
  'records.certificate.generate',
  'identity.user.admin',
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    shadow: args.includes('--shadow'),
    workflow: args.find((a) => a.startsWith('--workflow='))?.split('=')[1] || null,
  };
}

async function runShadowCompare(pool, workflowKey, subject, reconcileResult) {
  const existing = await execution.findExecution(pool, {
    churchId: subject.church_id,
    workflowKey,
    subjectType: subject.subject_type,
    subjectId: subject.subject_id,
  });
  return {
    workflow_key: workflowKey,
    subject: subject.subject_id,
    church_id: subject.church_id,
    reconcile: {
      status: reconcileResult.status,
      step: reconcileResult.current_step_key,
      eligible: reconcileResult.eligible,
    },
    existing: existing
      ? { status: existing.status, step: existing.current_step_key }
      : null,
    match: existing
      ? existing.status === reconcileResult.status
        && existing.current_step_key === reconcileResult.current_step_key
      : !reconcileResult.eligible,
  };
}

async function main() {
  const opts = parseArgs();
  if (!execution.isModelEnabled()) {
    console.warn('EXECUTION_MODEL_ENABLED is false — set EXECUTION_MODEL_ENABLED=true for backfill writes');
    if (!opts.shadow && !opts.dryRun) {
      process.exit(1);
    }
  }

  const pool = getAppPool();
  const workflows = opts.workflow ? [opts.workflow] : FILED_WORKFLOWS;
  const runId = generateReconcileRunId();
  const stats = {
    run_id: runId,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    shadow_mismatches: [],
  };

  console.log(`Workflow execution backfill — run ${runId}`);
  console.log(`  dry_run=${opts.dryRun} shadow=${opts.shadow} workflows=${workflows.join(', ')}`);

  for (const workflowKey of workflows) {
    const subjects = await reconcilers.discoverSubjects(pool, workflowKey);
    console.log(`\n[${workflowKey}] ${subjects.length} subject(s)`);

    for (const subject of subjects) {
      if (!subject.church_id && workflowKey !== 'church.enrollment') {
        stats.skipped += 1;
        continue;
      }
      const churchId = subject.church_id || 0;

      try {
        const result = await reconcilers.reconcileSubject(pool, workflowKey, {
          ...subject,
          church_id: churchId,
        });

        if (opts.shadow) {
          const cmp = await runShadowCompare(pool, workflowKey, { ...subject, church_id: churchId }, result);
          if (!cmp.match) stats.shadow_mismatches.push(cmp);
          continue;
        }

        if (!result.eligible) {
          stats.skipped += 1;
          continue;
        }

        if (opts.dryRun) {
          console.log(`  would upsert ${subject.subject_id} → ${result.status} @ ${result.current_step_key}`);
          stats.created += 1;
          continue;
        }

        const existing = await execution.findExecution(pool, {
          churchId,
          workflowKey,
          subjectType: subject.subject_type,
          subjectId: subject.subject_id,
        });

        await execution.upsertExecutionFromDomain(pool, {
          churchId,
          workflowKey,
          subjectType: subject.subject_type,
          subjectId: subject.subject_id,
          status: result.status,
          currentStepKey: result.current_step_key,
          sourceTable: result.source_table,
          sourceRowId: result.source_row_id,
          sourceUpdatedAt: result.source_updated_at,
          contextSnapshot: result.context_snapshot,
          reconcileHash: result.reconcile_hash,
          transitionSource: 'reconciliation',
          actorType: 'system',
        });

        if (existing) stats.updated += 1;
        else stats.created += 1;
      } catch (err) {
        stats.errors += 1;
        console.error(`  ERROR ${subject.subject_id}:`, err.message);
      }
    }
  }

  if (!opts.dryRun && !opts.shadow && execution.isModelEnabled()) {
    await execution.refreshExecutionSummary(pool);
    await pool.query(
      `INSERT INTO workflow_execution_reconcile_runs (
         run_id, run_type, executions_created, executions_updated, errors, completed_at
       ) VALUES (?, 'backfill', ?, ?, ?, NOW())`,
      [runId, stats.created, stats.updated, stats.errors]
    );
  }

  console.log('\n--- Summary ---');
  console.log(JSON.stringify(stats, null, 2));

  if (stats.shadow_mismatches.length) {
    console.log('\n--- Shadow mismatches ---');
    for (const m of stats.shadow_mismatches) {
      console.log(JSON.stringify(m));
    }
    process.exit(2);
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
