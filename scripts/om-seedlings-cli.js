#!/usr/bin/env node
/**
 * OM Seedlings CLI — Command-line interface for the seeding engine
 *
 * Usage:
 *   node scripts/om-seedlings-cli.js [--dry-run|--execute] [options]
 *
 * Default mode is --dry-run (safe). --execute required to actually insert records.
 *
 * Options:
 *   --dry-run              Preview mode (default) — no data written
 *   --execute              Insert records into tenant DBs
 *   --church-id=N          Seed only church with ID N
 *   --jurisdiction=STR     Filter by jurisdiction (LIKE match)
 *   --state=XX             Filter by state/province code
 *   --limit=N              Limit to N churches (query-level)
 *   --record-types=b,m,f   Comma-separated: baptism,marriage,funeral (default: all)
 *   --from-year=YYYY       Override start year
 *   --to-year=YYYY         Override end year
 *   --allow-fallback       Allow heuristic fallback for missing established year/size
 *   --allow-seeded         Allow re-seeding churches that already have records
 *   --batch-size=N         Records per INSERT batch (default: 500)
 *   --fail-fast            Stop on first church failure
 *   --max-churches=N       Cap execution at N churches (execute safety)
 *   --error-threshold=N    Stop after N church failures
 *   --delay-ms=N           Delay between churches in ms (default: 0)
 *   --json                 Output machine-readable JSON
 *   --report=PATH          Write JSON report to file
 *
 * Examples:
 *   node scripts/om-seedlings-cli.js --dry-run
 *   node scripts/om-seedlings-cli.js --dry-run --church-id=199
 *   node scripts/om-seedlings-cli.js --dry-run --allow-fallback --limit=5
 *   node scripts/om-seedlings-cli.js --execute --church-id=199 --record-types=baptism,marriage
 *   node scripts/om-seedlings-cli.js --execute --allow-fallback --max-churches=10 --error-threshold=3
 *   node scripts/om-seedlings-cli.js --execute --allow-fallback --report=seedling-report.json
 */

const fs = require('fs');
const path = require('path');

// ─── Parse CLI args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { mode: 'dry-run', filters: {}, options: {}, json: false, report: null };

  for (const arg of args) {
    if (arg === '--dry-run') opts.mode = 'dry-run';
    else if (arg === '--execute') opts.mode = 'execute';
    else if (arg === '--allow-fallback') opts.options.allowFallback = true;
    else if (arg === '--allow-seeded') opts.options.allowSeeded = true;
    else if (arg === '--fail-fast') opts.options.failFast = true;
    else if (arg === '--json') opts.json = true;
    else if (arg.startsWith('--church-id=')) opts.filters.churchId = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--jurisdiction=')) opts.filters.jurisdiction = arg.split('=')[1];
    else if (arg.startsWith('--state=')) opts.filters.state = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) opts.filters.limit = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--record-types=')) opts.options.recordTypes = arg.split('=')[1].split(',').map(s => s.trim());
    else if (arg.startsWith('--from-year=')) opts.options.fromYear = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--to-year=')) opts.options.toYear = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--batch-size=')) opts.options.batchSize = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--max-churches=')) opts.options.maxChurches = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--error-threshold=')) opts.options.errorThreshold = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--delay-ms=')) opts.options.delayMs = parseInt(arg.split('=')[1]);
    else if (arg.startsWith('--report=')) opts.report = arg.split('=')[1];
    else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0); }
    else { console.error(`Unknown argument: ${arg}`); printHelp(); process.exit(1); }
  }

  return opts;
}

function printHelp() {
  const helpText = fs.readFileSync(__filename, 'utf8');
  const match = helpText.match(/\/\*\*[\s\S]*?\*\//);
  if (match) {
    console.log(match[0].replace(/^\/\*\*\s*\n?/, '').replace(/\s*\*\/$/, '').replace(/^ \* ?/gm, ''));
  }
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function padR(s, n) { return String(s).padEnd(n); }
function padL(s, n) { return String(s).padStart(n); }

function printDryRunReport(report) {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        OM SEEDLINGS — DRY RUN REPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`  Run ID: ${report.run_id}  |  Timestamp: ${report.timestamp}`);
  console.log(`  Candidates: ${report.summary.total_candidates}  |  Skipped: ${report.summary.total_skipped}`);
  console.log();

  if (report.churches.length > 0) {
    // Header
    console.log('  ' + padR('ID', 5) + padR('Church Name', 42) + padR('DB', 16) + padR('Est.', 6) + padR('Size', 20) + padL('Bap', 6) + padL('Mar', 6) + padL('Fun', 6) + padL('Total', 7));
    console.log('  ' + '─'.repeat(114));

    for (const c of report.churches) {
      console.log('  ' +
        padR(c.church_id, 5) +
        padR(c.church_name.slice(0, 40), 42) +
        padR(c.db_name, 16) +
        padR(c.established_year, 6) +
        padR(c.size_category, 20) +
        padL(c.projected.baptism || 0, 6) +
        padL(c.projected.marriage || 0, 6) +
        padL(c.projected.funeral || 0, 6) +
        padL(c.projected_total, 7)
      );
      if (c.warnings.length > 0) {
        for (const w of c.warnings) {
          console.log(`       ⚠ ${w}`);
        }
      }
    }

    console.log('  ' + '─'.repeat(114));
    const s = report.summary.projected_inserts;
    console.log('  ' +
      padR('TOTALS', 89) +
      padL(s.baptism, 6) +
      padL(s.marriage, 6) +
      padL(s.funeral, 6) +
      padL(s.total, 7)
    );
  }

  if (report.skipped.length > 0) {
    console.log('\n  SKIPPED CHURCHES:');
    console.log('  ' + '─'.repeat(90));
    for (const s of report.skipped) {
      console.log(`  ${padR(s.church_id, 5)} ${padR(s.name, 42)} ${s.reason}`);
    }
  }

  console.log(`\n  Run ID: ${report.run_id}  |  Mode: DRY RUN — No records were written.`);
  console.log('  To execute, run with --execute flag.');
  console.log(`  To purge this run's projection: N/A (dry run)\n`);
}

function printExecuteReport(report) {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      OM SEEDLINGS — EXECUTION REPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`  Run ID: ${report.run_id}  |  Status: ${report.status}  |  Timestamp: ${report.timestamp}`);
  if (report.task_id) console.log(`  Task Runner ID: ${report.task_id}`);
  console.log(`  Churches processed: ${report.summary.total_candidates}  |  Skipped: ${report.summary.total_skipped}  |  Failed: ${report.summary.failed}`);
  console.log();

  if (report.results.length > 0) {
    console.log('  ' + padR('ID', 5) + padR('Church Name', 42) + padR('Status', 9) + padL('Bap', 6) + padL('Mar', 6) + padL('Fun', 6) + padL('Total', 7) + padL('Time', 8));
    console.log('  ' + '─'.repeat(89));

    for (const r of report.results) {
      const status = r.status === 'success' ? '✓' : r.status === 'failed' ? '✗ FAIL' : '...';
      console.log('  ' +
        padR(r.church_id, 5) +
        padR(r.church_name.slice(0, 40), 42) +
        padR(status, 9) +
        padL(r.inserted.baptism, 6) +
        padL(r.inserted.marriage, 6) +
        padL(r.inserted.funeral, 6) +
        padL(r.total_inserted, 7) +
        padL(r.duration_ms + 'ms', 8)
      );
      if (r.error) {
        console.log(`       ✗ Error: ${r.error}`);
      }
    }

    console.log('  ' + '─'.repeat(89));
    const s = report.summary.inserted;
    console.log('  ' +
      padR('TOTALS', 56) +
      padL(s.baptism, 6) +
      padL(s.marriage, 6) +
      padL(s.funeral, 6) +
      padL(s.total, 7)
    );
  }

  if (report.skipped.length > 0) {
    console.log('\n  SKIPPED CHURCHES:');
    for (const s of report.skipped) {
      console.log(`  ${padR(s.church_id, 5)} ${padR(s.name, 42)} ${s.reason}`);
    }
  }

  console.log(`\n  Run ID: ${report.run_id}  |  To rollback: POST /api/admin/om-seedlings/purge-run/${report.run_id}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Change to server dir so config/db can find .env
  const projectRoot = path.resolve(__dirname, '..');
  process.chdir(path.join(projectRoot, 'server'));

  const { dryRun, execute } = require(path.join(projectRoot, 'server/dist/services/om-seedlings/seedingEngine'));

  const args = parseArgs();
  const startTime = Date.now();

  console.log(`[OM Seedlings] Mode: ${args.mode.toUpperCase()}`);
  if (Object.keys(args.filters).length > 0) {
    console.log(`[OM Seedlings] Filters: ${JSON.stringify(args.filters)}`);
  }

  let report;

  if (args.mode === 'execute') {
    console.log('[OM Seedlings] ⚠ EXECUTE MODE — Records will be written to tenant databases.');
    report = await execute(args.filters, {
      ...args.options,
      startedBy: 'cli',
      onProgress: (result) => {
        const sym = result.status === 'success' ? '✓' : '✗';
        console.log(`  ${sym} ${result.church_name} — ${result.total_inserted} records (${result.duration_ms}ms)`);
      },
    });
    if (!args.json) printExecuteReport(report);
  } else {
    report = await dryRun(args.filters, { ...args.options, startedBy: 'cli' });
    if (!args.json) printDryRunReport(report);
  }

  // JSON output
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  }

  // Write report file
  if (args.report) {
    fs.writeFileSync(args.report, JSON.stringify(report, null, 2));
    console.log(`[OM Seedlings] Report written to ${args.report}`);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[OM Seedlings] Completed in ${elapsed}s`);
  process.exit(0);
}

main().catch(err => {
  console.error('[OM Seedlings] Fatal error:', err);
  process.exit(1);
});
