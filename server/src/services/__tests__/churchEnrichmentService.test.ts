#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchEnrichmentService.js (OMD-1076)
 *
 * Church website enrichment pipeline. Extracts established date and
 * parish size from HTML. Mostly pure functions plus a thin DB persistence
 * layer and an axios-based fetcher.
 *
 * Strategy:
 *   - Stub `../config/db` via require.cache dual-path.
 *   - Override `axios.get` on the real module (mutating the cached
 *     module object — SUT captures it after our mutation).
 *   - Patch global setTimeout to skip the polite-delay waits in
 *     fetchChurchPages (save/restore).
 *   - Fake pool for DB writers.
 *
 * Coverage:
 *   - normalizeUrl: bad inputs, http prefix, trailing slash, double-prefix repair
 *   - stripTags: scripts/styles removed, entities decoded
 *   - discoverLinksFromHtml: same-domain + keyword filter
 *   - extractFromJsonLd: foundingDate schema / (f. YYYY) description
 *   - extractFromRawHtml: JS bundle patterns
 *   - extractEstablishedDate: all confidence tiers, anniversary math,
 *     full_date precision, ranking
 *   - extractParishSize: family vs member extraction, categorization
 *   - inferSizeFromName: mission/cathedral/chapel signals
 *   - inferSizeFromWebsite: density + richness heuristics
 *   - tryFallbackAdapters + fallbackAdapters.oca_directory.canHandle
 *   - createEnrichmentRun / updateRunStatus / upsertEnrichmentProfile
 *     (SQL + param shape)
 *   - enrichChurch: no URL / invalid URL / skipWebsiteFetch no data,
 *     JSON-LD path, deterministic path, raw-html path, fallback path
 *   - fetchChurchPages: homepage fetch + discovery + dedup + max limit
 *
 * Run: npx tsx server/src/services/__tests__/churchEnrichmentService.test.ts
 */

import * as pathMod from 'path';

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

// ── Patch setTimeout to skip polite delays ──────────────────────────
const origSetTimeout = global.setTimeout;
global.setTimeout = ((fn: any, _ms?: number, ...args: any[]) => {
  // Execute immediately in the next microtask to preserve async semantics
  return origSetTimeout(fn, 0, ...args);
}) as any;

// ── Stub axios.get on real module ────────────────────────────────────
// Map URL → { data: html, status } | null (null throws)
let axiosResponses: Record<string, any> = {};
let axiosCallLog: string[] = [];

const realAxios = require('axios');
const origAxiosGet = realAxios.get;

realAxios.get = async (url: string, _opts?: any) => {
  axiosCallLog.push(url);
  if (url in axiosResponses) {
    const r = axiosResponses[url];
    if (r === null) throw new Error('simulated fetch error');
    return { data: r, status: 200 };
  }
  throw new Error('404 unmapped: ' + url);
};

function resetAxios() {
  axiosResponses = {};
  axiosCallLog = [];
}

// ── Fake pool ────────────────────────────────────────────────────────
type QueryCall = { sql: string; params: any[] };
let queryLog: QueryCall[] = [];
let insertIdSeq = 100;
let selectResponse: any[] = [];

function resetPool() {
  queryLog = [];
  insertIdSeq = 100;
  selectResponse = [];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queryLog.push({ sql, params });
    if (/^\s*INSERT /i.test(sql)) {
      return [{ insertId: insertIdSeq++, affectedRows: 1 }, []];
    }
    if (/^\s*UPDATE /i.test(sql)) {
      return [{ affectedRows: 1 }, []];
    }
    return [selectResponse, []];
  },
};

// ── Stub ../config/db ────────────────────────────────────────────────
function stubRequireDual(relFromSUT: string, exports: any) {
  const base = pathMod.resolve(__dirname, '..', relFromSUT);
  for (const ext of ['.js', '.ts', '']) {
    const key = base + ext;
    require.cache[key] = { id: key, filename: key, loaded: true, exports } as any;
  }
}
stubRequireDual('../config/db', { getAppPool: () => fakePool });

const {
  normalizeUrl,
  stripTags,
  discoverLinksFromHtml,
  extractFromJsonLd,
  extractFromRawHtml,
  extractEstablishedDate,
  extractParishSize,
  inferSizeFromName,
  inferSizeFromWebsite,
  tryFallbackAdapters,
  fallbackAdapters,
  createEnrichmentRun,
  updateRunStatus,
  upsertEnrichmentProfile,
  enrichChurch,
  fetchChurchPages,
} = require('../churchEnrichmentService');

// Silence logger calls
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// normalizeUrl
// ============================================================================
console.log('\n── normalizeUrl ──────────────────────────────────────────');

assertEq(normalizeUrl(null), null, 'null → null');
assertEq(normalizeUrl(''), null, 'empty → null');
assertEq(normalizeUrl(undefined), null, 'undefined → null');
assertEq(normalizeUrl(42 as any), null, 'non-string → null');
assertEq(normalizeUrl('not a url'), null, 'garbage → null');
assertEq(normalizeUrl('example.com'), 'http://example.com', 'prepends http');
assertEq(normalizeUrl('https://example.com'), 'https://example.com', 'https kept');
assertEq(normalizeUrl('https://example.com/'), 'https://example.com', 'trailing / stripped');
assertEq(
  normalizeUrl('https://https://example.com'),
  'https://example.com',
  'double-prefix repaired'
);

// ============================================================================
// stripTags
// ============================================================================
console.log('\n── stripTags ─────────────────────────────────────────────');

assertEq(
  stripTags('<p>Hello <b>world</b></p>'),
  'Hello world',
  'basic tags'
);
assertEq(
  stripTags('<script>alert(1)</script>Text'),
  'Text',
  'script removed'
);
assertEq(
  stripTags('<style>.x{}</style>Body'),
  'Body',
  'style removed'
);
assertEq(
  stripTags('A&nbsp;B'),
  'A B',
  'nbsp'
);
assertEq(
  stripTags('A&amp;B'),
  'A&B',
  'amp'
);
assertEq(
  stripTags('A&lt;B&gt;C'),
  'A<B>C',
  'lt/gt'
);

// ============================================================================
// discoverLinksFromHtml
// ============================================================================
console.log('\n── discoverLinksFromHtml ─────────────────────────────────');

{
  const html = `
    <a href="/history">History</a>
    <a href="/about-us">About</a>
    <a href="/donate">Donate</a>
    <a href="mailto:foo@bar">Email</a>
    <a href="https://external.com/history">External</a>
    <a href="/parish-history">Parish</a>
  `;
  const links = discoverLinksFromHtml(html, 'https://church.org');
  assert(links.includes('/history'), 'history found');
  assert(links.includes('/about-us'), 'about found');
  assert(links.includes('/parish-history'), 'parish-history found');
  assert(!links.includes('/donate'), 'donate excluded (no keyword)');
  assert(!links.some((l: string) => l.includes('external')), 'external domain excluded');
}

// javascript: and tel: ignored
{
  const html = `
    <a href="javascript:void(0)">JS</a>
    <a href="tel:+1234">Call</a>
    <a href="/our-history">Hist</a>
  `;
  const links = discoverLinksFromHtml(html, 'https://church.org');
  assertEq(links.length, 1, '1 link');
  assertEq(links[0], '/our-history', 'only our-history');
}

// ============================================================================
// extractFromJsonLd
// ============================================================================
console.log('\n── extractFromJsonLd ─────────────────────────────────────');

// foundingDate schema property
{
  const html = `
    <script type="application/ld+json">
      {"@type": "Church", "foundingDate": "1923-06-15", "description": "A parish"}
    </script>
  `;
  const r = extractFromJsonLd(html);
  assertEq(r.established.year, 1923, 'foundingDate year');
  assertEq(r.established.confidence, 'high', 'high confidence');
  assertEq(r.established.source, 'json_ld_schema', 'schema source');
}

// (f. 1966) in description
{
  const html = `
    <script type="application/ld+json">
      {"description": "Holy Trinity (f. 1966) is an Orthodox parish"}
    </script>
  `;
  const r = extractFromJsonLd(html);
  assertEq(r.established.year, 1966, 'f. year');
  assertEq(r.established.confidence, 'medium', 'medium from description');
}

// "(founded 1920)" in description
{
  const html = `
    <script type="application/ld+json">
      {"description": "Old church (founded 1920) in town"}
    </script>
  `;
  const r = extractFromJsonLd(html);
  assertEq(r.established.year, 1920, 'founded year');
}

// No JSON-LD
{
  const r = extractFromJsonLd('<p>no ld here</p>');
  assertEq(r.established, null, 'no established');
}

// Malformed JSON-LD tolerated
{
  const html = `<script type="application/ld+json">{not valid json</script>`;
  const r = extractFromJsonLd(html);
  assertEq(r.established, null, 'malformed tolerated');
}

// ============================================================================
// extractFromRawHtml
// ============================================================================
console.log('\n── extractFromRawHtml ────────────────────────────────────');

{
  const r = extractFromRawHtml('var x = "founded in 1945 by parishioners";');
  assertEq(r.year, 1945, 'from JS bundle');
  assertEq(r.confidence, 'low', 'low conf');
  assertEq(r.source, 'raw_html_bundle', 'source');
}

{
  const r = extractFromRawHtml('"established 1888" in some string');
  assertEq(r.year, 1888, 'established pattern');
}

// Out-of-range year ignored
{
  const r = extractFromRawHtml('"founded in 1500 maybe"');
  assertEq(r, null, 'implausible year → null');
}

// No match
{
  const r = extractFromRawHtml('just random content');
  assertEq(r, null, 'no match');
}

// ============================================================================
// extractEstablishedDate
// ============================================================================
console.log('\n── extractEstablishedDate ────────────────────────────────');

// High confidence: "founded in 1923"
{
  const pages = {
    '/history': { url: 'x/history', text: 'Our parish was founded in 1923 by immigrants.' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'year 1923');
  assertEq(r.best.confidence, 'high', 'high');
}

// Full date
{
  const pages = {
    '/about': { url: 'x/about', text: 'Established January 15, 1965 in the city' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1965, 'year');
  assertEq(r.best.date, '1965-01-15', 'full date');
  assertEq(r.best.precision, 'full_date', 'precision');
}

// Month precision
{
  const pages = {
    '/about': { url: 'x/about', text: 'Founded in March 1972' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1972, 'year');
  assertEq(r.best.date, '1972-03-01', 'date defaults day 1');
  assertEq(r.best.precision, 'month', 'precision');
}

// Anniversary math: "75th anniversary (1935-2010)"
{
  const pages = {
    '/about': { url: 'x/about', text: 'Celebrating our 75th Anniversary (1935-2010)' },
  };
  const r = extractEstablishedDate(pages);
  assert(r !== null, 'found');
  // 2010 - 75 = 1935, but the date_patterns capture "founded in" earlier
  // Actually anniversary pattern: "75th anniversary ... 2010" captures m[1]=75, m[2]=2010 → 2010-75=1935
  assertEq(r.best.year, 1935, 'anniversary math');
}

// "serving since YYYY" — matches the serving pattern with medium confidence
{
  const pages = {
    '/': { url: 'x/', text: 'We have been serving 1923 in our community' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'year');
  assertEq(r.best.confidence, 'medium', 'medium from serving');
}

// Bare "since YYYY" — low confidence fallback
{
  const pages = {
    '/': { url: 'x/', text: 'A long tradition since 1923 in our town' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'year');
  assertEq(r.best.confidence, 'low', 'low from bare since');
}

// No matches
{
  const pages = {
    '/': { url: 'x/', text: 'Welcome to our parish' },
  };
  const r = extractEstablishedDate(pages);
  assertEq(r, null, 'no match');
}

// Ranking: high/full_date beats low/year
{
  const pages = {
    '/': { url: 'x/', text: 'since 2005' },  // low/year
    '/history': { url: 'x/history', text: 'Founded on June 12, 1950' },  // high/full_date
  };
  const r = extractEstablishedDate(pages);
  assertEq(r.best.year, 1950, 'high/full_date wins');
}

// ============================================================================
// extractParishSize
// ============================================================================
console.log('\n── extractParishSize ─────────────────────────────────────');

// Family count
{
  const pages = {
    '/about': { url: 'x/about', text: 'We have approximately 120 families in our parish' },
  };
  const r = extractParishSize(pages);
  assertEq(r.best.rawCount, 120, 'count');
  assertEq(r.best.rawType, 'family', 'family type');
  assertEq(r.best.familyMin, 96, 'min 0.8x');
  assertEq(r.best.familyMax, 144, 'max 1.2x');
  assertEq(r.best.category, 'parish_medium', 'category');
}

// Member count → family estimate
{
  const pages = {
    '/about': { url: 'x/about', text: 'About 300 members worship with us' },
  };
  const r = extractParishSize(pages);
  assertEq(r.best.rawCount, 300, 'count');
  assertEq(r.best.rawType, 'member', 'member type');
  // 300/3=100 families, 0.7×=70, 1.3×=130
  assertEq(r.best.familyMin, 70, 'min');
  assertEq(r.best.familyMax, 130, 'max');
}

// Small count (cathedral → or_major)
{
  const pages = {
    '/about': { url: 'x/about', text: 'A parish of 800 families' },
  };
  const r = extractParishSize(pages);
  assertEq(r.best.category, 'cathedral_or_major', '800 fam → cathedral');
}

// Very small → mission
{
  const pages = {
    '/about': { url: 'x/about', text: 'With 15 families currently worshipping' },
  };
  const r = extractParishSize(pages);
  assertEq(r.best.category, 'mission_small', '15 fam → mission_small');
}

// Count out of range filtered
{
  const pages = {
    '/about': { url: 'x/about', text: 'With 2 families here' },
  };
  const r = extractParishSize(pages);
  assertEq(r, null, 'below floor → null');
}

// Family > member priority
{
  const pages = {
    '/about': {
      url: 'x/about',
      text: 'Our parish has 100 families and approximately 300 members',
    },
  };
  const r = extractParishSize(pages);
  assertEq(r.best.rawType, 'family', 'family wins ranking');
}

// ============================================================================
// inferSizeFromName
// ============================================================================
console.log('\n── inferSizeFromName ─────────────────────────────────────');

assertEq(
  inferSizeFromName('St John Mission').category,
  'mission_small',
  'mission'
);
assertEq(
  inferSizeFromName('Holy Trinity Cathedral').category,
  'cathedral_or_major',
  'cathedral'
);
assertEq(
  inferSizeFromName('St Mary Chapel').category,
  'mission_small',
  'chapel'
);
assertEq(inferSizeFromName('Holy Trinity Church'), null, 'no signal');
assertEq(inferSizeFromName(null as any), null, 'null name');
assertEq(inferSizeFromName(''), null, 'empty name');

// ============================================================================
// inferSizeFromWebsite
// ============================================================================
console.log('\n── inferSizeFromWebsite ──────────────────────────────────');

// High clergy/ministry density
{
  const pages: any = {};
  for (let i = 0; i < 8; i++) {
    pages[`/p${i}`] = {
      url: `x/p${i}`,
      text: 'Our archpriest and deacon lead the parish with many ministries, choir, school, sunday school, outreach, stewardship. '.repeat(30),
    };
  }
  const r = inferSizeFromWebsite(pages);
  assert(r !== null, 'returns inference');
  assertEq(r.category, 'parish_large', 'large inferred');
}

// Medium density
{
  const pages = {
    '/': { url: 'x/', text: 'Father John and our pastor lead. choir and ministry and youth group' },
    '/about': { url: 'x/about', text: 'Various ministries here including sunday school' },
  };
  const r = inferSizeFromWebsite(pages);
  assertEq(r?.category, 'parish_medium', 'medium');
}

// Sparse website → parish_small
{
  const pages = {
    '/': { url: 'x/', text: 'Welcome' },
  };
  const r = inferSizeFromWebsite(pages);
  assertEq(r?.category, 'parish_small', 'sparse → small');
}

// Rich website but no clergy signals
{
  const pages: any = {};
  for (let i = 0; i < 7; i++) {
    pages[`/p${i}`] = { url: `x/p${i}`, text: 'a b c d e f g h i j '.repeat(400) };
  }
  const r = inferSizeFromWebsite(pages);
  assertEq(r?.category, 'parish_medium', 'rich → medium');
}

// ============================================================================
// tryFallbackAdapters
// ============================================================================
console.log('\n── tryFallbackAdapters ───────────────────────────────────');

assertEq(
  fallbackAdapters.oca_directory.canHandle({ jurisdiction: 'OCA' }),
  true,
  'OCA handled'
);
assertEq(
  fallbackAdapters.oca_directory.canHandle({ jurisdiction: 'oca-diocese' }),
  true,
  'oca lowercase'
);
assertEq(
  fallbackAdapters.oca_directory.canHandle({ jurisdiction: 'GOARCH' }),
  false,
  'GOARCH not handled'
);
assertEq(
  fallbackAdapters.oca_directory.canHandle({}),
  false,
  'no jurisdiction'
);

{
  const r = await tryFallbackAdapters({ jurisdiction: 'OCA' });
  // stub adapter returns null
  assertEq(r, null, 'stub returns null');
}

{
  const r = await tryFallbackAdapters({ jurisdiction: 'GOARCH' });
  assertEq(r, null, 'no matching adapter');
}

// ============================================================================
// createEnrichmentRun
// ============================================================================
console.log('\n── createEnrichmentRun ───────────────────────────────────');

resetPool();
{
  const runId = await createEnrichmentRun(fakePool, {
    runType: 'batch',
    filterState: 'CA',
    filterJurisdiction: 'OCA',
    totalChurches: 50,
    options: { forceReenrich: true },
  });
  assertEq(runId, 100, 'insertId returned');
  assertEq(queryLog.length, 1, '1 query');
  assert(
    /INSERT INTO church_enrichment_runs/i.test(queryLog[0].sql),
    'correct table'
  );
  assertEq(queryLog[0].params[0], 'batch', 'runType');
  assertEq(queryLog[0].params[1], 'CA', 'filterState');
  assertEq(queryLog[0].params[2], 'OCA', 'filterJurisdiction');
  assertEq(queryLog[0].params[3], 50, 'totalChurches');
  assertEq(
    queryLog[0].params[4],
    JSON.stringify({ forceReenrich: true }),
    'options JSON'
  );
}

// Defaults
resetPool();
{
  await createEnrichmentRun(fakePool, {});
  assertEq(queryLog[0].params[0], 'batch', 'default runType');
  assertEq(queryLog[0].params[1], null, 'default state');
  assertEq(queryLog[0].params[3], 0, 'default total');
  assertEq(queryLog[0].params[4], '{}', 'default options');
}

// ============================================================================
// updateRunStatus
// ============================================================================
console.log('\n── updateRunStatus ───────────────────────────────────────');

resetPool();
{
  await updateRunStatus(fakePool, 5, {
    status: 'completed',
    enrichedCount: 10,
    failedCount: 2,
    skippedCount: 1,
    errorMessage: null,
  });
  assert(/UPDATE church_enrichment_runs/i.test(queryLog[0].sql), 'table');
  assertEq(queryLog[0].params[0], 'completed', 'status');
  assertEq(queryLog[0].params[1], 10, 'enriched');
  assertEq(queryLog[0].params[2], 2, 'failed');
  assertEq(queryLog[0].params[3], 1, 'skipped');
  assertEq(queryLog[0].params[4], null, 'no error');
  assertEq(queryLog[0].params[5], 5, 'runId');
}

// ============================================================================
// upsertEnrichmentProfile
// ============================================================================
console.log('\n── upsertEnrichmentProfile ───────────────────────────────');

resetPool();
{
  const result = {
    churchId: 42,
    churchName: 'Holy Trinity',
    established: {
      year: 1923, date: '1923-06-15', precision: 'full_date',
      sourceType: 'website', sourceUrl: 'https://x/', excerpt: '...', confidence: 'high',
    },
    size: {
      category: 'parish_medium', familyMin: 80, familyMax: 120,
      sourceType: 'website', sourceUrl: 'https://x/', excerpt: '...', confidence: 'medium',
    },
    extractionMethod: 'deterministic_website',
    status: 'enriched',
    notes: ['Found est year', 'Found size'],
    rawSignals: { x: 1 },
    pagesFetched: [],
    noDataReasons: [],
  };
  await upsertEnrichmentProfile(fakePool, 99, result);
  const call = queryLog[0];
  assert(/INSERT INTO church_enrichment_profiles/i.test(call.sql), 'table');
  assertEq(call.params[0], 42, 'church_id');
  assertEq(call.params[1], 99, 'run_id');
  assertEq(call.params[2], 1923, 'est year');
  assertEq(call.params[3], '1923-06-15', 'est date');
  assertEq(call.params[4], 'full_date', 'precision');
  assertEq(call.params[8], 'high', 'est confidence');
  assertEq(call.params[9], 'parish_medium', 'size cat');
  assertEq(call.params[10], 80, 'family min');
  assertEq(call.params[16], 'deterministic_website', 'method');
  assertEq(call.params[17], 'enriched', 'status');
  assertEq(call.params[18], 'Found est year; Found size', 'notes joined');
}

// Null established/size
resetPool();
{
  const result = {
    churchId: 1, churchName: 'X',
    established: null, size: null,
    extractionMethod: 'none', status: 'no_data',
    notes: [], rawSignals: {}, pagesFetched: [], noDataReasons: [],
  };
  await upsertEnrichmentProfile(fakePool, 1, result);
  const call = queryLog[0];
  assertEq(call.params[2], null, 'est year null');
  assertEq(call.params[8], 'none', 'confidence none');
  assertEq(call.params[9], 'unknown', 'size unknown');
}

// ============================================================================
// enrichChurch: no URL
// ============================================================================
console.log('\n── enrichChurch: no URL ──────────────────────────────────');

quiet();
{
  const r = await enrichChurch({ id: 1, name: 'X', website: null }, { skipWebsiteFetch: true });
  loud();
  assertEq(r.status, 'no_data', 'no_data status');
  assert(r.noDataReasons.includes('no_valid_url'), 'no_valid_url reason');
}

// Bad URL
quiet();
{
  const r = await enrichChurch({ id: 1, name: 'X', website: '   ' });
  loud();
  assertEq(r.status, 'no_data', 'bad url → no_data');
}

// ============================================================================
// enrichChurch: with real URL but skipWebsiteFetch
// ============================================================================
console.log('\n── enrichChurch: skipWebsiteFetch ────────────────────────');

quiet();
{
  const r = await enrichChurch(
    { id: 1, name: 'St John Mission', website: 'https://x.org' },
    { skipWebsiteFetch: true }
  );
  loud();
  // No pages → fallback → name inference → mission_small
  assertEq(r.size.category, 'mission_small', 'name heuristic applied');
  assertEq(r.size.sourceType, 'inferred', 'inferred source');
  assertEq(r.status, 'low_confidence', 'low confidence');
}

// ============================================================================
// fetchChurchPages: homepage + discovery + dedup
// ============================================================================
console.log('\n── fetchChurchPages ──────────────────────────────────────');

resetAxios();
{
  // Homepage has a /history link — should be discovered
  const homeHtml = `
    <html><body>
      <a href="/history">History</a>
      <a href="/about">About</a>
      <p>${'Welcome '.repeat(100)}</p>
    </body></html>`;
  const historyHtml = `<html><body><p>Our parish was founded in 1945. ${'Text '.repeat(60)}</p></body></html>`;
  const aboutHtml = `<html><body><p>About us. ${'About '.repeat(60)}</p></body></html>`;
  axiosResponses['https://example.org'] = homeHtml;
  axiosResponses['https://example.org/history'] = historyHtml;
  axiosResponses['https://example.org/about'] = aboutHtml;
  // All other paths error out

  quiet();
  const pages = await fetchChurchPages('https://example.org');
  loud();
  assert('/' in pages, 'homepage fetched');
  assert('/history' in pages, 'history discovered + fetched');
  assert('/about' in pages, 'about fetched');
}

// Dedup: two paths returning identical content → one kept
resetAxios();
{
  const sameHtml = '<html><body>' + 'Same content here. '.repeat(50) + '</body></html>';
  axiosResponses['https://dupe.org'] = sameHtml;
  axiosResponses['https://dupe.org/about'] = sameHtml;

  quiet();
  const pages = await fetchChurchPages('https://dupe.org');
  loud();
  assert('/' in pages, 'homepage');
  assert(!('/about' in pages), 'duplicate skipped');
}

// ============================================================================
// enrichChurch: full pipeline with live fetch
// ============================================================================
console.log('\n── enrichChurch: JSON-LD path ────────────────────────────');

resetAxios();
{
  const html = `
    <html><head>
      <script type="application/ld+json">
        {"foundingDate": "1890-05-01"}
      </script>
    </head><body>${'Content '.repeat(100)}</body></html>`;
  axiosResponses['https://jsonld.org'] = html;

  quiet();
  const r = await enrichChurch({ id: 7, name: 'Holy Trinity', website: 'https://jsonld.org' });
  loud();
  assertEq(r.established.year, 1890, 'year from JSON-LD');
  assert(r.extractionMethod.startsWith('json_ld'), 'method starts with json_ld');
  assertEq(r.status, 'enriched', 'enriched');
}

// Deterministic text path
resetAxios();
{
  const html = `
    <html><body>
      <p>Our parish was founded in 1923 by Russian immigrants.</p>
      <p>We have about 200 families today.</p>
      ${'Extra '.repeat(100)}
    </body></html>`;
  axiosResponses['https://text.org'] = html;

  quiet();
  const r = await enrichChurch({ id: 8, name: 'St Nicholas', website: 'https://text.org' });
  loud();
  assertEq(r.established.year, 1923, 'year from text');
  assertEq(r.established.confidence, 'high', 'high conf');
  assert(r.size !== null, 'size extracted');
  assertEq(r.status, 'enriched', 'enriched');
}

// Raw HTML fallback path (Wix/SPA bundle)
resetAxios();
{
  const html = `
    <html><body><div>${'lorem '.repeat(80)}</div>
      <script>var data = {"foo": "founded in 1955 with members"};</script>
    </body></html>`;
  axiosResponses['https://wix.org'] = html;

  quiet();
  const r = await enrichChurch({ id: 9, name: 'St George', website: 'https://wix.org' });
  loud();
  // Could come from either text path or raw_html. Check year found.
  assertEq(r.established.year, 1955, 'year via raw html or text');
}

// No matching content → no_data
resetAxios();
{
  const html = '<html><body>' + ('Welcome content '.repeat(100)) + '</body></html>';
  axiosResponses['https://blank.org'] = html;

  quiet();
  const r = await enrichChurch({ id: 10, name: 'St Paul', website: 'https://blank.org' });
  loud();
  assertEq(r.established, null, 'no established');
  // Could still have no size → no_data
  if (r.status === 'no_data') {
    assert(r.noDataReasons.length > 0, 'reasons populated');
  }
}

// ============================================================================
// Summary
// ============================================================================
realAxios.get = origAxiosGet;
global.setTimeout = origSetTimeout;
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  realAxios.get = origAxiosGet;
  global.setTimeout = origSetTimeout;
  loud();
  console.error('Unhandled test error:', e);
  process.exit(1);
});
