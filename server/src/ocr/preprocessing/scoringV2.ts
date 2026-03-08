/**
 * Review Routing v2 — Phase 4.1
 *
 * Field-level scoring with explainable flags using provenance + validators.
 * Deterministic rules only (no ML).
 *
 * Consumes:
 *   - tokens_normalized.json
 *   - table_provenance.json
 *   - record_candidates.json
 *   - record_candidates_provenance.json
 *
 * Produces:
 *   - scoring_v2.json (companion artifact, never modifies existing schemas)
 *
 * Pure functions: no DB access, no side effects.
 */

// ── Public types ─────────────────────────────────────────────────────────────

export type ReasonCode =
  | 'DATE_PARSE_FAIL'
  | 'LOW_OCR_CONF'
  | 'AMBIGUOUS_COLUMN'
  | 'MISSING_REQUIRED'
  | 'SHORT_VALUE'
  | 'SUSPICIOUS_CHARS'
  | 'FIELD_OK';

export interface FieldScore {
  field_name: string;
  cell_confidence: number | null;
  validity_score: number;
  field_score: number;
  needs_review: boolean;
  reasons: ReasonCode[];
  /** Token IDs from provenance for UI highlighting */
  token_ids: number[];
  /** Bbox union from provenance for UI highlighting */
  bbox_union: [number, number, number, number] | null;
}

export interface RowScore {
  candidate_index: number;
  source_row_index: number;
  row_score: number;
  needs_review: boolean;
  reasons: ReasonCode[];
  fields: FieldScore[];
}

export interface ScoringV2Result {
  method: string;
  thresholds: {
    low_ocr_conf: number;
    date_required_types: string[];
    min_value_length: number;
    field_review_threshold: number;
    row_review_threshold: number;
  };
  rows: RowScore[];
  page_score_v2: number;
  routing_recommendation: string;
  summary: {
    total_rows: number;
    rows_need_review: number;
    total_fields: number;
    fields_flagged: number;
    flag_counts: Record<ReasonCode, number>;
  };
  recorded_at: string;
}

export interface ScoringV2Options {
  /** Threshold below which token confidence triggers LOW_OCR_CONF. Default 0.70 */
  lowOcrConfThreshold?: number;
  /** Minimum value length before SHORT_VALUE is flagged. Default 2 */
  minValueLength?: number;
  /** Field score below which needs_review is set. Default 0.65 */
  fieldReviewThreshold?: number;
  /** Row score below which row needs_review is set. Default 0.60 */
  rowReviewThreshold?: number;
  /** Record type for context-aware validation. */
  recordType?: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LOW_OCR_CONF = 0.70;
const DEFAULT_MIN_VALUE_LENGTH = 2;
const DEFAULT_FIELD_REVIEW_THRESHOLD = 0.65;
const DEFAULT_ROW_REVIEW_THRESHOLD = 0.60;

/** Fields that should contain parseable dates. */
const DATE_FIELDS = new Set([
  'date', 'date_of_birth', 'date_of_baptism', 'date_of_marriage',
  'date_of_death', 'date_of_funeral', 'burial_date',
]);

/** Required fields by record type. */
const REQUIRED_FIELDS: Record<string, string[]> = {
  baptism: ['child_name', 'date_of_baptism', 'date_of_birth'],
  marriage: ['groom_name', 'bride_name', 'date_of_marriage'],
  funeral: ['deceased_name', 'date_of_death', 'date_of_funeral'],
};

/** Characters suspicious in OCR output (likely misreads). */
const SUSPICIOUS_CHAR_RE = /[§¶†‡¤¥£€©®™◊∆∑∏∫]{2,}/;

// ── Date validation ──────────────────────────────────────────────────────────

/**
 * Check if a string is a plausible date. Returns 1.0 for valid, 0.0 for invalid.
 * Recognizes YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, month names.
 */
function dateValidityScore(value: string): number {
  if (!value || value.trim().length < 4) return 0;
  const t = value.trim();

  // Common date patterns
  if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(t)) return 1.0;
  if (/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(t)) return 1.0;

  // Month names (English, Greek, Russian partial)
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(t)) return 1.0;
  if (/\b(ιαν|φεβ|μαρ|απρ|μαι|ιουν|ιουλ|αυγ|σεπ|οκτ|νοε|δεκ)\b/i.test(t)) return 1.0;

  // At least 2 digit groups with one being 4 digits (year-like)
  const digitGroups = t.match(/\d+/g);
  if (digitGroups && digitGroups.length >= 2 && digitGroups.some(g => g.length >= 4)) return 0.8;

  return 0;
}

// ── Main scoring ─────────────────────────────────────────────────────────────

/**
 * Compute field-level and row-level scores with explainable flags.
 *
 * Field scoring:
 *   field_score = 0.7 * cell_confidence + 0.3 * validity_score
 *
 * Row scoring:
 *   row_score = min(required field_scores), or mean of all if no required fields
 *
 * Page scoring:
 *   page_score = mean of all row_scores
 */
export function computeScoringV2(
  recordCandidates: any,
  recordCandidatesProvenance: any,
  tableProvenance: any,
  normalizedTokens: any,
  opts?: ScoringV2Options,
): ScoringV2Result {
  const lowOcrConf = opts?.lowOcrConfThreshold ?? DEFAULT_LOW_OCR_CONF;
  const minValueLength = opts?.minValueLength ?? DEFAULT_MIN_VALUE_LENGTH;
  const fieldReviewThreshold = opts?.fieldReviewThreshold ?? DEFAULT_FIELD_REVIEW_THRESHOLD;
  const rowReviewThreshold = opts?.rowReviewThreshold ?? DEFAULT_ROW_REVIEW_THRESHOLD;
  const recordType = opts?.recordType ?? recordCandidates?.detectedType ?? 'unknown';

  const requiredFields = new Set(REQUIRED_FIELDS[recordType] || []);
  const dateRequiredTypes = [...DATE_FIELDS];

  const candidates: any[] = recordCandidates?.candidates || [];
  const provFields: any[] = recordCandidatesProvenance?.fields || [];
  const tokens: any[] = normalizedTokens?.tokens || [];

  // Build token lookup
  const tokenMap = new Map<number, any>();
  for (const t of tokens) {
    tokenMap.set(t.token_id, t);
  }

  // Build provenance lookup: (candidate_index, field_name) → provenance bundle
  const provLookup = new Map<string, any>();
  for (const pf of provFields) {
    provLookup.set(`${pf.candidate_index}:${pf.field_name}`, pf.provenance);
  }

  // Build cell ambiguity lookup from table provenance
  const ambiguousCells = new Set<string>();
  if (tableProvenance?.cells) {
    for (const cell of tableProvenance.cells) {
      // A cell is "ambiguous" if it has tokens that appear in multiple cells
      // We approximate: if the table_provenance came from template extraction with ambiguous tokens
      // For now, check if cell has 0 tokens but the column had content (token alignment failure)
      if (cell.provenance.token_ids.length === 0) {
        ambiguousCells.add(`${cell.row_index}:${cell.column_key}`);
      }
    }
  }

  const flagCounts: Record<ReasonCode, number> = {
    DATE_PARSE_FAIL: 0,
    LOW_OCR_CONF: 0,
    AMBIGUOUS_COLUMN: 0,
    MISSING_REQUIRED: 0,
    SHORT_VALUE: 0,
    SUSPICIOUS_CHARS: 0,
    FIELD_OK: 0,
  };

  const rows: RowScore[] = [];
  let totalFields = 0;
  let fieldsFlagged = 0;

  for (let ci = 0; ci < candidates.length; ci++) {
    const cand = candidates[ci];
    const sourceRowIndex = cand.sourceRowIndex ?? -1;
    const candFields = cand.fields || {};
    const fieldScores: FieldScore[] = [];

    // Score each field
    for (const [fieldName, rawValue] of Object.entries(candFields)) {
      const value = String(rawValue || '');
      totalFields++;

      const reasons: ReasonCode[] = [];
      let validityScore = 1.0;

      // Get provenance for this field
      const prov = provLookup.get(`${ci}:${fieldName}`);
      const tokenIds: number[] = prov?.token_ids || [];
      const bboxUnion: [number, number, number, number] | null = prov?.bbox_union || null;

      // 1. Cell confidence from provenance
      let cellConfidence: number | null = prov?.confidence ?? null;

      // If no provenance confidence, try to get from candidate confidence
      if (cellConfidence === null && typeof cand.confidence === 'number') {
        cellConfidence = cand.confidence;
      }

      // 2. LOW_OCR_CONF check
      if (cellConfidence !== null && cellConfidence < lowOcrConf) {
        reasons.push('LOW_OCR_CONF');
        validityScore *= 0.7;
      }

      // 3. DATE_PARSE_FAIL check
      if (DATE_FIELDS.has(fieldName)) {
        const dateScore = dateValidityScore(value);
        if (dateScore === 0 && value.trim().length > 0) {
          reasons.push('DATE_PARSE_FAIL');
          validityScore *= 0.3;
        } else if (dateScore < 1.0 && dateScore > 0) {
          validityScore *= (0.5 + 0.5 * dateScore);
        }
      }

      // 4. MISSING_REQUIRED check
      if (requiredFields.has(fieldName) && value.trim().length === 0) {
        reasons.push('MISSING_REQUIRED');
        validityScore = 0;
      }

      // 5. SHORT_VALUE check (non-empty but very short)
      if (value.trim().length > 0 && value.trim().length < minValueLength) {
        reasons.push('SHORT_VALUE');
        validityScore *= 0.8;
      }

      // 6. SUSPICIOUS_CHARS check
      if (SUSPICIOUS_CHAR_RE.test(value)) {
        reasons.push('SUSPICIOUS_CHARS');
        validityScore *= 0.5;
      }

      // 7. AMBIGUOUS_COLUMN check (from table provenance)
      if (ambiguousCells.has(`${sourceRowIndex}:${fieldName}`)) {
        reasons.push('AMBIGUOUS_COLUMN');
        validityScore *= 0.7;
      }

      if (reasons.length === 0) {
        reasons.push('FIELD_OK');
      }

      // Compute field score
      const confValue = cellConfidence ?? 0.5; // fallback if no confidence
      const fieldScore = Math.round((0.7 * confValue + 0.3 * validityScore) * 10000) / 10000;
      const needsReview = fieldScore < fieldReviewThreshold || reasons.some(r => r !== 'FIELD_OK');

      // Update flag counts
      for (const r of reasons) {
        flagCounts[r]++;
      }
      if (needsReview && !reasons.includes('FIELD_OK')) {
        fieldsFlagged++;
      }

      fieldScores.push({
        field_name: fieldName,
        cell_confidence: cellConfidence,
        validity_score: Math.round(validityScore * 10000) / 10000,
        field_score: fieldScore,
        needs_review: needsReview,
        reasons,
        token_ids: tokenIds,
        bbox_union: bboxUnion,
      });
    }

    // Check for missing required fields not present in candidate at all
    for (const reqField of requiredFields) {
      if (!(reqField in candFields)) {
        totalFields++;
        fieldsFlagged++;
        flagCounts.MISSING_REQUIRED++;

        fieldScores.push({
          field_name: reqField,
          cell_confidence: null,
          validity_score: 0,
          field_score: 0,
          needs_review: true,
          reasons: ['MISSING_REQUIRED'],
          token_ids: [],
          bbox_union: null,
        });
      }
    }

    // Row score = min of required field scores, or mean of all
    const requiredFieldScores = fieldScores
      .filter(f => requiredFields.has(f.field_name))
      .map(f => f.field_score);

    let rowScore: number;
    if (requiredFieldScores.length > 0) {
      rowScore = Math.min(...requiredFieldScores);
    } else {
      const allScores = fieldScores.map(f => f.field_score);
      rowScore = allScores.length > 0
        ? allScores.reduce((s, v) => s + v, 0) / allScores.length
        : 0;
    }

    rowScore = Math.round(rowScore * 10000) / 10000;
    const rowReasons = [...new Set(fieldScores.flatMap(f => f.reasons))].filter(r => r !== 'FIELD_OK') as ReasonCode[];
    const rowNeedsReview = rowScore < rowReviewThreshold || rowReasons.length > 0;

    rows.push({
      candidate_index: ci,
      source_row_index: sourceRowIndex,
      row_score: rowScore,
      needs_review: rowNeedsReview,
      reasons: rowReasons.length > 0 ? rowReasons : ['FIELD_OK'],
      fields: fieldScores,
    });
  }

  // Page score = mean of row scores
  const pageScore = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.row_score, 0) / rows.length) * 10000) / 10000
    : 0;

  const rowsNeedReview = rows.filter(r => r.needs_review).length;

  // Routing recommendation (non-breaking: doesn't change DB status)
  let routingRecommendation: string;
  if (rows.length === 0) {
    routingRecommendation = 'review';
  } else if (rowsNeedReview === 0 && pageScore >= 0.85) {
    routingRecommendation = 'accepted';
  } else if (rowsNeedReview > 0 && pageScore >= 0.60) {
    routingRecommendation = 'accepted_with_flags';
  } else if (pageScore >= 0.40) {
    routingRecommendation = 'review';
  } else {
    routingRecommendation = 'retry';
  }

  return {
    method: 'scoring_v2',
    thresholds: {
      low_ocr_conf: lowOcrConf,
      date_required_types: dateRequiredTypes,
      min_value_length: minValueLength,
      field_review_threshold: fieldReviewThreshold,
      row_review_threshold: rowReviewThreshold,
    },
    rows,
    page_score_v2: pageScore,
    routing_recommendation: routingRecommendation,
    summary: {
      total_rows: rows.length,
      rows_need_review: rowsNeedReview,
      total_fields: totalFields,
      fields_flagged: fieldsFlagged,
      flag_counts: flagCounts,
    },
    recorded_at: new Date().toISOString(),
  };
}
