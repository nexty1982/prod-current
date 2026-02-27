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

import * as crypto from 'crypto';
import * as fs from 'fs';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import * as path from 'path';
import sharp from 'sharp';
import { promisify } from 'util';
import { classifyRecordType } from '../utils/ocrClassifier';
import { detectAndRemoveBorder } from '../ocr/preprocessing/borderDetection';
import { detectAndCorrectSkew } from '../ocr/preprocessing/deskew';
import { detectAndCropROI } from '../ocr/preprocessing/roiCrop';
import { detectAndSplitSpread } from '../ocr/preprocessing/splitSpread';
import { normalizeBackground } from '../ocr/preprocessing/bgNormalize';
import { gridPreserveDenoise } from '../ocr/preprocessing/denoise';
import { generateRedactionMask } from '../ocr/preprocessing/redaction';
import { generateOcrPlan } from '../ocr/preprocessing/ocrPlan';
import type { OcrRegion } from '../ocr/preprocessing/ocrPlan';
import { selectRegionProfiles, getProfile } from '../ocr/preprocessing/ocrProfiles';
import type { RegionProfileAssignment, ProfilePlanResult } from '../ocr/preprocessing/ocrProfiles';
import { buildRetryPlan, extractSignals, computeStructureScore } from '../ocr/preprocessing/structureRetry';
import type { RetryPlan } from '../ocr/preprocessing/structureRetry';
import { selectTemplate, resolveTemplate, extractWithTemplate } from '../ocr/preprocessing/templateSpec';
import type { TemplateMatchResult } from '../ocr/preprocessing/templateSpec';

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

  if (filename.startsWith('/') && !filename.startsWith('/uploads/')) {
    // Absolute path (e.g. batch_import jobs) — use as-is
    filePath = filename;
  } else if (filename.startsWith('/uploads/')) {
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

// ── Atomic file write helper ────────────────────────────────────────────────

function atomicWriteFileSync(targetPath: string, data: string | Buffer): void {
  const tmpPath = targetPath + '.tmp';
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, targetPath);
}

// ── Metrics merge helper ────────────────────────────────────────────────────

function mergeMetrics(metricsPath: string, newData: Record<string, any>): void {
  let metrics: Record<string, any> = {};
  if (fs.existsSync(metricsPath)) {
    try { metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8')); } catch {}
  }
  Object.assign(metrics, newData);
  atomicWriteFileSync(metricsPath, JSON.stringify(metrics, null, 2));
}

// ── Step 1: Preprocess ──────────────────────────────────────────────────────

async function preprocessPage(
  tenantPool: Pool,
  page: PageRow
): Promise<{ preprocPath: string; qualityScore: number; splitPaths?: { left: string; right: string } }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  const preprocPath = path.join(pageDir, 'preprocessed.jpg');
  mkdirp(pageDir);

  let qualityScore = 0.85;
  let splitPaths: { left: string; right: string } | undefined;

  if (fs.existsSync(page.input_path)) {
    try {
      // ── Step 1A.1: Border detection + removal ─────────────────────────
      const imageBuffer = fs.readFileSync(page.input_path);
      const borderResult = await detectAndRemoveBorder(imageBuffer);

      // Write border_geometry.json (always, atomic)
      const geometryPath = path.join(pageDir, 'border_geometry.json');
      const geometryPayload: Record<string, any> = {
        method: borderResult.method,
        applied: borderResult.applied,
        cropBoxPx: borderResult.cropBoxPx,
        cropBoxNorm: borderResult.cropBoxNorm,
        confidence: borderResult.confidence,
        reasons: borderResult.reasons,
        thresholds: borderResult.thresholds,
        trimPx: borderResult.trimPx,
        originalDimensions: borderResult.originalDimensions,
      };
      const geometryJson = JSON.stringify(geometryPayload, null, 2);
      atomicWriteFileSync(geometryPath, geometryJson);

      // Write border_trimmed.jpg (only when applied, atomic)
      const borderTrimmedPath = path.join(pageDir, 'border_trimmed.jpg');
      if (borderResult.applied && borderResult.croppedBuffer) {
        atomicWriteFileSync(borderTrimmedPath, borderResult.croppedBuffer);
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: border trimmed ` +
          `(conf=${borderResult.confidence.toFixed(3)}, trim L=${borderResult.trimPx.left} R=${borderResult.trimPx.right} ` +
          `T=${borderResult.trimPx.top} B=${borderResult.trimPx.bottom})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no border crop (reasons=${borderResult.reasons.join(',')}, conf=${borderResult.confidence.toFixed(3)})`
        );
      }

      // Write metrics.json (merge/append, atomic)
      const metricsPath = path.join(pageDir, 'metrics.json');
      mergeMetrics(metricsPath, {
        border_black_detected: borderResult.applied,
        border_black_trim_px: borderResult.trimPx,
        border_confidence: borderResult.confidence,
      });

      // Insert border_geometry artifact into DB
      const geometryBytes = Buffer.byteLength(geometryJson, 'utf8');
      const geometrySha256 = crypto.createHash('sha256').update(geometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'border_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          geometryPath,
          JSON.stringify({
            applied: borderResult.applied,
            confidence: borderResult.confidence,
            method: borderResult.method,
            trimPx: borderResult.trimPx,
          }),
          geometrySha256,
          geometryBytes,
        ]
      );

      // ── Step 1A.2: Deskew ──────────────────────────────────────────────
      const postBorderInput = borderResult.applied && borderResult.croppedBuffer
        ? borderResult.croppedBuffer
        : imageBuffer;

      const deskewResult = await detectAndCorrectSkew(postBorderInput);

      // Write deskew_geometry.json (always, atomic)
      const deskewGeometryPath = path.join(pageDir, 'deskew_geometry.json');
      const deskewPayload: Record<string, any> = {
        method: deskewResult.method,
        applied: deskewResult.applied,
        angle_deg: deskewResult.angleDeg,
        confidence: deskewResult.confidence,
        reasons: deskewResult.reasons,
        thresholds: deskewResult.thresholds,
        input_dimensions: deskewResult.inputDimensions,
        output_dimensions: deskewResult.outputDimensions,
        line_count: deskewResult.lineCount,
        angle_variance: deskewResult.angleVariance,
      };
      const deskewGeometryJson = JSON.stringify(deskewPayload, null, 2);
      atomicWriteFileSync(deskewGeometryPath, deskewGeometryJson);

      // Write deskewed.jpg (only when applied, atomic)
      if (deskewResult.applied && deskewResult.deskewedBuffer) {
        const deskewedPath = path.join(pageDir, 'deskewed.jpg');
        atomicWriteFileSync(deskewedPath, deskewResult.deskewedBuffer);
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: deskewed ` +
          `(angle=${deskewResult.angleDeg.toFixed(3)}°, conf=${deskewResult.confidence.toFixed(3)}, lines=${deskewResult.lineCount})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no deskew (reasons=${deskewResult.reasons.join(',')}, angle=${deskewResult.angleDeg.toFixed(3)}°, conf=${deskewResult.confidence.toFixed(3)})`
        );
      }

      // Merge deskew metrics
      mergeMetrics(metricsPath, {
        deskew_applied: deskewResult.applied,
        deskew_angle_deg: deskewResult.angleDeg,
        deskew_confidence: deskewResult.confidence,
        deskew_line_count: deskewResult.lineCount,
      });

      // Insert deskew_geometry artifact into DB
      const deskewGeometryBytes = Buffer.byteLength(deskewGeometryJson, 'utf8');
      const deskewGeometrySha256 = crypto.createHash('sha256').update(deskewGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'deskew_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          deskewGeometryPath,
          JSON.stringify({
            applied: deskewResult.applied,
            confidence: deskewResult.confidence,
            method: deskewResult.method,
            angle_deg: deskewResult.angleDeg,
          }),
          deskewGeometrySha256,
          deskewGeometryBytes,
        ]
      );

      // ── Step 1A.3: Ledger ROI crop ────────────────────────────────────
      const postDeskewInput = deskewResult.applied && deskewResult.deskewedBuffer
        ? deskewResult.deskewedBuffer
        : postBorderInput;

      const roiResult = await detectAndCropROI(postDeskewInput);

      // Write roi_geometry.json (always, atomic)
      const roiGeometryPath = path.join(pageDir, 'roi_geometry.json');
      const roiPayload: Record<string, any> = {
        method: roiResult.method,
        applied: roiResult.applied,
        roi_box_px: roiResult.roiBoxPx,
        roi_box_norm: roiResult.roiBoxNorm,
        confidence: roiResult.confidence,
        reasons: roiResult.reasons,
        thresholds: roiResult.thresholds,
        input_dimensions: roiResult.inputDimensions,
        output_dimensions: roiResult.outputDimensions,
      };
      const roiGeometryJson = JSON.stringify(roiPayload, null, 2);
      atomicWriteFileSync(roiGeometryPath, roiGeometryJson);

      // Write roi_cropped.jpg (only when applied, atomic)
      if (roiResult.applied && roiResult.croppedBuffer) {
        const roiCroppedPath = path.join(pageDir, 'roi_cropped.jpg');
        atomicWriteFileSync(roiCroppedPath, roiResult.croppedBuffer);
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ROI cropped ` +
          `(method=${roiResult.method}, conf=${roiResult.confidence.toFixed(3)}, ` +
          `${roiResult.outputDimensions.w}x${roiResult.outputDimensions.h})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no ROI crop (reasons=${roiResult.reasons.join(',')}, conf=${roiResult.confidence.toFixed(3)})`
        );
      }

      // Merge ROI metrics
      mergeMetrics(metricsPath, {
        roi_applied: roiResult.applied,
        roi_confidence: roiResult.confidence,
        roi_box_px: roiResult.roiBoxPx,
        roi_box_norm: roiResult.roiBoxNorm,
        roi_method: roiResult.method,
      });

      // Insert roi_geometry artifact into DB
      const roiGeometryBytes = Buffer.byteLength(roiGeometryJson, 'utf8');
      const roiGeometrySha256 = crypto.createHash('sha256').update(roiGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'roi_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          roiGeometryPath,
          JSON.stringify({
            applied: roiResult.applied,
            confidence: roiResult.confidence,
            method: roiResult.method,
            roi_box_px: roiResult.roiBoxPx,
          }),
          roiGeometrySha256,
          roiGeometryBytes,
        ]
      );

      // ── Step 1A.4: Split spread detection ────────────────────────────
      const postRoiInput = roiResult.applied && roiResult.croppedBuffer
        ? roiResult.croppedBuffer
        : postDeskewInput;

      const splitResult = await detectAndSplitSpread(postRoiInput);

      // Write split_geometry.json (always, atomic)
      const splitGeometryPath = path.join(pageDir, 'split_geometry.json');
      const splitPayload: Record<string, any> = {
        method: splitResult.method,
        applied: splitResult.applied,
        split_x_px: splitResult.splitXPx,
        split_x_norm: splitResult.splitXNorm,
        confidence: splitResult.confidence,
        reasons: splitResult.reasons,
        thresholds: splitResult.thresholds,
        input_dimensions: splitResult.inputDimensions,
        left_box: splitResult.leftBox,
        right_box: splitResult.rightBox,
      };

      // Write page_left.jpg + page_right.jpg (only when applied, atomic)
      if (splitResult.applied && splitResult.leftBuffer && splitResult.rightBuffer) {
        const leftPath = path.join(pageDir, 'page_left.jpg');
        const rightPath = path.join(pageDir, 'page_right.jpg');
        atomicWriteFileSync(leftPath, splitResult.leftBuffer);
        atomicWriteFileSync(rightPath, splitResult.rightBuffer);
        splitPaths = { left: leftPath, right: rightPath };

        // Add paths to geometry for downstream consumers
        splitPayload.left_image_path = leftPath;
        splitPayload.right_image_path = rightPath;

        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: split spread ` +
          `(x=${splitResult.splitXPx}, conf=${splitResult.confidence.toFixed(3)}, ` +
          `left=${splitResult.leftBox.w}x${splitResult.leftBox.h}, ` +
          `right=${splitResult.rightBox.w}x${splitResult.rightBox.h})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no split (reasons=${splitResult.reasons.join(',')}, conf=${splitResult.confidence.toFixed(3)})`
        );
      }

      const splitGeometryJson = JSON.stringify(splitPayload, null, 2);
      atomicWriteFileSync(splitGeometryPath, splitGeometryJson);

      // Merge split metrics
      mergeMetrics(metricsPath, {
        split_applied: splitResult.applied,
        split_confidence: splitResult.confidence,
        split_x_px: splitResult.splitXPx,
        split_method: splitResult.method,
      });

      // Insert split_geometry artifact into DB
      const splitGeometryBytes = Buffer.byteLength(splitGeometryJson, 'utf8');
      const splitGeometrySha256 = crypto.createHash('sha256').update(splitGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'split_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          splitGeometryPath,
          JSON.stringify({
            applied: splitResult.applied,
            confidence: splitResult.confidence,
            method: splitResult.method,
            split_x_px: splitResult.splitXPx,
          }),
          splitGeometrySha256,
          splitGeometryBytes,
        ]
      );

      // ── Step 1B.1: Background normalization ─────────────────────────
      // Runs on the main image (postRoiInput). If split, also runs on each half.
      const bgResult = await normalizeBackground(postRoiInput);

      // Write bg_geometry.json (always, atomic)
      const bgGeometryPath = path.join(pageDir, 'bg_geometry.json');
      const bgPayload: Record<string, any> = {
        method: bgResult.method,
        applied: bgResult.applied,
        confidence: bgResult.confidence,
        reasons: bgResult.reasons,
        thresholds: bgResult.thresholds,
        input_dimensions: bgResult.inputDimensions,
        output_dimensions: bgResult.outputDimensions,
        metrics_before: bgResult.metricsBefore,
        metrics_after: bgResult.metricsAfter,
      };

      // Write bg_normalized.jpg (only when applied, atomic)
      if (bgResult.applied && bgResult.normalizedBuffer) {
        const bgNormalizedPath = path.join(pageDir, 'bg_normalized.jpg');
        atomicWriteFileSync(bgNormalizedPath, bgResult.normalizedBuffer);
        bgPayload.normalized_image_path = bgNormalizedPath;

        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: bg normalized ` +
          `(conf=${bgResult.confidence.toFixed(3)}, nonunif ${bgResult.metricsBefore.bgNonuniformity.toFixed(1)} → ${bgResult.metricsAfter.bgNonuniformity.toFixed(1)})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no bg normalization (reasons=${bgResult.reasons.join(',')}, conf=${bgResult.confidence.toFixed(3)})`
        );
      }

      const bgGeometryJson = JSON.stringify(bgPayload, null, 2);
      atomicWriteFileSync(bgGeometryPath, bgGeometryJson);

      // Merge bg metrics
      mergeMetrics(metricsPath, {
        bg_applied: bgResult.applied,
        bg_confidence: bgResult.confidence,
        bg_method: bgResult.method,
        bg_metrics_before: bgResult.metricsBefore,
        bg_metrics_after: bgResult.metricsAfter,
      });

      // Insert bg_geometry artifact into DB
      const bgGeometryBytes = Buffer.byteLength(bgGeometryJson, 'utf8');
      const bgGeometrySha256 = crypto.createHash('sha256').update(bgGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'bg_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          bgGeometryPath,
          JSON.stringify({
            applied: bgResult.applied,
            confidence: bgResult.confidence,
            method: bgResult.method,
          }),
          bgGeometrySha256,
          bgGeometryBytes,
        ]
      );

      // For split halves: run bg normalization on each half independently
      let bgLeftBuffer = splitResult.leftBuffer;
      let bgRightBuffer = splitResult.rightBuffer;

      if (splitPaths && splitResult.leftBuffer && splitResult.rightBuffer) {
        const bgLeftResult = await normalizeBackground(splitResult.leftBuffer);
        if (bgLeftResult.applied && bgLeftResult.normalizedBuffer) {
          bgLeftBuffer = bgLeftResult.normalizedBuffer;
          const bgLeftPath = path.join(pageDir, 'bg_normalized_left.jpg');
          atomicWriteFileSync(bgLeftPath, bgLeftResult.normalizedBuffer);
        }

        const bgRightResult = await normalizeBackground(splitResult.rightBuffer);
        if (bgRightResult.applied && bgRightResult.normalizedBuffer) {
          bgRightBuffer = bgRightResult.normalizedBuffer;
          const bgRightPath = path.join(pageDir, 'bg_normalized_right.jpg');
          atomicWriteFileSync(bgRightPath, bgRightResult.normalizedBuffer);
        }
      }

      // ── Step 1B.2: Grid-preserving denoise ─────────────────────────
      const postBgInput = bgResult.applied && bgResult.normalizedBuffer
        ? bgResult.normalizedBuffer
        : postRoiInput;

      const denoiseResult = await gridPreserveDenoise(postBgInput);

      // Write denoise_geometry.json (always, atomic)
      const denoiseGeometryPath = path.join(pageDir, 'denoise_geometry.json');
      const denoisePayload: Record<string, any> = {
        method: denoiseResult.method,
        applied: denoiseResult.applied,
        confidence: denoiseResult.confidence,
        reasons: denoiseResult.reasons,
        thresholds: denoiseResult.thresholds,
        input_dimensions: denoiseResult.inputDimensions,
        output_dimensions: denoiseResult.outputDimensions,
        metrics_before: denoiseResult.metricsBefore,
        metrics_after: denoiseResult.metricsAfter,
      };

      // Write denoised.jpg (only when applied, atomic)
      if (denoiseResult.applied && denoiseResult.denoisedBuffer) {
        const denoisedPath = path.join(pageDir, 'denoised.jpg');
        atomicWriteFileSync(denoisedPath, denoiseResult.denoisedBuffer);
        denoisePayload.denoised_image_path = denoisedPath;

        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: denoised ` +
          `(conf=${denoiseResult.confidence.toFixed(3)}, speckle ${denoiseResult.metricsBefore.speckleCount} → ${denoiseResult.metricsAfter.speckleCount})`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no denoise (reasons=${denoiseResult.reasons.join(',')}, conf=${denoiseResult.confidence.toFixed(3)})`
        );
      }

      const denoiseGeometryJson = JSON.stringify(denoisePayload, null, 2);
      atomicWriteFileSync(denoiseGeometryPath, denoiseGeometryJson);

      // Merge denoise metrics
      mergeMetrics(metricsPath, {
        denoise_applied: denoiseResult.applied,
        denoise_confidence: denoiseResult.confidence,
        denoise_method: denoiseResult.method,
        denoise_metrics_before: denoiseResult.metricsBefore,
        denoise_metrics_after: denoiseResult.metricsAfter,
      });

      // Insert denoise_geometry artifact into DB
      const denoiseGeometryBytes = Buffer.byteLength(denoiseGeometryJson, 'utf8');
      const denoiseGeometrySha256 = crypto.createHash('sha256').update(denoiseGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'denoise_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          denoiseGeometryPath,
          JSON.stringify({
            applied: denoiseResult.applied,
            confidence: denoiseResult.confidence,
            method: denoiseResult.method,
          }),
          denoiseGeometrySha256,
          denoiseGeometryBytes,
        ]
      );

      // For split halves: run denoise on each half independently
      let denoiseLeftBuffer = bgLeftBuffer;
      let denoiseRightBuffer = bgRightBuffer;

      if (splitPaths && bgLeftBuffer && bgRightBuffer) {
        const denoiseLeftResult = await gridPreserveDenoise(bgLeftBuffer);
        if (denoiseLeftResult.applied && denoiseLeftResult.denoisedBuffer) {
          denoiseLeftBuffer = denoiseLeftResult.denoisedBuffer;
          const denoiseLeftPath = path.join(pageDir, 'denoised_left.jpg');
          atomicWriteFileSync(denoiseLeftPath, denoiseLeftResult.denoisedBuffer);
        }

        const denoiseRightResult = await gridPreserveDenoise(bgRightBuffer);
        if (denoiseRightResult.applied && denoiseRightResult.denoisedBuffer) {
          denoiseRightBuffer = denoiseRightResult.denoisedBuffer;
          const denoiseRightPath = path.join(pageDir, 'denoised_right.jpg');
          atomicWriteFileSync(denoiseRightPath, denoiseRightResult.denoisedBuffer);
        }
      }

      // ── Step 1B.3: Conservative redaction mask ─────────────────────
      // Non-destructive: produces a mask but does NOT alter the image.
      const postDenoiseInput = denoiseResult.applied && denoiseResult.denoisedBuffer
        ? denoiseResult.denoisedBuffer
        : postBgInput;

      const redactionResult = await generateRedactionMask(postDenoiseInput);

      // Write redaction_geometry.json (always, atomic)
      const redactionGeometryPath = path.join(pageDir, 'redaction_geometry.json');
      const redactionPayload: Record<string, any> = {
        method: redactionResult.method,
        applied: redactionResult.applied,
        confidence: redactionResult.confidence,
        reasons: redactionResult.reasons,
        redacted_area_frac: redactionResult.redactedAreaFrac,
        tile_stats: redactionResult.tileStats,
        thresholds: redactionResult.thresholds,
        input_dimensions: redactionResult.inputDimensions,
      };

      // Write redaction_mask.png (always, atomic)
      const redactionMaskPath = path.join(pageDir, 'redaction_mask.png');
      atomicWriteFileSync(redactionMaskPath, redactionResult.maskBuffer);
      redactionPayload.mask_image_path = redactionMaskPath;

      if (redactionResult.applied) {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: redaction mask ` +
          `(conf=${redactionResult.confidence.toFixed(3)}, ${(redactionResult.redactedAreaFrac * 100).toFixed(1)}% redacted, ` +
          `${redactionResult.tileStats.redactedTiles} tiles)`
        );
      } else {
        console.log(
          `[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: ` +
          `no redaction (reasons=${redactionResult.reasons.join(',')}, conf=${redactionResult.confidence.toFixed(3)})`
        );
      }

      const redactionGeometryJson = JSON.stringify(redactionPayload, null, 2);
      atomicWriteFileSync(redactionGeometryPath, redactionGeometryJson);

      // Merge redaction metrics
      mergeMetrics(metricsPath, {
        redaction_applied: redactionResult.applied,
        redaction_confidence: redactionResult.confidence,
        redaction_method: redactionResult.method,
        redaction_area_frac: redactionResult.redactedAreaFrac,
      });

      // Insert redaction_geometry artifact into DB
      const redactionGeoBytes = Buffer.byteLength(redactionGeometryJson, 'utf8');
      const redactionGeoSha256 = crypto.createHash('sha256').update(redactionGeometryJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'redaction_geometry', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          redactionGeometryPath,
          JSON.stringify({
            applied: redactionResult.applied,
            confidence: redactionResult.confidence,
            method: redactionResult.method,
            redacted_area_frac: redactionResult.redactedAreaFrac,
          }),
          redactionGeoSha256,
          redactionGeoBytes,
        ]
      );

      // Insert redaction_mask artifact into DB
      const maskBytes = redactionResult.maskBuffer.length;
      const maskSha256 = crypto.createHash('sha256').update(redactionResult.maskBuffer).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'redaction_mask', ?, ?, ?, ?, 'image/png')`,
        [
          page.id,
          redactionMaskPath,
          JSON.stringify({
            applied: redactionResult.applied,
            redacted_area_frac: redactionResult.redactedAreaFrac,
          }),
          maskSha256,
          maskBytes,
        ]
      );

      // ── Quality score: compute from post-denoise image ──────────────

      const meta = await sharp(postDenoiseInput).metadata();
      const origW = meta.width!;
      const origH = meta.height!;
      const analysisWidth = Math.min(origW, 800);
      const scaleQS = origW / analysisWidth;
      const analysisHeight = Math.round(origH / scaleQS);

      const { data: pixels, info } = await sharp(postDenoiseInput)
        .resize(analysisWidth, analysisHeight, { fit: 'fill' })
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const w = info.width;
      const h = info.height;

      let brightSum = 0;
      const totalPixels = w * h;
      for (let i = 0; i < totalPixels; i++) {
        brightSum += pixels[i];
      }
      const meanBrightness = totalPixels > 0 ? brightSum / totalPixels : 128;

      if (meanBrightness < 60) {
        qualityScore = 0.4;
      } else if (meanBrightness < 100) {
        qualityScore = 0.4 + (meanBrightness - 60) * (0.4 / 40);
      } else if (meanBrightness <= 200) {
        qualityScore = 0.8 + (meanBrightness - 100) * (0.15 / 100);
      } else if (meanBrightness <= 240) {
        qualityScore = 0.95 - (meanBrightness - 200) * (0.15 / 40);
      } else {
        qualityScore = 0.6;
      }
      qualityScore = Math.max(0.3, Math.min(0.99, qualityScore));

      // ── Normalize + sharpen → preprocessed.jpg ────────────────────────
      // When split: also produce preprocessed_left.jpg and preprocessed_right.jpg
      // Input: post-denoise buffer (or bg-normalized, or postRoiInput)
      await sharp(postDenoiseInput)
        .normalize()
        .sharpen()
        .jpeg({ quality: 90 })
        .toFile(preprocPath);

      if (splitPaths && denoiseLeftBuffer && denoiseRightBuffer) {
        const leftPreprocPath = path.join(pageDir, 'preprocessed_left.jpg');
        const rightPreprocPath = path.join(pageDir, 'preprocessed_right.jpg');

        await sharp(denoiseLeftBuffer)
          .normalize()
          .sharpen()
          .jpeg({ quality: 90 })
          .toFile(leftPreprocPath);

        await sharp(denoiseRightBuffer)
          .normalize()
          .sharpen()
          .jpeg({ quality: 90 })
          .toFile(rightPreprocPath);

        splitPaths = { left: leftPreprocPath, right: rightPreprocPath };
      }

    } catch (err: any) {
      console.error(`[OCR Preprocess] Job ${page.job_id} page ${page.page_index}: sharp failed, falling back to copy:`, err.message);
      fs.copyFileSync(page.input_path, preprocPath);
    }
  }

  await tenantPool.execute(
    `UPDATE ocr_feeder_pages SET preproc_path = ?, quality_score = ?, updated_at = NOW() WHERE id = ?`,
    [preprocPath, qualityScore, page.id]
  );

  return { preprocPath, qualityScore, splitPaths };
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

// ── Step 2b: Region-scoped OCR using mask plan ──────────────────────────────

/**
 * Runs OCR on individual regions derived from the redaction mask plan.
 * Each region is cropped from the preprocessed image, sent to Vision API
 * independently, and bounding boxes are adjusted back to full-image coords.
 *
 * Region failures are non-fatal — other regions continue.
 */
async function runRegionScopedOCR(
  tenantPool: Pool,
  page: PageRow,
  regions: OcrRegion[],
  profilePlan?: ProfilePlanResult,
): Promise<{ rawText: string; confidence: number; visionResultJson: any; regionResults: any[] }> {
  const pageDir = getPageStorageDir(page.job_id, page.page_index);
  mkdirp(pageDir);

  const imagePath = page.preproc_path || page.input_path;
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const retryConfThreshold = profilePlan?.thresholds?.retryConfidenceThreshold ?? 0.70;

  // Set up Vision client once
  const vision = require('@google-cloud/vision');
  const visionConfig: any = { projectId: process.env.GOOGLE_CLOUD_PROJECT_ID };
  if (process.env.GOOGLE_VISION_KEY_PATH) visionConfig.keyFilename = process.env.GOOGLE_VISION_KEY_PATH;
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) visionConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const client = new vision.ImageAnnotatorClient(visionConfig);

  const regionResults: any[] = [];
  const allTexts: string[] = [];
  const allPages: any[] = [];
  let totalConfidence = 0;
  let successCount = 0;
  let retryCount = 0;

  for (const region of regions) {
    const { x, y, w, h } = region.box;
    const regionLabel = `region_${region.index}`;

    // Resolve profile for this region
    const profileAssignment = profilePlan?.regions?.find(r => r.regionIndex === region.index);
    const languageHints = profileAssignment?.languageHints ?? LANGUAGE_HINTS_CFG;
    const visionFeature = profileAssignment?.visionFeature ?? 'DOCUMENT_TEXT_DETECTION';
    const timeoutMs = (profileAssignment ? getProfile(profileAssignment.profile).timeoutMs : null) ?? VISION_TIMEOUT_MS_CFG;
    const fallbackEnabled = profileAssignment?.fallback?.enabled ?? false;
    const alternateHints = profileAssignment?.fallback?.alternateHints ?? [];
    const profileName = profileAssignment?.profile ?? 'unknown';

    try {
      console.log(`  [RegionOCR] Page ${page.id} ${regionLabel}: crop (${x},${y},${w},${h}) profile=${profileName}`);

      // Crop region from preprocessed image
      const croppedBuffer = await sharp(imageBuffer)
        .extract({ left: x, top: y, width: w, height: h })
        .jpeg({ quality: 92 })
        .toBuffer();

      // Save cropped region artifact (for debugging)
      const cropPath = path.join(pageDir, `ocr_${regionLabel}.jpg`);
      fs.writeFileSync(cropPath, croppedBuffer);

      // ── Primary Vision call with profile settings ──────────────────────
      const callVision = async (hints: string[], feature: string, label: string) => {
        const visionPromise = client.annotateImage({
          image: { content: croppedBuffer },
          imageContext: { languageHints: hints },
          features: [{ type: feature }],
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Vision API timed out for ${label}`)), timeoutMs)
        );
        return Promise.race([visionPromise, timeoutPromise]) as Promise<any[]>;
      };

      let [result] = await callVision(languageHints, visionFeature, regionLabel);

      let document = result.fullTextAnnotation;
      let regionText = document?.text || '';
      let visionPages = document?.pages || [];
      let regionConfidence = 0;
      if (visionPages.length > 0 && visionPages[0].confidence !== undefined) {
        regionConfidence = visionPages[0].confidence;
      }

      let usedRetry = false;
      let retryAttemptText = '';
      let retryAttemptConf = 0;

      // ── Retry with alternate hints if confidence below threshold ──────
      if (fallbackEnabled && alternateHints.length > 0 && regionConfidence < retryConfThreshold) {
        console.log(`  [RegionOCR] ${regionLabel}: conf=${(regionConfidence * 100).toFixed(1)}% < ${(retryConfThreshold * 100).toFixed(0)}% → retrying with alternate hints [${alternateHints.join(',')}]`);
        try {
          const [retryResult] = await callVision(alternateHints, visionFeature, `${regionLabel}_retry`);
          const retryDoc = retryResult.fullTextAnnotation;
          retryAttemptText = retryDoc?.text || '';
          const retryPages = retryDoc?.pages || [];
          retryAttemptConf = 0;
          if (retryPages.length > 0 && retryPages[0].confidence !== undefined) {
            retryAttemptConf = retryPages[0].confidence;
          }

          // Use retry result only if it's better
          if (retryAttemptConf > regionConfidence) {
            console.log(`  [RegionOCR] ${regionLabel}: retry better (${(retryAttemptConf * 100).toFixed(1)}% > ${(regionConfidence * 100).toFixed(1)}%) → using retry`);
            result = retryResult;
            document = retryDoc;
            regionText = retryAttemptText;
            visionPages = retryPages;
            regionConfidence = retryAttemptConf;
            usedRetry = true;
          } else {
            console.log(`  [RegionOCR] ${regionLabel}: retry not better (${(retryAttemptConf * 100).toFixed(1)}% <= ${(regionConfidence * 100).toFixed(1)}%) → keeping original`);
          }
          retryCount++;
        } catch (retryErr: any) {
          console.warn(`  [RegionOCR] ${regionLabel}: retry failed (keeping original): ${retryErr.message}`);
          retryCount++;
        }
      }

      // Adjust bounding boxes: offset all vertices by region origin (x, y)
      const adjustedPages = visionPages.map((vp: any, vpIdx: number) => ({
        pageIndex: vpIdx,
        width: vp.width,
        height: vp.height,
        _region: region.index,
        _regionBox: region.box,
        _profile: profileName,
        blocks: (vp.blocks || []).map((block: any) => ({
          blockType: block.blockType,
          confidence: block.confidence,
          boundingBox: offsetBoundingBox(block.boundingBox, x, y),
          paragraphs: (block.paragraphs || []).map((p: any) => ({
            confidence: p.confidence,
            boundingBox: offsetBoundingBox(p.boundingBox, x, y),
            words: (p.words || []).map((wrd: any) => ({
              text: (wrd.symbols || []).map((s: any) => s.text).join(''),
              confidence: wrd.confidence,
              boundingBox: offsetBoundingBox(wrd.boundingBox, x, y),
            })),
          })),
        })),
      }));

      allTexts.push(regionText);
      allPages.push(...adjustedPages);
      totalConfidence += regionConfidence;
      successCount++;

      regionResults.push({
        index: region.index,
        box: region.box,
        profile: profileName,
        status: 'ok',
        confidence: regionConfidence,
        textLength: regionText.length,
        cropPath,
        usedRetry,
        ...(usedRetry ? { primaryConfidence: retryAttemptConf > regionConfidence ? regionConfidence : retryAttemptConf } : {}),
        ...(retryCount > 0 && !usedRetry ? { retryAttempted: true, retryConfidence: retryAttemptConf } : {}),
      });

      console.log(`  [RegionOCR] ${regionLabel}: ${regionText.length} chars, conf=${(regionConfidence * 100).toFixed(1)}%, profile=${profileName}${usedRetry ? ' (RETRY)' : ''}`);

    } catch (err: any) {
      console.warn(`  [RegionOCR] ${regionLabel} FAILED (non-fatal): ${err.message}`);
      regionResults.push({
        index: region.index,
        box: region.box,
        profile: profileName,
        status: 'error',
        error: err.message,
      });
    }
  }

  if (successCount === 0) {
    throw new Error(`All ${regions.length} OCR regions failed`);
  }

  const fullText = allTexts.join('\n\n');
  const avgConfidence = totalConfidence / successCount;

  // Build merged vision result with coordinate-adjusted bounding boxes
  const visionResultJson: any = {
    text: fullText,
    pages: allPages,
    _regionScoped: true,
    _regionCount: regions.length,
    _successCount: successCount,
  };

  // Save raw text artifact
  const artifactPath = path.join(pageDir, 'raw_text.txt');
  await writeFile(artifactPath, fullText);
  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'raw_text', ?, ?)`,
    [page.id, artifactPath, JSON.stringify({
      confidence: avgConfidence,
      regionScoped: true,
      regionCount: regions.length,
      successCount,
      extractedAt: new Date().toISOString(),
    })]
  );

  // Save vision JSON
  const visionJsonPath = path.join(pageDir, 'vision_result.json');
  const visionJsonStr = JSON.stringify(visionResultJson);
  await writeFile(visionJsonPath, visionJsonStr);
  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'vision_json', ?, ?)`,
    [page.id, visionJsonPath, JSON.stringify({
      pages: allPages.length,
      totalChars: fullText.length,
      regionScoped: true,
      regionCount: regions.length,
      extractedAt: new Date().toISOString(),
    })]
  );

  // Save region results artifact
  const regionResultsPath = path.join(pageDir, 'vision_regions.json');
  atomicWriteFileSync(regionResultsPath, JSON.stringify({ regions: regionResults, retryCount }, null, 2));
  await tenantPool.execute(
    `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
     VALUES (?, 'vision_regions', ?, ?)`,
    [page.id, regionResultsPath, JSON.stringify({
      regionCount: regions.length,
      successCount,
      failedCount: regions.length - successCount,
      retryCount,
    })]
  );

  console.log(`  [RegionOCR] Page ${page.id}: ${successCount}/${regions.length} regions, ${fullText.length} chars total, avg conf=${(avgConfidence * 100).toFixed(1)}%${retryCount > 0 ? `, ${retryCount} retries` : ''}`);

  await tenantPool.execute(
    `UPDATE ocr_feeder_pages SET ocr_confidence = ?, updated_at = NOW() WHERE id = ?`,
    [avgConfidence, page.id]
  );

  return { rawText: fullText, confidence: avgConfidence, visionResultJson, regionResults };
}

/** Offset all vertices in a Vision API boundingBox by (dx, dy). */
function offsetBoundingBox(bb: any, dx: number, dy: number): any {
  if (!bb || !bb.vertices) return bb;
  return {
    ...bb,
    vertices: bb.vertices.map((v: any) => ({
      x: (v.x || 0) + dx,
      y: (v.y || 0) + dy,
    })),
    normalizedVertices: bb.normalizedVertices, // keep original normalized coords (region-relative)
  };
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
  let splitPaths: { left: string; right: string } | undefined;

  if (page.status === 'queued' || page.status === 'preprocessing') {
    if (!(await updatePageStatus(tenantPool, page.id, 'preprocessing', page.status))) return;
    const preprocResult = await preprocessPage(tenantPool, page);
    splitPaths = preprocResult.splitPaths;
    console.log(`  Preprocessed page ${page.id}, quality: ${preprocResult.qualityScore}${splitPaths ? ' (SPLIT)' : ''}`);
    page.status = 'preprocessing';
  }

  if (page.status === 'preprocessing' || page.status === 'ocr') {
    if (!(await updatePageStatus(tenantPool, page.id, 'ocr', page.status))) return;

    // If split paths exist but weren't set (resuming from a previous run), check disk
    if (!splitPaths) {
      const pageDir = getPageStorageDir(page.job_id, page.page_index);
      const splitGeoPath = path.join(pageDir, 'split_geometry.json');
      if (fs.existsSync(splitGeoPath)) {
        try {
          const splitGeo = JSON.parse(fs.readFileSync(splitGeoPath, 'utf8'));
          if (splitGeo.applied && splitGeo.left_image_path && splitGeo.right_image_path) {
            const leftPreproc = path.join(pageDir, 'preprocessed_left.jpg');
            const rightPreproc = path.join(pageDir, 'preprocessed_right.jpg');
            if (fs.existsSync(leftPreproc) && fs.existsSync(rightPreproc)) {
              splitPaths = { left: leftPreproc, right: rightPreproc };
            }
          }
        } catch {}
      }
    }

    let ocrRawText: string;
    let confidence: number;
    let visionResultJson: any;

    if (splitPaths && fs.existsSync(splitPaths.left) && fs.existsSync(splitPaths.right)) {
      // OCR each half separately and merge results
      console.log(`  Running split OCR for page ${page.id}: left + right`);

      // Temporarily override preproc_path for left half
      const origPreprocPath = page.preproc_path;
      page.preproc_path = splitPaths.left;
      const leftOcr = await runOCR(tenantPool, page);

      page.preproc_path = splitPaths.right;
      const rightOcr = await runOCR(tenantPool, page);

      // Restore original preproc_path
      page.preproc_path = origPreprocPath;

      // Merge: concatenate text with separator, average confidence, merge vision JSON
      ocrRawText = leftOcr.rawText + '\n\n--- PAGE SPLIT ---\n\n' + rightOcr.rawText;
      confidence = (leftOcr.confidence + rightOcr.confidence) / 2;

      // Merge vision result: combine pages arrays
      visionResultJson = {
        text: ocrRawText,
        pages: [
          ...(leftOcr.visionResultJson.pages || []),
          ...(rightOcr.visionResultJson.pages || []),
        ],
        _split: true,
        _leftText: leftOcr.rawText,
        _rightText: rightOcr.rawText,
      };

      console.log(
        `  Split OCR complete: left=${(leftOcr.confidence * 100).toFixed(1)}%, ` +
        `right=${(rightOcr.confidence * 100).toFixed(1)}%, avg=${(confidence * 100).toFixed(1)}%`
      );
    } else {
      // ── Check for region-scoped OCR via redaction mask plan ──────────
      const pageDir = getPageStorageDir(page.job_id, page.page_index);
      const redactionMaskPath = path.join(pageDir, 'redaction_mask.png');
      const redactionGeoPath = path.join(pageDir, 'redaction_geometry.json');
      let usedRegionOCR = false;

      if (fs.existsSync(redactionMaskPath) && fs.existsSync(redactionGeoPath)) {
        try {
          const redactionGeo = JSON.parse(fs.readFileSync(redactionGeoPath, 'utf8'));

          // Only attempt region-scoped OCR if redaction was applied
          if (redactionGeo.applied) {
            const maskBuf = fs.readFileSync(redactionMaskPath);
            const imagePath = page.preproc_path || page.input_path;
            const imgMeta = await sharp(imagePath).metadata();
            const imgW = imgMeta.width!;
            const imgH = imgMeta.height!;

            const plan = await generateOcrPlan(maskBuf, imgW, imgH);

            // Save OCR plan artifact (always)
            const planPath = path.join(pageDir, 'ocr_input_plan.json');
            atomicWriteFileSync(planPath, JSON.stringify(plan, null, 2));
            await tenantPool.execute(
              `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
               VALUES (?, 'ocr_input_plan', ?, ?)`,
              [page.id, planPath, JSON.stringify({
                useRegions: plan.useRegions,
                regionCount: plan.regions.length,
                contentFrac: plan.contentFrac,
                method: plan.method,
              })]
            );

            // Merge plan metrics
            const metricsPath = path.join(pageDir, 'metrics.json');
            mergeMetrics(metricsPath, {
              ocr_mask_applied: true,
              ocr_plan_use_regions: plan.useRegions,
              ocr_regions_count: plan.regions.length,
              ocr_content_frac: plan.contentFrac,
            });

            if (plan.useRegions && plan.regions.length > 0) {
              console.log(`  [OCR Plan] Page ${page.id}: region-scoped OCR with ${plan.regions.length} regions (content ${(plan.contentFrac * 100).toFixed(1)}%)`);

              // ── Step 2.2: Generate profile plan for regions ──────────────
              let jobRecordType = 'unknown';
              let jobLayoutTemplateId: number | null = null;
              try {
                const [jobRows] = await platformPool.query(
                  `SELECT record_type, layout_template_id FROM ocr_jobs WHERE id = ?`, [page.job_id]
                ) as any[];
                if (jobRows.length > 0) {
                  jobRecordType = jobRows[0].record_type || 'unknown';
                  jobLayoutTemplateId = jobRows[0].layout_template_id || null;
                }
              } catch (_: any) { /* best effort */ }

              const profilePlan = selectRegionProfiles(plan.regions, {
                recordType: jobRecordType,
                layoutTemplateId: jobLayoutTemplateId,
              });

              // Persist profile plan artifact (always, atomic)
              const profilePlanPath = path.join(pageDir, 'ocr_profile_plan.json');
              const profilePlanJson = JSON.stringify(profilePlan, null, 2);
              atomicWriteFileSync(profilePlanPath, profilePlanJson);
              const profilePlanSha256 = crypto.createHash('sha256').update(profilePlanJson).digest('hex');
              await tenantPool.execute(
                `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
                 VALUES (?, 'ocr_profile_plan', ?, ?, ?, ?, 'application/json')`,
                [
                  page.id,
                  profilePlanPath,
                  JSON.stringify({
                    method: profilePlan.method,
                    regionCount: profilePlan.regions.length,
                    reasons: profilePlan.reasons,
                  }),
                  profilePlanSha256,
                  Buffer.byteLength(profilePlanJson),
                ]
              );

              // Merge profile metrics
              const profileCounts: Record<string, number> = {};
              for (const pa of profilePlan.regions) {
                profileCounts[pa.profile] = (profileCounts[pa.profile] || 0) + 1;
              }
              mergeMetrics(metricsPath, {
                ocr_profiles_used: profileCounts,
              });

              console.log(`  [OCR Profiles] Page ${page.id}: ${profilePlan.regions.map(r => `r${r.regionIndex}=${r.profile}`).join(', ')}`);

              // Pass profile plan to region-scoped OCR
              const regionResult = await runRegionScopedOCR(tenantPool, page, plan.regions, profilePlan);
              ocrRawText = regionResult.rawText;
              confidence = regionResult.confidence;
              visionResultJson = regionResult.visionResultJson;
              usedRegionOCR = true;

              // Update metrics with region results + fallback count
              const fallbackCount = regionResult.regionResults.filter((r: any) => r.usedRetry || r.retryAttempted).length;
              mergeMetrics(metricsPath, {
                ocr_region_success_count: regionResult.regionResults.filter((r: any) => r.status === 'ok').length,
                ocr_region_fail_count: regionResult.regionResults.filter((r: any) => r.status === 'error').length,
                ocr_profile_fallbacks: fallbackCount,
              });
            } else {
              console.log(`  [OCR Plan] Page ${page.id}: no regions (${plan.reasons.join(', ')}), using standard OCR`);
            }
          }
        } catch (planErr: any) {
          console.warn(`  [OCR Plan] Page ${page.id}: Plan failed (falling back to standard OCR): ${planErr.message}`);
        }
      }

      if (!usedRegionOCR) {
        // Standard single-image OCR (fallback or no mask)
        const ocrResult = await runOCR(tenantPool, page);
        ocrRawText = ocrResult.rawText;
        confidence = ocrResult.confidence;
        visionResultJson = ocrResult.visionResultJson;
      }
    }
    console.log(`  OCR page ${page.id}, confidence: ${(confidence * 100).toFixed(1)}%`);

    // ── Table Extraction (runs between OCR and parsing) ──────────────────
    // Hoist these for use in both table extraction and structure retry
    let recordType = 'unknown';
    let templateBands: any = null;
    let templateHeaderY: number | null = null;

    try {
      // Look up job's record_type from platform DB
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
      let templateId: number | null = null;
      let extractionMode: string = 'tabular';
      let extractorRow: any = null;
      try {
        // First check if job has an explicit layout_template_id
        const [tplJobRows] = await platformPool.query(
          `SELECT layout_template_id FROM ocr_jobs WHERE id = ?`, [page.job_id]
        ) as any[];
        templateId = tplJobRows[0]?.layout_template_id || null;

        // Fallback: find default template for this record_type
        if (!templateId) {
          const [defaultRows] = await platformPool.query(
            `SELECT id, extraction_mode, column_bands, header_y_threshold, record_regions, learned_params
             FROM ocr_extractors
             WHERE record_type = ? AND is_default = 1 LIMIT 1`,
            [recordType]
          ) as any[];
          if (defaultRows.length > 0) {
            templateId = defaultRows[0].id;
            extractorRow = defaultRows[0];
            extractionMode = defaultRows[0].extraction_mode || 'tabular';
            if (defaultRows[0].column_bands) {
              templateBands = typeof defaultRows[0].column_bands === 'string'
                ? JSON.parse(defaultRows[0].column_bands) : defaultRows[0].column_bands;
            }
            templateHeaderY = defaultRows[0].header_y_threshold;
          }
        } else {
          // Load explicit template
          const [tplRows] = await platformPool.query(
            `SELECT id, extraction_mode, column_bands, header_y_threshold, record_regions, learned_params
             FROM ocr_extractors WHERE id = ?`,
            [templateId]
          ) as any[];
          if (tplRows.length > 0) {
            extractorRow = tplRows[0];
            extractionMode = tplRows[0].extraction_mode || 'tabular';
            if (tplRows[0].column_bands) {
              templateBands = typeof tplRows[0].column_bands === 'string'
                ? JSON.parse(tplRows[0].column_bands) : tplRows[0].column_bands;
            }
            templateHeaderY = tplRows[0].header_y_threshold;
          }
        }

        if (templateBands) {
          console.log(`  [TableExtract] Page ${page.id}: Using layout template ${templateId} (${templateBands.length} bands, mode=${extractionMode})`);
        } else {
          console.log(`  [TableExtract] Page ${page.id}: Template ${templateId || 'none'} (mode=${extractionMode})`);
        }
      } catch (tplErr: any) {
        console.warn(`  [TableExtract] Page ${page.id}: Template lookup failed (non-blocking): ${tplErr.message}`);
      }

      let tableExtractionResult: any = null;

      // Dispatch based on extraction_mode
      if (extractionMode === 'form' && extractorRow) {
        // Single form per page — anchor-based extraction
        const { extractFormPage } = require('../ocr/formExtractor');
        tableExtractionResult = await extractFormPage(visionResultJson, extractorRow, platformPool, recordType);
        console.log(`  [FormExtract] Page ${page.id}: Form mode → ${tableExtractionResult.data_rows} records, ${tableExtractionResult.columns_detected} fields`);

      } else if (extractionMode === 'multi_form' && extractorRow) {
        // N records per page — record regions + anchor extraction
        const { extractMultiFormPage } = require('../ocr/formExtractor');
        tableExtractionResult = await extractMultiFormPage(visionResultJson, extractorRow, platformPool, recordType);
        console.log(`  [FormExtract] Page ${page.id}: Multi-form mode → ${tableExtractionResult.data_rows} records, ${tableExtractionResult.columns_detected} fields`);

      } else if (extractionMode === 'auto' && extractorRow) {
        // Try anchor detection first; fall back to generic table
        const { extractAutoMode } = require('../ocr/formExtractor');
        const autoResult = await extractAutoMode(visionResultJson, extractorRow, recordType, platformPool);
        if (autoResult) {
          tableExtractionResult = autoResult;
          console.log(`  [FormExtract] Page ${page.id}: Auto mode (anchors) → ${tableExtractionResult.data_rows} records`);
        } else {
          // Fall through to tabular extraction below
          console.log(`  [FormExtract] Page ${page.id}: Auto mode → falling back to tabular`);
        }
      }

      // Tabular extraction (default, or auto-mode fallback)
      // Phase 3.1: Try template-locked extraction first
      let templateMatchResult: TemplateMatchResult | null = null;
      if (!tableExtractionResult) {
        try {
          templateMatchResult = selectTemplate(recordType, extractorRow);
          const resolvedTemplate = resolveTemplate(templateMatchResult, extractorRow, recordType);

          if (resolvedTemplate) {
            tableExtractionResult = extractWithTemplate(visionResultJson, resolvedTemplate, { pageIndex: 0 });
            console.log(`  [TemplateExtract] Page ${page.id}: Template ${resolvedTemplate.templateId} → ${tableExtractionResult.data_rows} rows, ${tableExtractionResult.columns_detected} columns, ambig=${tableExtractionResult._ambiguous_tokens}`);
          }
        } catch (tmplErr: any) {
          console.warn(`  [TemplateExtract] Page ${page.id}: Template extraction failed (falling back): ${tmplErr.message}`);
          templateMatchResult = templateMatchResult || { method: 'template_selector_v1', selectedTemplateId: null, confidence: 0, reasons: ['TEMPLATE_ERROR'], candidates: [] };
        }

        // Fallback to generic/marriage extraction if no template or template produced no data
        if (!tableExtractionResult || tableExtractionResult.data_rows === 0) {
          const prevResult = tableExtractionResult; // keep for comparison
          if (templateBands) {
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
          // If template had data but generic has more, keep generic; otherwise keep whatever has data
          if (prevResult && prevResult.data_rows > 0 && prevResult.data_rows >= (tableExtractionResult?.data_rows ?? 0)) {
            tableExtractionResult = prevResult;
            console.log(`  [TemplateExtract] Page ${page.id}: Keeping template result (${prevResult.data_rows} rows vs generic ${tableExtractionResult?.data_rows ?? 0})`);
          }
        }
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

      // Phase 3.1: Write template_match.json artifact (always)
      if (templateMatchResult) {
        const pageDir = getPageStorageDir(page.job_id, page.page_index);
        mkdirp(pageDir);
        const tmplMatchPath = path.join(pageDir, 'template_match.json');
        const tmplMatchJson = JSON.stringify({
          ...templateMatchResult,
          template_locked: tableExtractionResult?._template_locked ?? false,
          ambiguous_tokens: tableExtractionResult?._ambiguous_tokens ?? 0,
          total_assigned_tokens: tableExtractionResult?._total_assigned_tokens ?? 0,
          recorded_at: new Date().toISOString(),
        }, null, 2);
        const tmplTmp = tmplMatchPath + '.tmp';
        fs.writeFileSync(tmplTmp, tmplMatchJson);
        fs.renameSync(tmplTmp, tmplMatchPath);

        const tmplSha = crypto.createHash('sha256').update(tmplMatchJson).digest('hex');
        await tenantPool.execute(
          `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, json_blob, sha256, bytes, mime_type)
           VALUES (?, 'template_match', ?, ?, ?, ?, 'application/json')`,
          [page.id, tmplMatchPath, tmplMatchJson, tmplSha, Buffer.byteLength(tmplMatchJson)]
        );

        // Merge template metrics into metrics.json
        const metricsPath = path.join(pageDir, 'metrics.json');
        let metrics: Record<string, any> = {};
        if (fs.existsSync(metricsPath)) {
          try { metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8')); } catch {}
        }
        Object.assign(metrics, {
          template_used: templateMatchResult.selectedTemplateId,
          template_confidence: templateMatchResult.confidence,
          template_locked: tableExtractionResult?._template_locked ?? false,
          column_ambiguity_rate: (tableExtractionResult?._total_assigned_tokens ?? 0) > 0
            ? (tableExtractionResult?._ambiguous_tokens ?? 0) / (tableExtractionResult._total_assigned_tokens ?? 1)
            : 0,
          rows_extracted: tableExtractionResult?.data_rows ?? 0,
        });
        const metricsTmp = metricsPath + '.tmp';
        fs.writeFileSync(metricsTmp, JSON.stringify(metrics, null, 2));
        fs.renameSync(metricsTmp, metricsPath);

        console.log(`  [TemplateMatch] Page ${page.id}: template=${templateMatchResult.selectedTemplateId}, conf=${templateMatchResult.confidence}, locked=${tableExtractionResult?._template_locked ?? false}`);
      }
    } catch (tableErr: any) {
      console.warn(`  [TableExtract] Page ${page.id}: Table extraction failed (non-blocking): ${tableErr.message}`);
      // Non-blocking — continue with raw text
    }

    // ── Step 2.3: Structure-aware OCR retry ────────────────────────────────
    try {
      const pageDir = getPageStorageDir(page.job_id, page.page_index);
      const tableJsonPath = path.join(pageDir, 'table_extraction.json');

      // Load initial table extraction (if it exists)
      let initialTableResult: any = null;
      if (fs.existsSync(tableJsonPath)) {
        try {
          initialTableResult = JSON.parse(fs.readFileSync(tableJsonPath, 'utf8'));
        } catch {}
      }

      // Check if Step 2.2 already used alt hints
      let altHintsAlreadyUsed = false;
      const visionRegionsPath = path.join(pageDir, 'vision_regions.json');
      if (fs.existsSync(visionRegionsPath)) {
        try {
          const vr = JSON.parse(fs.readFileSync(visionRegionsPath, 'utf8'));
          altHintsAlreadyUsed = (vr.retryCount ?? 0) > 0 ||
            (vr.regions || []).some((r: any) => r.usedRetry || r.retryAttempted);
        } catch {}
      }

      // Check if binarized input exists
      const binarizedPath = path.join(pageDir, 'cleaned_bin.jpg');
      const binarizedAvailable = fs.existsSync(binarizedPath);

      const retryPlan = buildRetryPlan(initialTableResult, null, {
        altHintsAlreadyUsed,
        binarizedInputAvailable: binarizedAvailable,
      });

      if (retryPlan.retry.shouldRetry) {
        console.log(`  [StructRetry] Page ${page.id}: score=${retryPlan.initial.structureScore.toFixed(3)}, strategy=${retryPlan.retry.strategy}, reasons=${retryPlan.initial.reasons.join(',')}`);

        let retryVisionResult: any = null;
        let retryRawText = '';
        let retryConfidence = 0;

        // Execute retry strategy
        if (retryPlan.retry.strategy === 'ALT_HINTS') {
          // Swap language hint order and re-OCR
          const origHints = LANGUAGE_HINTS_CFG;
          const altHints = [...origHints].reverse();
          LANGUAGE_HINTS_CFG = altHints;
          try {
            const retryOcr = await runOCR(tenantPool, page);
            retryVisionResult = retryOcr.visionResultJson;
            retryRawText = retryOcr.rawText;
            retryConfidence = retryOcr.confidence;
          } finally {
            LANGUAGE_HINTS_CFG = origHints;
          }

        } else if (retryPlan.retry.strategy === 'BINARIZED_INPUT' && binarizedAvailable) {
          // Re-OCR using binarized input
          const origPreprocPath = page.preproc_path;
          page.preproc_path = binarizedPath;
          try {
            const retryOcr = await runOCR(tenantPool, page);
            retryVisionResult = retryOcr.visionResultJson;
            retryRawText = retryOcr.rawText;
            retryConfidence = retryOcr.confidence;
          } finally {
            page.preproc_path = origPreprocPath;
          }

        } else if (retryPlan.retry.strategy === 'DROP_HEADER_STRIP') {
          // Re-OCR excluding top header strip
          const headerStripFrac = retryPlan.retry.details?.headerStripFrac ?? 0.12;
          const imagePath = page.preproc_path || page.input_path;
          const imgMeta = await sharp(imagePath).metadata();
          const imgW = imgMeta.width!;
          const imgH = imgMeta.height!;
          const stripPx = Math.round(imgH * headerStripFrac);

          // Create a cropped version excluding the header strip
          const strippedPath = path.join(pageDir, 'ocr_header_stripped.jpg');
          await sharp(imagePath)
            .extract({ left: 0, top: stripPx, width: imgW, height: imgH - stripPx })
            .jpeg({ quality: 92 })
            .toFile(strippedPath);

          const origPreprocPath = page.preproc_path;
          page.preproc_path = strippedPath;
          try {
            const retryOcr = await runOCR(tenantPool, page);
            retryVisionResult = retryOcr.visionResultJson;
            retryRawText = retryOcr.rawText;
            retryConfidence = retryOcr.confidence;
          } finally {
            page.preproc_path = origPreprocPath;
          }
        }

        if (retryVisionResult) {
          // Save retry vision outputs as separate files
          const retryVisionPath = path.join(pageDir, 'vision_result_retry_1.json');
          const retryVisionStr = JSON.stringify(retryVisionResult);
          atomicWriteFileSync(retryVisionPath, retryVisionStr);
          await tenantPool.execute(
            `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json)
             VALUES (?, 'vision_json_retry', ?, ?)`,
            [page.id, retryVisionPath, JSON.stringify({
              strategy: retryPlan.retry.strategy,
              confidence: retryConfidence,
              extractedAt: new Date().toISOString(),
            })]
          );

          // Re-run table extraction on retry vision result
          let retryTableResult: any = null;
          try {
            if (templateBands) {
              const { extractGenericTable } = require('../ocr/layouts/generic_table');
              const exOpts: any = {
                pageIndex: 0,
                columnBands: templateBands.map((b: any) => Array.isArray(b) ? b : [b.start, b.end]),
              };
              if (templateHeaderY != null) exOpts.headerYThreshold = templateHeaderY;
              retryTableResult = extractGenericTable(retryVisionResult, exOpts);
            } else if (recordType === 'marriage') {
              const { extractMarriageLedgerTable } = require('../ocr/layouts/marriage_ledger_v1');
              retryTableResult = extractMarriageLedgerTable(retryVisionResult, { pageIndex: 0 });
            } else {
              const { extractGenericTable } = require('../ocr/layouts/generic_table');
              retryTableResult = extractGenericTable(retryVisionResult, { pageIndex: 0 });
            }
          } catch (retryExErr: any) {
            console.warn(`  [StructRetry] Page ${page.id}: Retry extraction failed: ${retryExErr.message}`);
          }

          // Compute retry structure score
          const retrySignals = extractSignals(retryTableResult, null);
          const retryAssessment = computeStructureScore(retrySignals);

          console.log(`  [StructRetry] Page ${page.id}: initial=${retryPlan.initial.structureScore.toFixed(3)}, retry=${retryAssessment.structureScore.toFixed(3)}`);

          // Pick winner (tie goes to initial)
          if (retryAssessment.structureScore > retryPlan.initial.structureScore) {
            retryPlan.winner = 'retry';
            retryPlan.final = retryAssessment;

            // Overwrite canonical outputs with retry versions
            const canonVisionPath = path.join(pageDir, 'vision_result.json');
            atomicWriteFileSync(canonVisionPath, retryVisionStr);
            visionResultJson = retryVisionResult;
            ocrRawText = retryRawText;
            confidence = retryConfidence;

            // Overwrite raw_text.txt
            const canonRawTextPath = path.join(pageDir, 'raw_text.txt');
            await writeFile(canonRawTextPath, retryRawText);

            // Overwrite table_extraction.json if retry had a result
            if (retryTableResult) {
              atomicWriteFileSync(tableJsonPath, JSON.stringify(retryTableResult, null, 2));
              const { tableToStructuredText } = require('../ocr/layouts/generic_table');
              const retryStructuredText = tableToStructuredText(retryTableResult);
              if (retryStructuredText) {
                const structuredTxtPath = path.join(pageDir, '_structured.txt');
                await writeFile(structuredTxtPath, retryStructuredText);
              }
            }

            console.log(`  [StructRetry] Page ${page.id}: RETRY WINS (${retryAssessment.structureScore.toFixed(3)} > ${retryPlan.initial.structureScore.toFixed(3)})`);
          } else {
            retryPlan.winner = 'initial';
            retryPlan.final = retryPlan.initial;
            console.log(`  [StructRetry] Page ${page.id}: INITIAL WINS (${retryPlan.initial.structureScore.toFixed(3)} >= ${retryAssessment.structureScore.toFixed(3)})`);
          }
        }
      } else {
        console.log(`  [StructRetry] Page ${page.id}: score=${retryPlan.initial.structureScore.toFixed(3)} >= threshold, no retry needed`);
      }

      // Persist retry_plan.json (ALWAYS)
      const retryPlanPath = path.join(pageDir, 'retry_plan.json');
      const retryPlanJson = JSON.stringify(retryPlan, null, 2);
      atomicWriteFileSync(retryPlanPath, retryPlanJson);
      const retryPlanSha256 = crypto.createHash('sha256').update(retryPlanJson).digest('hex');
      await tenantPool.execute(
        `INSERT INTO ocr_feeder_artifacts (page_id, type, storage_path, meta_json, sha256, bytes, mime_type)
         VALUES (?, 'retry_plan', ?, ?, ?, ?, 'application/json')`,
        [
          page.id,
          retryPlanPath,
          JSON.stringify({
            method: retryPlan.method,
            initial_score: retryPlan.initial.structureScore,
            final_score: retryPlan.final.structureScore,
            shouldRetry: retryPlan.retry.shouldRetry,
            strategy: retryPlan.retry.strategy,
            winner: retryPlan.winner,
          }),
          retryPlanSha256,
          Buffer.byteLength(retryPlanJson),
        ]
      );

      // Merge metrics
      const metricsPath = path.join(pageDir, 'metrics.json');
      mergeMetrics(metricsPath, {
        structure_score_initial: retryPlan.initial.structureScore,
        structure_score_final: retryPlan.final.structureScore,
        ocr_retry_performed: retryPlan.retry.shouldRetry,
        ocr_retry_strategy: retryPlan.retry.strategy,
        ocr_retry_improved: retryPlan.winner === 'retry',
      });

    } catch (retryErr: any) {
      console.warn(`  [StructRetry] Page ${page.id}: Structure retry failed (non-blocking): ${retryErr.message}`);
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

