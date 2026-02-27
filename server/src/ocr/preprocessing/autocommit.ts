/**
 * Auto-Commit v1 — Phase 5.1
 *
 * Deterministic eligibility gate for row-level auto-commit.
 * Pure functions: no DB access, no side effects.
 *
 * Consumes:
 *   - scoring_v2.json (ScoringV2Result)
 *   - record_candidates_provenance.json (provenance coverage)
 *   - metrics.json (structure_score)
 *   - template_used flag
 *
 * Produces:
 *   - AutocommitPlan (which rows are eligible and why)
 */

import * as crypto from 'crypto';

// ── Public types ─────────────────────────────────────────────────────────────

export interface AutocommitThresholds {
  /** Row score threshold for auto-commit eligibility. Default 0.92 */
  autoCommitRowThreshold: number;
  /** Minimum provenance coverage rate for a row. Default 0.90 */
  requiredProvenanceCoverage: number;
  /** Minimum structure score (page-level). Default 0.75 */
  minStructureScore: number;
}

export interface RowEligibility {
  candidateIndex: number;
  sourceRowIndex: number;
  eligible: boolean;
  rowScore: number;
  reasons: string[];
}

export interface AutocommitPlan {
  method: 'autocommit_v1';
  batch_id: string;
  thresholds: AutocommitThresholds;
  structure_score: number | null;
  template_used: boolean;
  eligible_rows: RowEligibility[];
  skipped_rows: RowEligibility[];
  total_candidates: number;
  eligible_count: number;
  skipped_count: number;
  artifact_refs: Record<string, string | null>;
  created_at: string;
}

export interface AutocommitRowResult {
  candidateIndex: number;
  sourceRowIndex: number;
  outcome: 'committed' | 'skipped' | 'error';
  recordId: number | null;
  recordType: string | null;
  table: string | null;
  error: string | null;
}

export interface AutocommitResults {
  method: 'autocommit_v1';
  batch_id: string;
  job_id: number;
  church_id: number;
  rows: AutocommitRowResult[];
  committed_count: number;
  skipped_count: number;
  error_count: number;
  created_at: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: AutocommitThresholds = {
  autoCommitRowThreshold: 0.92,
  requiredProvenanceCoverage: 0.90,
  minStructureScore: 0.75,
};

/** Required fields by record type (same as scoringV2). */
const REQUIRED_FIELDS: Record<string, string[]> = {
  baptism: ['child_name', 'date_of_baptism', 'date_of_birth'],
  marriage: ['groom_name', 'bride_name', 'date_of_marriage'],
  funeral: ['deceased_name', 'date_of_death', 'date_of_funeral'],
};

// ── Eligibility gate ─────────────────────────────────────────────────────────

/**
 * Determine if a single row is eligible for auto-commit.
 *
 * A row is eligible when ALL of the following hold:
 *   1. row_score >= autoCommitRowThreshold
 *   2. No MISSING_REQUIRED flags on any field
 *   3. No DATE_PARSE_FAIL flags on required date fields
 *   4. Provenance coverage for this row >= requiredProvenanceCoverage
 *   5. Page-level structure_score >= minStructureScore (or no structure score available but template was used)
 */
export function isRowAutoCommittable(
  candidateIndex: number,
  scoringV2: any,
  provenance: any,
  structureScore: number | null,
  templateUsed: boolean,
  thresholds?: Partial<AutocommitThresholds>,
): RowEligibility {
  const t: AutocommitThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons: string[] = [];

  // Find scoring row
  const scoringRow = scoringV2?.rows?.find((r: any) => r.candidate_index === candidateIndex);
  if (!scoringRow) {
    return {
      candidateIndex,
      sourceRowIndex: -1,
      eligible: false,
      rowScore: 0,
      reasons: ['NO_SCORING_DATA'],
    };
  }

  const rowScore: number = scoringRow.row_score ?? 0;
  const sourceRowIndex: number = scoringRow.source_row_index ?? -1;

  // 1. Row score threshold
  if (rowScore < t.autoCommitRowThreshold) {
    reasons.push(`ROW_SCORE_LOW:${rowScore.toFixed(4)}<${t.autoCommitRowThreshold}`);
  }

  // 2. Check for MISSING_REQUIRED flags
  const fields: any[] = scoringRow.fields || [];
  const missingFields = fields.filter((f: any) =>
    f.reasons?.includes('MISSING_REQUIRED'),
  );
  if (missingFields.length > 0) {
    reasons.push(`MISSING_REQUIRED:${missingFields.map((f: any) => f.field_name).join(',')}`);
  }

  // 3. Check for DATE_PARSE_FAIL on required date fields
  const recordType = scoringV2?.thresholds?.date_required_types
    ? undefined // can't determine from thresholds alone
    : undefined;
  const dateFailFields = fields.filter((f: any) =>
    f.reasons?.includes('DATE_PARSE_FAIL'),
  );
  if (dateFailFields.length > 0) {
    reasons.push(`DATE_PARSE_FAIL:${dateFailFields.map((f: any) => f.field_name).join(',')}`);
  }

  // 4. Provenance coverage check
  if (provenance?.fields) {
    // Find provenance entries for this candidate
    const candProv = provenance.fields.filter(
      (pf: any) => pf.candidate_index === candidateIndex,
    );
    if (candProv.length > 0) {
      // Coverage = fraction of fields that have at least one token matched
      const withTokens = candProv.filter(
        (pf: any) => pf.provenance?.token_ids?.length > 0,
      );
      const coverage = withTokens.length / candProv.length;
      if (coverage < t.requiredProvenanceCoverage) {
        reasons.push(`PROVENANCE_LOW:${coverage.toFixed(2)}<${t.requiredProvenanceCoverage}`);
      }
    }
    // If no provenance entries for this candidate at all, that's also a flag
    if (candProv.length === 0) {
      reasons.push('NO_PROVENANCE_DATA');
    }
  } else {
    // No provenance at all — still allow if template was used and score is high
    if (!templateUsed) {
      reasons.push('NO_PROVENANCE_DATA');
    }
  }

  // 5. Structure score check
  if (structureScore !== null && structureScore !== undefined) {
    if (structureScore < t.minStructureScore) {
      reasons.push(`STRUCTURE_SCORE_LOW:${structureScore.toFixed(2)}<${t.minStructureScore}`);
    }
  } else if (!templateUsed) {
    // No structure score and no template — conservative: flag it
    reasons.push('NO_STRUCTURE_SCORE');
  }

  return {
    candidateIndex,
    sourceRowIndex,
    eligible: reasons.length === 0,
    rowScore,
    reasons: reasons.length > 0 ? reasons : ['ELIGIBLE'],
  };
}

// ── Plan builder ─────────────────────────────────────────────────────────────

/**
 * Build a complete autocommit plan for all candidates.
 */
export function buildAutocommitPlan(
  scoringV2: any,
  provenance: any,
  structureScore: number | null,
  templateUsed: boolean,
  artifactRefs: Record<string, string | null>,
  thresholds?: Partial<AutocommitThresholds>,
): AutocommitPlan {
  const t: AutocommitThresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const batchId = crypto.randomUUID();

  const candidates: any[] = scoringV2?.rows || [];
  const eligible: RowEligibility[] = [];
  const skipped: RowEligibility[] = [];

  for (const row of candidates) {
    const result = isRowAutoCommittable(
      row.candidate_index,
      scoringV2,
      provenance,
      structureScore,
      templateUsed,
      thresholds,
    );
    if (result.eligible) {
      eligible.push(result);
    } else {
      skipped.push(result);
    }
  }

  return {
    method: 'autocommit_v1',
    batch_id: batchId,
    thresholds: t,
    structure_score: structureScore,
    template_used: templateUsed,
    eligible_rows: eligible,
    skipped_rows: skipped,
    total_candidates: candidates.length,
    eligible_count: eligible.length,
    skipped_count: skipped.length,
    artifact_refs: artifactRefs,
    created_at: new Date().toISOString(),
  };
}

/**
 * Generate a batch_id for a new autocommit run.
 */
export function generateBatchId(): string {
  return crypto.randomUUID();
}

/**
 * Build autocommit results artifact.
 */
export function buildAutocommitResults(
  batchId: string,
  jobId: number,
  churchId: number,
  rows: AutocommitRowResult[],
): AutocommitResults {
  return {
    method: 'autocommit_v1',
    batch_id: batchId,
    job_id: jobId,
    church_id: churchId,
    rows,
    committed_count: rows.filter(r => r.outcome === 'committed').length,
    skipped_count: rows.filter(r => r.outcome === 'skipped').length,
    error_count: rows.filter(r => r.outcome === 'error').length,
    created_at: new Date().toISOString(),
  };
}
