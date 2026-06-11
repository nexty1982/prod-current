#!/usr/bin/env node
/**
 * Manual / cron workflow execution reconcile.
 * Usage: node scripts/workflow-execution-reconcile.js [--outbox-only] [--workflow=KEY] [--church=ID]
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
const job = require('../src/services/workflowExecutionReconcileJob');

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    outboxOnly: args.includes('--outbox-only'),
    workflow: args.find((a) => a.startsWith('--workflow='))?.split('=')[1] || null,
    churchId: args.find((a) => a.startsWith('--church='))?.split('=')[1] || null,
  };
}

async function main() {
  const opts = parseArgs();
  const pool = getAppPool();

  if (opts.outboxOnly) {
    const outbox = await job.retryOutbox(pool);
    console.log(JSON.stringify({ outbox }, null, 2));
    process.exit(0);
  }

  if (opts.workflow || opts.churchId) {
    const result = await job.runScopedReconcile(pool, {
      workflowKey: opts.workflow,
      churchId: opts.churchId ? parseInt(opts.churchId, 10) : null,
      runType: 'workflow_scoped',
    });
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.errors > 0 ? 1 : 0);
  }

  const result = await job.runNightlyMaintenance(pool);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.reconcile?.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
