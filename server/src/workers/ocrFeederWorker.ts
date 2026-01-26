/**
 * OCR Feeder Worker
 * Processes queued pages through: preprocess -> OCR -> parse -> score -> route
 * Idempotent state machine with safe restart capability
 */

import promisePool from '../config/db';
import type { RowDataPacket } from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

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

interface Artifact {
  type: string;
  storagePath: string;
  jsonBlob?: any;
  metaJson?: any;
}

// State machine transitions (idempotent)
const STATE_TRANSITIONS: Record<string, string[]> = {
  queued: ['preprocessing'],
  preprocessing: ['ocr', 'failed'],
  ocr: ['parsing', 'failed'],
  parsing: ['scoring', 'failed'],
  scoring: ['accepted', 'review', 'retry', 'failed'],
  retry: ['queued', 'failed'],
  accepted: [],
  review: [],
  failed: []
};

// Update page status (idempotent - only if transition is valid)
async function updatePageStatus(
  pageId: number,
  newStatus: string,
  currentStatus?: string
): Promise<boolean> {
  try {
    if (currentStatus && !STATE_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      console.warn(`Invalid state transition: ${currentStatus} -> ${newStatus} for page ${pageId}`);
      return false;
    }

    await promisePool.execute(
      `UPDATE ocr_feeder_pages 
       SET status = ?, updated_at = NOW() 
       WHERE id = ? AND (status = ? OR ? IS NULL)`,
      [newStatus, pageId, currentStatus || '', currentStatus || null]
    );

    return true;
  } catch (error) {
    console.error(`Error updating page ${pageId} status:`, error);
    return false;
  }
}

// Claim next queued page (SKIP LOCKED for concurrent workers)
async function claimNextPage(): Promise<PageRow | null> {
  try {
    // Use SKIP LOCKED to allow multiple workers
    const [rows] = await promisePool.execute<PageRow[]>(
      `SELECT * FROM ocr_feeder_pages 
       WHERE status = 'queued' 
       ORDER BY created_at ASC 
       LIMIT 1 
       FOR UPDATE SKIP LOCKED`
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  } catch (error) {
    // Fallback if SKIP LOCKED not supported (older MySQL)
    const [rows] = await promisePool.execute<PageRow[]>(
      `SELECT * FROM ocr_feeder_pages 
       WHERE status = 'queued' 
       ORDER BY created_at ASC 
       LIMIT 1`
    );

    return rows.length > 0 ? rows[0] : null;
  }
}

// Get job storage directory
function getJobStorageDir(jobId: number): string {
  return path.join(__dirname, '../../storage/feeder', `job_${jobId}`);
}

// Get page storage directory
function getPageStorageDir(jobId: number, pageIndex: number): string {
  return path.join(getJobStorageDir(jobId), `page_${pageIndex}`);
}

// Step 1: Preprocess (normalize orientation/contrast)
async function preprocessPage(page: PageRow): Promise<{ preprocPath: string; qualityScore: number }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  const preprocPath = path.join(pageDir, 'preprocessed.jpg');
  
  // Ensure directory exists
  await mkdir(pageDir, { recursive: true });

  // Stub implementation - in production, use image processing library
  // For now, just copy the input file
  if (await exists(page.input_path)) {
    const inputData = await readFile(page.input_path);
    await writeFile(preprocPath, inputData);
  } else {
    throw new Error(`Input file not found: ${page.input_path}`);
  }

  // Stub quality score (0.0-1.0)
  const qualityScore = 0.85;

  // Update page with preprocessed path
  await promisePool.execute(
    `UPDATE ocr_feeder_pages 
     SET preproc_path = ?, quality_score = ?, updated_at = NOW()
     WHERE id = ?`,
    [preprocPath, qualityScore, page.id]
  );

  return { preprocPath, qualityScore };
}

// Step 2: OCR (extract text)
async function runOCR(page: PageRow): Promise<{ rawText: string; confidence: number }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  const artifactPath = path.join(pageDir, 'raw_text.txt');

  // Stub OCR - in production, integrate with existing OCR service
  // For now, write placeholder text
  const rawText = `[OCR Placeholder] Page ${page.page_index} from job ${page.job_id}\nExtracted text would appear here.`;
  const confidence = 0.75;

  await writeFile(artifactPath, rawText);

  // Store as artifact
  await promisePool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'raw_text', ?, ?)`,
    [page.id, artifactPath, JSON.stringify({ confidence, extractedAt: new Date().toISOString() })]
  );

  // Update page OCR confidence
  await promisePool.execute(
    `UPDATE ocr_feeder_pages 
     SET ocr_confidence = ?, updated_at = NOW()
     WHERE id = ?`,
    [confidence, page.id]
  );

  return { rawText, confidence };
}

// Step 3: Parse (extract structured data)
async function parsePage(page: PageRow, rawText: string): Promise<any> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  const artifactPath = path.join(pageDir, 'record_candidates.json');

  // Stub parsing - in production, use existing extractors
  const recordCandidates = {
    candidates: [
      {
        recordType: 'baptism', // or detect from content
        confidence: 0.7,
        fields: {
          // Minimal structure
          extractedText: rawText.substring(0, 200)
        }
      }
    ],
    parsedAt: new Date().toISOString()
  };

  await writeFile(artifactPath, JSON.stringify(recordCandidates, null, 2));

  // Store as artifact
  await promisePool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, meta_json)
     VALUES (?, 'record_candidates', ?, ?, ?)`,
    [
      page.id,
      artifactPath,
      JSON.stringify(recordCandidates),
      JSON.stringify({ candidateCount: recordCandidates.candidates.length })
    ]
  );

  return recordCandidates;
}

// Step 4: Score and route
async function scoreAndRoute(page: PageRow, ocrConfidence: number, qualityScore: number): Promise<string> {
  // Combined score (weighted average)
  const combinedScore = (ocrConfidence * 0.7 + qualityScore * 0.3);

  let newStatus: string;
  let needsDraft = false;
  let draftStatus = 'draft';

  if (combinedScore >= 0.85) {
    newStatus = 'accepted';
    needsDraft = true;
    draftStatus = 'draft';
  } else if (combinedScore >= 0.6) {
    newStatus = 'review';
    needsDraft = true;
    draftStatus = 'needs_review';
  } else {
    // Retry if under threshold and retry count < 2
    if (page.retry_count < 2) {
      newStatus = 'retry';
    } else {
      newStatus = 'failed';
    }
  }

  // Create draft if needed
  if (needsDraft) {
    await createDraft(page, draftStatus);
  }

  return newStatus;
}

// Create draft in existing drafts table (schema-tolerant)
async function createDraft(page: PageRow, status: string): Promise<void> {
  try {
    // Get job to find church_id
    interface JobRow extends RowDataPacket {
      church_id: number;
    }
    const [jobs] = await promisePool.execute<JobRow[]>(
      `SELECT church_id FROM ocr_feeder_jobs WHERE id = ?`,
      [page.job_id]
    );

    if (jobs.length === 0) {
      throw new Error(`Job ${page.job_id} not found`);
    }

    const churchId = jobs[0].church_id;
    const churchDb = `om_church_${churchId}`;

    // Get record candidates artifact
    interface ArtifactRow extends RowDataPacket {
      json_blob: string;
    }
    const [artifacts] = await promisePool.execute<ArtifactRow[]>(
      `SELECT json_blob FROM ocr_feeder_artifacts 
       WHERE page_id = ? AND type = 'record_candidates'
       ORDER BY created_at DESC LIMIT 1`,
      [page.id]
    );

    if (artifacts.length === 0) {
      console.warn(`No record candidates found for page ${page.id}`);
      return;
    }

    const candidates = JSON.parse(artifacts[0].json_blob);
    const candidate = candidates.candidates?.[0];

    if (!candidate) {
      return;
    }

    // Determine record type
    const recordType = candidate.recordType || 'baptism';

    // Get existing drafts table structure (schema-tolerant)
    // Try ocr_fused_drafts first (preferred)
    try {
      interface ColumnRow extends RowDataPacket {
        COLUMN_NAME: string;
      }
      const [columns] = await promisePool.execute<ColumnRow[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ocr_fused_drafts'`,
        [churchDb]
      );

      if (columns.length > 0) {
        // Table exists - insert draft
        const hasWorkflowStatus = columns.some((c: ColumnRow) => c.COLUMN_NAME === 'workflow_status');
        const hasChurchId = columns.some((c: ColumnRow) => c.COLUMN_NAME === 'church_id');

        const fields = ['ocr_job_id', 'entry_index', 'record_type', 'payload_json', 'status'];
        const values = [page.job_id, page.page_index, recordType, JSON.stringify(candidate.fields), status];

        if (hasWorkflowStatus) {
          fields.push('workflow_status');
          values.push(status);
        }

        if (hasChurchId) {
          fields.push('church_id');
          values.push(churchId);
        }

        await promisePool.execute(
          `INSERT INTO ${churchDb}.ocr_fused_drafts (${fields.join(', ')}, created_at)
           VALUES (${values.map(() => '?').join(', ')}, NOW())
           ON DUPLICATE KEY UPDATE 
             payload_json = VALUES(payload_json),
             status = VALUES(status),
             updated_at = NOW()`,
          values
        );

        console.log(`Created draft for page ${page.id} in ${churchDb}.ocr_fused_drafts`);
        return;
      }
    } catch (error) {
      console.warn(`Could not create draft in ocr_fused_drafts:`, error);
    }

    // Fallback: Try ocr_drafts or other draft tables
    console.warn(`Draft table not found for church ${churchId}, skipping draft creation`);
  } catch (error) {
    console.error(`Error creating draft for page ${page.id}:`, error);
    // Don't throw - draft creation is non-critical
  }
}

// Process a single page through the pipeline
async function processPage(page: PageRow): Promise<void> {
  console.log(`Processing page ${page.id} (job ${page.job_id}, index ${page.page_index})`);

  try {
    // Step 1: Preprocess
    if (page.status === 'queued' || page.status === 'preprocessing') {
      if (!(await updatePageStatus(page.id, 'preprocessing', page.status))) {
        return; // State already changed by another worker
      }

      const { preprocPath, qualityScore } = await preprocessPage(page);
      console.log(`Preprocessed page ${page.id}, quality: ${qualityScore}`);
    }

    // Step 2: OCR
    if (page.status === 'preprocessing' || page.status === 'ocr') {
      const currentStatus = page.status === 'preprocessing' ? 'preprocessing' : 'ocr';
      if (!(await updatePageStatus(page.id, 'ocr', currentStatus))) {
        return;
      }

      const { rawText, confidence } = await runOCR(page);
      console.log(`OCR completed for page ${page.id}, confidence: ${confidence}`);
    }

    // Step 3: Parse
    if (page.status === 'ocr' || page.status === 'parsing') {
      const currentStatus = page.status === 'ocr' ? 'ocr' : 'parsing';
      if (!(await updatePageStatus(page.id, 'parsing', currentStatus))) {
        return;
      }

      // Get raw text from artifact
      interface ArtifactPathRow extends RowDataPacket {
        storage_path: string;
      }
      const [artifacts] = await promisePool.execute<ArtifactPathRow[]>(
        `SELECT storage_path FROM ocr_feeder_artifacts 
         WHERE page_id = ? AND type = 'raw_text'
         ORDER BY created_at DESC LIMIT 1`,
        [page.id]
      );

      let rawText = '';
      if (artifacts.length > 0) {
        const textPath = artifacts[0].storage_path;
        if (await exists(textPath)) {
          rawText = (await readFile(textPath)).toString();
        }
      }

      await parsePage(page, rawText);
      console.log(`Parsed page ${page.id}`);
    }

    // Step 4: Score and route
    if (page.status === 'parsing' || page.status === 'scoring') {
      const currentStatus = page.status === 'parsing' ? 'parsing' : 'scoring';
      if (!(await updatePageStatus(page.id, 'scoring', currentStatus))) {
        return;
      }

      // Get current scores
      interface ScoreRow extends RowDataPacket {
        quality_score: number | null;
        ocr_confidence: number | null;
      }
      const [pages] = await promisePool.execute<ScoreRow[]>(
        `SELECT quality_score, ocr_confidence FROM ocr_feeder_pages WHERE id = ?`,
        [page.id]
      );

      if (pages.length === 0) {
        throw new Error(`Page ${page.id} not found`);
      }

      const currentPage = pages[0];
      const qualityScore = currentPage.quality_score || 0.85;
      const ocrConfidence = currentPage.ocr_confidence || 0.75;

      const finalStatus = await scoreAndRoute(page, ocrConfidence, qualityScore);
      await updatePageStatus(page.id, finalStatus, 'scoring');

      console.log(`Page ${page.id} routed to: ${finalStatus}`);
    }

    // Handle retry state
    if (page.status === 'retry') {
      await updatePageStatus(page.id, 'queued', 'retry');
      console.log(`Page ${page.id} queued for retry`);
    }

  } catch (error: any) {
    console.error(`Error processing page ${page.id}:`, error);
    
    // Update page with error
    await promisePool.execute(
      `UPDATE ocr_feeder_pages 
       SET status = 'failed', last_error = ?, updated_at = NOW()
       WHERE id = ?`,
      [error.message?.substring(0, 500) || 'Unknown error', page.id]
    );
  }
}

// Main worker loop
async function workerLoop(): Promise<void> {
  console.log('OCR Feeder Worker started');

  while (true) {
    try {
      const page = await claimNextPage();

      if (!page) {
        // No pages to process, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Refresh page data to get current status
      const [pages] = await promisePool.execute<PageRow[]>(
        `SELECT * FROM ocr_feeder_pages WHERE id = ?`,
        [page.id]
      );

      if (pages.length === 0) {
        continue;
      }

      const currentPage = pages[0];
      await processPage(currentPage);

      // Small delay between pages
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('Worker loop error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
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

export { workerLoop, processPage };

