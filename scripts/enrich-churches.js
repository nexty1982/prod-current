#!/usr/bin/env node
// ============================================================
// CLI Runner: Church Enrichment
// Usage:
//   node scripts/enrich-churches.js --state NJ --jurisdiction OCA
//   node scripts/enrich-churches.js --state NJ --jurisdiction OCA --limit 5
//   node scripts/enrich-churches.js --force    # Re-enrich already-processed churches
//   node scripts/enrich-churches.js --church 62  # Single church by ID
// ============================================================

// Config auto-loads env via server/dist/config
const { runBatchEnrichment, enrichChurch, upsertEnrichmentProfile, createEnrichmentRun, updateRunStatus } = require('../server/dist/services/churchEnrichmentService');
const { getAppPool } = require('../server/dist/config/db');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { state: null, jurisdiction: null, limit: null, force: false, churchId: null, statusFilter: null };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--state':
      case '-s':
        opts.state = args[++i];
        break;
      case '--jurisdiction':
      case '-j':
        opts.jurisdiction = args[++i];
        break;
      case '--limit':
      case '-l':
        opts.limit = parseInt(args[++i], 10);
        break;
      case '--force':
      case '-f':
        opts.force = true;
        break;
      case '--church':
      case '-c':
        opts.churchId = parseInt(args[++i], 10);
        break;
      case '--status':
        opts.statusFilter = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Church Enrichment CLI
=====================
Inspects church websites to extract established dates and parish size estimates.

Usage:
  node scripts/enrich-churches.js [options]

Options:
  --state, -s <code>        Filter by state (e.g., NJ, PA)
  --jurisdiction, -j <name> Filter by jurisdiction (e.g., OCA, GOARCH)
  --limit, -l <n>           Process at most n churches
  --force, -f               Re-enrich already-processed churches
  --church, -c <id>         Enrich a single church by ID
  --status <list>           Re-run only these statuses (e.g., "no_data,low_confidence")
  --help, -h                Show this help

Examples:
  node scripts/enrich-churches.js --state NJ --jurisdiction OCA
  node scripts/enrich-churches.js --church 62
  node scripts/enrich-churches.js --state NJ --jurisdiction OCA --limit 5 --force
  node scripts/enrich-churches.js --state NJ --status no_data,low_confidence
`);
        process.exit(0);
    }
  }

  return opts;
}

async function enrichSingleChurch(churchId) {
  const pool = getAppPool();
  const [rows] = await pool.query(
    'SELECT id, name, website, city, state_code, jurisdiction FROM us_churches WHERE id = ?',
    [churchId]
  );

  if (rows.length === 0) {
    console.error(`Church ID ${churchId} not found`);
    process.exit(1);
  }

  const church = rows[0];
  console.log(`\nEnriching: ${church.name} (${church.city}, ${church.state_code})`);
  console.log(`Website: ${church.website}\n`);

  const runId = await createEnrichmentRun(pool, {
    runType: 'single',
    totalChurches: 1,
    options: { churchId }
  });

  const result = await enrichChurch(church);
  await upsertEnrichmentProfile(pool, runId, result);

  await updateRunStatus(pool, runId, {
    status: 'completed',
    enrichedCount: result.status === 'enriched' || result.status === 'low_confidence' ? 1 : 0,
    failedCount: result.status === 'failed' ? 1 : 0,
    skippedCount: result.status === 'no_data' ? 1 : 0
  });

  console.log('─── Result ───');
  console.log(`Status: ${result.status}`);
  console.log(`Method: ${result.extractionMethod}`);
  console.log(`Pages fetched: ${result.pagesFetched.join(', ') || 'none'}`);

  if (result.established) {
    console.log(`\nEstablished:`);
    console.log(`  Year: ${result.established.year}`);
    console.log(`  Date: ${result.established.date || 'year only'}`);
    console.log(`  Precision: ${result.established.precision}`);
    console.log(`  Confidence: ${result.established.confidence}`);
    console.log(`  Source: ${result.established.sourceUrl}`);
    console.log(`  Excerpt: "${result.established.excerpt}"`);
  } else {
    console.log('\nEstablished: not found');
  }

  if (result.size) {
    console.log(`\nParish Size:`);
    console.log(`  Category: ${result.size.category}`);
    if (result.size.familyMin) console.log(`  Families: ~${result.size.familyMin}-${result.size.familyMax}`);
    console.log(`  Confidence: ${result.size.confidence}`);
    if (result.size.sourceUrl) console.log(`  Source: ${result.size.sourceUrl}`);
    if (result.size.excerpt) console.log(`  Excerpt: "${result.size.excerpt}"`);
  } else {
    console.log('\nParish Size: not determined');
  }

  console.log(`\nNotes: ${result.notes.join('; ')}`);
  console.log(`Run ID: ${runId}`);

  if (result.rawSignals.established_candidates?.length > 1) {
    console.log(`\nAll established date candidates (${result.rawSignals.established_candidates.length}):`);
    result.rawSignals.established_candidates.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.year} (${c.confidence}, ${c.precision}) — ${c.sourceUrl}`);
    });
  }
}

async function main() {
  const opts = parseArgs();

  try {
    if (opts.churchId) {
      await enrichSingleChurch(opts.churchId);
    } else {
      const summary = await runBatchEnrichment({
        state: opts.state,
        jurisdiction: opts.jurisdiction,
        limit: opts.limit,
        forceReenrich: opts.force || !!opts.statusFilter,
        statusFilter: opts.statusFilter
      });

      console.log('\n═══ Summary ═══');
      console.log(`Run ID:   ${summary.runId}`);
      console.log(`Total:    ${summary.total}`);
      console.log(`Enriched: ${summary.enriched}`);
      console.log(`Failed:   ${summary.failed}`);
      console.log(`Skipped:  ${summary.skipped}`);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }

  process.exit(0);
}

main();
