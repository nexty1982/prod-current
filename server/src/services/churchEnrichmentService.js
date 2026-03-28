// ============================================================
// Church Enrichment Service v2
// Inspects church websites to infer established date and parish size.
// Deterministic extraction first, heuristic inference as fallback.
//
// v2 improvements:
//   - Link discovery from homepage nav (finds OCA CMS .html pages)
//   - JSON-LD and raw HTML extraction (catches Wix/WordPress meta)
//   - Broader regex patterns (f. YYYY, anniversary math, etc.)
//   - Clergy/ministry density as size signal
//   - Modular fallback adapter framework
//   - Better no-data reason logging
// ============================================================

const axios = require('axios');
const { getAppPool } = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12000;
const MAX_HTML_BYTES = 2_000_000;
const USER_AGENT = 'OrthodoxMetrics-Enrichment/2.0 (church data research)';

// Base candidate paths — tried first, before link discovery
const CANDIDATE_PATHS = [
  '/', '/about', '/about-us', '/history', '/our-parish',
  '/parish-history', '/who-we-are', '/our-history', '/about-our-parish',
  '/clergy', '/ministries', '/calendar'
];

// OCA CMS uses .html extensions with non-standard names
const OCA_CMS_PATHS = [
  '/history.html', '/aboutourchurch.html', '/parhist.html',
  '/background.html', '/from-beginning.html', '/parish-history.html',
  '/about.html', '/our-parish.html', '/aboutus.html'
];

// ─── URL Normalization ────────────────────────────────────────────────────────

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.trim();
  url = url.replace(/^https?:\/\/https?:\/\//i, 'https://');
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  url = url.replace(/\/+$/, '');
  try {
    const parsed = new URL(url);
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}

// ─── HTML Fetching ────────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const resp = await axios.get(url, {
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_HTML_BYTES,
      headers: { 'User-Agent': USER_AGENT },
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: (s) => s >= 200 && s < 400
    });
    return typeof resp.data === 'string' ? resp.data : '';
  } catch {
    return null;
  }
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Link Discovery ──────────────────────────────────────────────────────────
// Parse homepage HTML for internal links that look like history/about pages

function discoverLinksFromHtml(html, baseUrl) {
  const discovered = new Set();
  const base = new URL(baseUrl);

  // Match <a href="..."> tags
  const hrefRe = /<a\s[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>/gi;
  const historyKeywords = /hist|about|parish|background|founding|our.?church|who.?we|beginning|story|mission/i;

  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    let href = m[1].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;

    try {
      const resolved = new URL(href, baseUrl);
      // Only same-domain links
      if (resolved.hostname !== base.hostname) continue;
      const path = resolved.pathname;

      // Filter to likely-relevant pages
      if (historyKeywords.test(path) || historyKeywords.test(href)) {
        discovered.add(path);
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return [...discovered];
}

// ─── JSON-LD Extraction ──────────────────────────────────────────────────────
// Extract founding info from structured data in <script type="application/ld+json">

function extractFromJsonLd(html) {
  const results = { established: null, description: null };
  const jsonLdRe = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  let m;
  while ((m = jsonLdRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1]);
      const desc = data.description || '';

      // "(f. 1966)" or "(founded 1966)" in description
      const fMatch = desc.match(/\(f\.\s*(\d{4})\)/i) || desc.match(/\(founded\s+(\d{4})\)/i);
      if (fMatch && isPlausibleYear(parseInt(fMatch[1], 10))) {
        results.established = {
          year: parseInt(fMatch[1], 10),
          confidence: 'medium',
          source: 'json_ld',
          excerpt: desc.substring(0, 200)
        };
      }

      // "foundingDate" schema.org property
      if (data.foundingDate) {
        const y = parseInt(String(data.foundingDate).substring(0, 4), 10);
        if (isPlausibleYear(y)) {
          results.established = {
            year: y,
            confidence: 'high',
            source: 'json_ld_schema',
            excerpt: `foundingDate: ${data.foundingDate}`
          };
        }
      }

      if (desc) results.description = desc;
    } catch {
      // Malformed JSON-LD, skip
    }
  }

  return results;
}

// ─── Raw HTML Year Search (for SPA bundles like Wix) ─────────────────────────
// Search the raw HTML (before tag stripping) for founding patterns in JS bundles

function extractFromRawHtml(html) {
  // Look for "Founded in YYYY" or "Established in YYYY" in raw HTML including JS strings
  const rawPatterns = [
    /["']?(?:founded|established)\s+in\s+(\d{4})/gi,
    /["']?(?:founded|established)\s+(\d{4})/gi
  ];

  for (const re of rawPatterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const year = parseInt(m[1], 10);
      if (isPlausibleYear(year)) {
        return {
          year,
          confidence: 'low',
          source: 'raw_html_bundle',
          excerpt: html.substring(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/[\n\r]+/g, ' ').trim()
        };
      }
    }
  }

  return null;
}

// ─── Page Fetching with Discovery ────────────────────────────────────────────

async function fetchChurchPages(baseUrl, logger) {
  const pages = {};
  const tried = new Set();
  const log = logger || (() => {});

  // Helper to fetch and store a page
  async function tryPath(path) {
    if (tried.has(path)) return;
    tried.add(path);

    const url = path === '/' ? baseUrl : baseUrl + path;
    const html = await fetchPage(url);
    if (html && html.length > 200) {
      // Deduplicate: check if this page's text matches an already-fetched page
      const text = stripTags(html);
      const isDuplicate = Object.values(pages).some(p =>
        p.text.length > 0 && Math.abs(p.text.length - text.length) < 100 &&
        p.text.substring(0, 200) === text.substring(0, 200)
      );
      if (!isDuplicate) {
        pages[path] = { url, html, text };
        return true;
      }
    }
    return false;
  }

  // 1. Fetch homepage first
  await tryPath('/');
  await new Promise(r => setTimeout(r, 500));

  // 2. Discover links from homepage navigation
  let discoveredPaths = [];
  if (pages['/']) {
    discoveredPaths = discoverLinksFromHtml(pages['/'].html, baseUrl);
    if (discoveredPaths.length > 0) {
      log(`  [discovery] Found ${discoveredPaths.length} nav links: ${discoveredPaths.slice(0, 8).join(', ')}`);
    }
  }

  // 3. Build priority fetch list: discovered links first, then candidates, then OCA CMS
  const fetchOrder = [
    ...discoveredPaths,
    ...CANDIDATE_PATHS.filter(p => p !== '/'),
    ...OCA_CMS_PATHS
  ];

  // Deduplicate
  const uniquePaths = [...new Set(fetchOrder)];

  // 4. Fetch up to 12 additional pages (to stay polite)
  let fetched = 0;
  for (const path of uniquePaths) {
    if (fetched >= 12) break;
    const ok = await tryPath(path);
    if (ok) fetched++;
    await new Promise(r => setTimeout(r, 600));
  }

  return pages;
}

// ─── Established Date Extraction ──────────────────────────────────────────────

const YEAR_PATTERNS = [
  // "founded in 1923" / "established in 1923" / "organized in 1923"
  { re: /(?:founded|established|organized|incorporated|chartered|formed|constituted)\s+(?:in\s+)?(\d{4})/gi, confidence: 'high' },
  // "since 1923"
  { re: /(?:serving|worshipping|celebrating)\s+(?:since\s+)?(\d{4})/gi, confidence: 'medium' },
  // "est. 1923" / "est 1923" / "(f. 1923)"
  { re: /est\.?\s+(\d{4})/gi, confidence: 'high' },
  { re: /\(f\.\s*(\d{4})\)/gi, confidence: 'medium' },
  // "our parish was begun in 1923" / "parish began in 1923"
  { re: /parish\s+(?:was\s+)?(?:begun|began|started|created|born)\s+(?:in\s+)?(\d{4})/gi, confidence: 'high' },
  // "the first liturgy was celebrated in 1923"
  { re: /first\s+(?:liturgy|divine liturgy|service|services|meeting)\s+(?:was\s+|were\s+)?(?:celebrated|served|held)\s+(?:in\s+)?(\d{4})/gi, confidence: 'medium' },
  // "first organizational meeting on February 16, 1970" (year captured)
  { re: /first\s+(?:organizational\s+)?meeting\s+(?:on\s+|in\s+)?(?:\w+\s+\d{1,2},?\s+)?(\d{4})/gi, confidence: 'medium' },
  // "in 1923, a group of Orthodox families..."
  { re: /in\s+(\d{4})\s*,?\s*(?:a\s+(?:small\s+)?group|several|a\s+number|a\s+handful)\s+of\s+(?:orthodox|faithful|immigrant|russian|serbian|greek|romanian|ukrainian|american)/gi, confidence: 'medium' },
  // "dates back to 1923" / "traces its roots to 1923"
  { re: /(?:dates?\s+back|traces?\s+(?:its\s+)?(?:roots|history|origins?))\s+to\s+(\d{4})/gi, confidence: 'medium' },
  // " Nth anniversary" math — "75th Anniversary (1935-2010)" or "celebrating 100 years"
  { re: /(\d{2,3})(?:st|nd|rd|th)\s+anniversary\s*[\(:]?\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi, confidence: 'medium', type: 'anniversary' },
  // "since 1923" standalone
  { re: /\bsince\s+(\d{4})\b/gi, confidence: 'low' },
  // Copyright-style: "© 1923-2024"
  { re: /[©]\s*(\d{4})\s*[-–]/gi, confidence: 'low' }
];

// Full date patterns
const DATE_PATTERNS = [
  { re: /(?:founded|established|organized|constituted)\s+(?:on\s+)?(?:in\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*,?\s*(\d{4})/gi, type: 'full_date' },
  { re: /(?:founded|established|organized|constituted)\s+(?:on\s+)?(?:in\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi, type: 'month' },
  // "On August 23, 1964, ... celebrated the Divine Liturgy" (first liturgy context)
  { re: /on\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*,?\s*(\d{4})\s*,?\s*(?:following|after|the\s+first|a\s+group|members)/gi, type: 'full_date' }
];

const MONTH_MAP = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12'
};

function isPlausibleYear(y) {
  return y >= 1700 && y <= 2026;
}

function extractEstablishedDate(pages) {
  const candidates = [];

  for (const [path, page] of Object.entries(pages)) {
    const text = page.text;

    // Full date patterns first
    for (const pat of DATE_PATTERNS) {
      let m;
      while ((m = pat.re.exec(text)) !== null) {
        const month = m[1].toLowerCase();
        if (pat.type === 'full_date') {
          const year = parseInt(m[3], 10);
          const day = parseInt(m[2], 10);
          if (isPlausibleYear(year)) {
            candidates.push({
              year, date: `${year}-${MONTH_MAP[month]}-${String(day).padStart(2, '0')}`,
              precision: 'full_date', confidence: 'high',
              sourceUrl: page.url, excerpt: getExcerpt(text, m.index, m[0]), path
            });
          }
        } else if (pat.type === 'month') {
          const year = parseInt(m[2], 10);
          if (isPlausibleYear(year)) {
            candidates.push({
              year, date: `${year}-${MONTH_MAP[month]}-01`,
              precision: 'month', confidence: 'high',
              sourceUrl: page.url, excerpt: getExcerpt(text, m.index, m[0]), path
            });
          }
        }
      }
    }

    // Year-only patterns
    for (const pat of YEAR_PATTERNS) {
      let m;
      while ((m = pat.re.exec(text)) !== null) {
        let year;
        if (pat.type === 'anniversary') {
          // Anniversary math: "75th anniversary ... 2010" → 2010 - 75 = 1935
          const span = parseInt(m[1], 10);
          const refYear = parseInt(m[2], 10);
          year = refYear - span;
        } else {
          year = parseInt(m[1], 10);
        }
        if (isPlausibleYear(year)) {
          candidates.push({
            year, date: null, precision: 'year', confidence: pat.confidence,
            sourceUrl: page.url, excerpt: getExcerpt(text, m.index, m[0]), path
          });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  // Rank candidates
  const confOrder = { high: 3, medium: 2, low: 1 };
  const precOrder = { full_date: 3, month: 2, year: 1 };
  const historyPaths = ['/about', '/history', '/parish-history', '/our-parish', '/our-history',
    '/history.html', '/parhist.html', '/background.html', '/aboutourchurch.html', '/from-beginning.html'];
  const pathBoost = (p) => historyPaths.some(h => p.includes(h)) ? 1 : 0;

  candidates.sort((a, b) => {
    const ca = confOrder[a.confidence] || 0, cb = confOrder[b.confidence] || 0;
    if (ca !== cb) return cb - ca;
    const pa = precOrder[a.precision] || 0, pb = precOrder[b.precision] || 0;
    if (pa !== pb) return pb - pa;
    return pathBoost(b.path) - pathBoost(a.path);
  });

  return { best: candidates[0], allCandidates: candidates };
}

// ─── Parish Size Extraction ───────────────────────────────────────────────────

const SIZE_PATTERNS = [
  { re: /(?:approximately|about|around|over|nearly|more than|roughly)?\s*(\d{1,5})\s+famil(?:y|ies)/gi, type: 'family' },
  { re: /(?:approximately|about|around|over|nearly|more than|roughly)?\s*(\d{1,5})\s+(?:members|parishioners|communicants|souls|congregants)/gi, type: 'member' },
  { re: /parish\s+of\s+(?:approximately\s+|about\s+|around\s+)?(\d{1,5})/gi, type: 'member' },
  { re: /congregation\s+of\s+(?:approximately\s+|about\s+|around\s+)?(\d{1,5})/gi, type: 'member' },
  { re: /(?:approximately|about|around|over|nearly|more than|roughly)\s+(\d{1,5})\s+(?:active|registered|faithful)/gi, type: 'member' }
];

function categorizeSize(familyCount) {
  if (familyCount <= 25) return 'mission_small';
  if (familyCount <= 75) return 'parish_small';
  if (familyCount <= 200) return 'parish_medium';
  if (familyCount <= 500) return 'parish_large';
  return 'cathedral_or_major';
}

function extractParishSize(pages) {
  const candidates = [];

  for (const [path, page] of Object.entries(pages)) {
    const text = page.text;

    for (const pat of SIZE_PATTERNS) {
      let m;
      while ((m = pat.re.exec(text)) !== null) {
        const count = parseInt(m[1], 10);
        if (count < 5 || count > 10000) continue;

        let familyMin, familyMax;
        if (pat.type === 'family') {
          familyMin = Math.max(1, Math.round(count * 0.8));
          familyMax = Math.round(count * 1.2);
        } else {
          const families = Math.round(count / 3);
          familyMin = Math.max(1, Math.round(families * 0.7));
          familyMax = Math.round(families * 1.3);
        }

        candidates.push({
          rawCount: count, rawType: pat.type, familyMin, familyMax,
          category: categorizeSize(Math.round((familyMin + familyMax) / 2)),
          confidence: 'medium',
          sourceUrl: page.url, excerpt: getExcerpt(text, m.index, m[0]), path
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  const typeOrder = { family: 2, member: 1 };
  const pathBoost = (p) => ['/about', '/about-us', '/our-parish'].includes(p) ? 1 : 0;
  candidates.sort((a, b) => {
    const ta = typeOrder[a.rawType] || 0, tb = typeOrder[b.rawType] || 0;
    if (ta !== tb) return tb - ta;
    return pathBoost(b.path) - pathBoost(a.path);
  });

  return { best: candidates[0], allCandidates: candidates };
}

// ─── Heuristic Inference ──────────────────────────────────────────────────────

function inferSizeFromName(churchName) {
  const lower = (churchName || '').toLowerCase();
  if (/\bmission\b/.test(lower)) return { category: 'mission_small', confidence: 'low', method: 'name_signal:mission' };
  if (/\bcathedral\b/.test(lower)) return { category: 'cathedral_or_major', confidence: 'low', method: 'name_signal:cathedral' };
  if (/\bchapel\b/.test(lower)) return { category: 'mission_small', confidence: 'low', method: 'name_signal:chapel' };
  return null;
}

function inferSizeFromWebsite(pages) {
  const pageCount = Object.keys(pages).length;
  const totalText = Object.values(pages).reduce((sum, p) => sum + p.text.length, 0);

  // Count clergy/ministry density signals
  const allText = Object.values(pages).map(p => p.text).join(' ').toLowerCase();
  const clergyMentions = (allText.match(/\b(?:priest|pastor|deacon|archpriest|protopresbyter|rector|dean|father\s+\w+)\b/gi) || []).length;
  const ministryMentions = (allText.match(/\b(?:ministry|ministries|choir|school|youth\s+group|sunday\s+school|outreach|stewardship|bible\s+study|bookstore)\b/gi) || []).length;

  // Many clergy + many ministries → larger parish
  if (clergyMentions >= 3 && ministryMentions >= 5) {
    return { category: 'parish_large', confidence: 'low', method: 'clergy_ministry_density:high' };
  }
  if (clergyMentions >= 2 && ministryMentions >= 3) {
    return { category: 'parish_medium', confidence: 'low', method: 'clergy_ministry_density:medium' };
  }

  if (pageCount >= 6 && totalText > 15000) {
    return { category: 'parish_medium', confidence: 'low', method: 'website_richness:high' };
  }
  if (pageCount <= 1 && totalText < 2000) {
    return { category: 'parish_small', confidence: 'low', method: 'website_richness:low' };
  }

  return null;
}

// ─── Fallback Adapters ───────────────────────────────────────────────────────
// Modular adapters for external data sources

const fallbackAdapters = {
  oca_directory: {
    name: 'OCA Parish Directory',
    canHandle: (church) => (church.jurisdiction || '').toUpperCase().includes('OCA'),
    async enrich(church) {
      // OCA parish directory URLs follow a pattern
      // This is a stub ready for future implementation when OCA directory scraping is authorized
      return null;
    }
  }
  // Future: goarch_directory, antiochian_directory, etc.
};

async function tryFallbackAdapters(church) {
  for (const [key, adapter] of Object.entries(fallbackAdapters)) {
    if (adapter.canHandle(church)) {
      try {
        const result = await adapter.enrich(church);
        if (result) return { ...result, adapter: key };
      } catch {
        // Adapter failed, try next
      }
    }
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExcerpt(text, matchIndex, matchStr) {
  const start = Math.max(0, matchIndex - 80);
  const end = Math.min(text.length, matchIndex + matchStr.length + 80);
  let excerpt = text.slice(start, end).trim();
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';
  return excerpt;
}

// ─── Main Enrichment Pipeline ─────────────────────────────────────────────────

async function enrichChurch(church, options = {}) {
  const { skipWebsiteFetch = false } = options;
  const log = options.logger || console.log;

  const result = {
    churchId: church.id,
    churchName: church.name,
    established: null,
    size: null,
    extractionMethod: null,
    status: 'no_data',
    notes: [],
    rawSignals: {},
    pagesFetched: [],
    noDataReasons: []
  };

  // 1. Normalize URL
  const websiteUrl = normalizeUrl(church.website);
  if (!websiteUrl) {
    result.noDataReasons.push('no_valid_url');
    result.notes.push('No valid website URL');
    return result;
  }

  // 2. Fetch pages with discovery
  let pages = {};
  if (!skipWebsiteFetch) {
    try {
      pages = await fetchChurchPages(websiteUrl, log);
      result.pagesFetched = Object.keys(pages);
    } catch (err) {
      result.noDataReasons.push('fetch_error');
      result.notes.push(`Website fetch error: ${err.message}`);
    }
  }

  const hasPages = Object.keys(pages).length > 0;
  if (!hasPages) {
    result.noDataReasons.push('no_pages_fetched');
    result.notes.push('No pages could be fetched (site may require JavaScript or block crawlers)');
  }

  // 3. JSON-LD extraction (before tag stripping, catches WordPress meta)
  if (hasPages) {
    for (const [path, page] of Object.entries(pages)) {
      const jsonLd = extractFromJsonLd(page.html);
      if (jsonLd.established && !result.established) {
        result.established = {
          year: jsonLd.established.year,
          date: null,
          precision: 'year',
          confidence: jsonLd.established.confidence,
          sourceType: 'website',
          sourceUrl: page.url,
          excerpt: jsonLd.established.excerpt
        };
        result.extractionMethod = 'json_ld';
        result.notes.push(`Found established year ${jsonLd.established.year} via JSON-LD (${jsonLd.established.confidence})`);
        result.rawSignals.json_ld = jsonLd;
      }
    }
  }

  // 4. Deterministic extraction — established date (text-based)
  if (hasPages) {
    const estResult = extractEstablishedDate(pages);
    if (estResult) {
      const best = estResult.best;
      // Only override JSON-LD if text extraction has higher confidence
      const confOrder = { high: 3, medium: 2, low: 1 };
      if (!result.established || (confOrder[best.confidence] || 0) > (confOrder[result.established.confidence] || 0)) {
        result.established = {
          year: best.year, date: best.date, precision: best.precision,
          confidence: best.confidence, sourceType: 'website',
          sourceUrl: best.sourceUrl, excerpt: best.excerpt
        };
        result.extractionMethod = 'deterministic_website';
      }
      result.rawSignals.established_candidates = estResult.allCandidates.map(c => ({
        year: c.year, date: c.date, precision: c.precision,
        confidence: c.confidence, sourceUrl: c.sourceUrl
      }));
      if (!result.notes.some(n => n.includes('established year'))) {
        result.notes.push(`Found established year ${best.year} (${best.confidence} confidence)`);
      }
    }
  }

  // 5. Raw HTML search (catches Wix/SPA bundles) — only if no result yet
  if (!result.established && hasPages) {
    for (const page of Object.values(pages)) {
      const rawResult = extractFromRawHtml(page.html);
      if (rawResult) {
        result.established = {
          year: rawResult.year, date: null, precision: 'year',
          confidence: rawResult.confidence, sourceType: 'website',
          sourceUrl: page.url, excerpt: rawResult.excerpt
        };
        result.extractionMethod = 'raw_html_bundle';
        result.notes.push(`Found established year ${rawResult.year} in raw HTML (${rawResult.confidence})`);
        result.rawSignals.raw_html = rawResult;
        break;
      }
    }
  }

  // 6. Deterministic extraction — parish size
  if (hasPages) {
    const sizeResult = extractParishSize(pages);
    if (sizeResult) {
      const best = sizeResult.best;
      result.size = {
        category: best.category, familyMin: best.familyMin, familyMax: best.familyMax,
        confidence: best.confidence, sourceType: 'website',
        sourceUrl: best.sourceUrl, excerpt: best.excerpt
      };
      result.rawSignals.size_candidates = sizeResult.allCandidates.map(c => ({
        rawCount: c.rawCount, rawType: c.rawType, category: c.category,
        confidence: c.confidence, sourceUrl: c.sourceUrl
      }));
      result.notes.push(`Found size: ${best.category} (~${best.familyMin}-${best.familyMax} families)`);
    }
  }

  // 7. Fallback adapters (OCA directory, etc.)
  if (!result.established) {
    const fallback = await tryFallbackAdapters(church);
    if (fallback?.established) {
      result.established = {
        year: fallback.established.year, date: null, precision: 'year',
        confidence: fallback.established.confidence || 'medium',
        sourceType: fallback.adapter || 'external',
        sourceUrl: fallback.established.sourceUrl || null,
        excerpt: fallback.established.excerpt || null
      };
      result.extractionMethod = (result.extractionMethod || '') + '+' + fallback.adapter;
      result.notes.push(`Found established year ${fallback.established.year} via ${fallback.adapter}`);
    }
  }

  // 8. Heuristic fallback for size
  if (!result.size) {
    const nameInference = inferSizeFromName(church.name);
    if (nameInference) {
      result.size = {
        category: nameInference.category, familyMin: null, familyMax: null,
        confidence: nameInference.confidence, sourceType: 'inferred',
        sourceUrl: null, excerpt: null
      };
      result.extractionMethod = (result.extractionMethod || '') + '+name_heuristic';
      result.notes.push(`Size inferred from name: ${nameInference.method}`);
    } else if (hasPages) {
      const webInference = inferSizeFromWebsite(pages);
      if (webInference) {
        result.size = {
          category: webInference.category, familyMin: null, familyMax: null,
          confidence: webInference.confidence, sourceType: 'inferred',
          sourceUrl: null, excerpt: null
        };
        result.extractionMethod = (result.extractionMethod || '') + '+website_heuristic';
        result.notes.push(`Size inferred from website: ${webInference.method}`);
      }
    }
  }

  // 9. Determine final enrichment status + no-data reasons
  if (result.established || result.size) {
    const estConf = result.established?.confidence || 'none';
    const sizeConf = result.size?.confidence || 'none';
    const highConfs = [estConf, sizeConf].filter(c => c === 'high').length;
    const lowConfs = [estConf, sizeConf].filter(c => c === 'low').length;

    if (highConfs > 0 && lowConfs === 0) result.status = 'enriched';
    else if (lowConfs > 0 && highConfs === 0) result.status = 'low_confidence';
    else result.status = 'enriched';
  } else {
    // Classify why we got no data
    if (!hasPages) {
      result.noDataReasons.push('website_unreachable_or_js_only');
    } else {
      result.noDataReasons.push('no_matching_patterns');
      const totalText = Object.values(pages).reduce((s, p) => s + p.text.length, 0);
      if (totalText < 500) {
        result.noDataReasons.push('very_sparse_content');
      }
    }
  }

  if (!result.extractionMethod) result.extractionMethod = 'none';
  result.rawSignals.noDataReasons = result.noDataReasons;
  result.rawSignals.pagesFetched = result.pagesFetched;

  return result;
}

// ─── Database Persistence ─────────────────────────────────────────────────────

async function createEnrichmentRun(pool, { runType = 'batch', filterState = null, filterJurisdiction = null, totalChurches = 0, options = {} }) {
  const [result] = await pool.query(
    `INSERT INTO church_enrichment_runs (run_type, status, filter_state, filter_jurisdiction, total_churches, options_json)
     VALUES (?, 'running', ?, ?, ?, ?)`,
    [runType, filterState, filterJurisdiction, totalChurches, JSON.stringify(options)]
  );
  return result.insertId;
}

async function updateRunStatus(pool, runId, { status, enrichedCount, failedCount, skippedCount, errorMessage = null }) {
  await pool.query(
    `UPDATE church_enrichment_runs
     SET status = ?, enriched_count = ?, failed_count = ?, skipped_count = ?,
         error_message = ?, completed_at = NOW()
     WHERE id = ?`,
    [status, enrichedCount, failedCount, skippedCount, errorMessage, runId]
  );
}

async function upsertEnrichmentProfile(pool, runId, result) {
  const est = result.established || {};
  const sz = result.size || {};

  await pool.query(
    `INSERT INTO church_enrichment_profiles
       (church_id, run_id, established_year, established_date, established_date_precision,
        established_source_type, established_source_url, established_source_excerpt, established_confidence,
        size_category, estimated_family_count_min, estimated_family_count_max,
        size_source_type, size_source_url, size_source_excerpt, size_confidence,
        extraction_method, enrichment_status, enrichment_notes, raw_signals_json, last_enriched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       run_id = VALUES(run_id),
       established_year = VALUES(established_year),
       established_date = VALUES(established_date),
       established_date_precision = VALUES(established_date_precision),
       established_source_type = VALUES(established_source_type),
       established_source_url = VALUES(established_source_url),
       established_source_excerpt = VALUES(established_source_excerpt),
       established_confidence = VALUES(established_confidence),
       size_category = VALUES(size_category),
       estimated_family_count_min = VALUES(estimated_family_count_min),
       estimated_family_count_max = VALUES(estimated_family_count_max),
       size_source_type = VALUES(size_source_type),
       size_source_url = VALUES(size_source_url),
       size_source_excerpt = VALUES(size_source_excerpt),
       size_confidence = VALUES(size_confidence),
       extraction_method = VALUES(extraction_method),
       enrichment_status = VALUES(enrichment_status),
       enrichment_notes = VALUES(enrichment_notes),
       raw_signals_json = VALUES(raw_signals_json),
       last_enriched_at = NOW()`,
    [
      result.churchId, runId,
      est.year || null, est.date || null, est.precision || 'unknown',
      est.sourceType || null, est.sourceUrl || null, est.excerpt || null, est.confidence || 'none',
      sz.category || 'unknown', sz.familyMin || null, sz.familyMax || null,
      sz.sourceType || null, sz.sourceUrl || null, sz.excerpt || null, sz.confidence || 'none',
      result.extractionMethod, result.status,
      result.notes.join('; '),
      JSON.stringify(result.rawSignals)
    ]
  );
}

// ─── Batch Runner ─────────────────────────────────────────────────────────────

async function runBatchEnrichment({ state = null, jurisdiction = null, limit = null, forceReenrich = false, statusFilter = null } = {}) {
  const pool = getAppPool();

  let where = ['1=1'];
  const params = [];

  if (state) { where.push('c.state_code = ?'); params.push(state); }
  if (jurisdiction) { where.push('c.jurisdiction LIKE ?'); params.push(`%${jurisdiction}%`); }

  if (statusFilter) {
    // Re-run only specific statuses: "no_data", "low_confidence", "failed"
    const statuses = statusFilter.split(',').map(s => s.trim());
    where.push(`ep.enrichment_status IN (${statuses.map(() => '?').join(',')})`);
    params.push(...statuses);
  } else if (!forceReenrich) {
    where.push('(ep.id IS NULL OR ep.enrichment_status IN ("pending","failed","no_data"))');
  }

  let sql = `
    SELECT c.id, c.name, c.website, c.city, c.state_code, c.jurisdiction
    FROM us_churches c
    LEFT JOIN church_enrichment_profiles ep ON ep.church_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.name`;

  if (limit) { sql += ' LIMIT ?'; params.push(limit); }

  const [churches] = await pool.query(sql, params);
  console.log(`[Enrichment] Found ${churches.length} churches to process`);

  const runId = await createEnrichmentRun(pool, {
    runType: churches.length === 1 ? 'single' : 'batch',
    filterState: state, filterJurisdiction: jurisdiction,
    totalChurches: churches.length,
    options: { limit, forceReenrich, statusFilter }
  });

  let enrichedCount = 0, failedCount = 0, skippedCount = 0;

  for (let i = 0; i < churches.length; i++) {
    const church = churches[i];
    console.log(`[Enrichment] [${i + 1}/${churches.length}] Processing: ${church.name} (${church.city}, ${church.state_code})`);

    try {
      if (!church.website) {
        console.log(`  → Skipped: no website`);
        skippedCount++;
        continue;
      }

      const result = await enrichChurch(church, { logger: console.log });
      await upsertEnrichmentProfile(pool, runId, result);

      if (result.status === 'enriched' || result.status === 'low_confidence') {
        enrichedCount++;
        const estStr = result.established ? `est. ${result.established.year} (${result.established.confidence})` : 'no est. date';
        const sizeStr = result.size ? `${result.size.category} (${result.size.confidence})` : 'no size';
        console.log(`  → ${result.status}: ${estStr}, ${sizeStr}`);
      } else {
        const reasons = result.noDataReasons.length > 0 ? ` [${result.noDataReasons.join(', ')}]` : '';
        console.log(`  → ${result.status}: ${result.notes.join('; ')}${reasons}`);
        if (result.status === 'no_data') skippedCount++;
      }

    } catch (err) {
      console.error(`  → ERROR: ${err.message}`);
      failedCount++;
    }

    if (i < churches.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  await updateRunStatus(pool, runId, {
    status: failedCount === churches.length ? 'failed' : 'completed',
    enrichedCount, failedCount, skippedCount
  });

  const summary = { runId, total: churches.length, enriched: enrichedCount, failed: failedCount, skipped: skippedCount };
  console.log(`[Enrichment] Run #${runId} complete:`, summary);
  return summary;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  normalizeUrl, enrichChurch, runBatchEnrichment,
  createEnrichmentRun, updateRunStatus, upsertEnrichmentProfile,
  extractEstablishedDate, extractParishSize,
  inferSizeFromName, inferSizeFromWebsite,
  fetchChurchPages, stripTags,
  discoverLinksFromHtml, extractFromJsonLd, extractFromRawHtml,
  tryFallbackAdapters, fallbackAdapters
};
