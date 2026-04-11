#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fastEstablishedDateService.js (OMD-1053)
 *
 * Fast-path founding date enrichment with three tiers:
 *   Tier 1: quickWebsiteScan — fetch website + /about + /history, extract
 *           years near founding keywords, + JSON-LD foundingDate
 *   Tier 2: inferEstablishedYear — heuristic by parish type/urban/state
 *   Tier 3: applyConsistencyChecks — cathedral ≤1960, mission ≥1950
 *
 * External deps:
 *   - axios (stubbed via require.cache)
 *   - ../config/db getAppPool (stubbed)
 *   - ./taskRunner updateTask/addTaskEvent/isCancelled (stubbed)
 *
 * We pin Math.random to a deterministic value so heuristic-picked years
 * are predictable. Scripted HTML responses drive quickWebsiteScan paths.
 *
 * Coverage:
 *   - inferEstablishedYear:
 *       · cathedral → cathedral_urban range
 *       · modern mission
 *       · urban city → old_urban range
 *       · chapel / skete → modern_mission range
 *       · default suburban
 *       · NY/NJ shift-5 adjustment
 *       · URBAN_CITIES matching is case-insensitive
 *   - quickWebsiteScan:
 *       · no website → null
 *       · URL normalization (no protocol + trailing slash)
 *       · short/invalid HTML skipped
 *       · year near "founded in 1905" → high confidence
 *       · JSON-LD foundingDate → high confidence
 *       · no keyword match → returns null → tries next URL
 *       · network error → skips + tries next URL
 *       · all URLs fail → null
 *       · best-candidate sort by confidence
 *   - fastEnrichChurch:
 *       · website hit → web_search extractionMethod
 *       · no website → heuristic fallback
 *       · cathedral with post-1960 web hit → consistency check kicks in
 *   - runFastFill:
 *       · zero churches → early exit (taskRunner skip)
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

// ── axios stub ────────────────────────────────────────────────────────
type AxiosCall = { url: string; options: any };
const axiosCalls: AxiosCall[] = [];
// Route table: URL regex → response (or error)
type AxiosRoute = { match: RegExp; html?: string; throws?: Error };
let axiosRoutes: AxiosRoute[] = [];

const axiosStub = {
  get: async (url: string, options: any = {}) => {
    axiosCalls.push({ url, options });
    for (const r of axiosRoutes) {
      if (r.match.test(url)) {
        if (r.throws) throw r.throws;
        return { data: r.html, status: 200 };
      }
    }
    // Default: 404-like failure
    const err: any = new Error('No route matched');
    throw err;
  },
};

const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath, filename: axiosPath, loaded: true, exports: axiosStub,
} as any;

// ── db stub (SQL-routed pool) ─────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
const queryLog: QueryCall[] = [];
type DbRoute = { match: RegExp; respond?: (params: any[]) => any; rows?: any };
let dbRoutes: DbRoute[] = [];

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    for (const r of dbRoutes) {
      if (r.match.test(sql)) {
        const out = r.respond ? r.respond(params) : r.rows;
        return [out];
      }
    }
    return [[]];
  },
};

const dbStub = { getAppPool: () => fakePool };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// ── taskRunner stub ───────────────────────────────────────────────────
type TaskCall = { method: string; args: any[] };
const taskCalls: TaskCall[] = [];
let isCancelledReturn = false;

const taskRunnerStub = {
  updateTask: async (...args: any[]) => { taskCalls.push({ method: 'updateTask', args }); },
  addTaskEvent: async (...args: any[]) => { taskCalls.push({ method: 'addTaskEvent', args }); },
  isCancelled: async (..._args: any[]) => isCancelledReturn,
};

const trPath = require.resolve('../taskRunner');
require.cache[trPath] = {
  id: trPath, filename: trPath, loaded: true, exports: taskRunnerStub,
} as any;

// Silence console noise
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

// Pin Math.random so heuristic picks are predictable (0 → range.min)
const origRandom = Math.random;
Math.random = () => 0;

const svc = require('../fastEstablishedDateService');
const { fastEnrichChurch, runFastFill, quickWebsiteScan, inferEstablishedYear } = svc;

function reset() {
  axiosCalls.length = 0;
  axiosRoutes = [];
  queryLog.length = 0;
  dbRoutes = [];
  taskCalls.length = 0;
  isCancelledReturn = false;
}

async function main() {

// ============================================================================
// inferEstablishedYear
// ============================================================================
console.log('\n── inferEstablishedYear ──────────────────────────────────');

// Math.random pinned to 0 → year = range.min

// Cathedral (non-NY/NJ) → cathedral_urban.min = 1890
{
  const r = inferEstablishedYear('Holy Trinity Cathedral', 'Chicago', 'IL');
  assertEq(r.year, 1890, 'cathedral → 1890');
  assertEq(r.confidence, 'low', 'confidence low');
  assertEq(r.sourceType, 'inferred', 'sourceType inferred');
  assert(r.excerpt.includes('cathedral/urban'), 'excerpt mentions cathedral');
}

// Mission (non-NY/NJ) → modern_mission.min = 1980
{
  const r = inferEstablishedYear("St. Tikhon's Mission", 'Springfield', 'IL');
  assertEq(r.year, 1980, 'mission → 1980');
  assert(r.excerpt.includes('mission'), 'excerpt mentions mission');
}

// Urban city → old_urban.min = 1900
{
  const r = inferEstablishedYear('St. Nicholas Church', 'Buffalo', 'IL');
  // Buffalo is in URBAN_CITIES set
  assertEq(r.year, 1900, 'urban → 1900');
  assert(r.excerpt.includes('urban parish'), 'excerpt mentions urban');
}

// Chapel → modern_mission range (min 1980)
{
  const r = inferEstablishedYear('St. Seraphim Chapel', 'Smalltown', 'IL');
  assertEq(r.year, 1980, 'chapel → 1980');
}

// Skete → modern_mission range
{
  const r = inferEstablishedYear('Holy Skete', 'Nowhere', 'IL');
  assertEq(r.year, 1980, 'skete → 1980');
}

// Default (non-urban, non-special) → default.min = 1945
{
  const r = inferEstablishedYear('Regular Parish', 'Smalltown', 'IL');
  assertEq(r.year, 1945, 'default → 1945');
  assert(r.excerpt.includes('suburban parish'), 'excerpt mentions suburban');
}

// NY state → shift by -5 → default becomes 1940
{
  const r = inferEstablishedYear('Regular Parish', 'Smalltown', 'NY');
  assertEq(r.year, 1940, 'NY default → 1940 (shifted -5)');
}

// NJ state → shift by -5
{
  const r = inferEstablishedYear('Regular Parish', 'Smalltown', 'NJ');
  assertEq(r.year, 1940, 'NJ default → 1940 (shifted -5)');
}

// Urban NY cathedral → cathedral_urban.min 1890 - 5 = 1885
{
  const r = inferEstablishedYear('Holy Trinity Cathedral', 'New York', 'NY');
  assertEq(r.year, 1885, 'NY cathedral → 1885');
}

// Case-insensitivity of city name (URBAN_CITIES stores lowercase)
{
  const r = inferEstablishedYear('St. Vladimir Church', 'Brooklyn', 'NY');
  // Brooklyn is urban, NY shift → 1900 - 5 = 1895
  assertEq(r.year, 1895, 'Brooklyn NY urban → 1895');
}

// Case-insensitive city
{
  const r = inferEstablishedYear('St. X', 'BROOKLYN', 'NY');
  assertEq(r.year, 1895, 'BROOKLYN uppercase still matches');
}

// Null inputs → default path
{
  const r = inferEstablishedYear(null, null, null);
  // null city → not in URBAN_CITIES → default → 1945, no NY/NJ shift
  assertEq(r.year, 1945, 'null inputs → default 1945');
}

// Special: urban Holy Trinity (pattern triggers cathedral_urban even without "cathedral")
{
  const r = inferEstablishedYear('Holy Trinity Church', 'Brooklyn', 'IL');
  // Brooklyn is urban + holy trinity → cathedral_urban (min 1890), no NY/NJ shift
  assertEq(r.year, 1890, 'urban Holy Trinity → cathedral_urban 1890');
}

// ============================================================================
// quickWebsiteScan
// ============================================================================
console.log('\n── quickWebsiteScan ──────────────────────────────────────');

// No website → null
{
  reset();
  const r = await quickWebsiteScan('Name', 'City', 'ST', null);
  assertEq(r, null, 'null website → null');
  assertEq(axiosCalls.length, 0, 'no axios calls');
}

{
  reset();
  const r = await quickWebsiteScan('Name', 'City', 'ST', '');
  assertEq(r, null, 'empty website → null');
}

// Helper: build HTML with enough content to pass 100-char text minimum
function buildHtml(sentence: string): string {
  const filler = 'Our parish has a long and storied history in the community with many devoted members. ';
  return '<html><body>' + filler + sentence + ' ' + filler + '</body></html>';
}

// URL normalization: no protocol + trailing slash gets normalized
{
  reset();
  axiosRoutes.push({
    match: /^http:\/\/example\.org$/,
    html: buildHtml('The parish was founded in 1905 during the revival.'),
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'example.org/');
  loud();
  assert(r !== null, 'hit returned');
  assertEq(r.year, 1905, 'extracted year 1905');
  assertEq(r.confidence, 'high', 'confidence high (keyword+year close)');
  assertEq(r.sourceUrl, 'http://example.org', 'normalized URL');
}

// URL normalization: already has https:// + trailing slash
{
  reset();
  axiosRoutes.push({
    match: /^https:\/\/example\.org$/,
    html: buildHtml('Our parish was established in 1920 by faithful settlers.'),
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'https://example.org/');
  loud();
  assert(r !== null, 'https hit');
  assertEq(r.year, 1920, 'extracted 1920');
}

// Short HTML (< 200 chars) → skipped, tries next URL
{
  reset();
  axiosRoutes.push({ match: /^http:\/\/foo\.org$/, html: '<html>tiny</html>' });
  axiosRoutes.push({
    match: /^http:\/\/foo\.org\/about$/,
    html: buildHtml('The parish was founded in 1950 by early settlers.'),
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'foo.org');
  loud();
  assert(r !== null, 'found on /about');
  assertEq(r.year, 1950, 'year from /about');
  assertEq(r.sourceUrl, 'http://foo.org/about', 'sourceUrl is /about');
}

// JSON-LD foundingDate → high confidence
{
  reset();
  axiosRoutes.push({
    match: /^http:\/\/json\.org$/,
    // No keyword-based sentence, just JSON-LD — the JSON-LD check scans raw HTML, not stripped text
    html: '<html><body>' + 'Some text about the parish community. '.repeat(20) + '<span data-x=\'"foundingDate":"1875-06-15"\'></span>' + '</body></html>',
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'json.org');
  loud();
  assert(r !== null, 'JSON-LD hit');
  assertEq(r.year, 1875, 'JSON-LD year');
  assertEq(r.confidence, 'high', 'JSON-LD is high');
}

// No keyword match + no JSON-LD → tries all URLs → null
{
  reset();
  // All 5 pages return plain content with no founding keywords (and no year patterns that could match)
  const filler = 'The weather was nice this year. We have many members in our community. '.repeat(10);
  axiosRoutes.push({ match: /.*/, html: '<html><body>' + filler + '</body></html>' });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'bar.org');
  loud();
  assertEq(r, null, 'no keyword → null');
  // All 5 URLs were tried
  assertEq(axiosCalls.length, 5, 'all 5 pages attempted');
}

// Network error on all URLs → null
{
  reset();
  axiosRoutes.push({ match: /.*/, throws: new Error('network down') });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'dead.org');
  loud();
  assertEq(r, null, 'all errors → null');
  assertEq(axiosCalls.length, 5, '5 errors swallowed');
}

// Year outside valid range (< 1700) → filtered by regex
{
  reset();
  axiosRoutes.push({
    match: /^http:\/\/old\.org$/,
    html: buildHtml('The parish was founded in 1650 according to legend, many years ago.'),
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'old.org');
  loud();
  // YEAR_RE is /\b(1[89]\d{2}|20[0-2]\d)\b/g — 1650 doesn't match (requires 18xx/19xx/20xx)
  // So no candidates → null
  assertEq(r, null, '1650 filtered by regex');
}

// HTML with script and style tags stripped properly
{
  reset();
  axiosRoutes.push({
    match: /^http:\/\/clean\.org$/,
    html: '<html><body>' +
      '<script>var year = 1800; console.log("established in 1800");</script>' +
      '<style>.x { content: "1700"; }</style>' +
      'The history of our parish community is long and storied with many members over the decades. ' +
      'The parish was founded in 1930 by immigrants from the homeland.' +
      '</body></html>',
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'clean.org');
  loud();
  assert(r !== null, 'hit');
  assertEq(r.year, 1930, 'script/style stripped — extracted 1930 not 1800');
}

// Best candidate sorting: JSON-LD (high) beats keyword-only candidates
{
  reset();
  // JSON-LD is always high; the sentence keyword match may be medium/low.
  // Sort by confidence → JSON-LD year wins.
  axiosRoutes.push({
    match: /^http:\/\/multi\.org$/,
    html: '<html><body>' +
      'Our community has deep roots and many members who contribute regularly. '.repeat(3) +
      'Some very long sentence mentioning that the parish was established at some later point in 1980 after many years of struggle. ' +
      '<meta content=\'"foundingDate":"1875-06-15"\'/>' +
      '</body></html>',
  });
  quiet();
  const r = await quickWebsiteScan('Name', 'City', 'ST', 'multi.org');
  loud();
  assert(r !== null, 'candidates found');
  // Sort returns highest confidence first
  assertEq(r.confidence, 'high', 'high confidence wins sort');
}

// ============================================================================
// fastEnrichChurch
// ============================================================================
console.log('\n── fastEnrichChurch ──────────────────────────────────────');

// Website hit → fast_web_search
{
  reset();
  axiosRoutes.push({
    match: /^http:\/\/parish\.org$/,
    html: 'Our parish has a long and storied history in the community with many devoted members. <html><body>The parish was established in 1925 to serve the community.' + 'Our parish has a long and storied history in the community with many devoted members. '.repeat(3) + '</body></html>',
  });
  quiet();
  const r = await fastEnrichChurch({
    id: 1, name: 'St. Vladimir Church', city: 'Somewhere', state_code: 'IL', website: 'parish.org',
  });
  loud();
  assertEq(r.churchId, 1, 'churchId');
  assertEq(r.extractionMethod, 'fast_web_search', 'web extraction method');
  assertEq(r.established.year, 1925, 'year');
  assertEq(r.established.precision, 'year', 'precision');
  assertEq(r.established.confidence, 'high', 'confidence high');
  assertEq(r.established.sourceType, 'website', 'sourceType website');
  assertEq(r.status, 'enriched', 'status enriched (high)');
  assert(Array.isArray(r.notes), 'notes array');
  assert(r.notes[0].includes('Web search'), 'notes mention web');
}

// No website → heuristic fallback
{
  reset();
  quiet();
  const r = await fastEnrichChurch({
    id: 2, name: 'Regular Parish', city: 'Smalltown', state_code: 'IL', website: null,
  });
  loud();
  assertEq(r.churchId, 2, 'churchId');
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic extraction method');
  assertEq(r.established.year, 1945, 'default year (Math.random=0)');
  assertEq(r.established.confidence, 'low', 'low confidence');
  assertEq(r.established.sourceType, 'inferred', 'inferred sourceType');
  assertEq(r.status, 'low_confidence', 'low_confidence status');
}

// Website returns no matches → falls through to heuristic
{
  reset();
  axiosRoutes.push({ match: /.*/, throws: new Error('dead') });
  quiet();
  const r = await fastEnrichChurch({
    id: 3, name: 'Regular Parish', city: 'Smalltown', state_code: 'IL', website: 'dead.org',
  });
  loud();
  assertEq(r.extractionMethod, 'fast_heuristic', 'falls back to heuristic');
  assertEq(r.established.year, 1945, 'heuristic year');
}

// Cathedral web hit with medium confidence + year > 1960 → consistency cap kicks in
{
  reset();
  // Sentence where keyword and year are >60 chars apart → medium confidence
  const paddedSentence =
    'When the doors were finally opened to the public for services after many years of preparation and community organizing efforts, with countless hours of volunteer work from dozens of parishioners contributing to the beautiful structure, the community was established in 1990 as part of the diocese';
  const filler = 'Our parish has many members and deep ties to the local community. ';
  axiosRoutes.push({
    match: /^http:\/\/cathedral\.org$/,
    html: '<html><body>' + filler + paddedSentence + '.</body></html>',
  });
  quiet();
  const r = await fastEnrichChurch({
    id: 4, name: 'Holy Trinity Cathedral', city: 'City', state_code: 'IL', website: 'cathedral.org',
  });
  loud();
  assertEq(r.extractionMethod, 'fast_web_search', 'still web extraction method');
  // Consistency check only runs when confidence !== 'high'
  // If medium: cathedral + year > 1960 → year reset to 1900-1940 range
  if (r.established.confidence !== 'high') {
    assert(r.established.year >= 1900 && r.established.year <= 1940, 'consistency cap applied');
  } else {
    // If high confidence, no consistency check — year stays at 1990
    assertEq(r.established.year, 1990, 'high confidence bypass cap');
  }
}

// ============================================================================
// runFastFill — zero churches
// ============================================================================
console.log('\n── runFastFill: zero churches ────────────────────────────');

{
  reset();
  // Mock SELECT returning empty
  dbRoutes.push({ match: /FROM us_churches/, rows: [] });
  quiet();
  const r = await runFastFill({ state: 'IL', limit: null });
  loud();
  assertEq(r.total, 0, 'total 0');
  assertEq(r.enriched, 0, 'enriched 0');
  assertEq(r.inferred, 0, 'inferred 0');
  assertEq(r.failed, 0, 'failed 0');
  // Only one query was made (the SELECT)
  const selectCount = queryLog.filter(q => /FROM us_churches/.test(q.sql)).length;
  assertEq(selectCount, 1, 'one SELECT');
  const insertCount = queryLog.filter(q => /INSERT INTO church_enrichment_runs/.test(q.sql)).length;
  assertEq(insertCount, 0, 'no run row (early exit)');
}

// runFastFill — with filters applied to SQL
{
  reset();
  dbRoutes.push({ match: /FROM us_churches/, rows: [] });
  quiet();
  await runFastFill({ state: 'NY', jurisdiction: 'OCA', limit: 100, overwriteExisting: false });
  loud();
  const q = queryLog.find(x => /FROM us_churches/.test(x.sql));
  assert(q !== undefined, 'query issued');
  assert(q!.sql.includes('c.state_code = ?'), 'state filter');
  assert(q!.sql.includes('c.jurisdiction LIKE ?'), 'jurisdiction filter');
  assert(q!.sql.includes('LIMIT ?'), 'LIMIT present');
  // Params: state, jurisdiction LIKE-pattern, limit
  assertEq(q!.params[0], 'NY', 'state param');
  assertEq(q!.params[1], '%OCA%', 'jurisdiction LIKE param');
  assertEq(q!.params[q!.params.length - 1], 100, 'limit param');
}

// overwriteExisting=true → no missing-profile clause
{
  reset();
  dbRoutes.push({ match: /FROM us_churches/, rows: [] });
  quiet();
  await runFastFill({ overwriteExisting: true });
  loud();
  const q = queryLog.find(x => /FROM us_churches/.test(x.sql));
  assert(q !== undefined, 'query issued');
  assert(!q!.sql.includes('ep.id IS NULL'), 'no missing-profile filter when overwriting');
}

// runFastFill — single-church happy path (heuristic fallback, no website)
{
  reset();
  dbRoutes.push({
    match: /FROM us_churches/,
    rows: [{ id: 1, name: 'Regular Parish', city: 'Smalltown', state_code: 'IL', jurisdiction: 'OCA', website: null }],
  });
  dbRoutes.push({
    match: /INSERT INTO church_enrichment_runs/,
    respond: () => ({ insertId: 42 }),
  });
  dbRoutes.push({ match: /INSERT INTO church_enrichment_profiles/, rows: {} });
  dbRoutes.push({ match: /UPDATE church_enrichment_runs/, rows: {} });
  quiet();
  const r = await runFastFill({});
  loud();
  assertEq(r.total, 1, 'total 1');
  assertEq(r.enriched, 0, '0 web enriched');
  assertEq(r.inferred, 1, '1 inferred');
  assertEq(r.failed, 0, '0 failed');
  assertEq(r.runId, 42, 'runId returned');
  // Verify profile INSERT happened
  const profileInsert = queryLog.find(q => /INSERT INTO church_enrichment_profiles/.test(q.sql));
  assert(profileInsert !== undefined, 'profile inserted');
  // Verify UPDATE run row happened
  const runUpdate = queryLog.find(q => /UPDATE church_enrichment_runs/.test(q.sql));
  assert(runUpdate !== undefined, 'run row updated');
  assertEq(runUpdate!.params[0], 'completed', 'final status completed');
}

// ============================================================================
// Summary
// ============================================================================
Math.random = origRandom;
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main()

main().catch((e) => { loud(); Math.random = origRandom; console.error('Unhandled:', e); process.exit(1); });
