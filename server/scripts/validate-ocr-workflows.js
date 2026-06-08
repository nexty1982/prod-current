#!/usr/bin/env node
/**
 * OCR Studio operational workflow validation (static + optional DB).
 *
 * Usage:
 *   node server/scripts/validate-ocr-workflows.js
 *   node server/scripts/validate-ocr-workflows.js --church 1
 *
 * Checks code/migration presence and optionally DB rule counts when MySQL is available.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

const checks = [];
let failed = 0;

function pass(name, detail) {
  checks.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail) {
  checks.push({ name, ok: false, detail });
  failed += 1;
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fileExists(rel) {
  const p = path.join(REPO_ROOT, rel);
  return fs.existsSync(p);
}

function fileContains(rel, needle) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) return false;
  return fs.readFileSync(p, 'utf8').includes(needle);
}

// ── Static checks (six validated workflows + governance) ─────────────────

const requiredFiles = [
  'server/src/routes/ocr/rules.ts',
  'server/src/services/ocr/rules/ParishRulesEngine.ts',
  'server/src/services/ocr/rules/defaultRules.ts',
  'server/database/migrations/2026_06_06_seed_default_rules.sql',
  'server/src/workers/ocrFeederWorker.ts',
  'server/src/controllers/ocrLayoutTemplateController.js',
  'front-end/src/features/devel-tools/om-ocr/pages/OCRSettingsPage.tsx',
  'front-end/src/features/devel-tools/om-ocr/pages/OcrReviewPage.tsx',
];

for (const f of requiredFiles) {
  if (fileExists(f)) pass(`file exists: ${f}`);
  else fail(`file exists: ${f}`, 'missing');
}

if (fileContains('server/src/workers/ocrFeederWorker.ts', "status = 'approved'")) {
  pass('worker default template filters approved status');
} else {
  fail('worker default template filters approved status', 'expected approved status guard in ocrFeederWorker');
}

if (fileContains('front-end/src/features/devel-tools/om-ocr/pages/OCRSettingsPage.tsx', "rule.scope === 'global'")) {
  pass('rules UI shows scope badges');
} else {
  fail('rules UI shows scope badges');
}

if (fileContains('front-end/src/features/devel-tools/om-ocr/pages/OcrReviewPage.tsx', 'Add to Parish Clergy')) {
  pass('review UI has Add to Parish Clergy action');
} else {
  fail('review UI has Add to Parish Clergy action');
}

if (fileContains('server/src/services/ocr/rules/ParishRulesEngine.ts', "FIELD(scope")) {
  pass('rules engine orders by scope (global → diocesan → church)');
} else {
  fail('rules engine scope ordering', 'expected FIELD(scope, ...) in ParishRulesEngine');
}

// ── Optional DB checks ────────────────────────────────────────────────────

async function tryDb(churchId) {
  let pool;
  try {
    const { getAppPool } = require(path.join(SERVER_ROOT, 'src/config/db'));
    pool = getAppPool();
    const [scopeRows] = await pool.query(
      'SELECT scope, COUNT(*) AS cnt FROM ocr_parish_rules GROUP BY scope'
    );
    pass('DB ocr_parish_rules reachable', JSON.stringify(scopeRows));
    const [globalRows] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM ocr_parish_rules WHERE scope = 'global' AND church_id IS NULL"
    );
    const globalCnt = globalRows[0]?.cnt || 0;
    if (globalCnt > 0) pass('global default rules seeded', `count=${globalCnt}`);
    else fail('global default rules seeded', 'count=0 — run 2026_06_06_seed_default_rules.sql');

    const [extRows] = await pool.query(
      "SELECT status, COUNT(*) AS cnt FROM ocr_extractors GROUP BY status"
    );
    pass('DB ocr_extractors status breakdown', JSON.stringify(extRows));

    if (churchId) {
      const [entRows] = await pool.query(
        'SELECT COUNT(*) AS cnt FROM ocr_parish_configuration_entities WHERE church_id = ? AND entity_type = ?',
        [churchId, 'clergy']
      );
      pass(`clergy entities church=${churchId}`, `count=${entRows[0]?.cnt || 0}`);
    }
  } catch (err) {
    console.warn(`⚠️  DB checks skipped: ${err.message}`);
  }
}

(async () => {
  const churchArg = process.argv.find((a) => a.startsWith('--church='));
  const churchId = churchArg ? parseInt(churchArg.split('=')[1], 10) : null;
  await tryDb(churchId);

  console.log('\n' + '='.repeat(60));
  console.log(`OCR Studio validation: ${checks.length - failed}/${checks.length} passed`);
  if (failed > 0) {
    console.log('FAILED checks:');
    checks.filter((c) => !c.ok).forEach((c) => console.log(`  - ${c.name}: ${c.detail || ''}`));
    process.exit(1);
  }
  console.log('All checks passed.');
})();
