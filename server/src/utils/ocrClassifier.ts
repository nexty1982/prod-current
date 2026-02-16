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

const KEYWORD_PATTERNS: Record<string, RegExp[]> = {
  baptism: [
    /\bbaptis[me]/i,
    /\bbaptiz/i,
    /\bchristening/i,
    /\bgodparent/i,
    /\bgodmother/i,
    /\bgodfather/i,
    /\bsponsor/i,
    /\bchrismat/i,
    /\bbaptism/i,
    /\bβάπτισ/i,
    /\bβαπτιστ/i,
    /\bνονό[ςσ]/i,
    /\bνονά/i,
    /\bкрещен/i,
    /\bкрёстн/i,
    /\bchild.?name/i,
    /\bdate.?of.?birth/i,
    /\bplace.?of.?birth/i,
    /\binfant/i,
  ],
  marriage: [
    /\bmarriag/i,
    /\bwedding/i,
    /\bmatrimon/i,
    /\bbride/i,
    /\bgroom/i,
    /\bcrowning/i,
    /\bστεφάνωση/i,
    /\bστέφαν/i,
    /\bγάμο[υς]/i,
    /\bνυμφίο/i,
    /\bνύφη/i,
    /\bбракосочетан/i,
    /\bвенчан/i,
    /\bженатый/i,
    /\bwitness/i,
    /\bdate.?of.?marriage/i,
    /\bbest.?man/i,
    /\bmaid.?of.?honor/i,
    /\bnuptial/i,
  ],
  funeral: [
    /\bfuneral/i,
    /\bdeath/i,
    /\bburial/i,
    /\bdeceased/i,
    /\brepose/i,
    /\bκηδεία/i,
    /\bθάνατο/i,
    /\bταφ[ήη]/i,
    /\bотпеван/i,
    /\bпохорон/i,
    /\bсмерт/i,
    /\bdate.?of.?death/i,
    /\bdate.?of.?burial/i,
    /\bcause.?of.?death/i,
    /\bage.?at.?death/i,
    /\bnext.?of.?kin/i,
    /\binterment/i,
    /\bobitu/i,
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
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        scores[type] += matches.length;
        hits[type].push(pattern.source.replace(/\\b/g, '').replace(/\[.*?\]/g, '?'));
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
