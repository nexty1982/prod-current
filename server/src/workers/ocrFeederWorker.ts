/**
 * OCR Feeder Worker — Tenant-Aware
 *
 * Polls pending jobs from the PLATFORM DB (orthodoxmetrics_db.ocr_jobs),
 * then for each job routes feeder table reads/writes to the correct
 * TENANT schema (om_church_<church_id>).
 *
 * DB routing:
 *   platformPool  → orthodoxmetrics_db.ocr_jobs        (global queue)
 *   tenantPool    → om_church_<id>.ocr_feeder_pages    (per-church)
 *   tenantPool    → om_church_<id>.ocr_feeder_artifacts(per-church)
 *
 * ocr_jobs columns (actual schema):
 *   id, church_id, filename, status, record_type, language,
 *   confidence_score, error_regions, ocr_result, ocr_text, created_at
 *
 * Status ENUM: pending | processing | complete | error
 *
 * Upload root: /var/www/orthodoxmetrics/prod/uploads (NO server/uploads)
 * Managed via systemctl, NOT pm2.
 */

import * as fs from 'fs';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import * as path from 'path';
import { promisify } from 'util';
import { classifyRecordType } from '../utils/ocrClassifier';

const { dbLogger } = require('../utils/dbLogger');

// ── DB pools (platform + tenant factory) ────────────────────────────────────
const {
  promisePool: platformPool,
  getTenantPool,
  tenantSchema,
  assertTenantOcrTablesExist,
} = require('../config/db');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdirp = (dir: string) => fs.mkdirSync(dir, { recursive: true });

// ── Resolve upload dir (canonical path outside server/) ─────────────────────
const UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads';
function resolveUploadDir(churchId: number): string {
  const dir = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded');
  mkdirp(dir);
  return dir;
}

/**
 * Resolve a job's filename to an absolute filesystem path.
 * filename may be a bare name or a relative /uploads/... path.
 * Guard: throws if resolved path contains /server/.
 */
function resolveJobFilePath(filename: string, churchId: number): string {
  let filePath: string;

  if (filename.startsWith('/uploads/')) {
    // Relative DB path → absolute under prod/
    filePath = path.join('/var/www/orthodoxmetrics/prod', filename);
  } else {
    // Bare filename → canonical upload dir
    filePath = path.join(resolveUploadDir(churchId), filename);
  }

  // Hard guard: no server/ paths
  if (filePath.includes('/server/')) {
    throw new Error(`[OCR Worker] FATAL: resolved path contains /server/: ${filePath}`);
  }

  return filePath;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface JobRow extends RowDataPacket {
  id: number;
  church_id: number;
  filename: string;
  record_type: string;
  language: string;
}

interface PageRow extends RowDataPacket {
  id: number;
  job_id: number;
  page_index: number;
  status: string;
  input_path: string;
  preproc_path: string | null;
  thumb_path: string | null;
  rotation: number;
  dpi: number | null;
  bbox_crop_json: string | null;
  quality_score: number | null;
  ocr_confidence: number | null;
  retry_count: number;
  last_error: string | null;
}

// ── State machine ───────────────────────────────────────────────────────────

const STATE_TRANSITIONS: Record<string, string[]> = {
  queued: ['preprocessing'],
  preprocessing: ['ocr', 'failed'],
  ocr: ['parsing', 'failed'],
  parsing: ['scoring', 'failed'],
  scoring: ['accepted', 'review', 'retry', 'failed'],
  retry: ['queued', 'failed'],
  accepted: [],
  review: [],
  failed: [],
};

// ── Storage helpers ─────────────────────────────────────────────────────────

function getJobStorageDir(jobId: number): string {
  return path.join(__dirname, '../../storage/feeder', `job_${jobId}`);
}
function getPageStorageDir(jobId: number, pageIndex: number): string {
  return path.join(getJobStorageDir(jobId), `page_${pageIndex}`);
}

// ── Tenant-aware page status update ─────────────────────────────────────────

async function updatePageStatus(
  tenantPool: Pool,
  pageId: number,
  newStatus: string,
  currentStatus?: string
): Promise<boolean> {
  try {
    if (currentStatus && !STATE_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      console.warn(`[OCR Worker] Invalid transition: ${currentStatus} -> ${newStatus} for page ${pageId}`);
      return false;
    }
    await tenantPool.execute(
      `UPDATE ocr_feeder_pages SET status = ?, updated_at = NOW()
       WHERE id = ? AND (status = ? OR ? IS NULL)`,
      [newStatus, pageId, currentStatus || '', currentStatus || null]
    );
    return true;
  } catch (error: any) {
    console.error(`[OCR Worker] Error updating page ${pageId} status:`, error.message);
    return false;
  }
}

// ── Step 1: Preprocess ──────────────────────────────────────────────────────

async function preprocessPage(
  tenantPool: Pool,
  page: PageRow
): Promise<{ preprocPath: string; qualityScore: number }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  const preprocPath = path.join(pageDir, 'preprocessed.jpg');
  mkdirp(pageDir);

  if (fs.existsSync(page.input_path)) {
    fs.copyFileSync(page.input_path, preprocPath);
  }
  const qualityScore = 0.85; // placeholder until image quality analysis

  await tenantPool.execute(
    `UPDATE ocr_feeder_pages SET preproc_path = ?, quality_score = ?, updated_at = NOW() WHERE id = ?`,
    [preprocPath, qualityScore, page.id]
  );

  return { preprocPath, qualityScore };
}

// ── Step 2: OCR via Google Vision ───────────────────────────────────────────

async function runOCR(
  tenantPool: Pool,
  page: PageRow
): Promise<{ rawText: string; confidence: number; visionResultJson: any }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  mkdirp(pageDir);
  const artifactPath = path.join(pageDir, 'raw_text.txt');

  const imagePath = page.preproc_path || page.input_path;
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  console.log(`  Calling Google Vision API for page ${page.id} -> ${imagePath}`);

  const vision = require('@google-cloud/vision');
  const visionConfig: any = { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID };
  if (process.env.GOOGLE_VISION_KEY_PATH) visionConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) visionConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const client = new vision.ImageAnnotatorClient(visionConfig);

  const imageBuffer = fs.readFileSync(imagePath);

  const visionPromise = client.annotateImage({
    image: { content: imageBuffer },
    imageContext: { languageHints: LANGUAGE_HINTS_CFG },
    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
  });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Vision API timed out after ${VISION_TIMEOUT_MS_CFG / 1000}s`)), VISION_TIMEOUT_MS_CFG)
  );
  const [result] = await Promise.race([visionPromise, timeoutPromise]) as any[];

  const document = result.fullTextAnnotation;
  const fullText = document?.text || '';
  let confidence = 0;
  const visionPages = document?.pages || [];
  if (visionPages.length > 0 && visionPages[0].confidence !== undefined) {
    confidence = visionPages[0].confidence;
  }

  if (!fullText) console.warn(`  No text detected for page ${page.id}`);

  // Build structured Vision JSON with bounding boxes (same format as ocr.js)
  const visionResultJson: any = {
    text: fullText,
    pages: visionPages.map((vp: any, vpIdx: number) => ({
      pageIndex: vpIdx,
      width: vp.width,
      height: vp.height,
      blocks: (vp.blocks || []).map((block: any) => ({
        blockType: block.blockType,
        confidence: block.confidence,
        boundingBox: block.boundingBox,
        paragraphs: (block.paragraphs || []).map((p: any) => ({
          confidence: p.confidence,
          boundingBox: p.boundingBox,
          words: (p.words || []).map((w: any) => ({
            text: (w.symbols || []).map((s: any) => s.text).join(''),
            confidence: w.confidence,
            boundingBox: w.boundingBox,
          })),
        })),
      })),
    })),
  };

  // Save raw text artifact
  await writeFile(artifactPath, fullText);

  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'raw_text', ?, ?)`,
    [page.id, artifactPath, JSON.stringify({ confidence, extractedAt: new Date().toISOString() })]
  );

  // Save Vision JSON to disk and as artifact
  const visionJsonPath = path.join(pageDir, 'vision_result.json');
  const visionJsonStr = JSON.stringify(visionResultJson);
  await writeFile(visionJsonPath, visionJsonStr);

  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'vision_json', ?, ?)`,
    [page.id, visionJsonPath, JSON.stringify({
      pages: visionResultJson.pages.length,
      totalChars: fullText.length,
      extractedAt: new Date().toISOString(),
    })]
  );

  console.log(`  Vision JSON saved for page ${page.id} (${visionJsonStr.length} bytes)`);

  await tenantPool.execute(
    `UPDATE ocr_feeder_pages SET ocr_confidence = ?, updated_at = NOW() WHERE id = ?`,
    [confidence, page.id]
  );

  return { rawText: fullText, confidence, visionResultJson };
}

// ── Step 3: Parse ───────────────────────────────────────────────────────────

async function parsePage(
  tenantPool: Pool,
  page: PageRow,
  rawText: string
): Promise<any> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  mkdirp(pageDir);
  const artifactPath = path.join(pageDir, 'record_candidates.json');

  // Look up the job's record_type from platform DB
  let jobRecordType = 'unknown';
  try {
    const [jobRows] = await platformPool.query(
      `SELECT record_type FROM ocr_jobs WHERE id = ?`, [page.job_id]
    ) as any[];
    if (jobRows.length > 0 && jobRows[0].record_type) {
      jobRecordType = jobRows[0].record_type;
    }
  } catch (_: any) { /* best effort */ }

  // Try to load table extraction result for multi-record parsing
  const tableJsonPath = path.join(pageDir, 'table_extraction.json');
  let recordCandidates: any;

  if (fs.existsSync(tableJsonPath)) {
    try {
      const tableExtractionResult = JSON.parse(
        (await readFile(tableJsonPath)).toString()
      );
      if (tableExtractionResult && tableExtractionResult.data_rows > 0) {
        const { extractRecordCandidates } = require('../ocr/columnMapper');
        recordCandidates = extractRecordCandidates(tableExtractionResult, rawText, jobRecordType);
        console.log(`  [ColumnMapper] Page ${page.id}: ${recordCandidates.candidates.length} record(s) detected (type: ${recordCandidates.detectedType})`);
      }
    } catch (mapErr: any) {
      console.warn(`  [ColumnMapper] Page ${page.id}: Mapping failed (non-blocking): ${mapErr.message}`);
    }
  }

  // Fallback: single placeholder candidate
  if (!recordCandidates || !recordCandidates.candidates || recordCandidates.candidates.length === 0) {
    recordCandidates = {
      candidates: [{
        recordType: jobRecordType,
        confidence: 0.7,
        fields: { extractedText: rawText.substring(0, 200) },
        sourceRowIndex: -1,
        needsReview: true,
      }],
      detectedType: jobRecordType,
      typeConfidence: 0,
      columnMapping: {},
      unmappedColumns: [],
      parsedAt: new Date().toISOString(),
    };
  }

  await writeFile(artifactPath, JSON.stringify(recordCandidates, null, 2));

  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json)
     VALUES (?, 'record_candidates', ?, ?, ?)`,
    [page.id, artifactPath, JSON.stringify(recordCandidates),
     JSON.stringify({ candidateCount: recordCandidates.candidates.length })]
  );

  return recordCandidates;
}

// ── Step 4: Score and route ─────────────────────────────────────────────────

async function scoreAndRoute(page: PageRow, ocrConfidence: number, qualityScore: number): Promise<string> {
  const combinedScore = ocrConfidence * CONFIDENCE_WEIGHT_CFG + qualityScore * QUALITY_WEIGHT_CFG;
  if (combinedScore >= ACCEPT_THRESHOLD_CFG) return 'accepted';
  if (combinedScore >= REVIEW_THRESHOLD_CFG) return 'review';
  return page.retry_count < 2 ? 'retry' : 'failed';
}

// ── Process a single page through the pipeline ─────────────────────────────

async function processPage(tenantPool: Pool, page: PageRow): Promise<void> {
  if (page.status === 'queued' || page.status === 'preprocessing') {
    if (!(await updatePageStatus(tenantPool, page.id, 'preprocessing', page.status))) return;
    const { qualityScore } = await preprocessPage(tenantPool, page);
    console.log(`  Preprocessed page ${page.id}, quality: ${qualityScore}`);
    page.status = 'preprocessing';
  }

  if (page.status === 'preprocessing' || page.status === 'ocr') {
    if (!(await updatePageStatus(tenantPool, page.id, 'ocr', page.status))) return;
    const { rawText: ocrRawText, confidence, visionResultJson } = await runOCR(tenantPool, page);
    console.log(`  OCR page ${page.id}, confidence: ${(confidence * 100).toFixed(1)}%`);

    // ── Table Extraction (runs between OCR and parsing) ──────────────────
    try {
      // Look up job's record_type from platform DB
      let recordType = 'unknown';
      try {
        const [jobRows] = await platformPool.query(
          `SELECT record_type FROM ocr_jobs WHERE id = ?`, [page.job_id]
        ) as any[];
        if (jobRows.length > 0 && jobRows[0].record_type) {
          recordType = jobRows[0].record_type;
        }
      } catch (_: any) { /* best effort */ }

      // Auto-detect record type from OCR text when job type is custom/unknown
      if (recordType === 'custom' || recordType === 'unknown') {
        try {
          const { classifyRecordType } = require('../utils/ocrClassifier');
          const classResult = classifyRecordType(ocrRawText);
          if (classResult.confidence > CLASSIFIER_CONFIDENCE_CFG && classResult.suggested_type !== 'unknown' && classResult.suggested_type !== 'custom') {
            console.log(`  [AutoDetect] Page ${page.id}: Detected '${classResult.suggested_type}' (conf: ${classResult.confidence}) — overriding job type '${recordType}'`);
            recordType = classResult.suggested_type;
            // Update job's record_type in platform DB so downstream steps also benefit
            try {
              await platformPool.query(`UPDATE ocr_jobs SET record_type = ? WHERE id = ?`, [recordType, page.job_id]);
            } catch (_: any) { /* best effort */ }
          }
        } catch (_: any) { /* classifier not available */ }
      }

      // Check for layout template (explicit on job, or default for record_type)
      let templateBands: any = null;
      let templateHeaderY: number | null = null;
      let templateId: number | null = null;
      try {
        // First check if job has an explicit layout_template_id
        const [tplJobRows] = await platformPool.query(
          `SELECT layout_template_id FROM ocr_jobs WHERE id = ?`, [page.job_id]
        ) as any[];
        templateId = tplJobRows[0]?.layout_template_id || null;

        // Fallback: find default template for this record_type
        if (!templateId) {
          const [defaultRows] = await platformPool.query(
            `SELECT id, column_bands, header_y_threshold FROM ocr_extractors
             WHERE record_type = ? AND is_default = 1 AND column_bands IS NOT NULL LIMIT 1`,
            [recordType]
          ) as any[];
          if (defaultRows.length > 0) {
            templateId = defaultRows[0].id;
            templateBands = typeof defaultRows[0].column_bands === 'string'
              ? JSON.parse(defaultRows[0].column_bands) : defaultRows[0].column_bands;
            templateHeaderY = defaultRows[0].header_y_threshold;
          }
        } else {
          // Load explicit template
          const [tplRows] = await platformPool.query(
            `SELECT column_bands, header_y_threshold FROM ocr_extractors WHERE id = ?`,
            [templateId]
          ) as any[];
          if (tplRows.length > 0 && tplRows[0].column_bands) {
            templateBands = typeof tplRows[0].column_bands === 'string'
              ? JSON.parse(tplRows[0].column_bands) : tplRows[0].column_bands;
            templateHeaderY = tplRows[0].header_y_threshold;
          }
        }

        if (templateBands) {
          console.log(`  [TableExtract] Page ${page.id}: Using layout template ${templateId} (${templateBands.length} bands)`);
        }
      } catch (tplErr: any) {
        console.warn(`  [TableExtract] Page ${page.id}: Template lookup failed (non-blocking): ${tplErr.message}`);
      }

      let tableExtractionResult: any = null;
      if (templateBands) {
        // Use template bands with generic_table extractor
        const { extractGenericTable } = require('../ocr/layouts/generic_table');
        const opts: any = {
          pageIndex: 0,
          columnBands: templateBands.map((b: any) => Array.isArray(b) ? b : [b.start, b.end]),
        };
        if (templateHeaderY != null) opts.headerYThreshold = templateHeaderY;
        tableExtractionResult = extractGenericTable(visionResultJson, opts);
        console.log(`  [TableExtract] Page ${page.id}: Template ${templateId} → ${tableExtractionResult.data_rows} rows, ${tableExtractionResult.columns_detected} columns`);
      } else if (recordType === 'marriage') {
        const { extractMarriageLedgerTable } = require('../ocr/layouts/marriage_ledger_v1');
        tableExtractionResult = extractMarriageLedgerTable(visionResultJson, { pageIndex: 0 });
        console.log(`  [TableExtract] Page ${page.id}: Marriage ledger → ${tableExtractionResult.data_rows} rows, ${tableExtractionResult.tables?.length || 0} tables`);
      } else {
        const { extractGenericTable } = require('../ocr/layouts/generic_table');
        tableExtractionResult = extractGenericTable(visionResultJson, { pageIndex: 0 });
        console.log(`  [TableExtract] Page ${page.id}: Generic extraction → ${tableExtractionResult.data_rows} rows, ${tableExtractionResult.columns_detected} columns`);
      }

      // Convert to structured text
      const { tableToStructuredText } = require('../ocr/layouts/generic_table');
      const structuredText = tableToStructuredText(tableExtractionResult);

      if (structuredText) {
        // Save table extraction JSON artifact
        const pageDir = getPageStorageDir(page.job_id, page.page_index);
        mkdirp(pageDir);
        const tableJsonPath = path.join(pageDir, 'table_extraction.json');
        await writeFile(tableJsonPath, JSON.stringify(tableExtractionResult, null, 2));

        const structuredTxtPath = path.join(pageDir, '_structured.txt');
        await writeFile(structuredTxtPath, structuredText);

        await tenantPool.execute(
          `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
           VALUES (?, 'table_extraction', ?, ?)`,
          [page.id, structuredTxtPath, JSON.stringify({
            layout_id: tableExtractionResult.layout_id,
            data_rows: tableExtractionResult.data_rows,
            columns_detected: tableExtractionResult.columns_detected || tableExtractionResult.tables?.[0]?.column_count,
            chars: structuredText.length,
            extractedAt: new Date().toISOString(),
          })]
        );

        console.log(`  [TableExtract] Page ${page.id}: Structured text saved (${structuredText.length} chars)`);
      }
    } catch (tableErr: any) {
      console.warn(`  [TableExtract] Page ${page.id}: Table extraction failed (non-blocking): ${tableErr.message}`);
      // Non-blocking — continue with raw text
    }

    page.status = 'ocr';
  }

  if (page.status === 'ocr' || page.status === 'parsing') {
    if (!(await updatePageStatus(tenantPool, page.id, 'parsing', page.status))) return;
    const [artifacts] = await tenantPool.execute<RowDataPacket[]>(
      `SELECT storage_path FROM ocr_feeder_artifacts
       WHERE page_id = ? AND type = 'raw_text' ORDER BY created_at DESC LIMIT 1`,
      [page.id]
    );
    let rawText = '';
    if (artifacts.length > 0 && fs.existsSync(artifacts[0].storage_path)) {
      rawText = (await readFile(artifacts[0].storage_path)).toString();
    }
    await parsePage(tenantPool, page, rawText);
    console.log(`  Parsed page ${page.id}`);
    page.status = 'parsing';
  }

  if (page.status === 'parsing' || page.status === 'scoring') {
    if (!(await updatePageStatus(tenantPool, page.id, 'scoring', page.status))) return;
    const [scoreRows] = await tenantPool.execute<RowDataPacket[]>(
      `SELECT quality_score, ocr_confidence FROM ocr_feeder_pages WHERE id = ?`, [page.id]
    );
    const qs = scoreRows[0]?.quality_score || 0.85;
    const oc = scoreRows[0]?.ocr_confidence || 0.75;
    const finalStatus = await scoreAndRoute(page, oc, qs);
    await updatePageStatus(tenantPool, page.id, finalStatus, 'scoring');
    console.log(`  Page ${page.id} -> ${finalStatus}`);
  }

  if (page.status === 'retry') {
    await updatePageStatus(tenantPool, page.id, 'queued', 'retry');
    console.log(`  Page ${page.id} re-queued for retry`);
  }
}

// ── Structured error logger ─────────────────────────────────────────────────

function logStructuredError(prefix: string, err: any): void {
  const detail: any = {
    message: err.message || 'Unknown error',
    code: err.code || null,
    errno: err.errno || null,
    sqlState: err.sqlState || null,
    sqlMessage: err.sqlMessage || null,
  };
  if (err.sql) detail.sql = String(err.sql).substring(0, 300);
  console.error(`${prefix} ${JSON.stringify(detail)}`);
  if (err.stack) {
    console.error(`${prefix} Stack: ${err.stack.split('\n').slice(0, 5).join('\n')}`);
  }
}

// ── Process a single OCR job ────────────────────────────────────────────────

async function processJob(job: JobRow): Promise<void> {
  const { id: jobId, church_id: churchId, filename, record_type, language } = job;
  const schema = tenantSchema(churchId);
  const uploadDir = resolveUploadDir(churchId);

  console.log(`OCR_JOB_CLAIMED ${JSON.stringify({ jobId, churchId, filename, recordType: record_type, language })}`);
  dbLogger.info('OCR:Worker', `Job ${jobId} claimed for processing`, {
    jobId, churchId, filename, recordType: record_type, language
  }, null, 'ocr-worker');

  // Resolve file path from filename
  const filePath = resolveJobFilePath(filename, churchId);
  const fileExists = fs.existsSync(filePath);
  console.log(`OCR_FILE_RESOLVED ${JSON.stringify({ jobId, filePath, exists: fileExists })}`);

  if (!fileExists) {
    // Mark job as error with explicit message — do NOT swallow
    const errMsg = `Source image file not found: ${filePath} (filename=${filename}, churchId=${churchId})`;
    await platformPool.query(
      `UPDATE ocr_jobs SET status = 'error', error_regions = ? WHERE id = ?`,
      [errMsg.substring(0, 500), jobId]
    );
    console.error(`OCR_JOB_ERROR ${JSON.stringify({ jobId, code: 'ENOENT', message: errMsg })}`);
    dbLogger.error('OCR:Worker', `Job ${jobId} failed: file not found`, {
      jobId, churchId, filename, filePath, code: 'ENOENT'
    }, null, 'ocr-worker');
    return;
  }

  // Guard: tenant tables must exist
  try {
    await assertTenantOcrTablesExist(churchId);
  } catch (tenantErr: any) {
    const errMsg = tenantErr.message || 'Tenant tables missing';
    await platformPool.query(
      `UPDATE ocr_jobs SET status = 'error', error_regions = ? WHERE id = ?`,
      [errMsg.substring(0, 500), jobId]
    );
    logStructuredError(`OCR_JOB_ERROR job=${jobId}`, tenantErr);
    return;
  }

  const tenantPool: Pool = getTenantPool(churchId);
  console.log(`OCR_TENANT_READY ${JSON.stringify({ jobId, tenantSchema: schema })}`);

  // Get pages for this job from TENANT DB
  const [pages] = await tenantPool.execute<PageRow[]>(
    `SELECT * FROM ocr_feeder_pages WHERE job_id = ? ORDER BY page_index ASC`,
    [jobId]
  );

  if (pages.length === 0) {
    console.log(`  No feeder pages for job ${jobId} — processing job image directly via processOcrJobAsync`);

    // Delegate to processOcrJobAsync — pass PLATFORM pool so it writes to orthodoxmetrics_db.ocr_jobs
    const ocrRoutes = require('../routes/ocr');
    if (typeof ocrRoutes.processOcrJobAsync === 'function') {
      await ocrRoutes.processOcrJobAsync(platformPool, jobId, filePath, {
        churchId,
        engine: 'google-vision',
        language: language || 'en',
        recordType: record_type || 'baptism',
      });

      // processOcrJobAsync uses 'completed'/'failed' status values but our ENUM is 'complete'/'error'
      // Fix up the status after it returns
      try {
        const [statusRows] = await platformPool.query(
          `SELECT status FROM ocr_jobs WHERE id = ?`, [jobId]
        ) as any[];
        const currentStatus = statusRows[0]?.status;
        if (currentStatus === 'completed') {
          await platformPool.query(`UPDATE ocr_jobs SET status = 'complete' WHERE id = ?`, [jobId]);
        } else if (currentStatus === 'failed') {
          await platformPool.query(`UPDATE ocr_jobs SET status = 'error' WHERE id = ?`, [jobId]);
        }
      } catch (_) { /* best effort status fixup */ }

      // Read back final state for logging + run classifier
      const [finalRows] = await platformPool.query(
        `SELECT status, confidence_score, ocr_text, LENGTH(ocr_text) as ocr_text_len FROM ocr_jobs WHERE id = ?`, [jobId]
      ) as any[];
      const final = finalRows[0];
      if (final?.status === 'complete') {
        console.log(`OCR_JOB_COMPLETE ${JSON.stringify({ jobId, confidenceScore: final.confidence_score, ocrTextLen: final.ocr_text_len })}`);
        dbLogger.success('OCR:Worker', `Job ${jobId} completed (direct processing)`, {
          jobId, churchId, confidenceScore: final.confidence_score, ocrTextLen: final.ocr_text_len
        }, null, 'ocr-worker');

        // Run classifier on OCR text
        if (final.ocr_text) {
          try {
            const classResult = classifyRecordType(final.ocr_text);
            await platformPool.query(
              `UPDATE ocr_jobs SET classifier_suggested_type = ?, classifier_confidence = ? WHERE id = ?`,
              [classResult.suggested_type, classResult.confidence, jobId]
            );
            console.log(`OCR_CLASSIFIER ${JSON.stringify({ jobId, suggested: classResult.suggested_type, confidence: classResult.confidence })}`);
          } catch (classErr: any) {
            console.warn(`[OCR Worker] Classifier failed for job ${jobId}: ${classErr.message}`);
          }
        }

        // Store raw_text as artifact in tenant DB
        try {
          const [pageRows] = await tenantPool.execute(
            `SELECT id FROM ocr_feeder_pages WHERE job_id = ? LIMIT 1`, [jobId]
          ) as any[];
          if (pageRows.length > 0) {
            await tenantPool.execute(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, json_blob, meta_json, created_at)
               VALUES (?, 'raw_text', ?, ?, NOW())`,
              [pageRows[0].id, final.ocr_text?.substring(0, 65000) || '', JSON.stringify({ source: 'processOcrJobAsync', jobId })]
            );
          }
        } catch (_: any) { /* best effort artifact storage */ }

        // Sync completion back to church DB (so GET /api/church/:id/ocr/jobs sees it)
        try {
          await tenantPool.execute(
            `UPDATE ocr_jobs SET status = 'completed', confidence_score = ?, ocr_text = ?, updated_at = NOW()
             WHERE church_id = ? AND filename = ? AND status IN ('queued', 'processing')`,
            [final.confidence_score, final.ocr_text, churchId, filename]
          );
          console.log(`OCR_CHURCH_DB_SYNC job=${jobId} church=${churchId} filename=${filename}`);
        } catch (syncErr: any) {
          console.warn(`[OCR Worker] Church DB sync failed (non-blocking): ${syncErr.message}`);
        }
      } else {
        console.log(`OCR_JOB_ERROR ${JSON.stringify({ jobId, code: 'PROCESS_RESULT', message: `Job ended with status=${final?.status}` })}`);
      }
    } else {
      throw new Error('processOcrJobAsync not available from routes/ocr');
    }
    return;
  }

  // ── Feeder page pipeline ──────────────────────────────────────────────────
  let pagesCompleted = 0;
  let pagesFailed = 0;

  for (const page of pages) {
    try {
      await processPage(tenantPool, page);
      pagesCompleted++;
    } catch (pageError: any) {
      console.error(`  Page ${page.id} failed:`, pageError.message);
      pagesFailed++;
      try {
        await tenantPool.execute(
          `UPDATE ocr_feeder_pages SET status = 'failed', last_error = ?, updated_at = NOW() WHERE id = ?`,
          [(pageError.message || 'Unknown error').substring(0, 500), page.id]
        );
      } catch (_) { /* best effort */ }
    }
  }

  // Determine final job status (ENUM: complete | error)
  const allFailed = pagesFailed === pages.length;
  const finalStatus = allFailed ? 'error' : 'complete';

  // Gather combined OCR text from page artifacts
  // Prefer structured table text over raw flat text when available
  let combinedText = '';
  let avgConfidence = 0;
  try {
    // First try table_extraction artifacts (structured text)
    const [structuredArtifacts] = await tenantPool.execute<RowDataPacket[]>(
      `SELECT a.storage_path, p.ocr_confidence
       FROM ocr_feeder_artifacts a
       JOIN ocr_feeder_pages p ON a.page_id = p.id
       WHERE p.job_id = ? AND a.type = 'table_extraction'
       ORDER BY p.page_index ASC`,
      [jobId]
    );

    let useStructured = false;
    if (structuredArtifacts.length > 0) {
      let structuredText = '';
      for (const row of structuredArtifacts) {
        if (fs.existsSync(row.storage_path)) {
          structuredText += (await readFile(row.storage_path)).toString() + '\n';
        }
      }
      if (structuredText.trim().length > 0) {
        combinedText = structuredText;
        useStructured = true;
        console.log(`  Using structured table text for job ${jobId} (${combinedText.length} chars)`);
      }
    }

    // Fall back to raw_text if no structured text available
    if (!useStructured) {
      const [textArtifacts] = await tenantPool.execute<RowDataPacket[]>(
        `SELECT a.storage_path, p.ocr_confidence
         FROM ocr_feeder_artifacts a
         JOIN ocr_feeder_pages p ON a.page_id = p.id
         WHERE p.job_id = ? AND a.type = 'raw_text'
         ORDER BY p.page_index ASC`,
        [jobId]
      );
      for (const row of textArtifacts) {
        if (fs.existsSync(row.storage_path)) {
          combinedText += (await readFile(row.storage_path)).toString() + '\n';
        }
      }
      console.log(`  Using raw text for job ${jobId} (${combinedText.length} chars)`);
    }

    // Gather confidence from all pages regardless of text source
    const [confRows] = await tenantPool.execute<RowDataPacket[]>(
      `SELECT ocr_confidence FROM ocr_feeder_pages WHERE job_id = ? AND ocr_confidence IS NOT NULL`,
      [jobId]
    );
    let confSum = 0, confCount = 0;
    for (const row of confRows) {
      confSum += row.ocr_confidence;
      confCount++;
    }
    if (confCount > 0) avgConfidence = confSum / confCount;
  } catch (_) { /* best effort */ }

  // Write results back to PLATFORM DB — only valid columns
  try {
    await platformPool.query(
      `UPDATE ocr_jobs SET
         status = ?,
         ocr_text = ?,
         confidence_score = ?,
         error_regions = ?
       WHERE id = ?`,
      [
        finalStatus,
        combinedText.substring(0, 65000) || null,
        avgConfidence || null,
        allFailed ? `All ${pagesFailed} pages failed` : null,
        jobId,
      ]
    );
  } catch (dbErr: any) {
    logStructuredError(`[OCR Worker] DB update failed for job ${jobId}`, dbErr);
    // Try minimal update
    try {
      await platformPool.query(
        `UPDATE ocr_jobs SET status = ? WHERE id = ?`,
        [finalStatus, jobId]
      );
    } catch (minErr: any) {
      logStructuredError(`[OCR Worker] Minimal DB update also failed for job ${jobId}`, minErr);
    }
  }

  if (finalStatus === 'complete') {
    console.log(`OCR_JOB_COMPLETE ${JSON.stringify({ jobId, confidenceScore: avgConfidence, ocrTextLen: combinedText.length })}`);
    dbLogger.success('OCR:Worker', `Job ${jobId} completed (${pagesCompleted}/${pages.length} pages)`, {
      jobId, churchId, pagesCompleted, pagesFailed, totalPages: pages.length,
      confidenceScore: avgConfidence, ocrTextLen: combinedText.length
    }, null, 'ocr-worker');

    // Run classifier on combined OCR text
    if (combinedText) {
      try {
        const classResult = classifyRecordType(combinedText);
        await platformPool.query(
          `UPDATE ocr_jobs SET classifier_suggested_type = ?, classifier_confidence = ? WHERE id = ?`,
          [classResult.suggested_type, classResult.confidence, jobId]
        );
        console.log(`OCR_CLASSIFIER ${JSON.stringify({ jobId, suggested: classResult.suggested_type, confidence: classResult.confidence })}`);
      } catch (classErr: any) {
        console.warn(`[OCR Worker] Classifier failed for job ${jobId}: ${classErr.message}`);
      }
    }
  } else {
    console.log(`OCR_JOB_ERROR ${JSON.stringify({ jobId, code: 'ALL_PAGES_FAILED', message: `${pagesFailed}/${pages.length} pages failed` })}`);
    dbLogger.error('OCR:Worker', `Job ${jobId} failed: ${pagesFailed}/${pages.length} pages failed`, {
      jobId, churchId, pagesFailed, totalPages: pages.length, code: 'ALL_PAGES_FAILED'
    }, null, 'ocr-worker');
  }
}

// ── Main worker loop ────────────────────────────────────────────────────────

// Mutable config — loaded from settings registry at startup, fallback to defaults
let POLL_BATCH = 5;
let POLL_IDLE_MS = 5000;
let POLL_BUSY_MS = 1000;
let HEARTBEAT_EVERY_CFG = 6;
let VISION_TIMEOUT_MS_CFG = 60000;
let LANGUAGE_HINTS_CFG = ['el', 'ru', 'en'];
let CONFIDENCE_WEIGHT_CFG = 0.7;
let QUALITY_WEIGHT_CFG = 0.3;
let ACCEPT_THRESHOLD_CFG = 0.85;
let REVIEW_THRESHOLD_CFG = 0.6;
let CLASSIFIER_CONFIDENCE_CFG = 0.3;

/**
 * Load OCR worker config from settings_registry at startup.
 * Falls back to hardcoded defaults if registry is unavailable.
 */
async function loadWorkerConfig(): Promise<void> {
  try {
    const [rows] = await platformPool.query(
      `SELECT \`key\`, default_value FROM settings_registry WHERE \`key\` LIKE 'ocr.%'`
    ) as any[];

    // Also load any global overrides
    const [overrides] = await platformPool.query(
      `SELECT \`key\`, value FROM settings_overrides WHERE \`key\` LIKE 'ocr.%' AND scope = 'global'`
    ) as any[];

    const overrideMap = new Map<string, string>();
    for (const ov of overrides) overrideMap.set(ov.key, ov.value);

    const get = (key: string, fallback: number | string): string => {
      return overrideMap.get(key) ?? rows.find((r: any) => r.key === key)?.default_value ?? String(fallback);
    };

    POLL_BATCH = Number(get('ocr.worker.pollBatchSize', 5));
    POLL_IDLE_MS = Number(get('ocr.worker.pollIdleMs', 5000));
    POLL_BUSY_MS = Number(get('ocr.worker.pollBusyMs', 1000));
    HEARTBEAT_EVERY_CFG = Number(get('ocr.worker.heartbeatEvery', 6));
    VISION_TIMEOUT_MS_CFG = Number(get('ocr.visionApi.timeoutMs', 60000));
    CONFIDENCE_WEIGHT_CFG = Number(get('ocr.scoring.confidenceWeight', 0.7));
    QUALITY_WEIGHT_CFG = Number(get('ocr.scoring.qualityWeight', 0.3));
    ACCEPT_THRESHOLD_CFG = Number(get('ocr.scoring.acceptThreshold', 0.85));
    REVIEW_THRESHOLD_CFG = Number(get('ocr.scoring.reviewThreshold', 0.6));
    CLASSIFIER_CONFIDENCE_CFG = Number(get('ocr.classifier.confidenceThreshold', 0.3));

    const langStr = get('ocr.visionApi.languageHints', '["el","ru","en"]');
    try { LANGUAGE_HINTS_CFG = JSON.parse(langStr); } catch { /* keep default */ }

    console.log(`OCR_WORKER_CONFIG_LOADED ${JSON.stringify({
      pollBatch: POLL_BATCH, pollIdleMs: POLL_IDLE_MS, pollBusyMs: POLL_BUSY_MS,
      heartbeatEvery: HEARTBEAT_EVERY_CFG, visionTimeoutMs: VISION_TIMEOUT_MS_CFG,
      languageHints: LANGUAGE_HINTS_CFG,
      scoring: { confidenceWeight: CONFIDENCE_WEIGHT_CFG, qualityWeight: QUALITY_WEIGHT_CFG,
                 acceptThreshold: ACCEPT_THRESHOLD_CFG, reviewThreshold: REVIEW_THRESHOLD_CFG },
      classifierConfidence: CLASSIFIER_CONFIDENCE_CFG
    })}`);
  } catch (err: any) {
    console.warn(`[OCR Worker] Failed to load config from registry, using defaults: ${err.message}`);
  }
}

async function workerLoop(): Promise<void> {
  // Load config from settings registry before starting the loop
  await loadWorkerConfig();

  console.log(`OCR_WORKER_START ${JSON.stringify({ pid: process.pid, nodeEnv: process.env.NODE_ENV || 'production', pollIntervalMs: POLL_IDLE_MS, batchSize: POLL_BATCH, uploadRoot: UPLOADS_ROOT })}`);

  // Ensure classifier columns exist in platform DB (idempotent)
  try {
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS classifier_suggested_type VARCHAR(32) NULL`);
    await platformPool.query(`ALTER TABLE ocr_jobs ADD COLUMN IF NOT EXISTS classifier_confidence DECIMAL(5,3) NULL`);
    console.log(`OCR_WORKER_SCHEMA_OK classifier columns ensured`);
  } catch (schemaErr: any) {
    if (schemaErr.code !== 'ER_DUP_FIELDNAME') {
      console.warn(`[OCR Worker] Schema migration warning: ${schemaErr.message}`);
    }
  }

  let heartbeatCounter = 0;

  while (true) {
    try {
      // Poll pending jobs from PLATFORM DB — only valid columns
      const [rows] = await platformPool.query(
        `SELECT id, church_id, filename, record_type, language
         FROM ocr_jobs
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT ?`,
        [POLL_BATCH]
      ) as [JobRow[], any];

      console.log(`OCR_WORKER_POLL ${JSON.stringify({ pendingCount: rows.length })}`);

      if (rows.length === 0) {
        heartbeatCounter++;
        if (heartbeatCounter >= HEARTBEAT_EVERY_CFG) {
          console.log(`OCR_WORKER_HEARTBEAT ${JSON.stringify({ ts: new Date().toISOString(), pid: process.pid })}`);
          heartbeatCounter = 0;
        }
        await new Promise(r => setTimeout(r, POLL_IDLE_MS));
        continue;
      }

      heartbeatCounter = 0; // reset when busy

      for (const job of rows) {
        // Atomic claim: only proceed if we win the race
        const [claimResult] = await platformPool.query(
          `UPDATE ocr_jobs SET status = 'processing', processing_started_at = NOW() WHERE id = ? AND status = 'pending'`,
          [job.id]
        ) as any[];

        if (!claimResult.affectedRows || claimResult.affectedRows === 0) {
          continue; // Another worker claimed it
        }

        try {
          await processJob(job);
        } catch (jobError: any) {
          logStructuredError(`OCR_JOB_ERROR job=${job.id} church=${job.church_id}`, jobError);
          dbLogger.error('OCR:Worker', `Job ${job.id} uncaught error: ${jobError.message}`, {
            jobId: job.id, churchId: job.church_id, error: jobError.message,
            code: jobError.code || null
          }, null, 'ocr-worker');

          try {
            await platformPool.query(
              `UPDATE ocr_jobs SET status = 'error', error_regions = ? WHERE id = ?`,
              [(jobError.message || 'Unknown error').substring(0, 500), job.id]
            );
          } catch (updateErr: any) {
            logStructuredError(`[OCR Worker] Failed to mark job ${job.id} as error`, updateErr);
          }
        }
      }

      await new Promise(r => setTimeout(r, POLL_BUSY_MS));
    } catch (loopError: any) {
      logStructuredError('[OCR Worker] Loop error', loopError);
      await new Promise(r => setTimeout(r, POLL_IDLE_MS));
    }
  }
}

// Start worker if run directly
if (require.main === module) {
  workerLoop().catch(error => {
    console.error('Fatal worker error:', error);
    process.exit(1);
  });
}

export { processJob, processPage, workerLoop };

