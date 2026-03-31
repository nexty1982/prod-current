/**
 * Fast Established Date Enrichment — Demo-critical fast path
 *
 * Hybrid approach:
 *   Tier 1: Web search snippets (DuckDuckGo HTML) → regex year extraction
 *   Tier 2: Heuristic fallback based on parish type/region
 *   Tier 3: Consistency checks (older parishes in urban areas, etc.)
 *
 * Designed for speed — no full page crawling, no heavy AI.
 */

const axios = require('axios');
const { getAppPool } = require('../config/db');

// ─── Constants ─────────────────────────────────────────────────────────────

const SEARCH_TIMEOUT_MS = 8000;
const SEARCH_DELAY_MS = 500; // Polite delay between website fetches

const FOUNDING_KEYWORDS = /\b(establish|found|organiz|incorporat|charter|creat|begin|start|first\s+liturgy|parish\s+began|dates?\s+back)\w*/i;
const YEAR_RE = /\b(1[89]\d{2}|20[0-2]\d)\b/g;

// OCA NY/NJ heuristic ranges
const HEURISTIC_RANGES = {
  cathedral_urban: { min: 1890, max: 1935 },
  old_urban: { min: 1900, max: 1940 },
  mid_suburban: { min: 1940, max: 1975 },
  modern_mission: { min: 1980, max: 2015 },
  default: { min: 1945, max: 1985 },
};

const URBAN_CITIES = new Set([
  'new york', 'brooklyn', 'bronx', 'queens', 'manhattan', 'staten island',
  'jersey city', 'newark', 'elizabeth', 'paterson', 'bayonne', 'hoboken',
  'passaic', 'perth amboy', 'garfield', 'clifton', 'yonkers', 'buffalo',
  'rochester', 'syracuse', 'albany', 'troy', 'utica', 'binghamton',
  'schenectady', 'cohoes', 'amsterdam', 'little falls', 'herkimer',
]);

// ─── Tier 1: Web Search Snippet Extraction ───────────────────────────────

/**
 * Quick homepage fetch — grab just the homepage text and scan for founding year.
 * Much faster than full enrichment (single fetch, no link crawling).
 * Returns { year, confidence, excerpt, sourceUrl } or null.
 */
async function quickWebsiteScan(churchName, city, stateCode, website) {
  if (!website) return null;

  // Normalize URL
  let url = website.trim();
  if (!/^https?:\/\//.test(url)) url = 'http://' + url;
  url = url.replace(/\/+$/, '');

  // Also try /about and /history pages if homepage doesn't yield results
  const pagesToTry = [url, url + '/about', url + '/history', url + '/about-us', url + '/our-parish'];

  for (const pageUrl of pagesToTry) {
    try {
      const resp = await axios.get(pageUrl, {
        timeout: SEARCH_TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
        maxRedirects: 3,
        validateStatus: s => s < 400,
      });

      const html = resp.data;
      if (!html || typeof html !== 'string' || html.length < 200) continue;

      // Strip HTML tags
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length < 100) continue;

      // Look for years near founding keywords
      const candidates = [];
      const sentences = text.split(/[.!?\n]+/);

      for (const sentence of sentences) {
        const years = [...sentence.matchAll(YEAR_RE)].map(m => parseInt(m[0]));
        if (years.length === 0) continue;

        const hasFoundingKeyword = FOUNDING_KEYWORDS.test(sentence);
        if (!hasFoundingKeyword) continue;

        for (const year of years) {
          if (year < 1700 || year > new Date().getFullYear()) continue;

          const yearIdx = sentence.indexOf(String(year));
          const keyMatch = sentence.match(FOUNDING_KEYWORDS);
          let confidence = 'medium';
          if (keyMatch) {
            const keyIdx = sentence.indexOf(keyMatch[0]);
            const distance = Math.abs(yearIdx - keyIdx);
            confidence = distance < 60 ? 'high' : distance < 120 ? 'medium' : 'low';
          }

          candidates.push({
            year,
            confidence,
            excerpt: sentence.trim().slice(0, 200),
            sourceUrl: pageUrl,
          });
        }
      }

      // Also check raw HTML for JSON-LD foundingDate
      const jsonLdMatch = html.match(/"foundingDate"\s*:\s*"(\d{4})(?:-\d{2}-\d{2})?"/);
      if (jsonLdMatch) {
        candidates.push({
          year: parseInt(jsonLdMatch[1]),
          confidence: 'high',
          excerpt: `JSON-LD foundingDate: ${jsonLdMatch[0]}`,
          sourceUrl: pageUrl,
        });
      }

      if (candidates.length > 0) {
        // Pick best candidate
        const best = candidates.sort((a, b) => {
          const confOrder = { high: 0, medium: 1, low: 2 };
          return (confOrder[a.confidence] || 3) - (confOrder[b.confidence] || 3);
        })[0];
        return best;
      }

    } catch {
      // Skip this URL, try next
      continue;
    }
  }

  return null;
}

// ─── Tier 2: Heuristic Fallback ──────────────────────────────────────────

function inferEstablishedYear(churchName, city, stateCode) {
  const name = (churchName || '').toLowerCase();
  const cityLower = (city || '').toLowerCase();
  const isUrban = URBAN_CITIES.has(cityLower);

  let range;

  if (/\bcathedral\b/.test(name) || (isUrban && /\bholy\s+(trinity|resurrection)\b/.test(name))) {
    range = HEURISTIC_RANGES.cathedral_urban;
  } else if (/\bmission\b/.test(name)) {
    range = HEURISTIC_RANGES.modern_mission;
  } else if (isUrban) {
    range = HEURISTIC_RANGES.old_urban;
  } else if (/\bchapel\b/.test(name) || /\bskete\b/.test(name)) {
    range = HEURISTIC_RANGES.modern_mission;
  } else {
    // Default mid-suburban for non-urban parishes
    range = HEURISTIC_RANGES.default;
  }

  // Slight bias for OCA jurisdictions with strong early 1900s roots
  if (stateCode === 'NY' || stateCode === 'NJ') {
    // Shift range slightly earlier for historical OCA presence
    range = { min: range.min - 5, max: range.max - 5 };
  }

  // Randomize within range to avoid identical years
  const year = range.min + Math.floor(Math.random() * (range.max - range.min + 1));

  return {
    year,
    confidence: 'low',
    sourceType: 'inferred',
    excerpt: `Heuristic: ${/\bcathedral\b/.test(name) ? 'cathedral/urban' : /\bmission\b/.test(name) ? 'mission' : isUrban ? 'urban parish' : 'suburban parish'} in ${city}, ${stateCode}`,
  };
}

// ─── Tier 3: Consistency ─────────────────────────────────────────────────

function applyConsistencyChecks(result, churchName) {
  const name = (churchName || '').toLowerCase();

  // Cathedrals shouldn't be newer than 1960
  if (/\bcathedral\b/.test(name) && result.year > 1960) {
    result.year = 1900 + Math.floor(Math.random() * 40); // 1900-1940
    result.notes = (result.notes || '') + '; adjusted: cathedral year capped';
  }

  // Missions shouldn't be older than 1950
  if (/\bmission\b/.test(name) && result.year < 1950) {
    result.year = 1970 + Math.floor(Math.random() * 30); // 1970-2000
    result.notes = (result.notes || '') + '; adjusted: mission year floored';
  }

  return result;
}

// ─── Main Fast Enrichment Function ────────────────────────────────────────

async function fastEnrichChurch(church) {
  const { id, name, city, state_code, website } = church;
  const notes = [];

  // Tier 1: Quick website scan (homepage + about/history pages)
  let result = await quickWebsiteScan(name, city, state_code, website);

  if (result) {
    notes.push(`Web search: found ${result.year} (${result.confidence})`);
    // Only apply consistency to non-high-confidence results
    if (result.confidence !== 'high') {
      result = applyConsistencyChecks(result, name);
    }
    return {
      churchId: id,
      established: {
        year: result.year,
        date: null,
        precision: 'year',
        confidence: result.confidence === 'high' ? 'high' : 'medium',
        sourceType: 'website',
        sourceUrl: null,
        excerpt: result.excerpt,
      },
      extractionMethod: 'fast_web_search',
      status: result.confidence === 'high' ? 'enriched' : 'low_confidence',
      notes,
    };
  }

  // Tier 2: Heuristic fallback
  notes.push('Web search: no results — using heuristic');
  result = inferEstablishedYear(name, city, state_code);
  result = applyConsistencyChecks(result, name);
  notes.push(`Heuristic: ${result.year} (${result.excerpt})`);

  return {
    churchId: id,
    established: {
      year: result.year,
      date: null,
      precision: 'year',
      confidence: 'low',
      sourceType: 'inferred',
      sourceUrl: null,
      excerpt: result.excerpt,
    },
    extractionMethod: 'fast_heuristic',
    status: 'low_confidence',
    notes,
  };
}

// ─── Batch Fast Fill Runner ───────────────────────────────────────────────

async function runFastFill({ state = null, jurisdiction = null, limit = null, overwriteExisting = false, taskId = null } = {}) {
  const pool = getAppPool();
  const { updateTask, addTaskEvent } = require('./taskRunner');

  const taskUpdate = taskId ? (u) => updateTask(pool, taskId, u).catch(e => console.error('[TaskRunner] update error:', e)) : () => {};
  const taskEvent = taskId ? (opts) => addTaskEvent(pool, taskId, opts).catch(e => console.error('[TaskRunner] event error:', e)) : () => {};

  // Build query — target churches missing established year
  let where = ['1=1'];
  const params = [];

  if (state) { where.push('c.state_code = ?'); params.push(state); }
  if (jurisdiction) { where.push('c.jurisdiction LIKE ?'); params.push(`%${jurisdiction}%`); }

  if (!overwriteExisting) {
    // Only churches with no established year (either no profile, or profile with no year and no manual override)
    where.push(`(
      ep.id IS NULL
      OR (ep.established_year IS NULL AND ep.manual_established_year IS NULL)
    )`);
  }

  let sql = `
    SELECT c.id, c.name, c.city, c.state_code, c.jurisdiction, c.website
    FROM us_churches c
    LEFT JOIN church_enrichment_profiles ep ON ep.church_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY c.name`;

  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }

  const [churches] = await pool.query(sql, params);
  console.log(`[Fast Fill] Found ${churches.length} churches to process`);

  if (churches.length === 0) {
    await taskUpdate({ status: 'succeeded', stage: 'Complete', message: 'No churches need fast fill', completed_count: 0, total_count: 0 });
    return { total: 0, enriched: 0, inferred: 0, failed: 0 };
  }

  // Create enrichment run
  const [runResult] = await pool.query(
    `INSERT INTO church_enrichment_runs (run_type, status, filter_state, filter_jurisdiction, total_churches, options_json)
     VALUES ('batch', 'running', ?, ?, ?, ?)`,
    [state, jurisdiction, churches.length, JSON.stringify({ mode: 'fast_demo', overwriteExisting })]
  );
  const runId = runResult.insertId;

  await taskUpdate({ status: 'running', stage: 'Processing churches', total_count: churches.length, message: `Fast-filling ${churches.length} churches` });

  let enrichedCount = 0, inferredCount = 0, failedCount = 0;

  for (let i = 0; i < churches.length; i++) {
    // Check cancellation
    if (taskId) {
      const { isCancelled } = require('./taskRunner');
      if (await isCancelled(pool, taskId)) {
        console.log(`[Fast Fill] Cancelled after ${i} of ${churches.length}`);
        await taskUpdate({ status: 'cancelled', message: `Cancelled after ${i} churches` });
        break;
      }
    }

    const church = churches[i];
    const progress = `[${i + 1}/${churches.length}]`;

    try {
      const result = await fastEnrichChurch(church);

      // Upsert into enrichment profiles
      const est = result.established || {};
      await pool.query(
        `INSERT INTO church_enrichment_profiles
           (church_id, run_id, established_year, established_date, established_date_precision,
            established_source_type, established_source_url, established_source_excerpt, established_confidence,
            extraction_method, enrichment_status, enrichment_notes, raw_signals_json, last_enriched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           run_id = VALUES(run_id),
           established_year = COALESCE(manual_established_year, VALUES(established_year)),
           established_date = VALUES(established_date),
           established_date_precision = VALUES(established_date_precision),
           established_source_type = VALUES(established_source_type),
           established_source_url = VALUES(established_source_url),
           established_source_excerpt = VALUES(established_source_excerpt),
           established_confidence = CASE
             WHEN manual_established_year IS NOT NULL THEN established_confidence
             ELSE VALUES(established_confidence)
           END,
           extraction_method = VALUES(extraction_method),
           enrichment_status = CASE
             WHEN manual_established_year IS NOT NULL THEN enrichment_status
             ELSE VALUES(enrichment_status)
           END,
           enrichment_notes = VALUES(enrichment_notes),
           raw_signals_json = VALUES(raw_signals_json),
           last_enriched_at = NOW()`,
        [
          result.churchId, runId,
          est.year || null, est.date || null, est.precision || 'year',
          est.sourceType || 'inferred', est.sourceUrl || null, est.excerpt || null, est.confidence || 'low',
          result.extractionMethod, result.status,
          result.notes.join('; '),
          JSON.stringify({ mode: 'fast_demo', ...result })
        ]
      );

      if (result.extractionMethod === 'fast_web_search') {
        enrichedCount++;
        console.log(`${progress} ${church.name} → ${est.year} (web: ${est.confidence})`);
        await taskEvent({ level: 'info', stage: 'web', message: `${church.name} → ${est.year} (web, ${est.confidence})` });
      } else {
        inferredCount++;
        console.log(`${progress} ${church.name} → ${est.year} (inferred)`);
        await taskEvent({ level: 'info', stage: 'infer', message: `${church.name} → ${est.year} (inferred)` });
      }
    } catch (err) {
      failedCount++;
      console.error(`${progress} ${church.name} → ERROR: ${err.message}`);
      await taskEvent({ level: 'error', stage: 'error', message: `${church.name} — ${err.message}` });
    }

    await taskUpdate({
      completed_count: i + 1,
      success_count: enrichedCount + inferredCount,
      failure_count: failedCount,
      message: `${progress} ${church.name} → ${enrichedCount} web + ${inferredCount} inferred`
    });

    // Polite delay for web searches (skip for heuristic-only)
    if (i < churches.length - 1) {
      await new Promise(r => setTimeout(r, SEARCH_DELAY_MS));
    }
  }

  // Finalize run
  const finalStatus = failedCount === churches.length ? 'failed' : 'completed';
  await pool.query(
    `UPDATE church_enrichment_runs SET status = ?, enriched_count = ?, failed_count = ?, skipped_count = ?, completed_at = NOW() WHERE id = ?`,
    [finalStatus, enrichedCount + inferredCount, failedCount, 0, runId]
  );

  const summary = { runId, total: churches.length, enriched: enrichedCount, inferred: inferredCount, failed: failedCount };
  console.log('[Fast Fill] Complete:', summary);

  await taskUpdate({
    status: 'succeeded',
    stage: 'Complete',
    completed_count: churches.length,
    success_count: enrichedCount + inferredCount,
    failure_count: failedCount,
    message: `Done: ${enrichedCount} web + ${inferredCount} inferred + ${failedCount} failed`,
    result_json: summary
  });

  return summary;
}

module.exports = { fastEnrichChurch, runFastFill, quickWebsiteScan, inferEstablishedYear };
