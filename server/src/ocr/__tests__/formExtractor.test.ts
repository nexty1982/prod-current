#!/usr/bin/env npx tsx
/**
 * Unit tests for formExtractor.ts (OMD-875)
 *
 * Covers:
 *   - Pure helpers exposed via __test__:
 *       getImageDimensions, unwrapVisionResponse, applyLearnedParams,
 *       layoutResultToTableFormat
 *   - Public functions with stub DB pool + minimal vision JSON:
 *       loadAnchorConfigs, extractFormPage, extractMultiFormPage,
 *       extractAutoMode
 *
 * Run: npx tsx server/src/ocr/__tests__/formExtractor.test.ts
 *
 * Exits non-zero on any failure (CI-friendly).
 */

import {
  __test__,
  loadAnchorConfigs,
  extractFormPage,
  extractMultiFormPage,
  extractAutoMode,
  ExtractorRow,
  FormExtractionResult,
} from '../formExtractor';
import { LayoutExtractorResult, FieldExtraction } from '../layoutExtractor';

const { getImageDimensions, unwrapVisionResponse, applyLearnedParams, layoutResultToTableFormat } = __test__;

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ============================================================================
// Stub DB pool — supports the single SELECT formExtractor issues
// ============================================================================

interface StubField {
  key: string;
  anchor_phrases: string | string[] | null;
  anchor_direction?: string;
  search_zone?: any;
}

function makeStubPool(rows: StubField[]) {
  return {
    query: async (_sql: string, _params: any[]) => {
      return [rows, []];
    },
  };
}

// ============================================================================
// getImageDimensions
// ============================================================================
console.log('\n── getImageDimensions ────────────────────────────────────');

assertEq(
  getImageDimensions({ fullTextAnnotation: { pages: [{ width: 1700, height: 2200 }] } }),
  { width: 1700, height: 2200 },
  'reads dimensions from fullTextAnnotation.pages[0]'
);

assertEq(
  getImageDimensions({ responses: [{ fullTextAnnotation: { pages: [{ width: 800, height: 600 }] } }] }),
  { width: 800, height: 600 },
  'reads dimensions from responses[0].fullTextAnnotation.pages[0]'
);

assertEq(
  getImageDimensions({}),
  { width: 1, height: 1 },
  'falls back to {1,1} when no page'
);

assertEq(
  getImageDimensions(null),
  { width: 1, height: 1 },
  'null input → {1,1}'
);

assertEq(
  getImageDimensions({ fullTextAnnotation: { pages: [{}] } }),
  { width: 1, height: 1 },
  'page exists but width/height undefined → {1,1}'
);

assertEq(
  getImageDimensions({ fullTextAnnotation: { pages: [{ width: 1700 }] } }),
  { width: 1700, height: 1 },
  'partial dimensions → fall back per missing axis'
);

// ============================================================================
// unwrapVisionResponse
// ============================================================================
console.log('\n── unwrapVisionResponse ──────────────────────────────────');

const wrapped = { responses: [{ fullTextAnnotation: { pages: [], text: 'X' } }] };
assertEq(
  unwrapVisionResponse(wrapped),
  wrapped.responses[0],
  'wrapped responses[] → first element'
);

const direct = { fullTextAnnotation: { pages: [], text: 'Y' } };
assertEq(
  unwrapVisionResponse(direct),
  direct,
  'direct VisionResponse passes through unchanged'
);

const emptyResponses = { responses: [] as any[] };
assertEq(
  unwrapVisionResponse(emptyResponses),
  undefined as any,
  'empty responses array → undefined first element'
);

// ============================================================================
// applyLearnedParams
// ============================================================================
console.log('\n── applyLearnedParams ────────────────────────────────────');

const baseConfigs = {
  child_first_name: {
    phrases: ['NAME OF CHILD', 'CHILD'],
    direction: 'below' as const,
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
  baptism_date: {
    phrases: ['BAPTIZED'],
    direction: 'below' as const,
    zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
    zoneExtent: { width: 0.3, height: 0.1 },
  },
};

// No learned params → returns input unchanged
const r1 = applyLearnedParams(baseConfigs, null);
assertEq(r1.child_first_name.phrases, ['NAME OF CHILD', 'CHILD'], 'null learnedParams → no change');

const r1b = applyLearnedParams(baseConfigs, {});
assertEq(r1b.child_first_name.phrases, ['NAME OF CHILD', 'CHILD'], 'no anchor_adjustments key → no change');

// Rebuild a fresh baseConfigs for each call so phrases-array mutation
// (see quirk note below) doesn't leak across tests.
function freshBase() {
  return {
    child_first_name: {
      phrases: ['NAME OF CHILD', 'CHILD'],
      direction: 'below' as const,
      zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
      zoneExtent: { width: 0.3, height: 0.1 },
    },
    baptism_date: {
      phrases: ['BAPTIZED'],
      direction: 'below' as const,
      zonePadding: { left: 0, right: 0, top: 0.01, bottom: 0.05 },
      zoneExtent: { width: 0.3, height: 0.1 },
    },
  };
}

// Add phrases (deduped, case-insensitive)
const baseForR2 = freshBase();
const r2 = applyLearnedParams(baseForR2, {
  anchor_adjustments: {
    child_first_name: { add_phrases: ['INFANT NAME', 'CHILD'] }, // CHILD is dup
  },
});
assertEq(
  r2.child_first_name.phrases,
  ['NAME OF CHILD', 'CHILD', 'INFANT NAME'],
  'add_phrases adds new phrase, dedupes existing (case-insensitive)'
);

// QUIRK: applyLearnedParams shallow-copies the field config (`{ ...result[key] }`)
// but does NOT clone the phrases array, so add_phrases mutates the input.
// In production each request builds a fresh configs object, so this is not
// observable — but tests need to account for it.
assertEq(
  baseForR2.child_first_name.phrases,
  ['NAME OF CHILD', 'CHILD', 'INFANT NAME'],
  'QUIRK: original phrases array IS mutated (shallow-copy via spread)'
);

// Extend zone height
const r3 = applyLearnedParams(freshBase(), {
  anchor_adjustments: {
    child_first_name: { zone_extend_height: 0.05 },
  },
});
const ze3 = r3.child_first_name.zoneExtent as any;
assert(
  Math.abs(ze3.height - 0.15) < 1e-9,
  `zone_extend_height extends height (0.1 + 0.05 = 0.15, got ${ze3.height})`
);
assertEq(ze3.width, 0.3, 'zone_extend_height leaves width unchanged');

// Extend zone width
const r4 = applyLearnedParams(freshBase(), {
  anchor_adjustments: {
    baptism_date: { zone_extend_width: 0.1 },
  },
});
const ze4 = r4.baptism_date.zoneExtent as any;
assert(
  Math.abs(ze4.width - 0.4) < 1e-9,
  `zone_extend_width extends width (0.3 + 0.1 = 0.4, got ${ze4.width})`
);

// Unknown field key — silently skipped
const r5 = applyLearnedParams(freshBase(), {
  anchor_adjustments: {
    nonexistent_field: { add_phrases: ['FOO'] },
  },
});
assertEq(
  Object.keys(r5).sort(),
  ['baptism_date', 'child_first_name'],
  'unknown field key skipped, base keys preserved'
);

// Combined: add phrases + extend height in same adjustment
const r6 = applyLearnedParams(freshBase(), {
  anchor_adjustments: {
    child_first_name: { add_phrases: ['BABY'], zone_extend_height: 0.02 },
  },
});
assertEq(r6.child_first_name.phrases, ['NAME OF CHILD', 'CHILD', 'BABY'], 'combined: phrases added');
const ze6 = r6.child_first_name.zoneExtent as any;
assert(Math.abs(ze6.height - 0.12) < 1e-9, 'combined: height extended');

// ============================================================================
// layoutResultToTableFormat
// ============================================================================
console.log('\n── layoutResultToTableFormat ─────────────────────────────');

function mkField(fieldKey: string, text: string, conf: number): FieldExtraction {
  return {
    fieldKey,
    extractedText: text,
    bboxUnionPx: { x0: 0, y0: 0, x1: 100, y1: 50 },
    bboxUnionNorm: { x0: 0, y0: 0, x1: 0.1, y1: 0.05 },
    tokensUsedCount: 1,
    avgConfidence: conf,
  };
}

// Empty result
const empty: LayoutExtractorResult = { fields: {}, anchors: [] };
const tEmpty = layoutResultToTableFormat(empty, 'form');
assertEq(tEmpty.layout_id, 'form_extractor_form', 'empty: layout_id format');
assertEq(tEmpty.extraction_mode, 'form', 'empty: extraction_mode echoed');
assertEq(tEmpty.data_rows, 0, 'empty: 0 data_rows');
assertEq(tEmpty.columns_detected, 0, 'empty: 0 columns_detected');
assertEq(tEmpty.tables[0].row_count, 0, 'empty: table row_count');
assertEq(tEmpty.tables[0].headers.length, 0, 'empty: table headers');

// Single entry with 3 fields, prefix-keyed (entry_0_*)
const single: LayoutExtractorResult = {
  fields: {
    entry_0_child_first_name: mkField('child_first_name', 'JOHN', 0.95),
    entry_0_birth_date: mkField('birth_date', '1985-05-12', 0.88),
    entry_0_birthplace: mkField('birthplace', 'BOSTON', 0.72),
  },
  anchors: [],
};
const tSingle = layoutResultToTableFormat(single, 'form');
assertEq(tSingle.data_rows, 1, 'single entry → 1 row');
assertEq(tSingle.columns_detected, 3, 'single entry → 3 columns');
assertEq(tSingle.tables[0].rows[0].cells.length, 3, 'single row has 3 cells');
const cellNames = tSingle.tables[0].rows[0].cells.map(c => c.column_key).sort();
assertEq(cellNames, ['birth_date', 'birthplace', 'child_first_name'], 'cell column_keys match field keys');
assertEq(tSingle.tables[0].headers.length, 3, 'single entry → 3 headers');

// Single entry: header text uses underscores → spaces
const headerTexts = tSingle.tables[0].headers.map(h => h.text).sort();
assertEq(
  headerTexts,
  ['birth date', 'birthplace', 'child first name'],
  'header text replaces underscores with spaces'
);

// Cell content & confidence preserved
const johnCell = tSingle.tables[0].rows[0].cells.find(c => c.column_key === 'child_first_name')!;
assertEq(johnCell.content, 'JOHN', 'cell content preserved');
assertEq(johnCell.confidence, 0.95, 'cell confidence preserved');
assert(johnCell.bbox !== null, 'cell bbox preserved');

// Multi-entry: 2 entries, partially overlapping fields
const multi: LayoutExtractorResult = {
  fields: {
    entry_0_child_first_name: mkField('child_first_name', 'JOHN', 0.9),
    entry_0_birth_date: mkField('birth_date', '1985-01-01', 0.8),
    entry_1_child_first_name: mkField('child_first_name', 'MARY', 0.85),
    entry_1_birthplace: mkField('birthplace', 'NYC', 0.7),
  },
  anchors: [],
};
const tMulti = layoutResultToTableFormat(multi, 'multi_form');
assertEq(tMulti.data_rows, 2, 'multi: 2 rows');
assertEq(
  tMulti.columns_detected,
  3,
  'multi: 3 columns (union of fields across entries)'
);

// Default sort puts entry_0 before entry_1
const rowFirstNames = tMulti.tables[0].rows.map(r => {
  const c = r.cells.find(c => c.column_key === 'child_first_name')!;
  return c.content;
});
assertEq(rowFirstNames, ['JOHN', 'MARY'], 'multi: rows ordered entry_0 then entry_1 (default sort)');

// Missing fields filled with empty string + 0 confidence
const johnRow = tMulti.tables[0].rows[0];
const johnBirthplace = johnRow.cells.find(c => c.column_key === 'birthplace')!;
assertEq(johnBirthplace.content, '', 'missing field → empty content');
assertEq(johnBirthplace.confidence, 0, 'missing field → 0 confidence');
assertEq(johnBirthplace.bbox, null, 'missing field → null bbox');

// Custom entryIds order respected
const tMultiOrdered = layoutResultToTableFormat(multi, 'multi_form', ['entry_1', 'entry_0']);
const orderedNames = tMultiOrdered.tables[0].rows.map(r => {
  const c = r.cells.find(c => c.column_key === 'child_first_name')!;
  return c.content;
});
assertEq(orderedNames, ['MARY', 'JOHN'], 'multi: entryIds parameter controls row ordering');

// entryIds with unknown id → filtered out
const tFiltered = layoutResultToTableFormat(multi, 'multi_form', ['entry_0', 'entry_99']);
assertEq(tFiltered.data_rows, 1, 'multi: unknown entryId filtered out, only known entries become rows');

// Fields with no entry_N prefix → fallback to single entry_0
const noPrefix: LayoutExtractorResult = {
  fields: {
    foo_child_first_name: mkField('child_first_name', 'JANE', 0.9),
    foo_baptism_date: mkField('baptism_date', '2020-06-15', 0.85),
  },
  anchors: [],
};
const tNoPrefix = layoutResultToTableFormat(noPrefix, 'form');
// Note: parser splits on _ and takes first 2 → 'foo_child' becomes the entryId.
// This is a quirk: the function only treats prefixes literally, so any 2-token
// prefix becomes its own entry. Document the actual behavior.
assert(tNoPrefix.data_rows >= 1, 'fields without entry_N prefix still produce ≥1 row');

// ============================================================================
// Async tests wrapped — top-level await not supported under tsx/cjs
// ============================================================================
async function runAsyncTests() {

// ============================================================================
// loadAnchorConfigs
// ============================================================================
console.log('\n── loadAnchorConfigs ─────────────────────────────────────');

// Empty DB → returns defaults for the record type (DEFAULT_ANCHOR_CONFIGS.baptism)
const cfgEmpty = await loadAnchorConfigs(99, makeStubPool([]), 'baptism');
assert(
  cfgEmpty.child_first_name !== undefined,
  'empty DB: defaults for baptism include child_first_name'
);
assert(
  cfgEmpty.baptism_date !== undefined,
  'empty DB: defaults for baptism include baptism_date'
);

// Empty DB + unknown record type → returns empty object
const cfgUnknown = await loadAnchorConfigs(99, makeStubPool([]), 'mystery_type');
assertEq(Object.keys(cfgUnknown).length, 0, 'unknown record type + empty DB → {}');

// DB row overrides default
const cfgOverride = await loadAnchorConfigs(
  1,
  makeStubPool([
    {
      key: 'child_first_name',
      anchor_phrases: JSON.stringify(['CUSTOM PHRASE']),
      anchor_direction: 'right',
      search_zone: JSON.stringify({ padding: { left: 0.1, right: 0, top: 0, bottom: 0 }, extent: { width: 0.5, height: 0.2 } }),
    },
  ]),
  'baptism'
);
assertEq(
  cfgOverride.child_first_name.phrases,
  ['CUSTOM PHRASE'],
  'DB phrases override defaults'
);
assertEq(cfgOverride.child_first_name.direction, 'right', 'DB direction overrides default');
const ze = cfgOverride.child_first_name.zoneExtent as any;
assertEq(ze, { width: 0.5, height: 0.2 }, 'DB zoneExtent overrides default');
// Other defaults are still present
assert(cfgOverride.baptism_date !== undefined, 'non-overridden defaults still present');

// DB rows accept already-parsed (object) values too
const cfgParsed = await loadAnchorConfigs(
  1,
  makeStubPool([
    {
      key: 'sponsors',
      anchor_phrases: ['GODPARENTS', 'SPONSORS'] as any,
      anchor_direction: 'below',
      search_zone: { padding: { left: 0, right: 0, top: 0.01, bottom: 0.05 }, extent: { width: 0.4, height: 0.1 } } as any,
    },
  ]),
  'baptism'
);
assertEq(cfgParsed.sponsors.phrases, ['GODPARENTS', 'SPONSORS'], 'pre-parsed phrases array accepted');
assertEq((cfgParsed.sponsors.zoneExtent as any).width, 0.4, 'pre-parsed search_zone object accepted');

// DB row with no search_zone gets fallback padding/extent
const cfgNoZone = await loadAnchorConfigs(
  1,
  makeStubPool([
    {
      key: 'witnesses',
      anchor_phrases: JSON.stringify(['WITNESSES']),
      anchor_direction: 'below',
      search_zone: null as any,
    },
  ]),
  'marriage'
);
assertEq(
  cfgNoZone.witnesses.zonePadding,
  { left: 0, right: 0, top: 0.01, bottom: 0.05 },
  'null search_zone → default zonePadding'
);
assertEq(
  cfgNoZone.witnesses.zoneExtent,
  { width: 0.3, height: 0.1 },
  'null search_zone → default zoneExtent'
);

// DB row with null phrases → empty phrases array
const cfgNullPhrases = await loadAnchorConfigs(
  1,
  makeStubPool([
    {
      key: 'odd_field',
      anchor_phrases: null,
      anchor_direction: 'below',
      search_zone: null as any,
    },
  ]),
  'baptism'
);
assertEq(cfgNullPhrases.odd_field.phrases, [], 'null phrases → []');

// ============================================================================
// extractFormPage / extractMultiFormPage / extractAutoMode (integration)
//
// Use a synthetic vision response with no text — these tests verify the
// wrapper code (region/config plumbing, return shape), not the field
// extraction quality, which is exercised by layoutExtractor's own tests.
// ============================================================================
console.log('\n── extractFormPage (integration) ─────────────────────────');

const emptyVision: any = {
  fullTextAnnotation: {
    text: '',
    pages: [{ width: 1700, height: 2200, blocks: [] }],
  },
};
const stubExtractor: ExtractorRow = {
  id: 1,
  extraction_mode: 'form',
  column_bands: null,
  header_y_threshold: 0,
  record_regions: null,
};
const stubPool = makeStubPool([]);

const formResult = await extractFormPage(emptyVision, stubExtractor, stubPool, 'baptism');
assertEq(formResult.layout_id, 'form_extractor_form', 'extractFormPage: layout_id');
assertEq(formResult.extraction_mode, 'form', 'extractFormPage: extraction_mode = form');
assertEq(formResult.data_rows, 0, 'extractFormPage: empty page → 0 data rows');
assertEq(formResult.tables.length, 1, 'extractFormPage: always returns 1 table');

// learned_params as a JSON string is parsed
const formWithLearned = await extractFormPage(
  emptyVision,
  { ...stubExtractor, learned_params: JSON.stringify({ anchor_adjustments: { child_first_name: { add_phrases: ['BABY'] } } }) },
  stubPool,
  'baptism'
);
assertEq(formWithLearned.layout_id, 'form_extractor_form', 'learned_params (JSON string): handled without crash');

// learned_params as object is parsed
const formWithLearnedObj = await extractFormPage(
  emptyVision,
  { ...stubExtractor, learned_params: { anchor_adjustments: { child_first_name: { add_phrases: ['BABY'] } } } },
  stubPool,
  'baptism'
);
assertEq(formWithLearnedObj.layout_id, 'form_extractor_form', 'learned_params (object): handled without crash');

console.log('\n── extractMultiFormPage (integration) ────────────────────');

// No record_regions → falls back to extractFormPage
const noRegionsResult = await extractMultiFormPage(emptyVision, stubExtractor, stubPool, 'baptism');
assertEq(noRegionsResult.extraction_mode, 'form', 'no record_regions → fallback to single-form mode');

// With regions → multi_form mode
const multiExtractor: ExtractorRow = {
  ...stubExtractor,
  extraction_mode: 'multi_form',
  record_regions: [
    { id: 'region_top', x: 0, y: 0, width: 1, height: 0.5 },
    { id: 'region_bottom', x: 0, y: 0.5, width: 1, height: 0.5 },
  ],
};
const multiResult = await extractMultiFormPage(emptyVision, multiExtractor, stubPool, 'baptism');
assertEq(multiResult.extraction_mode, 'multi_form', 'with regions → multi_form mode');
assertEq(multiResult.layout_id, 'form_extractor_multi_form', 'with regions → multi_form layout_id');

// record_regions as JSON string is parsed
const multiExtractorString: ExtractorRow = {
  ...stubExtractor,
  extraction_mode: 'multi_form',
  record_regions: JSON.stringify([{ id: 'r1', x: 0, y: 0, width: 1, height: 1 }]) as any,
};
const multiStringResult = await extractMultiFormPage(emptyVision, multiExtractorString, stubPool, 'baptism');
assertEq(multiStringResult.extraction_mode, 'multi_form', 'record_regions as JSON string parsed');

console.log('\n── extractAutoMode (integration) ─────────────────────────');

// Empty page → 0 anchors → returns null (caller falls back to generic table)
const autoResult = await extractAutoMode(emptyVision, stubExtractor, 'baptism', stubPool);
assertEq(autoResult, null, 'extractAutoMode: 0 anchors → null (signals fallback)');

// Marriage record type with empty page → also null
const autoMarriage = await extractAutoMode(emptyVision, stubExtractor, 'marriage', stubPool);
assertEq(autoMarriage, null, 'extractAutoMode marriage: 0 anchors → null');

// Funeral record type with empty page → also null
const autoFuneral = await extractAutoMode(emptyVision, stubExtractor, 'funeral', stubPool);
assertEq(autoFuneral, null, 'extractAutoMode funeral: 0 anchors → null');

} // end runAsyncTests

runAsyncTests().then(() => {
  // ============================================================================
  // Summary
  // ============================================================================
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}).catch((err) => {
  console.error('UNCAUGHT ERROR in async tests:', err);
  process.exit(1);
});
