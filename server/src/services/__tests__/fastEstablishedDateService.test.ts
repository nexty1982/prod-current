#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fastEstablishedDateService.js (OMD-1200)
 *
 * Three exported functions covered:
 *   - inferEstablishedYear(name, city, state) — pure heuristic;
 *     year is random within a range → assert range bounds, not exact value
 *   - quickWebsiteScan(name, city, state, website) — fetches via axios;
 *     stub axios.get with canned HTML bodies
 *   - fastEnrichChurch(church) — orchestrates tier 1 (quickWebsiteScan) and
 *     tier 2 (inferEstablishedYear); test both paths via axios stub
 *
 * runFastFill is out of scope — it's tightly coupled to pool + taskRunner
 * + child tables; covered by higher-level integration testing.
 *
 * Stub strategy:
 *   - axios (npm module) is patched in-place on the cached module object
 *     BEFORE the SUT is required, so `const axios = require('axios')` in the
 *     SUT captures the patched object.
 *   - ../config/db → require.cache stub (getAppPool unused by the three
 *     covered functions but needed to avoid load-time errors)
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

function assertRange(
  actual: number, min: number, max: number, message: string
): void {
  if (actual >= min && actual <= max) {
    console.log(`  PASS: ${message} (${actual} in [${min}, ${max}])`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: in [${min}, ${max}]\n         actual:   ${actual}`);
    failed++;
  }
}

// ── Stub axios (npm module, cached on first require) ───────────────
// Preload axios so the module object exists in the cache, then mutate .get.
// SUT will capture this same cached object via its own require('axios').
const axios = require('axios');

let axiosGetImpl: (url: string, opts?: any) => Promise<any> =
  async () => ({ data: '' });
const axiosCalls: Array<{ url: string; opts?: any }> = [];

axios.get = async (url: string, opts?: any) => {
  axiosCalls.push({ url, opts });
  return axiosGetImpl(url, opts);
};

// ── Stub db-compat (getAppPool) via require.cache ──────────────────
const fakePool = { query: async () => [[]] };
const dbStub = { getAppPool: () => fakePool };

const nodePath = require('path');
const sutPath = require.resolve('../fastEstablishedDateService');
const sutDir = nodePath.dirname(sutPath);
const dbPath = require.resolve(nodePath.join(sutDir, '..', 'config', 'db'));
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

const {
  fastEnrichChurch,
  quickWebsiteScan,
  inferEstablishedYear,
} = require('../fastEstablishedDateService');

// Silence noisy logs
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;
function quiet() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}
function loud() {
  console.log = origLog;
  console.warn = origWarn;
  console.error = origError;
}

function resetAxios() {
  axiosCalls.length = 0;
  axiosGetImpl = async () => ({ data: '' });
}

async function main() {

// ============================================================================
// inferEstablishedYear — heuristic ranges
// ============================================================================
console.log('\n── inferEstablishedYear: cathedral (NY shift) ───────────');

{
  // cathedral_urban = {1890, 1935}; NY/NJ shift -5 both bounds
  // → [1885, 1930]
  const r = inferEstablishedYear('Holy Trinity Cathedral', 'New York', 'NY');
  assertRange(r.year, 1885, 1930, 'cathedral NY year range');
  assertEq(r.confidence, 'low', 'confidence low for heuristic');
  assertEq(r.sourceType, 'inferred', 'sourceType inferred');
  assert(/cathedral\/urban/.test(r.excerpt), 'excerpt notes cathedral/urban');
}

console.log('\n── inferEstablishedYear: cathedral (non-NY/NJ) ──────────');

{
  // cathedral_urban = {1890, 1935}; no state shift
  const r = inferEstablishedYear('St Nicholas Cathedral', 'Chicago', 'IL');
  assertRange(r.year, 1890, 1935, 'cathedral IL year range');
}

console.log('\n── inferEstablishedYear: mission → modern ───────────────');

{
  // modern_mission = {1980, 2015}; no NY/NJ shift
  const r = inferEstablishedYear('St Paul Mission', 'Austin', 'TX');
  assertRange(r.year, 1980, 2015, 'mission TX year range');
  assert(/mission/.test(r.excerpt), 'excerpt notes mission');
}

console.log('\n── inferEstablishedYear: urban (non-cathedral) ──────────');

{
  // old_urban = {1900, 1940}; NY shift → [1895, 1935]
  const r = inferEstablishedYear('St George Church', 'Brooklyn', 'NY');
  assertRange(r.year, 1895, 1935, 'urban NY year range');
  assert(/urban parish/.test(r.excerpt), 'excerpt notes urban parish');
}

console.log('\n── inferEstablishedYear: chapel → modern ────────────────');

{
  // chapel/skete → modern_mission = {1980, 2015}
  const r = inferEstablishedYear('Sacred Heart Chapel', 'Podunk', 'WY');
  assertRange(r.year, 1980, 2015, 'chapel year range');
}

{
  const r = inferEstablishedYear('St Herman Skete', 'Somewhere', 'AK');
  assertRange(r.year, 1980, 2015, 'skete year range');
}

console.log('\n── inferEstablishedYear: default (suburban) ─────────────');

{
  // default = {1945, 1985}; no shift
  const r = inferEstablishedYear('Holy Apostles', 'Nowhere', 'TX');
  assertRange(r.year, 1945, 1985, 'default year range');
  assert(/suburban parish/.test(r.excerpt), 'excerpt notes suburban');
}

console.log('\n── inferEstablishedYear: NJ shift ───────────────────────');

{
  // default in NJ → [1940, 1980]
  const r = inferEstablishedYear('St Mary Church', 'Nowhere', 'NJ');
  assertRange(r.year, 1940, 1980, 'default NJ shifted range');
}

console.log('\n── inferEstablishedYear: urban Holy Trinity → cathedral ─');

{
  // Special rule: urban + "Holy Trinity|Resurrection" → cathedral_urban
  // Brooklyn is in URBAN_CITIES → treats as cathedral NY shifted: [1885, 1930]
  const r = inferEstablishedYear('Holy Trinity Parish', 'Brooklyn', 'NY');
  assertRange(r.year, 1885, 1930, 'holy-trinity+urban → cathedral range');
}

console.log('\n── inferEstablishedYear: null/empty inputs ──────────────');

{
  const r = inferEstablishedYear(null, null, null);
  // null name → no cathedral/mission/chapel/skete branch; null city → not urban
  // → default range [1945, 1985]
  assertRange(r.year, 1945, 1985, 'null inputs → default');
  assert(!!r.excerpt, 'excerpt populated');
}

// ============================================================================
// quickWebsiteScan
// ============================================================================
console.log('\n── quickWebsiteScan: no website → null ──────────────────');

resetAxios();
{
  const r = await quickWebsiteScan('St X', 'NYC', 'NY', null);
  assertEq(r, null, 'null website → null');
  assertEq(axiosCalls.length, 0, 'no axios call');
}

console.log('\n── quickWebsiteScan: founding keyword + year ────────────');

resetAxios();
{
  const html = `
    <html>
      <head><title>St Nicholas</title></head>
      <body>
        <h1>About Our Parish</h1>
        <p>Our parish was established in 1923 by a group of immigrants.</p>
        <p>Various other content here.</p>
      </body>
    </html>
  `;
  axiosGetImpl = async () => ({ data: html });

  const r = await quickWebsiteScan('St Nicholas', 'NYC', 'NY', 'http://stnick.org');
  assert(r !== null, 'returns result');
  assertEq(r!.year, 1923, 'year 1923');
  // Keyword 'established' within <60 chars of 1923 → high confidence
  assertEq(r!.confidence, 'high', 'high confidence (close keyword)');
  assert(/established in 1923/.test(r!.excerpt), 'excerpt contains sentence');
  assert(axiosCalls.length >= 1, 'at least one axios call');
}

console.log('\n── quickWebsiteScan: URL normalization ──────────────────');

resetAxios();
{
  axiosGetImpl = async () => ({ data: '<p>founded in 1950</p>' });
  await quickWebsiteScan('X', 'Y', 'Z', 'example.org');
  // First call should prefix http://
  assert(
    axiosCalls[0].url.startsWith('http://example.org'),
    'adds http:// prefix'
  );
}

resetAxios();
{
  axiosGetImpl = async () => ({ data: '<p>founded in 1950</p>' });
  await quickWebsiteScan('X', 'Y', 'Z', 'https://example.org/');
  // Trailing slash stripped
  assertEq(axiosCalls[0].url, 'https://example.org', 'strips trailing slash');
}

console.log('\n── quickWebsiteScan: tries multiple paths ───────────────');

resetAxios();
{
  let callCount = 0;
  axiosGetImpl = async () => {
    callCount++;
    // All responses have no match → should try all pages
    return { data: '<p>no year here just text at length longer than 100 chars so it does not get filtered oh yes very long indeed</p>' };
  };
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'http://example.org');
  assertEq(r, null, 'no match → null');
  // Should try homepage + /about + /history + /about-us + /our-parish = 5
  assert(callCount === 5, `tries all 5 pages (actual: ${callCount})`);
}

console.log('\n── quickWebsiteScan: JSON-LD foundingDate ───────────────');

resetAxios();
{
  const html = `
    <html><body>
      <script type="application/ld+json">
        {"@type":"Church","foundingDate":"1887-05-10"}
      </script>
      <p>This is some content that mentions nothing.</p>
      <p>More content to pad the length beyond the 200 char filter threshold threshold threshold threshold threshold threshold.</p>
    </body></html>
  `;
  axiosGetImpl = async () => ({ data: html });
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'http://ex.org');
  assert(r !== null, 'returns result');
  assertEq(r!.year, 1887, 'JSON-LD year extracted');
  assertEq(r!.confidence, 'high', 'JSON-LD → high confidence');
  assert(/JSON-LD/.test(r!.excerpt), 'excerpt notes JSON-LD');
}

console.log('\n── quickWebsiteScan: axios error → continues ────────────');

resetAxios();
{
  let idx = 0;
  axiosGetImpl = async () => {
    idx++;
    if (idx < 3) throw new Error('network fail');
    // Third page returns match
    return { data: '<p>Our parish was founded in 1972 and has served the community.</p>'.repeat(5) };
  };
  quiet();
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'http://ex.org');
  loud();
  assert(r !== null, 'eventual success despite prior errors');
  assertEq(r!.year, 1972, 'year from successful page');
}

console.log('\n── quickWebsiteScan: non-string / too-short → skip ──────');

resetAxios();
{
  let idx = 0;
  axiosGetImpl = async () => {
    idx++;
    if (idx === 1) return { data: null };           // non-string
    if (idx === 2) return { data: '<p>short</p>' }; // < 200 chars
    if (idx === 3) return { data: 42 };             // non-string
    return { data: '<p>something boring with no year at all but long enough to pass the stripping length check padding padding padding</p>' };
  };
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'http://ex.org');
  assertEq(r, null, 'all pages unusable → null');
}

console.log('\n── quickWebsiteScan: keyword too far → low confidence ───');

resetAxios();
{
  // Year far from keyword → low confidence
  const padding = 'word '.repeat(40); // ~200 chars of filler
  const html = `<p>Our parish was established ${padding} and in the year 1955 we had many members.</p>`;
  axiosGetImpl = async () => ({ data: html.repeat(3) });
  const r = await quickWebsiteScan('X', 'Y', 'Z', 'http://ex.org');
  assert(r !== null, 'returns a result');
  // 'established' is >120 chars away from 1955 → 'low'
  assertEq(r!.confidence, 'low', 'low confidence when keyword far away');
}

// ============================================================================
// fastEnrichChurch
// ============================================================================
console.log('\n── fastEnrichChurch: tier 1 web hit ─────────────────────');

resetAxios();
{
  const html = `<p>The parish was established in 1910 by the founders.</p>`.repeat(5);
  axiosGetImpl = async () => ({ data: html });
  quiet();
  const r = await fastEnrichChurch({
    id: 1, name: 'St X', city: 'NYC', state_code: 'NY', website: 'http://x.org',
  });
  loud();
  assertEq(r.churchId, 1, 'churchId echoed');
  assertEq(r.extractionMethod, 'fast_web_search', 'web search method');
  assertEq(r.status, 'enriched', 'enriched status on high confidence');
  assertEq(r.established.year, 1910, 'year from web');
  assertEq(r.established.confidence, 'high', 'high confidence');
  assertEq(r.established.sourceType, 'website', 'sourceType website');
  assert(r.notes.length >= 1, 'notes populated');
  assert(/Web search/.test(r.notes[0]), 'notes mention web search');
}

console.log('\n── fastEnrichChurch: tier 1 medium (non-high) ───────────');

resetAxios();
{
  // Keyword 60-120 chars away → medium confidence; applies consistency
  const filler = 'word '.repeat(20); // ~100 chars
  const html = `<p>Our parish was established ${filler} and in 1933 was recognized.</p>`.repeat(3);
  axiosGetImpl = async () => ({ data: html });
  quiet();
  const r = await fastEnrichChurch({
    id: 2, name: 'St Y', city: 'LA', state_code: 'CA', website: 'http://y.org',
  });
  loud();
  assertEq(r.extractionMethod, 'fast_web_search', 'web search method');
  assertEq(r.status, 'low_confidence', 'low_confidence when not high');
  assertEq(r.established.confidence, 'medium', 'confidence coerced to medium');
}

console.log('\n── fastEnrichChurch: tier 2 heuristic fallback ──────────');

resetAxios();
{
  // Force all axios requests to return usable but non-matching HTML
  axiosGetImpl = async () => ({
    data: '<p>generic content '.repeat(30) + '</p>',
  });
  quiet();
  const r = await fastEnrichChurch({
    id: 3, name: 'Holy Trinity Cathedral', city: 'Brooklyn', state_code: 'NY',
    website: 'http://cathedral.org',
  });
  loud();
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic method');
  assertEq(r.status, 'low_confidence', 'low_confidence');
  assertEq(r.established.confidence, 'low', 'low confidence');
  assertEq(r.established.sourceType, 'inferred', 'sourceType inferred');
  // Cathedral NY → [1885, 1930] pre-consistency; consistency caps >1960
  // to 1900-1940 — range [1885, 1940] overall for cathedral NY
  assertRange(r.established.year, 1885, 1940, 'cathedral year in expected range');
  assert(r.notes.length >= 2, 'notes include web-miss + heuristic');
  assert(/no results/.test(r.notes[0]), 'first note: no results');
  assert(/Heuristic/.test(r.notes[1]), 'second note: heuristic');
}

console.log('\n── fastEnrichChurch: no website → heuristic ─────────────');

resetAxios();
{
  quiet();
  const r = await fastEnrichChurch({
    id: 4, name: 'St Matthew Mission', city: 'Elsewhere', state_code: 'CO',
    website: null,
  });
  loud();
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic when no website');
  assertEq(axiosCalls.length, 0, 'no axios call when no website');
  // Mission → modern_mission range [1980, 2015]
  assertRange(r.established.year, 1980, 2015, 'mission range');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

} // end main()

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
