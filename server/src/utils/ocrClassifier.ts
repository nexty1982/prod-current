/**
 * OCR Record Type Classifier
 * Keyword-based classifier that suggests record type from OCR text.
 * Returns suggested_type + confidence. Unknown stays Unknown.
 */

interface ClassifierResult {
  suggested_type: 'baptism' | 'marriage' | 'funeral' | 'unknown';
  confidence: number;
  keyword_hits: Record<string, string[]>;
}

// Unicode-aware "word boundary" — JS \b is ASCII-only, so it silently fails
// for Greek/Cyrillic patterns. We use Unicode property lookarounds instead so
// the same pattern style works across English, Greek, Russian, etc.
const UB_START = '(?<![\\p{L}\\p{N}])';
const UB_END = '(?![\\p{L}\\p{N}])';

function ub(pattern: string): RegExp {
  return new RegExp(`${UB_START}${pattern}${UB_END}`, 'iu');
}

const KEYWORD_PATTERNS: Record<string, RegExp[]> = {
  baptism: [
    ub('baptis[me]'),
    ub('baptiz[\\p{L}\\p{N}]*'),
    ub('christening'),
    ub('godparent'),
    ub('godmother'),
    ub('godfather'),
    ub('sponsor[\\p{L}\\p{N}]*'),
    ub('chrismat[\\p{L}\\p{N}]*'),
    ub('baptism'),
    ub('βάπτισ[\\p{L}\\p{N}]*'),
    ub('βαπτιστ[\\p{L}\\p{N}]*'),
    ub('νονό[ςσ]'),
    ub('νονά'),
    ub('крещен[\\p{L}\\p{N}]*'),
    ub('крёстн[\\p{L}\\p{N}]*'),
    ub('child.?name'),
    ub('date.?of.?birth'),
    ub('place.?of.?birth'),
    ub('infant'),
  ],
  marriage: [
    ub('marriag[\\p{L}\\p{N}]*'),
    ub('wedding'),
    ub('matrimon[\\p{L}\\p{N}]*'),
    ub('bride'),
    ub('groom'),
    ub('crowning'),
    ub('στεφάνωση'),
    ub('στέφαν[\\p{L}\\p{N}]*'),
    ub('γάμο[υς]'),
    ub('νυμφίο[\\p{L}\\p{N}]*'),
    ub('νύφη'),
    ub('бракосочетан[\\p{L}\\p{N}]*'),
    ub('венчан[\\p{L}\\p{N}]*'),
    ub('женатый'),
    ub('witness'),
    ub('date.?of.?marriage'),
    ub('best.?man'),
    ub('maid.?of.?honor'),
    ub('nuptial'),
  ],
  funeral: [
    ub('funeral'),
    ub('death'),
    ub('burial'),
    ub('deceased'),
    ub('repose'),
    ub('κηδεία'),
    ub('θάνατο[\\p{L}\\p{N}]*'),
    ub('ταφ[ήη]'),
    ub('отпеван[\\p{L}\\p{N}]*'),
    ub('похорон[\\p{L}\\p{N}]*'),
    ub('смерт[\\p{L}\\p{N}]*'),
    ub('date.?of.?death'),
    ub('date.?of.?burial'),
    ub('cause.?of.?death'),
    ub('age.?at.?death'),
    ub('next.?of.?kin'),
    ub('interment'),
    ub('obitu[\\p{L}\\p{N}]*'),
  ],
};

const CONFIDENCE_THRESHOLD = 0.3;

export function classifyRecordType(ocrText: string): ClassifierResult {
  if (!ocrText || ocrText.trim().length === 0) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: {} };
  }

  const text = ocrText.toLowerCase();
  const scores: Record<string, number> = { baptism: 0, marriage: 0, funeral: 0 };
  const hits: Record<string, string[]> = { baptism: [], marriage: [], funeral: [] };

  for (const [type, patterns] of Object.entries(KEYWORD_PATTERNS)) {
    for (const pattern of patterns) {
      // Preserve original pattern flags but force global so we can count hits.
      // Patterns are built with iu (Unicode-aware boundaries), so we need 'u'
      // to correctly evaluate the \p{L} lookarounds for non-ASCII text.
      const globalPattern = new RegExp(pattern.source, 'giu');
      const matches = text.match(globalPattern);
      if (matches) {
        scores[type] += matches.length;
        hits[type].push(
          pattern.source
            .replace(/\(\?<!\[\\p\{L\}\\p\{N\}\]\)/g, '')
            .replace(/\(\?!\[\\p\{L\}\\p\{N\}\]\)/g, '')
            .replace(/\[.*?\]/g, '?')
        );
      }
    }
  }

  // Normalize scores
  const totalHits = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalHits === 0) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: hits };
  }

  const normalized: Record<string, number> = {};
  for (const type of Object.keys(scores)) {
    normalized[type] = scores[type] / totalHits;
  }

  // Find the best match
  let bestType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(normalized)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Only suggest if above threshold
  if (bestScore < CONFIDENCE_THRESHOLD) {
    return { suggested_type: 'unknown', confidence: 0, keyword_hits: hits };
  }

  return {
    suggested_type: bestType as ClassifierResult['suggested_type'],
    confidence: Math.round(bestScore * 1000) / 1000,
    keyword_hits: hits,
  };
}
