#!/usr/bin/env npx tsx
/**
 * Unit tests for services/churchEnrichmentService.js (OMD-1141)
 *
 * Text-processing heavy — most helpers are pure. Network is stubbed by
 * replacing axios via require.cache before the SUT is required.
 * Database helpers accept a pool argument so a plain fake pool works
 * without touching getAppPool().
 *
 * Coverage:
 *   - normalizeUrl                — scheme injection, double-scheme fix,
 *                                   trailing-slash strip, invalid → null
 *   - stripTags                   — scripts/styles/entities/whitespace
 *   - discoverLinksFromHtml       — same-domain filter, keyword filter,
 *                                   mailto/tel/javascript skip
 *   - extractFromJsonLd           — (f. 1966), (founded 1966), foundingDate,
 *                                   malformed JSON swallowed
 *   - extractFromRawHtml          — "Founded in YYYY" patterns, excerpt shape
 *   - extractEstablishedDate      — full date, month-only, year-only,
 *                                   anniversary math, ranking by confidence,
 *                                   path boost, filters out implausible years
 *   - extractParishSize           — family vs member (3:1 estimation),
 *                                   family/member ranking, bounds filter
 *   - inferSizeFromName           — mission/cathedral/chapel signals
 *   - inferSizeFromWebsite        — clergy+ministry density, page richness
 *   - tryFallbackAdapters         — OCA match, non-OCA skip, swallowed errors
 *   - enrichChurch                — no URL, empty pages, populated-pages flow
 *                                   using skipWebsiteFetch to bypass fetch
 *   - createEnrichmentRun/updateRunStatus/upsertEnrichmentProfile
 *                                 — SQL text + params
 *   - fetchChurchPages            — axios stubbed; homepage + dedupe
 *
 * Run: npx tsx server/src/services/__tests__/churchEnrichmentService.test.ts
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
// Map URL → HTML; missing URL → throws (simulates network failure)
const urlResponses: Map<string, string | Error> = new Map();
function setUrlResponse(url: string, body: string | Error) {
  urlResponses.set(url, body);
}
function clearUrlResponses() { urlResponses.clear(); }

const axiosStub = {
  get: async (url: string, _opts: any) => {
    const resp = urlResponses.get(url);
    if (resp === undefined) throw new Error(`stubbed axios: no response for ${url}`);
    if (resp instanceof Error) throw resp;
    return { data: resp };
  },
};

const axiosPath = require.resolve('axios');
require.cache[axiosPath] = {
  id: axiosPath, filename: axiosPath, loaded: true,
  exports: axiosStub,
} as any;

// ── db stub (getAppPool not called by the exported functions we test) ─
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[]] }) },
} as any;

// Silence logs
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

const svc = require('../churchEnrichmentService');

async function main() {

// ============================================================================
// normalizeUrl
// ============================================================================
console.log('\n── normalizeUrl ──────────────────────────────────────────');

assertEq(svc.normalizeUrl('example.com'), 'http://example.com', 'no scheme → http');
assertEq(svc.normalizeUrl('http://example.com'), 'http://example.com', 'http preserved');
assertEq(svc.normalizeUrl('https://example.com'), 'https://example.com', 'https preserved');
assertEq(svc.normalizeUrl('example.com/'), 'http://example.com', 'trailing slash stripped');
assertEq(svc.normalizeUrl('example.com///'), 'http://example.com', 'multiple trailing slashes');
assertEq(
  svc.normalizeUrl('https://https://example.com'),
  'https://example.com',
  'double-scheme fixed'
);
assertEq(svc.normalizeUrl('  example.com  '), 'http://example.com', 'trims whitespace');
assertEq(svc.normalizeUrl(null), null, 'null → null');
assertEq(svc.normalizeUrl(undefined), null, 'undefined → null');
assertEq(svc.normalizeUrl(''), null, 'empty → null');
assertEq(svc.normalizeUrl(42), null, 'non-string → null');
// Node's URL parser throws on unencoded spaces → normalizeUrl returns null
assertEq(svc.normalizeUrl('not a url with spaces'), null, 'spaces → URL parse fails → null');

// ============================================================================
// stripTags
// ============================================================================
console.log('\n── stripTags ─────────────────────────────────────────────');

assertEq(
  svc.stripTags('<p>Hello <b>world</b></p>'),
  'Hello world',
  'basic tag stripping'
);
assertEq(
  svc.stripTags('<script>evil()</script>visible'),
  'visible',
  'script block removed'
);
assertEq(
  svc.stripTags('<style>.x{color:red}</style>text'),
  'text',
  'style block removed'
);
assertEq(
  svc.stripTags('Price&nbsp;is&nbsp;&amp;50'),
  'Price is &50',
  'entity decoding'
);
assertEq(
  svc.stripTags('<a>&lt;div&gt;</a>'),
  '<div>',
  'encoded brackets decoded'
);
assertEq(
  svc.stripTags('  spaces   and\ttabs\nnewlines  '),
  'spaces and tabs newlines',
  'whitespace collapsed'
);

// ============================================================================
// discoverLinksFromHtml
// ============================================================================
console.log('\n── discoverLinksFromHtml ─────────────────────────────────');

{
  const html = `
    <a href="/about">About</a>
    <a href="/history">History</a>
    <a href="/contact">Contact</a>
    <a href="/parish-history">Parish History</a>
    <a href="https://other.com/about">External</a>
    <a href="mailto:priest@church.org">Email</a>
    <a href="tel:555-1234">Phone</a>
    <a href="javascript:void(0)">JS</a>
  `;
  const links = svc.discoverLinksFromHtml(html, 'https://mychurch.org');
  assert(links.includes('/about'), 'discovered /about');
  assert(links.includes('/history'), 'discovered /history');
  assert(links.includes('/parish-history'), 'discovered /parish-history');
  assert(!links.includes('/contact'), 'skipped /contact (not matching keywords)');
  assert(!links.some((l: string) => l.includes('other.com')), 'skipped external');
  assert(!links.some((l: string) => l.startsWith('mailto')), 'skipped mailto');
  assert(!links.some((l: string) => l.startsWith('tel')), 'skipped tel');
  assert(!links.some((l: string) => l.startsWith('javascript')), 'skipped javascript');
}

{
  // absolute same-domain link
  const html = '<a href="https://mychurch.org/our-history">Our History</a>';
  const links = svc.discoverLinksFromHtml(html, 'https://mychurch.org');
  assert(links.includes('/our-history'), 'absolute same-domain preserved as path');
}

{
  // malformed href
  const html = '<a href=":::broken:::">broken</a>';
  const links = svc.discoverLinksFromHtml(html, 'https://mychurch.org');
  assertEq(links.length, 0, 'invalid URLs skipped');
}

// ============================================================================
// extractFromJsonLd
// ============================================================================
console.log('\n── extractFromJsonLd ─────────────────────────────────────');

{
  const html = `
    <html><head>
    <script type="application/ld+json">
    {"@type":"Church","description":"Orthodox parish (f. 1966)"}
    </script>
    </head></html>
  `;
  const r = svc.extractFromJsonLd(html);
  assertEq(r.established.year, 1966, '(f. YYYY) captured');
  assertEq(r.established.confidence, 'medium', '(f.) is medium');
  assertEq(r.established.source, 'json_ld', 'source=json_ld');
}

{
  const html = `<script type="application/ld+json">
    {"description":"Parish (founded 1923) serving faithful"}
  </script>`;
  const r = svc.extractFromJsonLd(html);
  assertEq(r.established.year, 1923, '(founded YYYY) captured');
}

{
  // foundingDate schema.org takes precedence
  const html = `<script type="application/ld+json">
    {"foundingDate":"1950-03-15","description":"Church (f. 1900)"}
  </script>`;
  const r = svc.extractFromJsonLd(html);
  assertEq(r.established.year, 1950, 'foundingDate parsed');
  assertEq(r.established.confidence, 'high', 'foundingDate is high');
  assertEq(r.established.source, 'json_ld_schema', 'source=json_ld_schema');
}

{
  // Malformed JSON swallowed
  const html = `<script type="application/ld+json">{bad json}</script>`;
  const r = svc.extractFromJsonLd(html);
  assertEq(r.established, null, 'malformed JSON → null established');
  assertEq(r.description, null, 'malformed JSON → null description');
}

{
  // No JSON-LD
  const r = svc.extractFromJsonLd('<html><body>no scripts</body></html>');
  assertEq(r.established, null, 'no script → null');
}

{
  // Year out of range
  const html = `<script type="application/ld+json">
    {"foundingDate":"1500-01-01"}
  </script>`;
  const r = svc.extractFromJsonLd(html);
  assertEq(r.established, null, 'implausible year rejected');
}

// ============================================================================
// extractFromRawHtml
// ============================================================================
console.log('\n── extractFromRawHtml ────────────────────────────────────');

{
  const r = svc.extractFromRawHtml('var x = "This church was founded in 1923";');
  assertEq(r.year, 1923, 'founded in YYYY');
  assertEq(r.confidence, 'low', 'raw html is low confidence');
  assertEq(r.source, 'raw_html_bundle', 'source');
  assert(r.excerpt.includes('1923'), 'excerpt contains year');
}

{
  const r = svc.extractFromRawHtml('Established in 1850 by immigrants');
  assertEq(r.year, 1850, 'established in YYYY');
}

{
  const r = svc.extractFromRawHtml('no dates here at all');
  assertEq(r, null, 'no match → null');
}

{
  // Implausible year ignored
  const r = svc.extractFromRawHtml('founded in 1200');
  assertEq(r, null, 'year out of range');
}

// ============================================================================
// extractEstablishedDate
// ============================================================================
console.log('\n── extractEstablishedDate ────────────────────────────────');

function makePage(path: string, text: string) {
  return { url: `https://ch.org${path}`, html: `<p>${text}</p>`, text };
}

{
  // Single high-confidence year pattern
  const pages = { '/about': makePage('/about', 'The parish was founded in 1923 by Russian immigrants.') };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'founded year');
  assertEq(r.best.confidence, 'high', 'high confidence');
  assertEq(r.best.precision, 'year', 'year precision');
  assert(r.best.sourceUrl.includes('/about'), 'sourceUrl preserved');
}

{
  // Multiple candidates — highest confidence wins
  // NOTE: © regex requires literal © character
  const pages = {
    '/': makePage('/', '© 1950-2024 All rights reserved. Since 1940.'),
    '/about': makePage('/about', 'The church was established in 1923.'),
  };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'high-confidence wins over low (© 1950, since 1940)');
  assert(r.allCandidates.length >= 2, 'multiple candidates collected');
}

{
  // Full date precision wins at same confidence
  const pages = {
    '/history': makePage('/history', 'The parish was founded January 15, 1923.'),
  };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r.best.year, 1923, 'full date year');
  assertEq(r.best.precision, 'full_date', 'full_date precision');
  assertEq(r.best.date, '1923-01-15', 'formatted date');
}

{
  // Month + year
  const pages = { '/about': makePage('/about', 'The church was established in March 1890.') };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r.best.precision, 'month', 'month precision');
  assertEq(r.best.date, '1890-03-01', 'formatted date with day=01');
}

{
  // Anniversary math: 75th anniversary 2010 → 1935
  const pages = { '/': makePage('/', 'Celebrating our 75th anniversary 1935-2010.') };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r.best.year, 1935, 'anniversary math');
}

{
  // Path boost: /history beats /contact at same conf+precision
  const pages = {
    '/contact': makePage('/contact', 'Since 1900 we serve.'),
    '/history': makePage('/history', 'Since 1900 we serve.'),
  };
  const r = svc.extractEstablishedDate(pages);
  assert(r.best.sourceUrl.includes('/history'), 'history path wins tie');
}

{
  // Implausible year filtered
  const pages = { '/': makePage('/', 'Founded in 2999 (future!).') };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r, null, 'implausible year filtered');
}

{
  // No matches
  const pages = { '/': makePage('/', 'No dates here.') };
  const r = svc.extractEstablishedDate(pages);
  assertEq(r, null, 'no candidates → null');
}

// ============================================================================
// extractParishSize
// ============================================================================
console.log('\n── extractParishSize ─────────────────────────────────────');

{
  // Family count direct
  const pages = { '/': makePage('/', 'Our parish has approximately 100 families.') };
  const r = svc.extractParishSize(pages);
  assertEq(r.best.rawCount, 100, 'rawCount');
  assertEq(r.best.rawType, 'family', 'family type');
  // family range = ±20%
  assertEq(r.best.familyMin, 80, 'familyMin 80%');
  assertEq(r.best.familyMax, 120, 'familyMax 120%');
  assertEq(r.best.category, 'parish_medium', 'category for 100 families');
}

{
  // Member count → families = count / 3
  const pages = { '/': makePage('/', 'Our parish has about 300 parishioners.') };
  const r = svc.extractParishSize(pages);
  assertEq(r.best.rawType, 'member', 'member type');
  // 300/3 = 100 families; ±30% → 70-130
  assertEq(r.best.familyMin, 70, 'member-based familyMin');
  assertEq(r.best.familyMax, 130, 'member-based familyMax');
}

{
  // Bounds filter: <5 or >10000 rejected
  const pages = {
    '/': makePage('/', 'We have 2 families.'),
    '/about': makePage('/about', '500 families strong.'),
  };
  const r = svc.extractParishSize(pages);
  assertEq(r.best.rawCount, 500, 'too-small filtered, 500 remains');
}

{
  // No match
  const pages = { '/': makePage('/', 'No size info here.') };
  const r = svc.extractParishSize(pages);
  assertEq(r, null, 'no candidates → null');
}

{
  // Family rank wins over member at same path
  const pages = { '/': makePage('/', 'Our parish has 50 families and 150 parishioners.') };
  const r = svc.extractParishSize(pages);
  assertEq(r.best.rawType, 'family', 'family wins over member');
}

// ============================================================================
// inferSizeFromName
// ============================================================================
console.log('\n── inferSizeFromName ─────────────────────────────────────');

{
  const r = svc.inferSizeFromName('Holy Trinity Orthodox Mission');
  assertEq(r.category, 'mission_small', 'mission category');
  assertEq(r.confidence, 'low', 'low confidence');
  assertEq(r.method, 'name_signal:mission', 'method');
}

{
  const r = svc.inferSizeFromName('St. Nicholas Orthodox Cathedral');
  assertEq(r.category, 'cathedral_or_major', 'cathedral');
}

{
  const r = svc.inferSizeFromName('Holy Trinity Chapel');
  assertEq(r.category, 'mission_small', 'chapel → mission_small');
}

{
  const r = svc.inferSizeFromName('St. John Orthodox Church');
  assertEq(r, null, 'plain church → null');
}

{
  const r = svc.inferSizeFromName('');
  assertEq(r, null, 'empty → null');
}

{
  const r = svc.inferSizeFromName(null);
  assertEq(r, null, 'null → null');
}

// ============================================================================
// inferSizeFromWebsite
// ============================================================================
console.log('\n── inferSizeFromWebsite ──────────────────────────────────');

{
  // High clergy + ministry density
  const text = 'priest archpriest deacon rector, ministry choir school youth group sunday school stewardship';
  const pages = { '/': makePage('/', text) };
  const r = svc.inferSizeFromWebsite(pages);
  assertEq(r.category, 'parish_large', 'high density → parish_large');
  assertEq(r.method, 'clergy_ministry_density:high', 'method');
}

{
  // Medium density
  const text = 'our priest and deacon serve. We have choir, school, and youth group.';
  const pages = { '/': makePage('/', text) };
  const r = svc.inferSizeFromWebsite(pages);
  assertEq(r.category, 'parish_medium', 'medium density → parish_medium');
}

{
  // Low density + sparse content
  const pages = { '/': makePage('/', 'minimal') };
  const r = svc.inferSizeFromWebsite(pages);
  assertEq(r.category, 'parish_small', 'sparse site → parish_small');
  assertEq(r.method, 'website_richness:low', 'method low');
}

{
  // Rich site with many pages but not density signals
  const pages: any = {};
  for (let i = 0; i < 7; i++) {
    pages[`/p${i}`] = makePage(`/p${i}`, 'a'.repeat(3000)); // 21,000 chars total
  }
  const r = svc.inferSizeFromWebsite(pages);
  assertEq(r.category, 'parish_medium', 'rich site → parish_medium');
  assertEq(r.method, 'website_richness:high', 'method high');
}

{
  // No signals
  const pages = {
    '/a': makePage('/a', 'a'.repeat(3000)),
    '/b': makePage('/b', 'b'.repeat(3000)),
  };
  const r = svc.inferSizeFromWebsite(pages);
  assertEq(r, null, '2 pages 6k chars → no inference');
}

// ============================================================================
// tryFallbackAdapters
// ============================================================================
console.log('\n── tryFallbackAdapters ──────────────────────────────────');

{
  // OCA jurisdiction is handled (but stub returns null)
  const result = await svc.tryFallbackAdapters({ jurisdiction: 'OCA' });
  assertEq(result, null, 'OCA adapter returns null (stub)');
}

{
  // Non-OCA skipped
  const result = await svc.tryFallbackAdapters({ jurisdiction: 'GOARCH' });
  assertEq(result, null, 'non-OCA skipped');
}

{
  // No jurisdiction
  const result = await svc.tryFallbackAdapters({});
  assertEq(result, null, 'empty church skipped');
}

// fallbackAdapters export shape
assert(svc.fallbackAdapters.oca_directory, 'oca_directory exported');
assertEq(
  svc.fallbackAdapters.oca_directory.name,
  'OCA Parish Directory',
  'adapter name'
);
assert(
  svc.fallbackAdapters.oca_directory.canHandle({ jurisdiction: 'OCA' }),
  'canHandle true for OCA'
);
assert(
  !svc.fallbackAdapters.oca_directory.canHandle({ jurisdiction: 'Antiochian' }),
  'canHandle false for non-OCA'
);

// ============================================================================
// enrichChurch — no URL
// ============================================================================
console.log('\n── enrichChurch ──────────────────────────────────────────');

quiet();
{
  const r = await svc.enrichChurch({ id: 1, name: 'Holy Trinity', website: null });
  loud();
  assertEq(r.status, 'no_data', 'no URL → no_data');
  assert(r.noDataReasons.includes('no_valid_url'), 'no_valid_url reason');
  assertEq(r.established, null, 'no established');
  assertEq(r.size, null, 'no size');
  // No-URL path returns early, BEFORE the 'none' default is applied
  assertEq(r.extractionMethod, null, 'extractionMethod stays null on no URL');
}

// skipWebsiteFetch → no pages, goes through heuristics only
quiet();
{
  const r = await svc.enrichChurch(
    { id: 2, name: 'St Nicholas Mission', website: 'https://example.org' },
    { skipWebsiteFetch: true, logger: () => {} }
  );
  loud();
  // Name heuristic should populate size
  assertEq(r.size.category, 'mission_small', 'name heuristic → mission');
  // No established (no pages, no fallback)
  assertEq(r.established, null, 'no pages → no established');
  // Status is 'enriched' when lowConfs>0 and highConfs===0 → 'low_confidence'
  assertEq(r.status, 'low_confidence', 'low conf size only');
  assert(r.extractionMethod.includes('name_heuristic'), 'extractionMethod includes name_heuristic');
}

// skipWebsiteFetch + no name signals → no_data
quiet();
{
  const r = await svc.enrichChurch(
    { id: 3, name: 'Plain Church', website: 'https://p.org' },
    { skipWebsiteFetch: true, logger: () => {} }
  );
  loud();
  assertEq(r.status, 'no_data', 'no signals → no_data');
  assert(r.noDataReasons.includes('website_unreachable_or_js_only'),
    'reason: unreachable');
}

// OCA jurisdiction — fallback adapter returns null but doesn't crash
quiet();
{
  const r = await svc.enrichChurch(
    { id: 4, name: 'OCA Mission', jurisdiction: 'OCA', website: 'https://oca.example' },
    { skipWebsiteFetch: true, logger: () => {} }
  );
  loud();
  // Size comes from name heuristic
  assertEq(r.size.category, 'mission_small', 'OCA mission name heuristic');
}

// ============================================================================
// createEnrichmentRun / updateRunStatus / upsertEnrichmentProfile
// ============================================================================
console.log('\n── DB persistence helpers ────────────────────────────────');

type Call = { sql: string; params: any[] };
const calls: Call[] = [];
const fakePool = {
  query: async (sql: string, params: any[]) => {
    calls.push({ sql, params });
    if (/^INSERT INTO church_enrichment_runs/.test(sql)) return [{ insertId: 42 }];
    return [{ affectedRows: 1 }];
  },
};

// createEnrichmentRun
calls.length = 0;
{
  const id = await svc.createEnrichmentRun(fakePool, {
    runType: 'batch',
    filterState: 'NY',
    filterJurisdiction: 'OCA',
    totalChurches: 100,
    options: { limit: 50 },
  });
  assertEq(id, 42, 'insertId returned');
  assertEq(calls.length, 1, 'one query');
  assert(/INSERT INTO church_enrichment_runs/.test(calls[0].sql), 'insert table');
  assertEq(calls[0].params[0], 'batch', 'runType');
  assertEq(calls[0].params[1], 'NY', 'filterState');
  assertEq(calls[0].params[2], 'OCA', 'filterJurisdiction');
  assertEq(calls[0].params[3], 100, 'totalChurches');
  assertEq(calls[0].params[4], JSON.stringify({ limit: 50 }), 'options JSON');
}

// createEnrichmentRun with defaults
calls.length = 0;
{
  await svc.createEnrichmentRun(fakePool, {});
  assertEq(calls[0].params[0], 'batch', 'default runType');
  assertEq(calls[0].params[1], null, 'default filterState');
  assertEq(calls[0].params[2], null, 'default filterJurisdiction');
  assertEq(calls[0].params[3], 0, 'default totalChurches');
}

// updateRunStatus
calls.length = 0;
{
  await svc.updateRunStatus(fakePool, 42, {
    status: 'completed',
    enrichedCount: 50,
    failedCount: 5,
    skippedCount: 10,
  });
  assertEq(calls.length, 1, 'one update');
  assert(/UPDATE church_enrichment_runs/.test(calls[0].sql), 'update table');
  assertEq(calls[0].params[0], 'completed', 'status');
  assertEq(calls[0].params[1], 50, 'enrichedCount');
  assertEq(calls[0].params[2], 5, 'failedCount');
  assertEq(calls[0].params[3], 10, 'skippedCount');
  assertEq(calls[0].params[4], null, 'errorMessage default null');
  assertEq(calls[0].params[5], 42, 'runId');
}

// updateRunStatus with error message
calls.length = 0;
{
  await svc.updateRunStatus(fakePool, 42, {
    status: 'failed',
    enrichedCount: 0, failedCount: 100, skippedCount: 0,
    errorMessage: 'batch crashed',
  });
  assertEq(calls[0].params[4], 'batch crashed', 'errorMessage');
}

// upsertEnrichmentProfile — full payload
calls.length = 0;
{
  const result = {
    churchId: 5,
    established: {
      year: 1923, date: '1923-01-15', precision: 'full_date',
      sourceType: 'website', sourceUrl: 'https://ch.org/about',
      excerpt: 'founded in 1923', confidence: 'high',
    },
    size: {
      category: 'parish_medium', familyMin: 80, familyMax: 120,
      sourceType: 'website', sourceUrl: 'https://ch.org/',
      excerpt: '100 families', confidence: 'medium',
    },
    extractionMethod: 'deterministic_website',
    status: 'enriched',
    notes: ['Found year', 'Found size'],
    rawSignals: { a: 1 },
  };
  await svc.upsertEnrichmentProfile(fakePool, 42, result);
  assertEq(calls.length, 1, 'one upsert');
  assert(/INSERT INTO church_enrichment_profiles/.test(calls[0].sql), 'profile table');
  assert(/ON DUPLICATE KEY UPDATE/.test(calls[0].sql), 'upsert clause');
  // Verify critical params
  const p = calls[0].params;
  assertEq(p[0], 5, 'churchId');
  assertEq(p[1], 42, 'runId');
  assertEq(p[2], 1923, 'established_year');
  assertEq(p[3], '1923-01-15', 'established_date');
  assertEq(p[4], 'full_date', 'precision');
  assertEq(p[5], 'website', 'source_type');
  assertEq(p[8], 'high', 'confidence');
  assertEq(p[9], 'parish_medium', 'size_category');
  assertEq(p[10], 80, 'familyMin');
  assertEq(p[11], 120, 'familyMax');
  assertEq(p[15], 'medium', 'size confidence');
  assertEq(p[16], 'deterministic_website', 'extraction_method');
  assertEq(p[17], 'enriched', 'enrichment_status');
  assertEq(p[18], 'Found year; Found size', 'notes joined');
  assertEq(p[19], JSON.stringify({ a: 1 }), 'raw signals JSON');
}

// upsertEnrichmentProfile — sparse payload
calls.length = 0;
{
  const result = {
    churchId: 6,
    established: null,
    size: null,
    extractionMethod: 'none',
    status: 'no_data',
    notes: [],
    rawSignals: {},
  };
  await svc.upsertEnrichmentProfile(fakePool, 42, result);
  const p = calls[0].params;
  assertEq(p[2], null, 'null year');
  assertEq(p[3], null, 'null date');
  assertEq(p[4], 'unknown', 'precision fallback');
  assertEq(p[8], 'none', 'confidence fallback');
  assertEq(p[9], 'unknown', 'category fallback');
  assertEq(p[18], '', 'empty notes');
}

// ============================================================================
// fetchChurchPages — axios stubbed
// ============================================================================
console.log('\n── fetchChurchPages ──────────────────────────────────────');

quiet();
{
  clearUrlResponses();
  setUrlResponse(
    'https://ch.org',
    '<html><head></head><body>Welcome to our parish. ' + 'x'.repeat(300) + '</body></html>'
  );
  // All other paths → network error (returns null via fetchPage's catch)
  const pages = await svc.fetchChurchPages('https://ch.org', () => {});
  loud();
  assert(pages['/'] !== undefined, 'homepage fetched');
  assert(pages['/'].text.length > 0, 'text extracted');
  assert(pages['/'].html.includes('Welcome'), 'html stored');
}

// homepage too short → not stored
quiet();
{
  clearUrlResponses();
  setUrlResponse('https://tiny.org', '<html>tiny</html>');
  const pages = await svc.fetchChurchPages('https://tiny.org', () => {});
  loud();
  assertEq(pages['/'], undefined, 'short homepage not stored (<=200)');
}

// homepage with discoverable nav link
quiet();
{
  clearUrlResponses();
  setUrlResponse(
    'https://ch2.org',
    `<html><body><a href="/history">History</a>. Welcome to our parish. ${'x'.repeat(300)}</body></html>`
  );
  setUrlResponse(
    'https://ch2.org/history',
    `<html><body>Our founding history. ${'y'.repeat(300)}</body></html>`
  );
  const pages = await svc.fetchChurchPages('https://ch2.org', () => {});
  loud();
  assert(pages['/'] !== undefined, 'homepage present');
  assert(pages['/history'] !== undefined, 'discovered /history present');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

} // end main

main().catch((e) => { loud(); console.error('Unhandled:', e); process.exit(1); });
