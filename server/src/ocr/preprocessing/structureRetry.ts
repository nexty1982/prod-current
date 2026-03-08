/**
 * Structure-Aware OCR Retry — Phase 2.3
 *
 * Computes a structure sanity score from table extraction / record candidate
 * outputs and decides whether to retry OCR with an alternate strategy.
 *
 * Algorithm: structure_gate_retry_v1
 *
 * Pure function: no DB access, no side effects.
 */

// ── Public types ─────────────────────────────────────────────────────────────

export type RetryStrategy = 'ALT_HINTS' | 'BINARIZED_INPUT' | 'DROP_HEADER_STRIP' | 'NONE';

export interface StructureSignals {
  /** Number of data rows detected (excludes header). */
  dataRowCount: number;
  /** Number of columns detected. */
  columnCount: number;
  /** Fraction of cells that are non-empty (0..1). */
  cellFillRate: number;
  /** Fraction of expected date columns that parsed successfully (0..1). -1 if no date columns. */
  dateFieldRate: number;
  /** Average characters per data row. */
  tokenDensity: number;
  /** Ratio of header tokens to total tokens (0..1). High = header dominance. */
  headerDominanceRatio: number;
}

export interface StructureAssessment {
  structureScore: number;
  reasons: string[];
  signals: StructureSignals;
}

export interface RetryDecision {
  shouldRetry: boolean;
  strategy: RetryStrategy;
  details: Record<string, any>;
}

export interface RetryPlan {
  method: string;
  initial: StructureAssessment;
  retry: RetryDecision;
  winner: 'initial' | 'retry';
  final: StructureAssessment;
}

export interface StructureRetryOptions {
  /** Score threshold below which retry is triggered. Default 0.65. */
  retryThreshold?: number;
  /** Whether Step 2.2 already performed a language hint retry for this page. Default false. */
  altHintsAlreadyUsed?: boolean;
  /** Whether a binarized input variant exists on disk. Default false. */
  binarizedInputAvailable?: boolean;
  /** Fraction of image height to strip from top for DROP_HEADER_STRIP. Default 0.12. */
  headerStripFrac?: number;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_RETRY_THRESHOLD = 0.65;
const DEFAULT_HEADER_STRIP_FRAC = 0.12;

// ── Score computation ────────────────────────────────────────────────────────

/**
 * Compute structure sanity score from table extraction and record candidate outputs.
 *
 * Score breakdown (0..1):
 *   +0.25  dataRowCount >= 1
 *   +0.25  cellFillRate >= 0.30
 *   +0.20  tokenDensity >= 10 chars per row
 *   +0.15  headerDominanceRatio < 0.50
 *   +0.15  dateFieldRate > 0 (or no date columns expected)
 */
export function computeStructureScore(signals: StructureSignals): StructureAssessment {
  let score = 0;
  const reasons: string[] = [];

  // 1. Row count sanity (0.25)
  if (signals.dataRowCount >= 1) {
    score += 0.25;
  } else {
    reasons.push('NO_DATA_ROWS');
  }

  // 2. Cell fill rate (0.25)
  if (signals.cellFillRate >= 0.30) {
    score += 0.25;
  } else if (signals.cellFillRate >= 0.15) {
    score += 0.12;
    reasons.push('LOW_CELL_FILL');
  } else {
    reasons.push('VERY_LOW_CELL_FILL');
  }

  // 3. Token density (0.20)
  if (signals.tokenDensity >= 10) {
    score += 0.20;
  } else if (signals.tokenDensity >= 3) {
    score += 0.10;
    reasons.push('LOW_TOKEN_DENSITY');
  } else {
    reasons.push('VERY_LOW_TOKEN_DENSITY');
  }

  // 4. Header dominance (0.15)
  if (signals.headerDominanceRatio < 0.50) {
    score += 0.15;
  } else {
    reasons.push('HEADER_DOMINANT');
  }

  // 5. Date field validity (0.15)
  if (signals.dateFieldRate < 0) {
    // No date columns expected — give full credit
    score += 0.15;
  } else if (signals.dateFieldRate > 0) {
    score += 0.15 * Math.min(1, signals.dateFieldRate);
  } else {
    reasons.push('NO_VALID_DATES');
  }

  if (reasons.length === 0) {
    reasons.push('STRUCTURE_OK');
  }

  return {
    structureScore: Math.round(score * 1000) / 1000,
    reasons,
    signals,
  };
}

// ── Strategy selection ───────────────────────────────────────────────────────

/**
 * Choose a retry strategy based on the structure assessment and available options.
 */
export function selectRetryStrategy(
  assessment: StructureAssessment,
  opts?: StructureRetryOptions,
): RetryDecision {
  const retryThreshold = opts?.retryThreshold ?? DEFAULT_RETRY_THRESHOLD;
  const altHintsAlreadyUsed = opts?.altHintsAlreadyUsed ?? false;
  const binarizedInputAvailable = opts?.binarizedInputAvailable ?? false;
  const headerStripFrac = opts?.headerStripFrac ?? DEFAULT_HEADER_STRIP_FRAC;

  if (assessment.structureScore >= retryThreshold) {
    return {
      shouldRetry: false,
      strategy: 'NONE',
      details: { reason: 'score_above_threshold', score: assessment.structureScore, threshold: retryThreshold },
    };
  }

  const reasons = assessment.reasons;
  const signals = assessment.signals;

  // Priority 1: Header dominance + low fill → DROP_HEADER_STRIP
  if (reasons.includes('HEADER_DOMINANT') || (reasons.includes('VERY_LOW_CELL_FILL') && signals.dataRowCount <= 1)) {
    return {
      shouldRetry: true,
      strategy: 'DROP_HEADER_STRIP',
      details: {
        reason: 'header_dominant_or_empty_cells',
        headerStripFrac,
        headerDominanceRatio: signals.headerDominanceRatio,
        cellFillRate: signals.cellFillRate,
      },
    };
  }

  // Priority 2: Very low token density → BINARIZED_INPUT (if available)
  if ((reasons.includes('VERY_LOW_TOKEN_DENSITY') || reasons.includes('NO_DATA_ROWS')) && binarizedInputAvailable) {
    return {
      shouldRetry: true,
      strategy: 'BINARIZED_INPUT',
      details: {
        reason: 'low_token_density_binarized_available',
        tokenDensity: signals.tokenDensity,
      },
    };
  }

  // Priority 3: General low quality → ALT_HINTS (if not already used by Step 2.2)
  if (!altHintsAlreadyUsed) {
    return {
      shouldRetry: true,
      strategy: 'ALT_HINTS',
      details: {
        reason: 'low_quality_alt_hints_available',
        score: assessment.structureScore,
      },
    };
  }

  // Priority 4: ALT_HINTS already used, binarized available → BINARIZED_INPUT
  if (binarizedInputAvailable) {
    return {
      shouldRetry: true,
      strategy: 'BINARIZED_INPUT',
      details: {
        reason: 'alt_hints_exhausted_binarized_fallback',
        score: assessment.structureScore,
      },
    };
  }

  // No viable strategy left
  return {
    shouldRetry: false,
    strategy: 'NONE',
    details: {
      reason: 'no_viable_strategy',
      score: assessment.structureScore,
      altHintsAlreadyUsed,
      binarizedInputAvailable,
    },
  };
}

// ── Signal extraction from table_extraction.json ─────────────────────────────

/**
 * Extract StructureSignals from a table extraction result object.
 * Handles both generic_table and marriage_ledger_v1 formats.
 */
export function extractSignals(
  tableResult: any | null,
  recordCandidates: any | null,
): StructureSignals {
  if (!tableResult) {
    return {
      dataRowCount: 0,
      columnCount: 0,
      cellFillRate: 0,
      dateFieldRate: -1,
      tokenDensity: 0,
      headerDominanceRatio: 0,
    };
  }

  const dataRowCount = tableResult.data_rows ?? 0;
  const totalTokens = tableResult.total_tokens ?? 0;
  const dataTokens = tableResult.data_tokens ?? 0;

  // Column count from first table or top-level
  let columnCount = tableResult.columns_detected ?? 0;
  if (columnCount === 0 && tableResult.tables?.length > 0) {
    columnCount = tableResult.tables[0].column_count ?? 0;
  }

  // Cell fill rate: count non-empty cells across all data rows
  let totalCells = 0;
  let filledCells = 0;
  let headerTokenCount = 0;
  let dataTokenCount = 0;
  let dateColumnIndices: number[] = [];

  const tables = tableResult.tables || [];
  for (const table of tables) {
    const rows = table.rows || [];
    for (const row of rows) {
      const cells = row.cells || [];
      if (row.type === 'header') {
        for (const cell of cells) {
          headerTokenCount += (cell.content || '').length;
          // Detect date columns from header text
          const hdrText = (cell.content || '').toLowerCase();
          if (hdrText.includes('date') || hdrText.includes('ημερ') || hdrText.includes('дат')) {
            dateColumnIndices.push(cell.column_index);
          }
        }
      } else {
        for (const cell of cells) {
          totalCells++;
          const content = (cell.content || '').trim();
          if (content.length > 0) {
            filledCells++;
          }
        }
        dataTokenCount += cells.reduce((s: number, c: any) => s + (c.content || '').length, 0);
      }
    }
  }

  const cellFillRate = totalCells > 0 ? filledCells / totalCells : 0;
  const tokenDensity = dataRowCount > 0 ? dataTokenCount / dataRowCount : 0;
  const allTokens = headerTokenCount + dataTokenCount;
  const headerDominanceRatio = allTokens > 0 ? headerTokenCount / allTokens : 0;

  // Date field validity
  let dateFieldRate = -1; // -1 means no date columns expected
  if (dateColumnIndices.length > 0 && recordCandidates?.candidates) {
    const candidates = recordCandidates.candidates;
    let dateAttempts = 0;
    let dateSuccesses = 0;

    for (const cand of candidates) {
      if (!cand.fields) continue;
      for (const [key, value] of Object.entries(cand.fields)) {
        const keyLower = key.toLowerCase();
        if (keyLower.includes('date') || keyLower.includes('ημερ') || keyLower.includes('дат')) {
          dateAttempts++;
          if (looksLikeDate(value as string)) {
            dateSuccesses++;
          }
        }
      }
    }

    dateFieldRate = dateAttempts > 0 ? dateSuccesses / dateAttempts : -1;
  }

  return {
    dataRowCount,
    columnCount,
    cellFillRate,
    dateFieldRate,
    tokenDensity,
    headerDominanceRatio,
  };
}

// ── Build complete retry plan ────────────────────────────────────────────────

/**
 * Build a complete retry plan from extraction outputs.
 * This is the main entry point for Step 2.3 integration.
 */
export function buildRetryPlan(
  tableResult: any | null,
  recordCandidates: any | null,
  opts?: StructureRetryOptions,
): RetryPlan {
  const signals = extractSignals(tableResult, recordCandidates);
  const initial = computeStructureScore(signals);
  const retry = selectRetryStrategy(initial, opts);

  return {
    method: 'structure_gate_retry_v1',
    initial,
    retry,
    winner: 'initial', // updated after retry execution if applicable
    final: initial,     // updated after retry execution if applicable
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simple heuristic: does a string look like a date? */
function looksLikeDate(s: string): boolean {
  if (!s || s.trim().length < 4) return false;
  const t = s.trim();
  // Common date patterns: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, Month DD YYYY, etc.
  if (/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(t)) return true;
  if (/\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(t)) return true;
  // Month names (English, Greek, Russian partial)
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(t)) return true;
  if (/\b(ιαν|φεβ|μαρ|απρ|μαι|ιουν|ιουλ|αυγ|σεπ|οκτ|νοε|δεκ)\b/i.test(t)) return true;
  // At least 2 digit groups
  const digitGroups = t.match(/\d+/g);
  if (digitGroups && digitGroups.length >= 2 && digitGroups.some(g => g.length >= 4)) return true;
  return false;
}
