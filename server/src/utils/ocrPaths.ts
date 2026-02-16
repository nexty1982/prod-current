/**
 * Canonical OCR file path utilities.
 *
 * Single source of truth:
 *   Filesystem dir : /var/www/orthodoxmetrics/prod/uploads/om_church_<id>/uploaded/
 *   DB file_path   : /uploads/om_church_<id>/uploaded/<filename>
 *   Temp dir       : /var/www/orthodoxmetrics/prod/uploads/temp/
 *
 * server/uploads NO LONGER EXISTS — no legacy fallbacks.
 */

import fs from 'fs';
import path from 'path';

// Canonical uploads root — outside server/, shared by all services
const UPLOADS_ROOT = '/var/www/orthodoxmetrics/prod/uploads';

// Temp dir for multer — canonical, absolute
const UPLOADS_TEMP = path.join(UPLOADS_ROOT, 'temp');

/**
 * Guard: throw immediately if a computed path contains /server/.
 * Prevents regression to the deleted server/uploads directory.
 */
function assertNoServerPath(p: string): void {
  if (p.includes('/server/')) {
    throw new Error(`[ocrPaths] FATAL: path contains /server/ which is forbidden: ${p}`);
  }
}

/**
 * Absolute filesystem directory for a church's OCR uploads.
 * Returns <UPLOADS_ROOT>/om_church_<id>/uploaded/
 * Creates the directory if it doesn't exist.
 */
export function getOcrUploadDir(churchId: number): string {
  const dir = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded');
  assertNoServerPath(dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Public / DB-stored path for a file.
 * e.g. /uploads/om_church_51/uploaded/scan_123456.jpg
 */
export function getOcrDbPath(churchId: number, filename: string): string {
  return `/uploads/om_church_${churchId}/uploaded/${filename}`;
}

/**
 * Canonical resolveUploadDir — single helper for both uploader + worker.
 * Returns /var/www/orthodoxmetrics/prod/uploads/om_church_<id>/uploaded/
 * Creates the directory tree if it doesn't exist.
 */
export function resolveUploadDir(churchId: number): string {
  const dir = path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded');
  assertNoServerPath(dir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Ensure the canonical temp directory exists and return its path.
 */
export function getUploadsTempDir(): string {
  if (!fs.existsSync(UPLOADS_TEMP)) {
    fs.mkdirSync(UPLOADS_TEMP, { recursive: true });
  }
  return UPLOADS_TEMP;
}

/**
 * Resolve a DB file_path to an absolute filesystem path.
 * Searches ONLY canonical paths under UPLOADS_ROOT.
 *
 * Returns the first path that exists on disk, or null.
 */
export function resolveOcrFilePath(
  dbFilePath: string,
  churchId?: number
): string | null {
  if (!dbFilePath) return null;

  const filename = path.basename(dbFilePath);
  const candidates: string[] = [];

  // 1. If dbFilePath is already absolute under /var/ and exists, use it
  if (path.isAbsolute(dbFilePath) && dbFilePath.startsWith('/var/')) {
    candidates.push(dbFilePath);
  }

  // 2. Relative DB path → canonical root
  if (dbFilePath.startsWith('/uploads/')) {
    candidates.push(path.join(UPLOADS_ROOT, dbFilePath.replace(/^\/uploads\//, '')));
  }

  // 3. Canonical convention: <UPLOADS_ROOT>/om_church_<id>/uploaded/<file>
  if (churchId) {
    candidates.push(path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'uploaded', filename));
  }

  // 4. Canonical no-subdir: <UPLOADS_ROOT>/om_church_<id>/<file>
  if (churchId) {
    candidates.push(path.join(UPLOADS_ROOT, `om_church_${churchId}`, filename));
  }

  // 5. Processed sub-dir
  if (churchId) {
    candidates.push(path.join(UPLOADS_ROOT, `om_church_${churchId}`, 'processed', filename));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

export { UPLOADS_ROOT, UPLOADS_TEMP };

