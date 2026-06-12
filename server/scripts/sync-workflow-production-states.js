#!/usr/bin/env node
/**
 * C-PR9 — sync-production-states CLI (also invoked by om-deploy.sh after backend deploy).
 *
 * Usage:
 *   node scripts/sync-workflow-production-states.js           # deploy default: refs + promote-only
 *   node scripts/sync-workflow-production-states.js --full    # manual: allow downgrades
 *   node scripts/sync-workflow-production-states.js --json
 */
'use strict';

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

const json = process.argv.includes('--json');
const allowDowngrade = process.argv.includes('--full');

async function main() {
  const { getAppPool } = require('../src/config/db');
  const sync = require('../src/services/workflowCatalogSyncService');
  const pool = getAppPool();
  const result = await sync.syncProductionStates(pool, { allowDowngrade });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`sync-production-states: ${result.workflows_checked} workflows checked, ${result.updates.length} update(s)${allowDowngrade ? ' (full)' : ' (promote-only)'}`);
    for (const u of result.updates) {
      console.log(`  ${u.workflow_key}: ${u.from} → ${u.to}`);
    }
    if (result.skipped?.length) {
      console.log(`  ${result.skipped.length} downgrade(s) skipped (use --full to apply)`);
    }
    console.log(`refs synced at ${result.synced_at}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-production-states]', err.message);
  process.exit(1);
});
