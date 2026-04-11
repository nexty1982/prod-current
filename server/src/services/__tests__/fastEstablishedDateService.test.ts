#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fastEstablishedDateService.js (OMD-1022)
 *
 * Three exported functions tested (runFastFill deliberately skipped — 500ms
 * setTimeout delays per iteration and heavy batch orchestration).
 *
 *   - quickWebsiteScan: axios-stubbed HTML fetch + year extraction
 *       · null website → null
 *       · JSON-LD foundingDate → high-confidence hit
 *       · keyword + year proximity → high/medium/low
 *       · no founding keyword → no match
 *       · HTML < 200 chars / text < 100 chars → skipped
 *       · fallback through /about, /history pages
 *       · all pages throw → null
 *   - inferEstablishedYear: deterministic ranges with Math.random stubbed
 *       · cathedral → cathedral_urban range
 *       · mission → modern_mission
 *       · urban city → old_urban
 *       · chapel / skete → modern_mission
 *       · suburban default
 *       · NY/NJ state shift (-5 years)
 *       · low confidence + inferred sourceType
 *   - fastEnrichChurch: orchestration
 *       · web hit high → status=enriched, extractionMethod=fast_web_search
 *       · web hit medium → status=low_confidence
 *       · no web hit → heuristic fallback, status=low_confidence
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

// ── Stub: axios ───────────────────────────────────────────────────────
type AxiosRoute = { urlMatch: RegExp; data?: string; throws?: Error };
let axiosRoutes: AxiosRoute[] = [];
const axiosCalls: Array<{ url: string }> = [];

const axiosStub = {
  get: async (url: string, _opts?: any) => {
    axiosCalls.push({ url });
    for (const r of axiosRoutes) {
      if (r.urlMatch.test(url)) {
        if (r.throws) throw r.throws;
        return { data: r.data };
      }
    }
    throw new Error('No route matched: ' + url);
  },
};

const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: axiosStub,
} as any;

// Stub config/db — runFastFill uses it but we don't test runFastFill
const dbStub = { getAppPool: () => ({ query: async () => [[]] }) };
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: dbStub,
} as any;

function resetState() {
  axiosRoutes = [];
  axiosCalls.length = 0;
}

const {
  quickWebsiteScan,
  inferEstablishedYear,
  fastEnrichChurch,
} = require('../fastEstablishedDateService');

// Deterministic Math.random stub
const origRandom = Math.random;
function fixRandom(val: number) {
  Math.random = () => val;
}
function restoreRandom() {
  Math.random = origRandom;
}

async function main() {

// ============================================================================
// quickWebsiteScan — null website
// ============================================================================
console.log('\n── quickWebsiteScan: null website ───────────────────────');

resetState();
{
  const r = await quickWebsiteScan('Test', 'NYC', 'NY', null);
  assertEq(r, null, 'null website → null');
  assertEq(axiosCalls.length, 0, 'no axios calls');
}

// ============================================================================
// quickWebsiteScan — JSON-LD foundingDate
// ============================================================================
console.log('\n── quickWebsiteScan: JSON-LD ────────────────────────────');

resetState();
axiosRoutes = [
  {
    urlMatch: /example\.com\/?$/,
    data: '<html><head><script type="application/ld+json">{"@type":"Church","foundingDate":"1925-03-14"}</script></head><body>' +
          'A'.repeat(300) + '</body></html>',
  },
];
{
  const r = await quickWebsiteScan('T', 'Boston', 'MA', 'http://example.com');
  assert(r !== null, 'result returned');
  assertEq(r.year, 1925, 'JSON-LD year extracted');
  assertEq(r.confidence, 'high', 'JSON-LD → high confidence');
  assert(r.excerpt.includes('foundingDate'), 'excerpt references JSON-LD');
}

// ============================================================================
// quickWebsiteScan — founding keyword near year (high confidence)
// ============================================================================
console.log('\n── quickWebsiteScan: keyword proximity ──────────────────');

resetState();
// Sentence with "founded" and year close together
axiosRoutes = [
  {
    urlMatch: /.*/,
    data: '<html><body>' +
          'Our parish was founded in 1908 by a small group of devoted faithful who traveled from Russia. '.repeat(4) +
          '</body></html>',
  },
];
{
  const r = await quickWebsiteScan('T', 'NYC', 'NY', 'example.com');
  assert(r !== null, 'result returned');
  assertEq(r.year, 1908, 'year extracted from sentence');
  // "founded" and "1908" are ~5 chars apart → high confidence
  assertEq(r.confidence, 'high', 'close proximity → high');
}

// ============================================================================
// quickWebsiteScan — no founding keyword → null
// ============================================================================
console.log('\n── quickWebsiteScan: no keyword ─────────────────────────');

resetState();
axiosRoutes = [
  {
    urlMatch: /.*/,
    data: '<html><body>' +
          'Welcome to our church. The weather has been lovely in 1998. '.repeat(8) +
          '</body></html>',
  },
];
{
  const r = await quickWebsiteScan('T', 'City', 'NY', 'example.com');
  assertEq(r, null, 'no founding keyword → null');
}

// ============================================================================
// quickWebsiteScan — too short HTML skipped
// ============================================================================
console.log('\n── quickWebsiteScan: too short ──────────────────────────');

resetState();
axiosRoutes = [
  { urlMatch: /.*/, data: 'short' },   // <200 chars
];
{
  const r = await quickWebsiteScan('T', 'C', 'NY', 'example.com');
  assertEq(r, null, 'too-short HTML → null');
}

// ============================================================================
// quickWebsiteScan — all pages throw
// ============================================================================
console.log('\n── quickWebsiteScan: all errors ─────────────────────────');

resetState();
axiosRoutes = [
  { urlMatch: /.*/, throws: new Error('boom') },
];
{
  const r = await quickWebsiteScan('T', 'C', 'NY', 'example.com');
  assertEq(r, null, 'all errors → null');
  // Should try all 5 fallback URLs
  assert(axiosCalls.length >= 5, `tried multiple URLs (${axiosCalls.length})`);
}

// ============================================================================
// quickWebsiteScan — URL normalization
// ============================================================================
console.log('\n── quickWebsiteScan: URL normalization ──────────────────');

resetState();
axiosRoutes = [
  { urlMatch: /^http:\/\/example\.com$/, data: 'x'.repeat(300) + ' no keyword ' },
  { urlMatch: /.*/, data: 'x'.repeat(300) },
];
{
  await quickWebsiteScan('T', 'C', 'NY', 'example.com');
  // First call should be http://example.com (normalized)
  assertEq(axiosCalls[0].url, 'http://example.com', 'URL normalized with http://');
}

// Trailing slash stripped
resetState();
axiosRoutes = [{ urlMatch: /.*/, data: 'x'.repeat(300) }];
{
  await quickWebsiteScan('T', 'C', 'NY', 'https://foo.org/');
  assertEq(axiosCalls[0].url, 'https://foo.org', 'trailing slash stripped');
}

// ============================================================================
// quickWebsiteScan — fallback through /about, /history
// ============================================================================
console.log('\n── quickWebsiteScan: page fallback ──────────────────────');

resetState();
// Homepage has no keyword; /about has a hit
axiosRoutes = [
  { urlMatch: /\/about$/, data: '<html><body>' + 'This parish was established in 1915 by immigrants. '.repeat(4) + '</body></html>' },
  { urlMatch: /.*/, data: 'x'.repeat(300) },  // homepage + other pages: no keyword
];
{
  const r = await quickWebsiteScan('T', 'C', 'NY', 'example.com');
  assert(r !== null, 'found on fallback page');
  assertEq(r.year, 1915, 'year from /about');
  assert(r.sourceUrl.includes('/about'), 'sourceUrl = /about');
}

// ============================================================================
// inferEstablishedYear — cathedral
// ============================================================================
console.log('\n── inferEstablishedYear: cathedral ──────────────────────');

fixRandom(0);  // minimum of range
{
  // cathedral_urban: 1890-1935 → NY shift → 1885-1930
  const r = inferEstablishedYear('Holy Trinity Cathedral', 'New York', 'NY');
  assertEq(r.year, 1885, 'cathedral NY: 1890-5=1885 (min)');
  assertEq(r.confidence, 'low', 'low confidence');
  assertEq(r.sourceType, 'inferred', 'inferred source');
  assert(r.excerpt.includes('cathedral'), 'excerpt mentions type');
}
fixRandom(0.999999);  // maximum
{
  const r = inferEstablishedYear('Cathedral of All Saints', 'Albany', 'NY');
  assertEq(r.year, 1930, 'cathedral NY: 1935-5=1930 (max)');
}

// ============================================================================
// inferEstablishedYear — mission
// ============================================================================
console.log('\n── inferEstablishedYear: mission ────────────────────────');

fixRandom(0);
{
  // modern_mission 1980-2015 → non-NY/NJ no shift
  const r = inferEstablishedYear('St Xenia Mission', 'Austin', 'TX');
  assertEq(r.year, 1980, 'mission TX min = 1980');
}

// ============================================================================
// inferEstablishedYear — urban
// ============================================================================
console.log('\n── inferEstablishedYear: urban ──────────────────────────');

fixRandom(0);
{
  // old_urban 1900-1940 → NJ shift → 1895-1935
  const r = inferEstablishedYear('St Nicholas Church', 'Jersey City', 'NJ');
  assertEq(r.year, 1895, 'urban NJ min');
  assert(r.excerpt.includes('urban'), 'excerpt mentions urban');
}

// ============================================================================
// inferEstablishedYear — chapel
// ============================================================================
console.log('\n── inferEstablishedYear: chapel ─────────────────────────');

fixRandom(0);
{
  // chapel → modern_mission
  const r = inferEstablishedYear('St Innocent Chapel', 'Rural Town', 'PA');
  assertEq(r.year, 1980, 'chapel → modern_mission min');
}

// Skete also routes to modern_mission
fixRandom(0);
{
  const r = inferEstablishedYear('St Herman Skete', 'Rural', 'AK');
  assertEq(r.year, 1980, 'skete → modern_mission');
}

// ============================================================================
// inferEstablishedYear — suburban default
// ============================================================================
console.log('\n── inferEstablishedYear: suburban default ───────────────');

fixRandom(0);
{
  // default 1945-1985 → CA no shift
  const r = inferEstablishedYear('St John Church', 'Fresno', 'CA');
  assertEq(r.year, 1945, 'suburban default min');
  assert(r.excerpt.includes('suburban'), 'excerpt mentions suburban');
}

// NY suburban shifts -5
fixRandom(0);
{
  const r = inferEstablishedYear('St John', 'Rural Village', 'NY');
  assertEq(r.year, 1940, 'suburban NY shifted -5');
}

restoreRandom();

// ============================================================================
// fastEnrichChurch — web hit high confidence
// ============================================================================
console.log('\n── fastEnrichChurch: web high ───────────────────────────');

resetState();
axiosRoutes = [
  {
    urlMatch: /.*/,
    data: '<html><body>' +
          'St Nicholas was founded in 1908 in Brooklyn. '.repeat(4) +
          '</body></html>',
  },
];
{
  const r = await fastEnrichChurch({
    id: 1, name: 'St Nicholas', city: 'Brooklyn', state_code: 'NY',
    website: 'http://stnicholas.org',
  });
  assertEq(r.churchId, 1, 'churchId');
  assertEq(r.established.year, 1908, 'year from web');
  assertEq(r.established.confidence, 'high', 'high confidence');
  assertEq(r.established.sourceType, 'website', 'website source');
  assertEq(r.extractionMethod, 'fast_web_search', 'fast_web_search method');
  assertEq(r.status, 'enriched', 'enriched status');
  assert(r.notes[0].includes('1908'), 'notes mention year');
}

// ============================================================================
// fastEnrichChurch — web hit medium confidence → low_confidence status
// ============================================================================
console.log('\n── fastEnrichChurch: web medium ─────────────────────────');

resetState();
// Single long sentence: "founded" at position ~13, "1920" far at the end
// → distance > 60 → medium/low confidence
axiosRoutes = [
  {
    urlMatch: /.*/,
    data: '<html><body>' +
          'Our parish was founded by a small group of devoted immigrants from Russia who arrived with nothing and worked tirelessly over many decades to establish the community we see today at the beginning of 1920 ' +
          '</body></html>' + ' padding '.repeat(10),
  },
];
{
  const r = await fastEnrichChurch({
    id: 2, name: 'St Mary', city: 'Atlanta', state_code: 'GA',
    website: 'example.org',
  });
  // Should find 1920 with medium or low confidence, status = low_confidence
  assert(['medium', 'low'].includes(r.established.confidence), 'non-high confidence');
  assertEq(r.status, 'low_confidence', 'low_confidence status');
  assertEq(r.extractionMethod, 'fast_web_search', 'still fast_web_search');
}

// ============================================================================
// fastEnrichChurch — no web hit → heuristic fallback
// ============================================================================
console.log('\n── fastEnrichChurch: heuristic fallback ─────────────────');

resetState();
fixRandom(0.5);
axiosRoutes = [
  { urlMatch: /.*/, throws: new Error('unreachable') },
];
{
  const r = await fastEnrichChurch({
    id: 3, name: 'St Demetrios Cathedral', city: 'New York', state_code: 'NY',
  });
  assertEq(r.extractionMethod, 'fast_heuristic', 'fast_heuristic');
  assertEq(r.status, 'low_confidence', 'low confidence status');
  assertEq(r.established.confidence, 'low', 'low confidence');
  assertEq(r.established.sourceType, 'inferred', 'inferred sourceType');
  // cathedral_urban NY range: 1885-1930 → mid = ~1907
  assert(r.established.year >= 1885 && r.established.year <= 1930, 'year in cathedral NY range');
  assert(r.notes.some((n: string) => n.includes('Heuristic')), 'notes mention heuristic');
}
restoreRandom();

// No website at all → skip tier 1 entirely
resetState();
fixRandom(0);
{
  const r = await fastEnrichChurch({
    id: 4, name: 'St Paul', city: 'Rural', state_code: 'CA',
  });
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic when no website');
  assertEq(axiosCalls.length, 0, 'no web calls attempted');
}
restoreRandom();

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);

} // end main

main().catch((e) => { restoreRandom(); console.error('Unhandled:', e); process.exit(1); });
