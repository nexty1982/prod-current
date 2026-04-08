/**
 * i18nAuditService — Deterministic translation audit for the DB-backed i18n system.
 *
 * Runs read-only checks against translations_source + translations_localized.
 * Never mutates translation data. Parameterized by language code.
 *
 * Checks:
 *   1. Missing localized keys (source key exists, no localized row)
 *   2. Orphaned localized keys (localized row exists, no active source key)
 *   3. Identical-to-English (localized text === english text, length > 3)
 *   4. Placeholder mismatches ({name}, {year}, {count} divergence)
 *   5. Public-page keys missing from source
 *   6. Public-page keys missing from localization
 *   7. Summary counts
 */

const { getAppPool } = require('../config/db');
const path = require('path');
const fs = require('fs');

// Supported non-English language codes (must match i18n.js)
const SUPPORTED_LANGS = ['el', 'ru', 'ro', 'ka'];

// Placeholder pattern: {word} or {word_word}
const PLACEHOLDER_RE = /\{[a-zA-Z_]+\}/g;

/**
 * Extract {placeholder} tokens from a string, sorted for comparison.
 */
function extractPlaceholders(text) {
  if (!text) return [];
  return (text.match(PLACEHOLDER_RE) || []).sort();
}

/**
 * Scan frontend source files for t('key') calls used in public-facing pages.
 * Returns a sorted, deduplicated array of translation keys.
 *
 * This is a static code scan — it reads .tsx files from disk.
 */
function scanPublicPageKeys() {
  const frontendSrc = path.resolve(__dirname, '..', '..', '..', 'front-end', 'src');

  // Directories containing public-facing page components
  const scanDirs = [
    'features/pages/frontend-pages',
    'features/auth/authentication',
    'features/auth/authentication/authForms',
    'features/auth/authentication/auth1',
    'features/auth/authentication/auth2',
    'components/frontend-pages/shared/header',
    'components/frontend-pages/shared/footer',
    'components/frontend-pages/shared/c2a',
    'components/frontend-pages/homepage',
    'components/frontend-pages/homepage/records-transform',
    'components/frontend-pages/homepage/faq',
    'components/frontend-pages/portfolio',
  ];

  const keyPattern = /t\(['"]([a-zA-Z_]+\.[a-zA-Z0-9_.]+)['"]\)/g;
  const keys = new Set();

  for (const dir of scanDirs) {
    const fullDir = path.join(frontendSrc, dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(fullDir, file), 'utf8');
      let match;
      while ((match = keyPattern.exec(content)) !== null) {
        keys.add(match[1]);
      }
    }
  }

  return [...keys].sort();
}

/**
 * Run a full translation audit for a given language.
 *
 * @param {string} lang - Language code (e.g. 'ka', 'el', 'ru', 'ro')
 * @param {object} [options]
 * @param {boolean} [options.includePublicPageScan=true] - Run static code scan
 * @returns {Promise<object>} Audit result
 */
async function runAudit(lang, options = {}) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(`Unsupported language code: "${lang}". Supported: ${SUPPORTED_LANGS.join(', ')}`);
  }

  const { includePublicPageScan = true } = options;
  const pool = getAppPool();

  // ── 1. Fetch source keys ──────────────────────────────────────────
  const [sourceRows] = await pool.query(
    'SELECT translation_key, english_text, namespace FROM translations_source WHERE is_active = 1 ORDER BY translation_key'
  );
  const sourceMap = new Map(); // key → { english_text, namespace }
  for (const row of sourceRows) {
    sourceMap.set(row.translation_key, { english_text: row.english_text, namespace: row.namespace });
  }

  // ── 2. Fetch localized keys ───────────────────────────────────────
  const [localizedRows] = await pool.query(
    'SELECT translation_key, translated_text, status FROM translations_localized WHERE language_code = ? ORDER BY translation_key',
    [lang]
  );
  const localizedMap = new Map(); // key → { translated_text, status }
  for (const row of localizedRows) {
    localizedMap.set(row.translation_key, { translated_text: row.translated_text, status: row.status });
  }

  // ── 3. Missing localized keys ─────────────────────────────────────
  const missingLocalizedKeys = [];
  for (const key of sourceMap.keys()) {
    if (!localizedMap.has(key)) {
      missingLocalizedKeys.push(key);
    }
  }

  // ── 4. Orphaned localized keys ────────────────────────────────────
  const orphanedLocalizedKeys = [];
  for (const key of localizedMap.keys()) {
    if (!sourceMap.has(key)) {
      orphanedLocalizedKeys.push(key);
    }
  }

  // ── 5. Identical-to-English (copy-through) ────────────────────────
  const identicalToEnglishKeys = [];
  for (const [key, loc] of localizedMap) {
    const src = sourceMap.get(key);
    if (!src) continue;
    // Only flag if the value is non-trivial (length > 3) — short values like "5" or "#" are expected
    if (loc.translated_text === src.english_text && src.english_text.length > 3) {
      identicalToEnglishKeys.push(key);
    }
  }

  // ── 6. Placeholder mismatches ─────────────────────────────────────
  const placeholderMismatchKeys = [];
  for (const [key, loc] of localizedMap) {
    const src = sourceMap.get(key);
    if (!src) continue;
    const enPh = extractPlaceholders(src.english_text);
    const locPh = extractPlaceholders(loc.translated_text);
    if (JSON.stringify(enPh) !== JSON.stringify(locPh)) {
      placeholderMismatchKeys.push({
        key,
        english: enPh,
        localized: locPh,
      });
    }
  }

  // ── 7. Public-page key scan ───────────────────────────────────────
  let publicPageAudit = null;
  if (includePublicPageScan) {
    try {
      const publicKeys = scanPublicPageKeys();
      const missingInSource = publicKeys.filter(k => !sourceMap.has(k));
      const missingInLocalized = publicKeys.filter(k => sourceMap.has(k) && !localizedMap.has(k));

      publicPageAudit = {
        totalKeysUsed: publicKeys.length,
        missingInSource,
        missingInLocalized,
      };
    } catch (err) {
      publicPageAudit = { error: `Public page scan failed: ${err.message}` };
    }
  }

  // ── 8. Build result ───────────────────────────────────────────────
  const result = {
    language: lang,
    timestamp: new Date().toISOString(),
    summary: {
      totalSourceKeys: sourceMap.size,
      totalLocalizedKeys: localizedMap.size,
      missingLocalized: missingLocalizedKeys.length,
      orphanedLocalized: orphanedLocalizedKeys.length,
      identicalToEnglish: identicalToEnglishKeys.length,
      placeholderMismatches: placeholderMismatchKeys.length,
      publicPageKeysUsed: publicPageAudit ? publicPageAudit.totalKeysUsed : null,
      publicPageMissingInSource: publicPageAudit ? (publicPageAudit.missingInSource || []).length : null,
      publicPageMissingInLocalized: publicPageAudit ? (publicPageAudit.missingInLocalized || []).length : null,
    },
    missingLocalizedKeys,
    orphanedLocalizedKeys,
    identicalToEnglishKeys,
    placeholderMismatchKeys,
    publicPageAudit,
  };

  return result;
}

/**
 * Run audit for all supported languages.
 * @returns {Promise<object[]>}
 */
async function runAuditAll() {
  const results = [];
  for (const lang of SUPPORTED_LANGS) {
    results.push(await runAudit(lang));
  }
  return results;
}

module.exports = {
  runAudit,
  runAuditAll,
  scanPublicPageKeys,
  extractPlaceholders,
  SUPPORTED_LANGS,
};
