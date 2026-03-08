/**
 * Provenance & Alignment — Phase 3.2
 *
 * Links OCR tokens → table cells → record candidate fields with stable IDs
 * and bbox unions, enabling FusionOverlay highlighting and explainability.
 *
 * Pure functions: no DB access, no side effects.
 *
 * Outputs three companion artifacts (never mutates existing schemas):
 *   1. tokens_normalized.json   — stable token_id, bbox_px, bbox_norm
 *   2. table_provenance.json    — cell → token_id[] mapping
 *   3. record_candidates_provenance.json — field → token_id[] mapping
 */

// ── Public types ─────────────────────────────────────────────────────────────

export interface NormalizedToken {
  token_id: number;
  text: string;
  confidence: number | null;
  /** Pixel-space bounding box [x_min, y_min, x_max, y_max] */
  bbox_px: [number, number, number, number];
  /** Normalized bounding box [x_min, y_min, x_max, y_max] in [0..1] */
  bbox_norm: [number, number, number, number];
  /** Region index from Step 2.1 (-1 if full-page OCR) */
  source_region_index: number;
  /** Page side: 'full', 'left', 'right' */
  page_side: string;
}

export interface ProvenanceBundle {
  /** Stable token IDs referencing tokens_normalized.json */
  token_ids: number[];
  /** Union bounding box in normalized coords [x_min, y_min, x_max, y_max] */
  bbox_union: [number, number, number, number] | null;
  /** Weighted mean of token confidences (by token area), null if no area info */
  confidence: number | null;
}

export interface CellProvenance {
  row_index: number;
  column_key: string;
  provenance: ProvenanceBundle;
}

export interface TableProvenanceResult {
  method: string;
  page_dimensions: { width: number; height: number };
  cells: CellProvenance[];
  cell_coverage_rate: number;
  token_orphans_count: number;
  total_tokens: number;
  recorded_at: string;
}

export interface FieldProvenance {
  candidate_index: number;
  field_name: string;
  provenance: ProvenanceBundle;
}

export interface RecordCandidatesProvenanceResult {
  method: string;
  fields: FieldProvenance[];
  field_coverage_rate: number;
  recorded_at: string;
}

export interface NormalizedTokensResult {
  method: string;
  page_dimensions: { width: number; height: number };
  tokens: NormalizedToken[];
  recorded_at: string;
}

// ── Token normalization ──────────────────────────────────────────────────────

/**
 * Extract and normalize all tokens from a Vision API result.
 * Assigns stable incremental token_id starting from 0.
 * Handles region-scoped OCR with offset vertices.
 */
export function normalizeTokens(
  visionJson: any,
  opts?: {
    pageIndex?: number;
    pageSide?: string;
  },
): NormalizedTokensResult {
  const pageIndex = opts?.pageIndex ?? 0;
  const pageSide = opts?.pageSide ?? 'full';
  const pages = visionJson?.pages || [];
  const page = pages[pageIndex];
  const pageW = page?.width || 1;
  const pageH = page?.height || 1;

  const tokens: NormalizedToken[] = [];
  let tokenId = 0;

  for (const block of page?.blocks || []) {
    // Detect region index from metadata tag (set by region-scoped OCR)
    const regionIndex = block._region ?? block._regionIndex ?? -1;

    for (const paragraph of block.paragraphs || []) {
      for (const word of paragraph.words || []) {
        const text = word.text || (word.symbols || []).map((s: any) => s.text).join('');
        if (!text.trim()) continue;

        const vertices = word.boundingBox?.vertices || [];
        if (vertices.length < 4) continue;

        const pxXs = vertices.map((v: any) => v.x ?? 0);
        const pxYs = vertices.map((v: any) => v.y ?? 0);

        const xMinPx = Math.min(...pxXs);
        const xMaxPx = Math.max(...pxXs);
        const yMinPx = Math.min(...pxYs);
        const yMaxPx = Math.max(...pxYs);

        // Clamp to image bounds
        const xMinPxC = Math.max(0, Math.min(xMinPx, pageW));
        const xMaxPxC = Math.max(0, Math.min(xMaxPx, pageW));
        const yMinPxC = Math.max(0, Math.min(yMinPx, pageH));
        const yMaxPxC = Math.max(0, Math.min(yMaxPx, pageH));

        const xMinN = xMinPxC / pageW;
        const xMaxN = xMaxPxC / pageW;
        const yMinN = yMinPxC / pageH;
        const yMaxN = yMaxPxC / pageH;

        const conf = typeof word.confidence === 'number' ? word.confidence : null;

        tokens.push({
          token_id: tokenId++,
          text,
          confidence: conf,
          bbox_px: [xMinPxC, yMinPxC, xMaxPxC, yMaxPxC],
          bbox_norm: [xMinN, yMinN, xMaxN, yMaxN],
          source_region_index: regionIndex,
          page_side: pageSide,
        });
      }
    }
  }

  return {
    method: 'token_normalize_v1',
    page_dimensions: { width: pageW, height: pageH },
    tokens,
    recorded_at: new Date().toISOString(),
  };
}

// ── Confidence aggregation ───────────────────────────────────────────────────

/**
 * Compute weighted mean confidence from tokens, weighted by token area.
 * Falls back to simple mean if area is zero or missing.
 * Returns null if no tokens have confidence.
 */
export function aggregateConfidence(tokens: NormalizedToken[]): number | null {
  const withConf = tokens.filter(t => t.confidence !== null);
  if (withConf.length === 0) return null;

  // Try area-weighted mean
  let totalArea = 0;
  let weightedSum = 0;
  for (const t of withConf) {
    const w = t.bbox_norm[2] - t.bbox_norm[0];
    const h = t.bbox_norm[3] - t.bbox_norm[1];
    const area = w * h;
    totalArea += area;
    weightedSum += t.confidence! * area;
  }

  if (totalArea > 0) {
    return Math.round((weightedSum / totalArea) * 10000) / 10000;
  }

  // Fallback: simple mean
  const sum = withConf.reduce((s, t) => s + t.confidence!, 0);
  return Math.round((sum / withConf.length) * 10000) / 10000;
}

/**
 * Compute union bounding box (normalized) for a set of tokens.
 * Returns null if no tokens.
 */
export function bboxUnion(tokens: NormalizedToken[]): [number, number, number, number] | null {
  if (tokens.length === 0) return null;

  let xMin = 1, yMin = 1, xMax = 0, yMax = 0;
  for (const t of tokens) {
    if (t.bbox_norm[0] < xMin) xMin = t.bbox_norm[0];
    if (t.bbox_norm[1] < yMin) yMin = t.bbox_norm[1];
    if (t.bbox_norm[2] > xMax) xMax = t.bbox_norm[2];
    if (t.bbox_norm[3] > yMax) yMax = t.bbox_norm[3];
  }

  // Clamp to [0..1]
  xMin = Math.max(0, Math.min(1, xMin));
  yMin = Math.max(0, Math.min(1, yMin));
  xMax = Math.max(0, Math.min(1, xMax));
  yMax = Math.max(0, Math.min(1, yMax));

  return [xMin, yMin, xMax, yMax];
}

/**
 * Build a ProvenanceBundle from a set of tokens.
 */
export function buildBundle(tokens: NormalizedToken[]): ProvenanceBundle {
  return {
    token_ids: tokens.map(t => t.token_id),
    bbox_union: bboxUnion(tokens),
    confidence: aggregateConfidence(tokens),
  };
}

// ── Table cell provenance ────────────────────────────────────────────────────

/**
 * Build table provenance by matching normalized tokens to table cells
 * using bbox overlap (token center falls within cell bbox).
 *
 * Does NOT modify table_extraction.json — produces companion artifact.
 */
export function buildTableProvenance(
  normalizedTokens: NormalizedToken[],
  tableExtractionResult: any,
): TableProvenanceResult {
  const pageW = tableExtractionResult?.page_dimensions?.width || 1;
  const pageH = tableExtractionResult?.page_dimensions?.height || 1;

  const tables = tableExtractionResult?.tables || [];
  const cells: CellProvenance[] = [];
  const assignedTokenIds = new Set<number>();

  // Build index of column bands for fast lookup
  const columnBands: Record<string, [number, number]> = tableExtractionResult?.column_bands || {};
  const headerYThreshold = tableExtractionResult?.header_y_threshold ?? 0;

  for (const table of tables) {
    for (const row of table.rows || []) {
      for (const cell of row.cells || []) {
        const colKey = cell.column_key;
        const rowIdx = row.row_index;

        // Find tokens that belong to this cell
        // Strategy: if cell has a bbox, use it; otherwise use column band + row Y range
        const matchedTokens: NormalizedToken[] = [];

        if (cell.bbox && cell.bbox.length === 4) {
          // Cell has explicit bbox — match tokens whose center falls within
          const [cxMin, cyMin, cxMax, cyMax] = cell.bbox;
          for (const token of normalizedTokens) {
            const tcx = (token.bbox_norm[0] + token.bbox_norm[2]) / 2;
            const tcy = (token.bbox_norm[1] + token.bbox_norm[3]) / 2;
            if (tcx >= cxMin && tcx <= cxMax && tcy >= cyMin && tcy <= cyMax) {
              matchedTokens.push(token);
              assignedTokenIds.add(token.token_id);
            }
          }
        } else if (columnBands[colKey]) {
          // No cell bbox — use column band X range
          // For Y range, use row bbox estimation from surrounding rows or header threshold
          const [bandX0, bandX1] = columnBands[colKey];
          for (const token of normalizedTokens) {
            const tcx = (token.bbox_norm[0] + token.bbox_norm[2]) / 2;
            if (tcx >= bandX0 && tcx <= bandX1) {
              // Check if this token's text matches part of the cell content
              if (cell.content && cell.content.includes(token.text)) {
                matchedTokens.push(token);
                assignedTokenIds.add(token.token_id);
              }
            }
          }
        }

        cells.push({
          row_index: rowIdx,
          column_key: colKey,
          provenance: buildBundle(matchedTokens),
        });
      }
    }
  }

  // Coverage and orphans
  const cellsWithTokens = cells.filter(c => c.provenance.token_ids.length > 0);
  const totalCells = cells.length;
  const cellCoverageRate = totalCells > 0
    ? Math.round((cellsWithTokens.length / totalCells) * 10000) / 10000
    : 0;

  const tokenOrphansCount = normalizedTokens.filter(t => !assignedTokenIds.has(t.token_id)).length;

  return {
    method: 'table_provenance_v1',
    page_dimensions: { width: pageW, height: pageH },
    cells,
    cell_coverage_rate: cellCoverageRate,
    token_orphans_count: tokenOrphansCount,
    total_tokens: normalizedTokens.length,
    recorded_at: new Date().toISOString(),
  };
}

// ── Record candidate provenance ──────────────────────────────────────────────

/**
 * Build record candidate provenance by linking table cell provenance
 * through columnMapping to candidate fields.
 *
 * Does NOT modify record_candidates.json — produces companion artifact.
 */
export function buildRecordCandidatesProvenance(
  tableProvenance: TableProvenanceResult,
  recordCandidates: any,
): RecordCandidatesProvenanceResult {
  const columnMapping: Record<string, string> = recordCandidates?.columnMapping || {};
  const candidates: any[] = recordCandidates?.candidates || [];

  // Build lookup: (row_index, column_key) → ProvenanceBundle
  const cellIndex = new Map<string, ProvenanceBundle>();
  for (const cell of tableProvenance.cells) {
    const key = `${cell.row_index}:${cell.column_key}`;
    cellIndex.set(key, cell.provenance);
  }

  // Reverse mapping: field_name → column_key[]
  const fieldToColumns = new Map<string, string[]>();
  for (const [colKey, fieldName] of Object.entries(columnMapping)) {
    if (!fieldToColumns.has(fieldName)) fieldToColumns.set(fieldName, []);
    fieldToColumns.get(fieldName)!.push(colKey);
  }

  const fields: FieldProvenance[] = [];
  let totalFields = 0;
  let coveredFields = 0;

  for (let ci = 0; ci < candidates.length; ci++) {
    const cand = candidates[ci];
    const sourceRowIndex = cand.sourceRowIndex;
    const candFields = cand.fields || {};

    for (const fieldName of Object.keys(candFields)) {
      totalFields++;

      // Find column keys that map to this field
      const colKeys = fieldToColumns.get(fieldName) || [];
      const allTokenIds: number[] = [];
      const allBundleTokens: NormalizedToken[] = [];

      for (const colKey of colKeys) {
        const bundle = cellIndex.get(`${sourceRowIndex}:${colKey}`);
        if (bundle) {
          allTokenIds.push(...bundle.token_ids);
        }
      }

      // Also try direct column_key match (for template-locked where column_key === field_name)
      if (colKeys.length === 0) {
        const directBundle = cellIndex.get(`${sourceRowIndex}:${fieldName}`);
        if (directBundle) {
          allTokenIds.push(...directBundle.token_ids);
        }
      }

      if (allTokenIds.length > 0) {
        coveredFields++;
      }

      // Build a synthetic bundle from the merged token IDs
      // We need the union bbox and confidence from the cell bundles
      const mergedBundles: ProvenanceBundle[] = [];
      for (const colKey of colKeys.length > 0 ? colKeys : [fieldName]) {
        const bundle = cellIndex.get(`${sourceRowIndex}:${colKey}`);
        if (bundle) mergedBundles.push(bundle);
      }

      const mergedTokenIds = [...new Set(allTokenIds)];
      const mergedBbox = mergeBboxUnions(mergedBundles.map(b => b.bbox_union));
      const mergedConf = mergedBundles.length > 0
        ? mergeConfidences(mergedBundles)
        : null;

      fields.push({
        candidate_index: ci,
        field_name: fieldName,
        provenance: {
          token_ids: mergedTokenIds,
          bbox_union: mergedBbox,
          confidence: mergedConf,
        },
      });
    }
  }

  const fieldCoverageRate = totalFields > 0
    ? Math.round((coveredFields / totalFields) * 10000) / 10000
    : 0;

  return {
    method: 'record_candidates_provenance_v1',
    fields,
    field_coverage_rate: fieldCoverageRate,
    recorded_at: new Date().toISOString(),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Merge multiple bbox unions into a single union.
 */
function mergeBboxUnions(
  bboxes: (([number, number, number, number]) | null)[],
): [number, number, number, number] | null {
  const valid = bboxes.filter((b): b is [number, number, number, number] => b !== null);
  if (valid.length === 0) return null;

  let xMin = 1, yMin = 1, xMax = 0, yMax = 0;
  for (const [x0, y0, x1, y1] of valid) {
    if (x0 < xMin) xMin = x0;
    if (y0 < yMin) yMin = y0;
    if (x1 > xMax) xMax = x1;
    if (y1 > yMax) yMax = y1;
  }

  return [
    Math.max(0, Math.min(1, xMin)),
    Math.max(0, Math.min(1, yMin)),
    Math.max(0, Math.min(1, xMax)),
    Math.max(0, Math.min(1, yMax)),
  ];
}

/**
 * Merge confidences from multiple bundles (simple mean of non-null).
 */
function mergeConfidences(bundles: ProvenanceBundle[]): number | null {
  const confs = bundles.map(b => b.confidence).filter((c): c is number => c !== null);
  if (confs.length === 0) return null;
  return Math.round((confs.reduce((s, c) => s + c, 0) / confs.length) * 10000) / 10000;
}
