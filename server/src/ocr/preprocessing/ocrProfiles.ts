/**
 * OCR Profiles — Phase 2.2
 *
 * Assigns per-region OCR profiles (language hints, Vision feature type,
 * timeout, retry policy) based on record type, layout template, and
 * region geometry/density.
 *
 * Algorithm: region_profile_selector_v1
 *
 * Pure function: no DB access, no side effects.
 */

import type { OcrRegion } from './ocrPlan';

// ── Profile definitions ──────────────────────────────────────────────────────

export interface OcrProfile {
  /** Profile name */
  name: string;
  /** Ordered language hints for Vision API */
  languageHints: string[];
  /** Vision feature type */
  visionFeature: 'DOCUMENT_TEXT_DETECTION' | 'TEXT_DETECTION';
  /** Per-region timeout override in ms (null = use global default) */
  timeoutMs: number | null;
  /** Retry policy */
  retryPolicy: 'none' | 'one_retry_with_alternate_hints';
  /** Alternate language hints for retry (only used when retryPolicy = one_retry_with_alternate_hints) */
  alternateHints: string[];
}

const PROFILES: Record<string, OcrProfile> = {
  ledger_table: {
    name: 'ledger_table',
    languageHints: ['en', 'el', 'ru'],
    visionFeature: 'DOCUMENT_TEXT_DETECTION',
    timeoutMs: null,
    retryPolicy: 'one_retry_with_alternate_hints',
    alternateHints: ['el', 'en', 'ru'],
  },
  narrative_block: {
    name: 'narrative_block',
    languageHints: ['el', 'ru', 'en'],
    visionFeature: 'DOCUMENT_TEXT_DETECTION',
    timeoutMs: null,
    retryPolicy: 'one_retry_with_alternate_hints',
    alternateHints: ['ru', 'el', 'en'],
  },
  unknown: {
    name: 'unknown',
    languageHints: ['el', 'ru', 'en'],
    visionFeature: 'DOCUMENT_TEXT_DETECTION',
    timeoutMs: null,
    retryPolicy: 'none',
    alternateHints: [],
  },
};

// ── Public types ─────────────────────────────────────────────────────────────

export interface RegionProfileAssignment {
  regionIndex: number;
  profile: string;
  visionFeature: string;
  languageHints: string[];
  fallback: {
    enabled: boolean;
    alternateHints: string[];
  };
  selectionReason: string;
}

export interface ProfilePlanResult {
  method: string;
  regions: RegionProfileAssignment[];
  reasons: string[];
  thresholds: {
    denseLargeAreaFrac: number;
    denseAspectMin: number;
    sparseAreaFrac: number;
    retryConfidenceThreshold: number;
  };
}

export interface ProfilePlanOptions {
  /** Job record type (from ocr_jobs.record_type). */
  recordType?: string;
  /** Layout template ID (from ocr_jobs.layout_template_id). */
  layoutTemplateId?: number | null;
  /** Confidence threshold below which retry is triggered. Default 0.70. */
  retryConfidenceThreshold?: number;
}

// ── Thresholds for geometry-based inference ──────────────────────────────────

/** Region is "large & dense" if areaFrac >= this AND aspect ratio is wide/square. */
const DENSE_LARGE_AREA_FRAC = 0.15;
/** Minimum aspect ratio (w/h) for a region to be considered wide/tabular. */
const DENSE_ASPECT_MIN = 0.8;
/** Region is "sparse/small" if areaFrac <= this. */
const SPARSE_AREA_FRAC = 0.08;
/** Default confidence threshold for retry. */
const DEFAULT_RETRY_CONFIDENCE_THRESHOLD = 0.70;

// ── Main function ────────────────────────────────────────────────────────────

/**
 * Assigns an OCR profile to each region based on available metadata
 * and region geometry.
 *
 * Selection priority:
 *   1. Explicit record type mapping (baptism/marriage/funeral → ledger_table)
 *   2. Layout template presence → ledger_table
 *   3. Geometry-based inference (large+wide → ledger_table, small → narrative_block)
 *   4. Fallback → unknown
 */
export function selectRegionProfiles(
  regions: OcrRegion[],
  opts?: ProfilePlanOptions,
): ProfilePlanResult {
  const recordType = opts?.recordType ?? 'unknown';
  const layoutTemplateId = opts?.layoutTemplateId ?? null;
  const retryConfidenceThreshold = opts?.retryConfidenceThreshold ?? DEFAULT_RETRY_CONFIDENCE_THRESHOLD;

  const thresholds = {
    denseLargeAreaFrac: DENSE_LARGE_AREA_FRAC,
    denseAspectMin: DENSE_ASPECT_MIN,
    sparseAreaFrac: SPARSE_AREA_FRAC,
    retryConfidenceThreshold,
  };

  const reasons: string[] = [];
  const assignments: RegionProfileAssignment[] = [];

  // Check for explicit record type mapping
  const knownLedgerTypes = ['baptism', 'marriage', 'funeral', 'death', 'chrismation'];
  const isKnownLedger = knownLedgerTypes.includes(recordType);
  const hasLayoutTemplate = layoutTemplateId != null && layoutTemplateId > 0;

  if (isKnownLedger) {
    reasons.push(`RECORD_TYPE_MATCH:${recordType}`);
  }
  if (hasLayoutTemplate) {
    reasons.push(`LAYOUT_TEMPLATE:${layoutTemplateId}`);
  }

  for (const region of regions) {
    let profileName: string;
    let selectionReason: string;

    if (isKnownLedger) {
      // Priority 1: known sacramental record type → ledger_table
      profileName = 'ledger_table';
      selectionReason = `record_type:${recordType}`;
    } else if (hasLayoutTemplate) {
      // Priority 2: has layout template → ledger_table
      profileName = 'ledger_table';
      selectionReason = `layout_template:${layoutTemplateId}`;
    } else {
      // Priority 3: geometry-based inference
      const aspect = region.box.w / region.box.h;

      if (region.areaFrac >= DENSE_LARGE_AREA_FRAC && aspect >= DENSE_ASPECT_MIN) {
        profileName = 'ledger_table';
        selectionReason = `geometry:large_dense(area=${(region.areaFrac * 100).toFixed(1)}%,aspect=${aspect.toFixed(2)})`;
      } else if (region.areaFrac <= SPARSE_AREA_FRAC) {
        profileName = 'narrative_block';
        selectionReason = `geometry:small_sparse(area=${(region.areaFrac * 100).toFixed(1)}%)`;
      } else {
        profileName = 'unknown';
        selectionReason = `geometry:ambiguous(area=${(region.areaFrac * 100).toFixed(1)}%,aspect=${aspect.toFixed(2)})`;
      }
    }

    const profile = PROFILES[profileName];

    assignments.push({
      regionIndex: region.index,
      profile: profileName,
      visionFeature: profile.visionFeature,
      languageHints: [...profile.languageHints],
      fallback: {
        enabled: profile.retryPolicy === 'one_retry_with_alternate_hints',
        alternateHints: [...profile.alternateHints],
      },
      selectionReason,
    });
  }

  // Summarize profile usage in reasons
  const profileCounts: Record<string, number> = {};
  for (const a of assignments) {
    profileCounts[a.profile] = (profileCounts[a.profile] || 0) + 1;
  }
  reasons.push(`PROFILES:${JSON.stringify(profileCounts)}`);

  return {
    method: 'region_profile_selector_v1',
    regions: assignments,
    reasons,
    thresholds,
  };
}

/**
 * Get a profile by name. Returns the unknown profile if name is not recognized.
 */
export function getProfile(name: string): OcrProfile {
  return PROFILES[name] ?? PROFILES.unknown;
}

/**
 * Get all available profile names.
 */
export function getProfileNames(): string[] {
  return Object.keys(PROFILES);
}
