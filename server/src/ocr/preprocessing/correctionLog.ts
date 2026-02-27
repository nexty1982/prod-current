/**
 * Correction Log — Phase 6.1
 *
 * Captures user field edits in the OCR Workbench with full provenance.
 * Pure functions + atomic file I/O. No DB access.
 *
 * Storage format: JSONL (newline-delimited JSON) at
 *   server/storage/feeder/job_{id}/corrections_log.jsonl
 *
 * Each line is one CorrectionEvent.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Types ───────────────────────────────────────────────────────────────────

export interface CorrectionProvenance {
  token_ids: number[];
  bbox_union_norm: number[] | null;    // [x, y, w, h] normalized
  bbox_union_px: number[] | null;      // [x, y, w, h] pixels
  confidence: number | null;           // field_score at time of edit
}

export interface CorrectionEvent {
  edit_id: string;                     // UUID
  job_id: number;
  page_id: number | null;
  candidate_index: number;
  row_index: number | null;
  record_type: string;
  template_id: string | null;
  user_id: string;
  timestamp: string;                   // ISO 8601
  field_name: string;
  before_value: string | null;
  after_value: string | null;
  provenance: CorrectionProvenance | null;
  was_flagged: boolean;
  flag_reasons: string[];
  edit_source: 'autosave' | 'finalize' | 'commit';
}

export interface CorrectionsSummary {
  job_id: number;
  total_events: number;
  unique_fields_edited: number;
  unique_candidates_edited: number;
  by_field: Record<string, number>;
  by_source: Record<string, number>;
  flagged_corrections: number;
  first_event_at: string | null;
  last_event_at: string | null;
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build a CorrectionEvent from edit context.
 */
export function buildCorrectionEvent(opts: {
  jobId: number;
  pageId: number | null;
  candidateIndex: number;
  rowIndex: number | null;
  recordType: string;
  templateId: string | null;
  userId: string;
  fieldName: string;
  beforeValue: string | null;
  afterValue: string | null;
  editSource: 'autosave' | 'finalize' | 'commit';
  scoringField?: { field_score?: number; reasons?: string[]; token_ids?: number[]; bbox_union?: number[] } | null;
  provenanceField?: { token_ids?: number[]; bbox_union?: number[]; confidence?: number | null } | null;
}): CorrectionEvent {
  let provenance: CorrectionProvenance | null = null;

  // Prefer scoring_v2 provenance (has token_ids + bbox_union per field)
  const sf = opts.scoringField;
  const pf = opts.provenanceField;

  const tokenIds = sf?.token_ids ?? pf?.token_ids ?? [];
  const bboxNorm = sf?.bbox_union ?? pf?.bbox_union ?? null;
  const confidence = sf?.field_score ?? pf?.confidence ?? null;

  if (tokenIds.length > 0 || bboxNorm) {
    provenance = {
      token_ids: tokenIds,
      bbox_union_norm: bboxNorm,
      bbox_union_px: null,  // filled by caller if pixel coords available
      confidence,
    };
  }

  const wasFlagged = !!(sf?.reasons?.length && sf.reasons.some(
    r => r !== 'FIELD_OK' && r !== 'OK',
  ));
  const flagReasons = sf?.reasons?.filter(r => r !== 'FIELD_OK' && r !== 'OK') ?? [];

  return {
    edit_id: crypto.randomUUID(),
    job_id: opts.jobId,
    page_id: opts.pageId,
    candidate_index: opts.candidateIndex,
    row_index: opts.rowIndex,
    record_type: opts.recordType,
    template_id: opts.templateId,
    user_id: opts.userId,
    timestamp: new Date().toISOString(),
    field_name: opts.fieldName,
    before_value: opts.beforeValue,
    after_value: opts.afterValue,
    provenance,
    was_flagged: wasFlagged,
    flag_reasons: flagReasons,
    edit_source: opts.editSource,
  };
}

// ── File I/O ────────────────────────────────────────────────────────────────

/**
 * Resolve the corrections log path for a job.
 */
export function correctionsLogPath(jobId: number): string {
  return path.join(__dirname, '../../../storage/feeder', `job_${jobId}`, 'corrections_log.jsonl');
}

/**
 * Append a CorrectionEvent to the JSONL log.
 * Atomic: writes to .tmp then renames (append mode via read+write).
 * Deduplicates: skips if the last event for (candidate_index, field_name) has the same after_value.
 *
 * Returns true if event was written, false if skipped (duplicate).
 */
export function appendCorrection(logPath: string, event: CorrectionEvent): boolean {
  // Ensure parent dir exists
  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Read existing events for dedup check
  let existingLines: string[] = [];
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8').trim();
    if (content) {
      existingLines = content.split('\n');
    }
  }

  // Dedup: check last event for same (candidate_index, field_name)
  for (let i = existingLines.length - 1; i >= 0; i--) {
    try {
      const prev = JSON.parse(existingLines[i]) as CorrectionEvent;
      if (
        prev.candidate_index === event.candidate_index &&
        prev.field_name === event.field_name
      ) {
        // If after_value hasn't changed, skip
        if (prev.after_value === event.after_value) {
          return false;
        }
        // Found the most recent event for this field — it's different, so log it
        break;
      }
    } catch (_) {
      continue;
    }
  }

  // Append atomically
  const line = JSON.stringify(event) + '\n';
  fs.appendFileSync(logPath, line);

  return true;
}

/**
 * Load all correction events from the JSONL log.
 * Returns events in chronological order.
 */
export function loadCorrections(logPath: string): CorrectionEvent[] {
  if (!fs.existsSync(logPath)) return [];

  const content = fs.readFileSync(logPath, 'utf8').trim();
  if (!content) return [];

  const events: CorrectionEvent[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (_) {
      // Skip malformed lines
    }
  }

  return events;
}

/**
 * Build a summary from correction events.
 */
export function buildCorrectionsSummary(jobId: number, events: CorrectionEvent[]): CorrectionsSummary {
  const byField: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const candidateSet = new Set<number>();
  const fieldSet = new Set<string>();
  let flaggedCount = 0;

  for (const e of events) {
    byField[e.field_name] = (byField[e.field_name] || 0) + 1;
    bySource[e.edit_source] = (bySource[e.edit_source] || 0) + 1;
    candidateSet.add(e.candidate_index);
    fieldSet.add(e.field_name);
    if (e.was_flagged) flaggedCount++;
  }

  return {
    job_id: jobId,
    total_events: events.length,
    unique_fields_edited: fieldSet.size,
    unique_candidates_edited: candidateSet.size,
    by_field: byField,
    by_source: bySource,
    flagged_corrections: flaggedCount,
    first_event_at: events.length > 0 ? events[0].timestamp : null,
    last_event_at: events.length > 0 ? events[events.length - 1].timestamp : null,
  };
}

/**
 * Compute sha256 and byte size for the corrections log file.
 */
export function correctionLogStats(logPath: string): { sha256: string; bytes: number } | null {
  if (!fs.existsSync(logPath)) return null;
  const buf = fs.readFileSync(logPath);
  return {
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  };
}
