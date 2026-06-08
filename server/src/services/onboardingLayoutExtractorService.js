/**
 * Seeds ocr_extractors candidates from parish onboarding layout catalog selections.
 * Invoked when a church uploads OCR jobs so Studio has pre-declared layout shells.
 */
const { promisePool } = require('../config/db');
const layoutCatalog = require('./ocrLayoutCatalogService');

const ANCHOR_CONFIGS = {
  baptism: {
    record_number: { phrases: ['NO', 'N°', 'NUMBER', 'RECORD', 'PARISH RECORD'], direction: 'right' },
    child_first_name: { phrases: ['NAME OF CHILD', 'CHILD', 'FIRST NAME'], direction: 'below' },
    child_last_name: { phrases: ['LAST NAME', 'SURNAME', 'FAMILY NAME'], direction: 'below' },
    birth_date: { phrases: ['DATE OF BIRTH', 'BIRTH DATE', 'BORN'], direction: 'below' },
    baptism_date: { phrases: ['DATE OF BAPTISM', 'BAPTISM DATE', 'BAPTIZED', 'RECEPTION DATE'], direction: 'below' },
    birthplace: { phrases: ['PLACE OF BIRTH', 'BIRTHPLACE', 'CITY OF BIRTH', 'BORN IN'], direction: 'below' },
    sponsors: { phrases: ['FULL NAMES OF SPONSORS', 'NAMES OF SPONSORS', 'SPONSORS', 'GODPARENTS', 'GOD PARENTS'], direction: 'below' },
    parents: { phrases: ['PARENTS', 'FATHER', 'MOTHER', 'NAME OF PARENTS', "FATHER'S NAME", "MOTHER'S NAME"], direction: 'below' },
    clergy: { phrases: ["PRIEST'S NAME", 'PRIEST NAME', 'PRIEST', 'CLERGY', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'], direction: 'right' },
  },
  marriage: {
    groom_name: { phrases: ['GROOM', 'BRIDEGROOM', 'HUSBAND', 'NAME OF GROOM'], direction: 'below' },
    bride_name: { phrases: ['BRIDE', 'WIFE', 'NAME OF BRIDE'], direction: 'below' },
    date_of_marriage: { phrases: ['DATE OF MARRIAGE', 'MARRIAGE DATE', 'WEDDING DATE', 'MARRIED'], direction: 'below' },
    witnesses: { phrases: ['WITNESSES', 'WITNESS', 'BEST MAN', 'KOOM', 'KUMOVI'], direction: 'below' },
    officiant: { phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY', 'SACRAMENTS PERFORMED BY'], direction: 'right' },
  },
  funeral: {
    deceased_name: { phrases: ['DECEASED', 'NAME OF DECEASED', 'DECEDENT', 'FULL NAME'], direction: 'below' },
    date_of_death: { phrases: ['DATE OF DEATH', 'DIED', 'DEATH DATE'], direction: 'below' },
    date_of_funeral: { phrases: ['DATE OF FUNERAL', 'FUNERAL DATE', 'FUNERAL SERVICE'], direction: 'below' },
    date_of_burial: { phrases: ['DATE OF BURIAL', 'BURIAL DATE', 'INTERMENT', 'BURIED'], direction: 'below' },
    place_of_burial: { phrases: ['PLACE OF BURIAL', 'CEMETERY', 'INTERMENT PLACE', 'BURIED AT'], direction: 'below' },
    age_at_death: { phrases: ['AGE', 'AGE AT DEATH', 'YEARS OLD'], direction: 'right' },
    cause_of_death: { phrases: ['CAUSE OF DEATH', 'CAUSE', 'MANNER OF DEATH'], direction: 'below' },
    officiant: { phrases: ['PRIEST', 'CLERGY', 'OFFICIANT', 'PERFORMED BY'], direction: 'right' },
  },
};

const FIELD_KEYS_BY_TYPE = {
  baptism: Object.keys(ANCHOR_CONFIGS.baptism),
  marriage: Object.keys(ANCHOR_CONFIGS.marriage),
  funeral: Object.keys(ANCHOR_CONFIGS.funeral),
};

function parseLayoutSelections(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  return raw;
}

function mapCatalogExtractionMode(catalogMode) {
  if (catalogMode === 'narrative_block') return 'auto';
  if (['tabular', 'form', 'multi_form', 'auto'].includes(catalogMode)) return catalogMode;
  return 'auto';
}

function humanizeFieldKey(key) {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadOnboardingLayoutContext(churchId) {
  const [rows] = await promisePool.query(
    `SELECT onboarding_request_id, selected_layout_catalog_json
     FROM onboarding_requests
     WHERE church_id = ? AND layout_configuration_completed = 1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [churchId]
  );
  if (!rows.length) return null;
  return {
    onboardingRequestId: rows[0].onboarding_request_id,
    selections: parseLayoutSelections(rows[0].selected_layout_catalog_json),
  };
}

async function findCandidateByCatalogId(churchId, recordType, catalogLayoutId) {
  const [rows] = await promisePool.query(
    `SELECT id FROM ocr_extractors
     WHERE church_id = ? AND record_type = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(learned_params, '$.catalog_layout_id')) = ?
     LIMIT 1`,
    [churchId, recordType, catalogLayoutId]
  );
  return rows[0]?.id || null;
}

async function seedExtractorFields(extractorId, recordType, extractionMode) {
  if (!['form', 'multi_form', 'auto'].includes(extractionMode)) return;

  const fieldKeys = FIELD_KEYS_BY_TYPE[recordType];
  if (!fieldKeys?.length) return;

  const anchors = ANCHOR_CONFIGS[recordType] || {};

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i];
    const anchor = anchors[key];
    if (!anchor) continue;

    const [existing] = await promisePool.query(
      'SELECT id FROM ocr_extractor_fields WHERE extractor_id = ? AND `key` = ? LIMIT 1',
      [extractorId, key]
    );
    if (existing.length) continue;

    await promisePool.query(
      `INSERT INTO ocr_extractor_fields
         (extractor_id, name, \`key\`, field_type, column_index, sort_order,
          anchor_phrases, anchor_direction, search_zone)
       VALUES (?, ?, ?, 'text', ?, ?, ?, ?, NULL)`,
      [
        extractorId,
        humanizeFieldKey(key),
        key,
        i,
        i,
        JSON.stringify(anchor.phrases),
        anchor.direction,
      ]
    );
  }
}

async function createCatalogCandidate(churchId, recordType, catalogLayoutId, onboardingRequestId) {
  const layout = layoutCatalog.getLayoutById(catalogLayoutId);
  if (!layout || layout.record_type !== recordType) {
    throw new Error(`Invalid catalog layout ${catalogLayoutId} for ${recordType}`);
  }

  const extractionMode = mapCatalogExtractionMode(layout.extraction_mode);
  const learnedParams = {
    catalog_layout_id: catalogLayoutId,
    catalog_extraction_mode: layout.extraction_mode,
    source: 'onboarding_selection',
    onboarding_request_id: onboardingRequestId,
  };

  const [result] = await promisePool.query(
    `INSERT INTO ocr_extractors
       (name, description, record_type, page_mode, extraction_mode, column_bands,
        header_y_threshold, is_default, status, church_id, learned_params, created_at, updated_at)
     VALUES (?, ?, ?, 'single', ?, NULL, 0.15, 0, 'candidate', ?, ?, NOW(), NOW())`,
    [
      `[Onboarding] ${layout.title}`,
      `${layout.description} (catalog: ${catalogLayoutId})`,
      recordType,
      extractionMode,
      churchId,
      JSON.stringify(learnedParams),
    ]
  );

  const extractorId = result.insertId;
  await seedExtractorFields(extractorId, recordType, extractionMode);
  return extractorId;
}

/**
 * Idempotently create ocr_extractors candidates for each catalog layout the parish selected.
 * @returns {Promise<{ created: number[], existing: number[], catalogLayoutIds: string[] }>}
 */
async function ensureOnboardingLayoutCandidates(churchId, recordType) {
  const result = { created: [], existing: [], catalogLayoutIds: [] };
  if (!churchId || !recordType || recordType === 'custom') return result;

  const ctx = await loadOnboardingLayoutContext(churchId);
  if (!ctx) return result;

  const catalogIds = ctx.selections[recordType];
  if (!Array.isArray(catalogIds) || catalogIds.length === 0) return result;

  result.catalogLayoutIds = catalogIds;

  for (const catalogLayoutId of catalogIds) {
    const existingId = await findCandidateByCatalogId(churchId, recordType, catalogLayoutId);
    if (existingId) {
      result.existing.push(existingId);
      continue;
    }

    const newId = await createCatalogCandidate(
      churchId,
      recordType,
      catalogLayoutId,
      ctx.onboardingRequestId
    );
    result.created.push(newId);
  }

  return result;
}

/**
 * When exactly one layout was selected for a record type, return its candidate extractor id for job assignment.
 */
async function resolveUploadLayoutTemplateId(churchId, recordType) {
  if (!churchId || !recordType || recordType === 'custom') return null;

  const ctx = await loadOnboardingLayoutContext(churchId);
  if (!ctx) return null;

  const catalogIds = ctx.selections[recordType];
  if (!Array.isArray(catalogIds) || catalogIds.length !== 1) return null;

  return findCandidateByCatalogId(churchId, recordType, catalogIds[0]);
}

module.exports = {
  ensureOnboardingLayoutCandidates,
  resolveUploadLayoutTemplateId,
  loadOnboardingLayoutContext,
  findCandidateByCatalogId,
};
