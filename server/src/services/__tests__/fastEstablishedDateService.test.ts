#!/usr/bin/env npx tsx
/**
 * Unit tests for services/fastEstablishedDateService.js (OMD-1027)
 *
 * Website scrape + heuristic for church founding year.
 *
 * Coverage:
 *   - quickWebsiteScan:
 *       · null website → null (no axios calls)
 *       · JSON-LD foundingDate → high confidence
 *       · founding keyword proximity → high confidence
 *       · sentence with year but no keyword → skipped
 *       · HTML too short → skipped
 *       · all URLs fail → null (after trying 5 fallback URLs)
 *       · URL normalization: adds http://, strips trailing /
 *       · /about fallback used when homepage returns nothing
 *   - inferEstablishedYear:
 *       · cathedral_urban range, NY shifted -5
 *       · mission range
 *       · urban range
 *       · chapel/skete → modern_mission
 *       · suburban default
 *   - fastEnrichChurch:
 *       · web high confidence → status=enriched, method=fast_web_search
 *       · web medium → status=low_confidence, method=fast_web_search
 *       · all axios fails → heuristic fallback, method=fast_heuristic
 *       · no website → zero axios calls, heuristic path
 *
 * runFastFill is intentionally skipped — it has 500ms setTimeout delays
 * between iterations that would slow tests significantly.
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

// ── axios stub ──────────────────────────────────────────────────────────

type AxiosResponse = { data: any; status?: number };
type AxiosCall = { url: string };
const axiosCalls: AxiosCall[] = [];

type AxiosRoute = { match: RegExp; resp?: AxiosResponse; throws?: Error };
let axiosRoutes: AxiosRoute[] = [];
let axiosDefaultThrows = true;  // Default: throw to avoid hitting the real network

const axiosStub = {
  get: async (url: string, _opts: any = {}) => {
    axiosCalls.push({ url });
    for (const r of axiosRoutes) {
      if (r.match.test(url)) {
        if (r.throws) throw r.throws;
        return r.resp || { data: '', status: 200 };
      }
    }
    if (axiosDefaultThrows) throw new Error('no route match');
    return { data: '', status: 200 };
  },
};

const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath, filename: axiosPath, loaded: true, exports: axiosStub,
} as any;

// ── db stub (only used by runFastFill which we skip) ────────────────────
const dbStub = {
  getAppPool: () => ({
    query: async () => [[]],
  }),
};
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: dbStub,
} as any;

// ── Math.random stub for deterministic heuristic tests ──────────────────

const origRandom = Math.random;
function fixRandom(val: number) { Math.random = () => val; }
function restoreRandom() { Math.random = origRandom; }

function resetState() {
  axiosCalls.length = 0;
  axiosRoutes = [];
  axiosDefaultThrows = true;
}

const {
  quickWebsiteScan,
  inferEstablishedYear,
  fastEnrichChurch,
} = require('../fastEstablishedDateService');

async function main() {

// ============================================================================
// quickWebsiteScan — null website
// ============================================================================
console.log('\n── quickWebsiteScan: null website ────────────────────────');

resetState();
{
  const r = await quickWebsiteScan('Name', 'City', 'NY', null);
  assertEq(r, null, 'null website → null');
  assertEq(axiosCalls.length, 0, 'no axios calls');
}

resetState();
{
  const r = await quickWebsiteScan('Name', 'City', 'NY', '');
  assertEq(r, null, 'empty website → null');
}

// ============================================================================
// quickWebsiteScan — JSON-LD foundingDate
// ============================================================================
console.log('\n── quickWebsiteScan: JSON-LD ─────────────────────────────');

resetState();
axiosRoutes = [
  { match: /example\.com/, resp: { data: '<html><body>' + 'x'.repeat(500) + '<script type="application/ld+json">{"@type":"Church","foundingDate":"1905-06-15"}</script></body></html>' } },
];
{
  const r = await quickWebsiteScan('Holy X', 'NY', 'NY', 'http://example.com');
  assert(r !== null, 'got result');
  assertEq(r.year, 1905, 'parsed year from JSON-LD');
  assertEq(r.confidence, 'high', 'JSON-LD is high confidence');
  assert(r.excerpt.includes('JSON-LD'), 'excerpt mentions JSON-LD');
}

// ============================================================================
// quickWebsiteScan — founding keyword proximity high
// ============================================================================
console.log('\n── quickWebsiteScan: keyword proximity ───────────────────');

resetState();
{
  const html = '<html><body>' +
    'Lorem ipsum welcome to our church '.repeat(10) +
    'Our parish was founded in 1920 by immigrants. ' +
    'More lorem ipsum content here '.repeat(10) +
    '</body></html>';
  axiosRoutes = [{ match: /example\.com/, resp: { data: html } }];
  const r = await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com');
  assert(r !== null, 'got result');
  assertEq(r.year, 1920, 'found 1920');
  assertEq(r.confidence, 'high', 'high conf when close');
}

// ============================================================================
// quickWebsiteScan — year without keyword is skipped
// ============================================================================
console.log('\n── quickWebsiteScan: year without keyword ────────────────');

resetState();
{
  const html = '<html><body>' +
    'The building was renovated in 1950 and again in 1975. ' +
    'No sacred words here '.repeat(20) +
    '</body></html>';
  axiosRoutes = [
    { match: /example\.com(?!\/)/, resp: { data: html } },
    { match: /example\.com\/about/, throws: new Error('404') },
    { match: /example\.com\/history/, throws: new Error('404') },
    { match: /example\.com\/about-us/, throws: new Error('404') },
    { match: /example\.com\/our-parish/, throws: new Error('404') },
  ];
  const r = await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com');
  assertEq(r, null, 'no founding keyword → null');
}

// ============================================================================
// quickWebsiteScan — HTML too short
// ============================================================================
console.log('\n── quickWebsiteScan: HTML too short ──────────────────────');

resetState();
axiosRoutes = [
  { match: /example\.com/, resp: { data: 'tiny' } },
];
{
  const r = await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com');
  assertEq(r, null, 'too short → null');
}

// ============================================================================
// quickWebsiteScan — all URLs fail → null (tries 5 fallbacks)
// ============================================================================
console.log('\n── quickWebsiteScan: all fail ────────────────────────────');

resetState();
axiosDefaultThrows = true;  // all calls throw
{
  const r = await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com');
  assertEq(r, null, 'all fail → null');
  // 5 URLs tried: homepage, /about, /history, /about-us, /our-parish
  assertEq(axiosCalls.length, 5, '5 fallback URLs tried');
}

// ============================================================================
// quickWebsiteScan — URL normalization
// ============================================================================
console.log('\n── quickWebsiteScan: URL normalization ───────────────────');

// Adds http:// prefix
resetState();
axiosDefaultThrows = true;
{
  await quickWebsiteScan('X', 'NY', 'NY', 'example.com');
  assert(axiosCalls[0].url.startsWith('http://example.com'), 'adds http:// prefix');
}

// Strips trailing slash
resetState();
axiosDefaultThrows = true;
{
  await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com/');
  assertEq(axiosCalls[0].url, 'http://example.com', 'trailing slash stripped');
}

resetState();
axiosDefaultThrows = true;
{
  await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com///');
  assertEq(axiosCalls[0].url, 'http://example.com', 'multiple trailing slashes stripped');
}

// https:// preserved
resetState();
axiosDefaultThrows = true;
{
  await quickWebsiteScan('X', 'NY', 'NY', 'https://example.com');
  assertEq(axiosCalls[0].url, 'https://example.com', 'https preserved');
}

// ============================================================================
// quickWebsiteScan — /about fallback
// ============================================================================
console.log('\n── quickWebsiteScan: /about fallback ─────────────────────');

resetState();
axiosRoutes = [
  { match: /example\.com$/, throws: new Error('500') },
  { match: /example\.com\/about$/, resp: {
    data: '<html><body>' + 'padding '.repeat(30) + 'This parish was established in 1895 . ' + 'more '.repeat(30) + '</body></html>',
  }},
];
{
  const r = await quickWebsiteScan('X', 'NY', 'NY', 'http://example.com');
  assert(r !== null, 'got result from /about');
  assertEq(r.year, 1895, 'year from /about');
  assert(r.sourceUrl.includes('/about'), 'sourceUrl from /about');
}

// ============================================================================
// inferEstablishedYear
// ============================================================================
console.log('\n── inferEstablishedYear ──────────────────────────────────');

// Cathedral urban: range {1890, 1935}, NY shifted -5 → {1885, 1930}
fixRandom(0);
{
  const r = inferEstablishedYear('Holy Virgin Cathedral', 'New York', 'NY');
  assertEq(r.year, 1885, 'cathedral_urban NY min');
  assertEq(r.confidence, 'low', 'heuristic is low');
  assertEq(r.sourceType, 'inferred', 'inferred type');
}
fixRandom(0.9999);
{
  const r = inferEstablishedYear('Holy Virgin Cathedral', 'New York', 'NY');
  assertEq(r.year, 1930, 'cathedral_urban NY max');
}

// Mission — no shift (TX), range {1980, 2015}
fixRandom(0);
{
  const r = inferEstablishedYear('St. Peter Mission', 'Austin', 'TX');
  assertEq(r.year, 1980, 'mission TX min');
}
fixRandom(0.9999);
{
  const r = inferEstablishedYear('St. Peter Mission', 'Austin', 'TX');
  assertEq(r.year, 2015, 'mission TX max');
}

// Urban (non-cathedral): old_urban {1900, 1940}, NJ shifted → {1895, 1935}
fixRandom(0);
{
  const r = inferEstablishedYear('St. Nicholas Church', 'Jersey City', 'NJ');
  assertEq(r.year, 1895, 'urban NJ min');
}

// Chapel → modern_mission
fixRandom(0);
{
  const r = inferEstablishedYear('St. Seraphim Chapel', 'Boise', 'ID');
  assertEq(r.year, 1980, 'chapel → modern_mission');
}

// Skete → modern_mission
fixRandom(0);
{
  const r = inferEstablishedYear('Holy Skete', 'Missoula', 'MT');
  assertEq(r.year, 1980, 'skete → modern_mission');
}

// Default suburban {1945, 1985}
fixRandom(0);
{
  const r = inferEstablishedYear('St. George Church', 'Fresno', 'CA');
  assertEq(r.year, 1945, 'suburban CA default min');
}

// Default NY shifted: {1940, 1980}
fixRandom(0);
{
  const r = inferEstablishedYear('St. Paul Church', 'Rochester Ridge', 'NY');
  assertEq(r.year, 1940, 'suburban NY shifted min');
}

restoreRandom();

// ============================================================================
// fastEnrichChurch — web high confidence
// ============================================================================
console.log('\n── fastEnrichChurch: web high ────────────────────────────');

resetState();
axiosRoutes = [
  { match: /parish\.com/, resp: {
    data: '<html><body>' + 'padding padding padding padding padding '.repeat(10) +
      '<script type="application/ld+json">{"foundingDate":"1910"}</script>' +
      '</body></html>',
  }},
];
{
  const r = await fastEnrichChurch({
    id: 1, name: 'St. Nick', city: 'NY', state_code: 'NY', website: 'http://parish.com',
  });
  assertEq(r.status, 'enriched', 'enriched status');
  assertEq(r.extractionMethod, 'fast_web_search', 'fast_web_search method');
  assertEq(r.established.year, 1910, 'year 1910');
  assertEq(r.established.confidence, 'high', 'high confidence');
  assertEq(r.established.sourceType, 'website', 'website type');
  assertEq(r.churchId, 1, 'churchId');
}

// ============================================================================
// fastEnrichChurch — web medium confidence
// ============================================================================
console.log('\n── fastEnrichChurch: web medium ──────────────────────────');

resetState();
axiosRoutes = [
  { match: /parish\.com/, resp: {
    // Single long sentence: "founded" at position ~13, "1920" at position ~170+ (>120 chars, medium)
    data: '<html><body>' +
      'Our parish was founded by a small group of devoted immigrants from Russia who arrived with nothing and worked tirelessly over many decades to establish the community we see today at the beginning of 1920 ' +
      '</body></html>',
  }},
];
{
  const r = await fastEnrichChurch({
    id: 2, name: 'St. Nick', city: 'NY', state_code: 'NY', website: 'http://parish.com',
  });
  assertEq(r.extractionMethod, 'fast_web_search', 'still fast_web_search');
  assertEq(r.status, 'low_confidence', 'low_confidence status');
  assertEq(r.established.confidence, 'medium', 'medium confidence');
}

// ============================================================================
// fastEnrichChurch — all axios fail → heuristic fallback
// ============================================================================
console.log('\n── fastEnrichChurch: heuristic fallback ──────────────────');

resetState();
axiosDefaultThrows = true;  // all calls fail
fixRandom(0);
{
  const r = await fastEnrichChurch({
    id: 3, name: 'St. Peter Mission', city: 'Austin', state_code: 'TX', website: 'http://parish.com',
  });
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic method');
  assertEq(r.status, 'low_confidence', 'low_confidence');
  assertEq(r.established.confidence, 'low', 'low confidence');
  assertEq(r.established.sourceType, 'inferred', 'inferred type');
  assertEq(r.established.year, 1980, 'mission TX min year');
}
restoreRandom();

// ============================================================================
// fastEnrichChurch — no website → zero axios calls
// ============================================================================
console.log('\n── fastEnrichChurch: no website ──────────────────────────');

resetState();
fixRandom(0);
{
  const r = await fastEnrichChurch({
    id: 4, name: 'St. George Church', city: 'Fresno', state_code: 'CA', website: null,
  });
  assertEq(axiosCalls.length, 0, 'no axios calls');
  assertEq(r.extractionMethod, 'fast_heuristic', 'heuristic fallback');
  assertEq(r.established.year, 1945, 'suburban CA default');
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
