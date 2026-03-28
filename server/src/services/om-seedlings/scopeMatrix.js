/**
 * Scope Matrix — Canonical record count model for OM Seedlings
 *
 * Determines how many baptism, marriage, and funeral records a church should
 * have based on its size category and established year. The matrix defines
 * annual rates per decade bracket, producing historically plausible totals.
 *
 * Size categories align with church_enrichment_profiles.size_category enum.
 */

// ─── Annual rates per record type by size category ──────────────────────────
// Each entry: { baptism, marriage, funeral } = average records/year
// Rates are per-decade bracket to allow growth curves.

const SIZE_PROFILES = {
  mission_small: {
    label: 'Mission / Small',
    annualRates: {
      founding:  { baptism: 1.0, marriage: 0.3, funeral: 0.2 },  // first 10 years
      growing:   { baptism: 2.0, marriage: 0.8, funeral: 0.5 },  // years 10-30
      mature:    { baptism: 2.5, marriage: 1.0, funeral: 1.0 },  // years 30-60
      aging:     { baptism: 2.0, marriage: 0.8, funeral: 1.5 },  // years 60+
    },
  },
  parish_small: {
    label: 'Small Parish',
    annualRates: {
      founding:  { baptism: 2.0, marriage: 0.8, funeral: 0.4 },
      growing:   { baptism: 4.0, marriage: 1.5, funeral: 1.0 },
      mature:    { baptism: 5.0, marriage: 2.0, funeral: 2.0 },
      aging:     { baptism: 3.5, marriage: 1.5, funeral: 3.0 },
    },
  },
  parish_medium: {
    label: 'Medium Parish',
    annualRates: {
      founding:  { baptism: 3.0,  marriage: 1.2, funeral: 0.6 },
      growing:   { baptism: 6.0,  marriage: 2.5, funeral: 1.5 },
      mature:    { baptism: 8.0,  marriage: 3.5, funeral: 3.0 },
      aging:     { baptism: 6.0,  marriage: 2.5, funeral: 4.5 },
    },
  },
  parish_large: {
    label: 'Large Parish',
    annualRates: {
      founding:  { baptism: 5.0,  marriage: 2.0, funeral: 1.0 },
      growing:   { baptism: 10.0, marriage: 4.0, funeral: 2.5 },
      mature:    { baptism: 14.0, marriage: 5.5, funeral: 5.0 },
      aging:     { baptism: 10.0, marriage: 4.0, funeral: 7.0 },
    },
  },
  cathedral_or_major: {
    label: 'Cathedral / Major Parish',
    annualRates: {
      founding:  { baptism: 8.0,  marriage: 3.0, funeral: 1.5 },
      growing:   { baptism: 16.0, marriage: 6.0, funeral: 4.0 },
      mature:    { baptism: 22.0, marriage: 8.0, funeral: 7.0 },
      aging:     { baptism: 16.0, marriage: 6.0, funeral: 10.0 },
    },
  },
};

// ─── Lifecycle phase boundaries (years since founding) ──────────────────────

const LIFECYCLE_PHASES = [
  { key: 'founding', maxAge: 10 },
  { key: 'growing',  maxAge: 30 },
  { key: 'mature',   maxAge: 60 },
  { key: 'aging',    maxAge: Infinity },
];

// ─── Size inference from church name ────────────────────────────────────────

function inferSizeFromName(churchName) {
  const name = (churchName || '').toLowerCase();
  if (/\bcathedral\b/.test(name)) return 'cathedral_or_major';
  if (/\bmonastery\b|\bhermitage\b|\bskete\b/.test(name)) return 'mission_small';
  if (/\bmission\b/.test(name)) return 'mission_small';
  if (/\bchapel\b/.test(name)) return 'parish_small';
  return 'parish_medium'; // default assumption for unnamed parishes
}

// ─── Get lifecycle phase for a given year ───────────────────────────────────

function getLifecyclePhase(establishedYear, targetYear) {
  const age = targetYear - establishedYear;
  for (const phase of LIFECYCLE_PHASES) {
    if (age <= phase.maxAge) return phase.key;
  }
  return 'aging';
}

// ─── Compute target counts for a church ─────────────────────────────────────

/**
 * Calculate projected record counts for a church over its lifetime.
 *
 * @param {number} establishedYear - Year the church was founded
 * @param {string} sizeCategory - One of the SIZE_PROFILES keys
 * @param {object} [options]
 * @param {number} [options.fromYear] - Override start year (default: establishedYear)
 * @param {number} [options.toYear] - Override end year (default: current year)
 * @param {string[]} [options.recordTypes] - Subset of ['baptism','marriage','funeral']
 * @param {number} [options.varianceFactor] - Random variance ±% (default: 0.15)
 * @returns {{ totals, byYear, yearSpan, sizeCategory, establishedYear }}
 */
function computeTargetCounts(establishedYear, sizeCategory, options = {}) {
  const currentYear = new Date().getFullYear();
  const fromYear = options.fromYear || establishedYear;
  const toYear = options.toYear || currentYear;
  const recordTypes = options.recordTypes || ['baptism', 'marriage', 'funeral'];
  const varianceFactor = options.varianceFactor ?? 0.15;

  const profile = SIZE_PROFILES[sizeCategory];
  if (!profile) {
    throw new Error(`Unknown size category: ${sizeCategory}. Valid: ${Object.keys(SIZE_PROFILES).join(', ')}`);
  }

  const totals = { baptism: 0, marriage: 0, funeral: 0 };
  const byYear = {};

  for (let year = fromYear; year <= toYear; year++) {
    const phase = getLifecyclePhase(establishedYear, year);
    const rates = profile.annualRates[phase];

    byYear[year] = {};
    for (const type of recordTypes) {
      // Apply variance: base rate ± varianceFactor, with Poisson-like rounding
      const baseRate = rates[type] || 0;
      const variance = 1 + (Math.random() * 2 - 1) * varianceFactor;
      const adjusted = Math.max(0, baseRate * variance);
      // Use probabilistic rounding for fractional counts
      const count = Math.floor(adjusted) + (Math.random() < (adjusted % 1) ? 1 : 0);
      byYear[year][type] = count;
      totals[type] += count;
    }
  }

  return {
    totals,
    byYear,
    yearSpan: { from: fromYear, to: toYear, years: toYear - fromYear + 1 },
    sizeCategory,
    sizeLabel: profile.label,
    establishedYear,
  };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  SIZE_PROFILES,
  LIFECYCLE_PHASES,
  inferSizeFromName,
  getLifecyclePhase,
  computeTargetCounts,
};
