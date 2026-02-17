/**
 * Form-Based Extraction Functions
 *
 * Provides extraction strategies for non-tabular layouts:
 * - extractFormPage():      Single form/record per page (anchor-based)
 * - extractMultiFormPage(): Multiple records per page using record_regions
 * - extractAutoMode():      Auto-detect strategy (anchor vs generic table)
 *
 * Output format is compatible with the downstream column mapper / record
 * candidate pipeline used by ocrFeederWorker.
 */

import {
  extractLayoutFields,
  AnchorConfig,
  LayoutExtractorConfig,
  LayoutExtractorResult,
  FieldExtraction,
  VisionResponse,
  DEFAULT_ANCHOR_CONFIGS,
} from './layoutExtractor';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ExtractorRow {
  id: number;
  extraction_mode: string;
  column_bands: any;
  header_y_threshold: number;
  record_regions: any;
  learned_params?: any;
}

/** A record_region as drawn in the template editor (normalized 0..1) */
export interface RecordRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

/**
 * Table-extraction-compatible output so downstream code (artifact saving,
 * structured text, column mapper) can consume it without changes.
 */
export interface FormExtractionResult {
  layout_id: string;
  extraction_mode: string;
  data_rows: number;
  columns_detected: number;
  tables: Array<{
    table_index: number;
    column_count: number;
    row_count: number;
    rows: Array<{
      row_index: number;
      y_center: number;
      cells: Array<{
        column_index: number;
        column_key: string;
        content: string;
        confidence: number;
        bbox?: any;
      }>;
    }>;
    headers: Array<{ column_index: number; text: string; column_key: string }>;
  }>;
  /** Raw layout extractor result for debugging / downstream use */
  layoutResult?: LayoutExtractorResult;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getImageDimensions(visionJson: any): { width: number; height: number } {
  const page = visionJson?.fullTextAnnotation?.pages?.[0]
    || visionJson?.responses?.[0]?.fullTextAnnotation?.pages?.[0];
  if (page) {
    return { width: page.width || 1, height: page.height || 1 };
  }
  return { width: 1, height: 1 };
}

function unwrapVisionResponse(visionJson: any): VisionResponse {
  // Handle both raw response and array-of-responses format
  if (visionJson?.responses && Array.isArray(visionJson.responses)) {
    return visionJson.responses[0] as VisionResponse;
  }
  return visionJson as VisionResponse;
}

/**
 * Load anchor configs from DB fields, merging with hardcoded defaults.
 * DB values take priority.
 */
export async function loadAnchorConfigs(
  extractorId: number,
  pool: any,
  recordType: string
): Promise<Record<string, AnchorConfig>> {
  const [fields] = await pool.query(
    `SELECT \`key\`, anchor_phrases, anchor_direction, search_zone
     FROM ocr_extractor_fields
     WHERE extractor_id = ? AND anchor_phrases IS NOT NULL`,
    [extractorId]
  );

  const dbConfigs: Record<string, AnchorConfig> = {};
  for (const f of fields as any[]) {
    const phrases = typeof f.anchor_phrases === 'string'
      ? JSON.parse(f.anchor_phrases) : f.anchor_phrases;
    const zone = f.search_zone
      ? (typeof f.search_zone === 'string' ? JSON.parse(f.search_zone) : f.search_zone)
      : {};

    dbConfigs[f.key] = {
      phrases: phrases || [],
      direction: f.anchor_direction || 'below',
      zonePadding: zone.padding || { left: 0, right: 0, top: 0.01, bottom: 0.05 },
      zoneExtent: zone.extent || { width: 0.3, height: 0.1 },
    };
  }

  // Merge: DB overrides take priority over hardcoded defaults
  const defaults = DEFAULT_ANCHOR_CONFIGS[recordType] || {};
  return { ...defaults, ...dbConfigs };
}

/**
 * Apply learned_params overrides on top of anchor configs.
 */
function applyLearnedParams(
  configs: Record<string, AnchorConfig>,
  learnedParams: any
): Record<string, AnchorConfig> {
  if (!learnedParams?.anchor_adjustments) return configs;

  const result = { ...configs };
  for (const [key, adj] of Object.entries(learnedParams.anchor_adjustments) as any) {
    if (!result[key]) continue;
    const current = { ...result[key] };

    // Add extra phrases
    if (adj.add_phrases && Array.isArray(adj.add_phrases)) {
      const existing = new Set(current.phrases.map((p: string) => p.toUpperCase()));
      for (const phrase of adj.add_phrases) {
        if (!existing.has(phrase.toUpperCase())) {
          current.phrases.push(phrase);
        }
      }
    }

    // Extend search zone height/width
    if (adj.zone_extend_height && typeof current.zoneExtent === 'object') {
      current.zoneExtent = {
        ...current.zoneExtent,
        height: current.zoneExtent.height + adj.zone_extend_height,
      };
    }
    if (adj.zone_extend_width && typeof current.zoneExtent === 'object') {
      current.zoneExtent = {
        ...current.zoneExtent,
        width: current.zoneExtent.width + adj.zone_extend_width,
      };
    }

    result[key] = current;
  }
  return result;
}

/**
 * Convert a LayoutExtractorResult into the table-extraction-compatible format.
 * Each field becomes one column; each record/entry becomes one row.
 */
function layoutResultToTableFormat(
  result: LayoutExtractorResult,
  mode: string,
  entryIds?: string[]
): FormExtractionResult {
  // Group fields by entry prefix
  const entriesMap = new Map<string, Record<string, FieldExtraction>>();

  for (const [compositeKey, field] of Object.entries(result.fields)) {
    const parts = compositeKey.split('_');
    // entryId is the prefix (e.g. "entry_0"), fieldKey is the rest
    const entryId = parts.slice(0, 2).join('_');  // "entry_0"
    const fieldKey = field.fieldKey; // canonical key

    if (!entriesMap.has(entryId)) {
      entriesMap.set(entryId, {});
    }
    entriesMap.get(entryId)![fieldKey] = field;
  }

  // If no entries found by prefix, treat all fields as a single entry
  if (entriesMap.size === 0 && Object.keys(result.fields).length > 0) {
    const singleEntry: Record<string, FieldExtraction> = {};
    for (const [key, field] of Object.entries(result.fields)) {
      singleEntry[field.fieldKey || key] = field;
    }
    entriesMap.set('entry_0', singleEntry);
  }

  // Build all unique field keys across entries
  const allFieldKeys = new Set<string>();
  for (const fields of entriesMap.values()) {
    for (const key of Object.keys(fields)) {
      allFieldKeys.add(key);
    }
  }
  const fieldKeyArray = Array.from(allFieldKeys);

  // Build headers
  const headers = fieldKeyArray.map((key, i) => ({
    column_index: i,
    text: key.replace(/_/g, ' '),
    column_key: key,
  }));

  // Build rows
  const rows: any[] = [];
  let rowIndex = 0;
  const orderedEntries = entryIds
    ? entryIds.filter(id => entriesMap.has(id))
    : Array.from(entriesMap.keys()).sort();

  for (const entryId of orderedEntries) {
    const fields = entriesMap.get(entryId)!;
    const cells = fieldKeyArray.map((key, colIdx) => {
      const field = fields[key];
      return {
        column_index: colIdx,
        column_key: key,
        content: field?.extractedText || '',
        confidence: field?.avgConfidence || 0,
        bbox: field?.bboxUnionNorm || null,
      };
    });

    rows.push({
      row_index: rowIndex++,
      y_center: 0,
      cells,
    });
  }

  return {
    layout_id: `form_extractor_${mode}`,
    extraction_mode: mode,
    data_rows: rows.length,
    columns_detected: fieldKeyArray.length,
    tables: [{
      table_index: 0,
      column_count: fieldKeyArray.length,
      row_count: rows.length,
      rows,
      headers,
    }],
    layoutResult: result,
  };
}

// ── Main Extraction Functions ──────────────────────────────────────────────

/**
 * extractFormPage — Single form/record per page.
 * Uses anchor detection via layoutExtractor.ts.
 */
export async function extractFormPage(
  visionJson: any,
  extractor: ExtractorRow,
  platformPool: any,
  recordType: string = 'baptism'
): Promise<FormExtractionResult> {
  const visionResponse = unwrapVisionResponse(visionJson);
  const { width, height } = getImageDimensions(visionJson);

  // Load anchor configs (DB → defaults → learned)
  let anchorConfigs = await loadAnchorConfigs(extractor.id, platformPool, recordType);
  if (extractor.learned_params) {
    const learned = typeof extractor.learned_params === 'string'
      ? JSON.parse(extractor.learned_params) : extractor.learned_params;
    anchorConfigs = applyLearnedParams(anchorConfigs, learned);
  }

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.55,
    imageWidth: width,
    imageHeight: height,
    recordType: recordType as 'baptism' | 'marriage' | 'funeral',
    // Whole page is one entry
    entryAreas: [{ entryId: 'entry_0', bbox: { x: 0, y: 0, w: width, h: height } }],
  };

  const result = extractLayoutFields(visionResponse, config, anchorConfigs);
  return layoutResultToTableFormat(result, 'form');
}

/**
 * extractMultiFormPage — N records per page using record_regions.
 * Each region produces one record candidate via anchor extraction.
 */
export async function extractMultiFormPage(
  visionJson: any,
  extractor: ExtractorRow,
  platformPool: any,
  recordType: string = 'baptism'
): Promise<FormExtractionResult> {
  const visionResponse = unwrapVisionResponse(visionJson);
  const { width, height } = getImageDimensions(visionJson);

  // Parse record regions
  let regions: RecordRegion[] = [];
  if (extractor.record_regions) {
    regions = typeof extractor.record_regions === 'string'
      ? JSON.parse(extractor.record_regions) : extractor.record_regions;
  }

  if (regions.length === 0) {
    console.warn(`[FormExtractor] multi_form extractor ${extractor.id} has no record_regions, falling back to full page`);
    return extractFormPage(visionJson, extractor, platformPool, recordType);
  }

  // Load anchor configs
  let anchorConfigs = await loadAnchorConfigs(extractor.id, platformPool, recordType);
  if (extractor.learned_params) {
    const learned = typeof extractor.learned_params === 'string'
      ? JSON.parse(extractor.learned_params) : extractor.learned_params;
    anchorConfigs = applyLearnedParams(anchorConfigs, learned);
  }

  // Convert regions to entryAreas (regions are normalized 0..1, convert to pixel)
  const entryAreas = regions.map((r, i) => ({
    entryId: r.id || `entry_${i}`,
    bbox: {
      x: r.x * width,
      y: r.y * height,
      w: r.width * width,
      h: r.height * height,
    },
  }));

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.55,
    imageWidth: width,
    imageHeight: height,
    recordType: recordType as 'baptism' | 'marriage' | 'funeral',
    entryAreas,
  };

  const result = extractLayoutFields(visionResponse, config, anchorConfigs);
  const entryIds = entryAreas.map(e => e.entryId);
  return layoutResultToTableFormat(result, 'multi_form', entryIds);
}

/**
 * extractAutoMode — Try anchor detection first; fall back to generic table.
 * If ≥ 3 anchors are detected, use form-based extraction.
 */
export async function extractAutoMode(
  visionJson: any,
  extractor: ExtractorRow,
  recordType: string,
  platformPool: any
): Promise<FormExtractionResult | null> {
  const visionResponse = unwrapVisionResponse(visionJson);
  const { width, height } = getImageDimensions(visionJson);

  const anchorConfigs = await loadAnchorConfigs(extractor.id, platformPool, recordType);

  const config: LayoutExtractorConfig = {
    confidenceThreshold: 0.55,
    imageWidth: width,
    imageHeight: height,
    recordType: recordType as 'baptism' | 'marriage' | 'funeral',
    entryAreas: [{ entryId: 'entry_0', bbox: { x: 0, y: 0, w: width, h: height } }],
  };

  const result = extractLayoutFields(visionResponse, config, anchorConfigs);

  // If enough anchors matched, use anchor-based extraction
  if (result.anchors.length >= 3) {
    console.log(`[FormExtractor] auto: ${result.anchors.length} anchors detected → using form extraction`);
    return layoutResultToTableFormat(result, 'auto_form');
  }

  // Not enough anchors → return null to signal caller to fall back to generic table
  console.log(`[FormExtractor] auto: only ${result.anchors.length} anchors → falling back to generic table`);
  return null;
}
