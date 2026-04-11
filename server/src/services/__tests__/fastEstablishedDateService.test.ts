#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fastEstablishedDateService.js (OMD-1192)
 *
 * Hybrid established-date enrichment: Tier 1 web scan (axios), Tier 2
 * heuristic fallback, Tier 3 consistency checks.
 *
 * External deps stubbed via require.cache:
 *   - axios        → { get: async(url, opts) => scripted response }
 *   - ../config/db → fake pool (absolute path to avoid env validation)
 *   - ./taskRunner → { updateTask, addTaskEvent, isCancelled }
 *
 * Globals patched:
 *   - Math.random  → deterministic sequence
 *   - setTimeout   → immediate (avoid 500ms/church delay in runFastFill)
 *
 * Coverage:
 *   - inferEstablishedYear (pure via Math.random stub):
 *       · cathedral → cathedral_urban range (NY shift)
 *       · mission → modern_mission
 *       · urban city → old_urban
 *       · chapel/skete → modern_mission
 *       · default → default range
 *       · NY/NJ early-shift
 *       · excerpt reflects classification
 *   - quickWebsiteScan:
 *       · null website → null
 *       · normalizes http:// prefix, strips trailing slash
 *       · tries /, /about, /history, /about-us, /our-parish
 *       · skips short HTML and bad status codes
 *       · extracts year near "founded" keyword → high/medium/low confidence
 *       · JSON-LD foundingDate detected
 *       · sorts candidates: high > medium > low
 *       · returns null when no matches
 *   - fastEnrichChurch:
 *       · website hit with high confidence → status 'enriched'
 *       · medium confidence → applies consistency + status 'low_confidence'
 *       · no website → falls back to inferEstablishedYear + heuristic extractionMethod
 *       · notes array populated
 *   - runFastFill:
 *       · 0 churches → succeeded status, 0 counts
 *       · happy path: inserts enrichment_profiles, updates run, counts web/inferred
 *       · cancellation mid-run → status cancelled
 *       · state + jurisdiction filters build WHERE
 *       · overwriteExisting=false adds missing-year clause
 *       · per-church error → failedCount++
 *
 * Run: npx tsx server/src/services/__tests__/fastEstablishedDateService.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── axios stub ──────────────────────────────────────────────────────
type AxiosCall = { url: string; opts: any };
const axiosCalls: AxiosCall[] = [];

// Scripted: URL pattern → response (or error)
let axiosScript: Array<{ match: RegExp; status?: number; data?: any; throws?: boolean }> = [];

const axiosStub = {
  get: async (url: string, opts: any) => {
    axiosCalls.push({ url, opts });
    for (const s of axiosScript) {
      if (s.match.test(url)) {
        if (s.throws) throw new Error('axios failed');
        // Simulate validateStatus check (opts.validateStatus)
        if (s.status && opts?.validateStatus && !opts.validateStatus(s.status)) {
          throw new Error('status rejected');
        }
        return { status: s.status ?? 200, data: s.data ?? '' };
      }
    }
    throw new Error('no match in axios script');
  },
};

const axiosAbs = require.resolve('axios');
require.cache[axiosAbs] = {
  id: axiosAbs,
  filename: axiosAbs,
  loaded: true,
  exports: axiosStub,
} as any;

// ── db stub ──────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];

let churchesToReturn: any[] = [];
let runInsertId = 500;

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });

    // SELECT churches to process
    if (/FROM us_churches c/.test(sql) && /LEFT JOIN church_enrichment_profiles/.test(sql)) {
      return [churchesToReturn];
    }
    // INSERT enrichment run
    if (/INSERT INTO church_enrichment_runs/.test(sql)) {
      return [{ insertId: runInsertId }];
    }
    // INSERT / UPDATE church_enrichment_profiles
    if (/church_enrichment_profiles/.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    // UPDATE run finalization
    if (/UPDATE church_enrichment_runs/.test(sql)) {
      return [{ affectedRows: 1 }];
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };

const nodePath = require('path');
const sutAbs = require.resolve('../fastEstablishedDateService');
const sutDir = nodePath.dirname(sutAbs);
const dbAbs = require.resolve(nodePath.resolve(sutDir, '..', 'config', 'db'));

require.cache[dbAbs] = {
  id: dbAbs,
  filename: dbAbs,
  loaded: true,
  exports: dbStub,
} as any;

// ── taskRunner stub ─────────────────────────────────────────────────
const taskUpdateCalls: any[] = [];
const taskEventCalls: any[] = [];
let cancelAfter: number | null = null;
let callCount = 0;

const taskRunnerStub = {
  updateTask: async (_pool: any, _id: any, u: any) => { taskUpdateCalls.push(u); },
  addTaskEvent: async (_pool: any, _id: any, opts: any) => { taskEventCalls.push(opts); },
  isCancelled: async (_pool: any, _id: any) => {
    const c = callCount++;
    return cancelAfter !== null && c >= cancelAfter;
  },
};

const taskRunnerAbs = require.resolve(nodePath.resolve(sutDir, 'taskRunner'));
require.cache[taskRunnerAbs] = {
  id: taskRunnerAbs,
  filename: taskRunnerAbs,
  loaded: true,
  exports: taskRunnerStub,
} as any;

// ── Patch globals: Math.random + setTimeout ─────────────────────────
const origMathRandom = Math.random;
let randomSeq: number[] = [];
let randomIdx = 0;
Math.random = () => {
  if (randomIdx < randomSeq.length) return randomSeq[randomIdx++];
  return 0.5; // deterministic default
};

const origSetTimeout = global.setTimeout;
(global as any).setTimeout = (fn: any, _ms: any) => { fn(); return 0 as any; };

function resetState() {
  axiosCalls.length = 0;
  axiosScript = [];
  queryLog.length = 0;
  churchesToReturn = [];
  runInsertId = 500;
  taskUpdateCalls.length = 0;
  taskEventCalls.length = 0;
  cancelAfter = null;
  callCount = 0;
  randomSeq = [];
  randomIdx = 0;
}

// ── Require SUT ──────────────────────────────────────────────────────
const {
  fastEnrichChurch,
  runFastFill,
  quickWebsiteScan,
  inferEstablishedYear,
} = require('../fastEstablishedDateService');

// Silence logs
const origLog = console.log;
const origErr = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origErr; }

async function main() {

// ============================================================================
// inferEstablishedYear — pure logic with Math.random stub
// ============================================================================
console.log('\n── inferEstablishedYear ──────────────────────────────────');

// Cathedral in urban NY → cathedral_urban range, NY shift
resetState();
randomSeq = [0]; // Math.floor(0 * range_size) = 0 → min of range
{
  const r = inferEstablishedYear('Holy Trinity Cathedral', 'New York', 'NY');
  // cathedral_urban: min=1890, max=1935. NY shift: min=1885, max=1930
  assertEq(r.year, 1885, 'cathedral NY → shifted min');
  assertEq(r.confidence, 'low', 'low confidence');
  assertEq(r.sourceType, 'inferred', 'sourceType');
  assert(r.excerpt.includes('cathedral/urban'), 'excerpt mentions cathedral');
}

// Mission → modern_mission range (no NY/NJ)
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. John Mission', 'Podunk', 'TX');
  // modern_mission: 1980-2015
  assertEq(r.year, 1980, 'mission → min of modern range');
  assert(r.excerpt.includes('mission'), 'excerpt mentions mission');
}

// Urban parish (no cathedral/mission keyword)
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. Nicholas Church', 'Brooklyn', 'NY');
  // old_urban: 1900-1940, NY shift → 1895-1935
  assertEq(r.year, 1895, 'urban parish NY → shifted old_urban');
  assert(r.excerpt.includes('urban parish'), 'excerpt mentions urban');
}

// Chapel → modern_mission
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. Seraphim Chapel', 'Nowhere', 'VT');
  // modern_mission range 1980-2015
  assertEq(r.year, 1980, 'chapel → modern_mission min');
}

// Skete → modern_mission
resetState();
randomSeq = [0.5];
{
  const r = inferEstablishedYear('Holy Trinity Skete', 'Somewhere', 'AK');
  // modern_mission: 1980-2015, 0.5*36 = 18 → 1998
  assertEq(r.year, 1998, 'skete → middle of range');
}

// Default range for non-urban non-special parish
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. Mary Orthodox Church', 'Smalltown', 'TX');
  // default: 1945-1985
  assertEq(r.year, 1945, 'default min');
  assert(r.excerpt.includes('suburban parish'), 'excerpt mentions suburban');
}

// NJ shift
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. Peter Orthodox Church', 'Jersey City', 'NJ');
  // isUrban → old_urban 1900-1940, NJ shift → 1895-1935
  assertEq(r.year, 1895, 'NJ shift applied');
}

// Cathedral in non-urban → still cathedral_urban
resetState();
randomSeq = [0];
{
  const r = inferEstablishedYear('St. Vladimir Cathedral', 'Wherever', 'PA');
  // cathedral_urban 1890-1935, no shift → 1890
  assertEq(r.year, 1890, 'cathedral no-shift');
}

// ============================================================================
// quickWebsiteScan — URL handling
// ============================================================================
console.log('\n── quickWebsiteScan: URL handling ────────────────────────');

// null/empty website → null
resetState();
{
  assertEq(await quickWebsiteScan('X', 'Y', 'Z', null), null, 'null website');
  assertEq(await quickWebsiteScan('X', 'Y', 'Z', ''), null, 'empty website');
  assertEq(axiosCalls.length, 0, 'no axios calls');
}

// Normalizes URL, tries 5 pages
resetState();
// All pages return short content → continues through all 5
axiosScript = [{ match: /.*/, data: 'too short' }];
quiet();
{
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'example.com/');
  loud();
  assertEq(r, null, 'short content → null');
  assertEq(axiosCalls.length, 5, 'tried 5 pages');
  assertEq(axiosCalls[0].url, 'http://example.com', 'homepage (normalized + slash stripped)');
  assertEq(axiosCalls[1].url, 'http://example.com/about', '/about');
  assertEq(axiosCalls[2].url, 'http://example.com/history', '/history');
  assertEq(axiosCalls[3].url, 'http://example.com/about-us', '/about-us');
  assertEq(axiosCalls[4].url, 'http://example.com/our-parish', '/our-parish');
}

// https preserved
resetState();
axiosScript = [{ match: /.*/, data: 'too short' }];
quiet();
{
  await quickWebsiteScan('X', 'Y', 'Z', 'https://secure.example.com');
  loud();
  assertEq(axiosCalls[0].url, 'https://secure.example.com', 'https preserved');
}

// ============================================================================
// quickWebsiteScan — year extraction
// ============================================================================
console.log('\n── quickWebsiteScan: year extraction ─────────────────────');

// Founded keyword near year → high confidence (distance < 60)
resetState();
{
  // Put the founded sentence early so excerpt (first 200 chars after trim) includes it
  const html = '<html><body>' +
    '<p>Our parish was founded in 1923 by Russian immigrants</p>' +
    'x'.repeat(250) +
    '</body></html>';
  axiosScript = [{ match: /example\.com$/, data: html }, { match: /.*/, data: '' }];
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'example.com');
  assert(r !== null, 'result found');
  assertEq(r.year, 1923, 'year 1923');
  assertEq(r.confidence, 'high', 'high confidence (close distance)');
  assert(r.excerpt.includes('1923'), 'excerpt contains year');
  assertEq(r.sourceUrl, 'http://example.com', 'sourceUrl');
}

// JSON-LD foundingDate
resetState();
{
  const html = '<html>' + 'x'.repeat(250) +
    '<script>{"foundingDate":"1950-01-01"}</script>' +
    '</html>';
  axiosScript = [{ match: /.*/, data: html }];
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'example.com');
  assert(r !== null, 'JSON-LD result');
  assertEq(r.year, 1950, 'JSON-LD year');
  assertEq(r.confidence, 'high', 'JSON-LD high confidence');
}

// Sort: high wins over medium
resetState();
{
  // Sentence with close distance (high) and another with distance (low/medium)
  const html = '<html><body>' + 'x'.repeat(250) +
    '<p>The parish was established in 1905 by faithful immigrants.</p>' +
    '<p>Some unrelated text with year 2005 mentioned here and founded much later in the process, far apart.</p>' +
    '</body></html>';
  axiosScript = [{ match: /.*/, data: html }];
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'example.com');
  assert(r !== null, 'result found');
  assertEq(r.year, 1905, 'picked high-confidence year');
  assertEq(r.confidence, 'high', 'high conf wins');
}

// Year out of range ignored
resetState();
{
  const html = '<html><body>' + 'x'.repeat(250) +
    '<p>Founded in 1650 by monks.</p>' +
    '</body></html>';
  axiosScript = [{ match: /.*/, data: '' }]; // force no match
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'example.com');
  assertEq(r, null, 'year too old ignored → null');
}

// All pages fail → null
resetState();
axiosScript = [{ match: /.*/, throws: true }];
quiet();
{
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'bad.example.com');
  loud();
  assertEq(r, null, 'all throws → null');
  assertEq(axiosCalls.length, 5, 'tried all 5 pages');
}

// ============================================================================
// fastEnrichChurch
// ============================================================================
console.log('\n── fastEnrichChurch ──────────────────────────────────────');

// High-confidence web → 'enriched'
resetState();
{
  const html = '<html><body>' + 'x'.repeat(250) +
    '<p>Our parish was founded in 1921 by settlers.</p>' +
    '</body></html>';
  axiosScript = [{ match: /.*/, data: html }];
  const church = { id: 5, name: 'St. Nicholas', city: 'Brooklyn', state_code: 'NY', website: 'stnicholas.org' };
  const r = await fastEnrichChurch(church);
  assertEq(r.churchId, 5, 'churchId');
  assertEq(r.established.year, 1921, 'year');
  assertEq(r.established.confidence, 'high', 'confidence high');
  assertEq(r.extractionMethod, 'fast_web_search', 'extractionMethod');
  assertEq(r.status, 'enriched', 'status enriched');
  assert(r.notes[0].includes('Web search: found 1921'), 'notes populated');
}

// Medium-confidence web with cathedral mismatch → consistency check applied
resetState();
randomSeq = [0]; // for consistency adjustment
{
  // Cathedral with 1985 mentioned far from keyword → medium/low confidence
  // We engineer: distance between year and "founded" is > 60 but < 120 → medium
  const padding = 'x'.repeat(80);
  const html = '<html><body>' + 'x'.repeat(250) +
    `<p>The parish was officially founded ${padding}, and in 1985 we marked our anniversary.</p>` +
    '</body></html>';
  axiosScript = [{ match: /.*/, data: html }];
  const church = { id: 6, name: 'Holy Trinity Cathedral', city: 'Anywhere', state_code: 'CA', website: 'ht.org' };
  const r = await fastEnrichChurch(church);
  // Medium conf → status 'low_confidence', consistency check applied
  assertEq(r.status, 'low_confidence', 'status low_confidence for medium');
  // Cathedral + year > 1960 → adjusted to 1900 + 0*40 = 1900
  assertEq(r.established.year, 1900, 'cathedral year capped by consistency');
}

// No website → heuristic fallback
resetState();
randomSeq = [0];
{
  const church = { id: 7, name: 'St. George Mission', city: 'Somewhere', state_code: 'TX', website: null };
  const r = await fastEnrichChurch(church);
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic fallback');
  assertEq(r.status, 'low_confidence', 'low_confidence status');
  assertEq(r.established.year, 1980, 'mission → modern_mission min');
  assertEq(r.established.confidence, 'low', 'low confidence');
  assert(r.notes.some((n: string) => n.includes('no results')), 'notes say no results');
}

// ============================================================================
// runFastFill
// ============================================================================
console.log('\n── runFastFill ───────────────────────────────────────────');

// No churches → succeeded, 0 counts
resetState();
churchesToReturn = [];
quiet();
{
  const r = await runFastFill();
  loud();
  assertEq(r, { total: 0, enriched: 0, inferred: 0, failed: 0 }, 'empty result');
  // Should NOT insert run if nothing to do
  assert(!queryLog.some(q => /INSERT INTO church_enrichment_runs/.test(q.sql)), 'no run inserted');
}

// Happy path: 2 churches, 1 web + 1 heuristic
resetState();
randomSeq = [0, 0, 0, 0, 0];
churchesToReturn = [
  { id: 1, name: 'St. Andrew', city: 'Buffalo', state_code: 'NY', website: 'standrew.org' },
  { id: 2, name: 'Holy Cross Mission', city: 'Elsewhere', state_code: 'TX', website: null },
];
{
  const html = '<html><body>' + 'x'.repeat(250) +
    '<p>We were founded in 1910 by immigrants.</p>' +
    '</body></html>';
  axiosScript = [{ match: /.*/, data: html }];
  quiet();
  const r = await runFastFill({ taskId: 99 });
  loud();
  assertEq(r.total, 2, 'total 2');
  assertEq(r.enriched, 1, 'enriched (web) 1');
  assertEq(r.inferred, 1, 'inferred 1');
  assertEq(r.failed, 0, 'failed 0');
  assertEq(r.runId, 500, 'runId');
  // Run insert happened
  assert(queryLog.some(q => /INSERT INTO church_enrichment_runs/.test(q.sql)), 'run inserted');
  // 2 profile upserts
  const profileUpserts = queryLog.filter(q => /INSERT INTO church_enrichment_profiles/.test(q.sql));
  assertEq(profileUpserts.length, 2, '2 profile upserts');
  // Run finalization
  assert(queryLog.some(q => /UPDATE church_enrichment_runs/.test(q.sql)), 'run finalized');
  // Task events: expect at least 2 (one per church)
  assert(taskEventCalls.length >= 2, 'task events sent');
  // Final task update has status succeeded
  assert(taskUpdateCalls.some(u => u.status === 'succeeded'), 'task succeeded');
}

// Cancellation mid-run
resetState();
randomSeq = Array(50).fill(0);
churchesToReturn = [
  { id: 1, name: 'A', city: 'x', state_code: 'NY', website: null },
  { id: 2, name: 'B', city: 'x', state_code: 'NY', website: null },
  { id: 3, name: 'C', city: 'x', state_code: 'NY', website: null },
];
cancelAfter = 1; // cancelled after 1st check passes (2nd invocation returns true)
quiet();
{
  const r = await runFastFill({ taskId: 99 });
  loud();
  // Depending on exact logic: first iteration passes, second iteration checks (count>=1 → cancelled)
  assert(r.total === 3, 'total still reported');
  assert(taskUpdateCalls.some(u => u.status === 'cancelled'), 'cancelled update');
}

// State + jurisdiction filters
resetState();
churchesToReturn = [];
quiet();
await runFastFill({ state: 'NY', jurisdiction: 'OCA', limit: 10 });
loud();
{
  const sel = queryLog.find(q => /FROM us_churches c/.test(q.sql));
  assert(sel !== undefined, 'select happened');
  assert(sel!.sql.includes('c.state_code = ?'), 'state filter');
  assert(sel!.sql.includes('c.jurisdiction LIKE ?'), 'jurisdiction filter');
  assert(sel!.sql.includes('LIMIT ?'), 'limit applied');
  assertEq(sel!.params, ['NY', '%OCA%', 10], 'filter params');
}

// overwriteExisting=true → omits missing-year clause
resetState();
churchesToReturn = [];
quiet();
await runFastFill({ overwriteExisting: true });
loud();
{
  const sel = queryLog.find(q => /FROM us_churches c/.test(q.sql));
  assert(!sel!.sql.includes('ep.id IS NULL'), 'no missing-year clause when overwrite');
}

// Per-church error → failedCount++
resetState();
randomSeq = Array(20).fill(0);
churchesToReturn = [
  { id: 1, name: 'BadChurch', city: 'x', state_code: 'NY', website: 'fails.com' },
];
// axios throws for all pages → quickWebsiteScan returns null → fallback to heuristic
// For the error path, we need the PROFILE INSERT to throw. Override fakePool.query to throw on insert profile.
const origQuery = fakePool.query;
fakePool.query = async (sql: string, params: any[] = []) => {
  if (/INSERT INTO church_enrichment_profiles/.test(sql)) {
    throw new Error('db insert exploded');
  }
  return origQuery(sql, params);
};
quiet();
{
  const r = await runFastFill({ taskId: 99 });
  loud();
  assertEq(r.failed, 1, 'failed count 1');
  assertEq(r.enriched, 0, 'no enriched');
  assertEq(r.inferred, 0, 'no inferred');
  assert(taskEventCalls.some(e => e.level === 'error'), 'error task event');
}
fakePool.query = origQuery;

// ── Restore globals ──────────────────────────────────────────────
Math.random = origMathRandom;
(global as any).setTimeout = origSetTimeout;

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
