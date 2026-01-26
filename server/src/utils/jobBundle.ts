/**
 * Job Bundle Utility
 * File-backed storage for OCR job state (manifest, drafts, etc.)
 * This is the source of truth; DB writes are best-effort.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface Manifest {
  jobId: string;
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  page_year: number | null;
  draftCounts: {
    draft: number;
    in_review: number;
    finalized: number;
    committed: number;
  };
  updatedAt: string; // ISO string
  paths: {
    drafts: string;
    header: string;
    layout: string;
  };
}

export interface DraftEntry {
  entry_index: number;
  workflow_status: 'draft' | 'in_review' | 'finalized' | 'committed';
  record_number: string | null;
  payload: Record<string, any>;
  bbox: {
    entryBbox?: { x: number; y: number; w: number; h: number };
    fieldBboxes?: Record<string, any>;
  };
  updatedAt: string; // ISO string
  committed_record_id?: number | null;
  commit_error?: string | null;
}

export interface DraftsFile {
  jobId: string;
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral';
  entries: DraftEntry[];
}

// ============================================================================
// Path Helpers
// ============================================================================

/**
 * Get the job bundle directory path for a given church and job
 */
export function getJobBundleDir(churchId: number, jobId: string | number): string {
  let baseUploadPath = process.env.UPLOAD_BASE_PATH;
  
  // If UPLOAD_BASE_PATH is not set, try to resolve relative to server directory
  if (!baseUploadPath) {
    // Try to find server root by looking for common markers
    const possiblePaths = [
      path.resolve(__dirname, '..', '..', 'uploads'), // server/src/utils -> server/uploads
      path.resolve(__dirname, '..', 'uploads'), // server/utils -> server/uploads
      path.resolve(process.cwd(), 'server', 'uploads'), // From project root
      path.resolve(process.cwd(), 'uploads'), // From server directory
      '/var/www/orthodoxmetrics/prod/server/uploads', // Production Linux path
    ];
    
    // Use first path that exists, or default to relative path
    const fsSync = require('fs');
    for (const possiblePath of possiblePaths) {
      try {
        if (fsSync.existsSync(possiblePath)) {
          baseUploadPath = possiblePath;
          console.log(`[JobBundle] Using detected upload path: ${baseUploadPath}`);
          break;
        }
      } catch (e) {
        // Continue to next path
      }
    }
    
    // If no path found, default to relative path from server directory
    if (!baseUploadPath) {
      baseUploadPath = path.resolve(__dirname, '..', '..', 'uploads');
      console.log(`[JobBundle] Using default upload path: ${baseUploadPath}`);
    }
  }
  
  return path.join(baseUploadPath, `om_church_${churchId}`, 'jobs', String(jobId));
}

/**
 * Ensure directory exists (recursive)
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Atomic write: write to temp file then rename
 */
async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

// ============================================================================
// Manifest Operations
// ============================================================================

/**
 * Try to read manifest.json without creating a default if missing
 * Returns null if manifest doesn't exist
 */
export async function tryReadManifest(
  churchId: number,
  jobId: string | number
): Promise<Manifest | null> {
  const bundleDir = getJobBundleDir(churchId, jobId);
  const manifestPath = path.join(bundleDir, 'manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content) as Manifest;
    console.log(`[JobBundle] Read manifest for job ${jobId} (church ${churchId})`);
    return manifest;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Manifest doesn't exist - return null (don't create default)
      return null;
    }
    throw error;
  }
}

/**
 * Read manifest.json, creating default if missing
 */
export async function readManifest(
  churchId: number,
  jobId: string | number,
  defaults?: Partial<Manifest>
): Promise<Manifest> {
  const bundleDir = getJobBundleDir(churchId, jobId);
  const manifestPath = path.join(bundleDir, 'manifest.json');

  try {
    const content = await fs.readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(content) as Manifest;
    console.log(`[JobBundle] Read manifest for job ${jobId} (church ${churchId})`);
    return manifest;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Create default manifest
      console.log(`[JobBundle] Creating default manifest for job ${jobId} (church ${churchId})`);
      const defaultManifest: Manifest = {
        jobId: String(jobId),
        churchId,
        recordType: defaults?.recordType || 'baptism',
        status: defaults?.status || 'pending',
        page_year: defaults?.page_year ?? null,
        draftCounts: {
          draft: 0,
          in_review: 0,
          finalized: 0,
          committed: 0,
        },
        updatedAt: new Date().toISOString(),
        paths: {
          drafts: 'drafts.json',
          header: 'header_ocr.json',
          layout: 'layout.json',
        },
      };

      await ensureDir(bundleDir);
      await atomicWrite(manifestPath, JSON.stringify(defaultManifest, null, 2));
      
      // Create stub files for header_ocr.json and layout.json
      const headerPath = path.join(bundleDir, 'header_ocr.json');
      const layoutPath = path.join(bundleDir, 'layout.json');
      try {
        await fs.writeFile(headerPath, JSON.stringify({ page_year: null }, null, 2), 'utf8');
        await fs.writeFile(layoutPath, JSON.stringify({}, null, 2), 'utf8');
      } catch (e) {
        // Non-critical if stub files can't be created
        console.warn(`[JobBundle] Could not create stub files (non-critical):`, e);
      }
      
      return defaultManifest;
    }
    throw error;
  }
}

/**
 * Write manifest.json with partial update
 */
export async function writeManifest(
  churchId: number,
  jobId: string | number,
  updates: Partial<Manifest>
): Promise<Manifest> {
  const bundleDir = getJobBundleDir(churchId, jobId);
  const manifestPath = path.join(bundleDir, 'manifest.json');

  // Try to read existing manifest, or create default if it doesn't exist
  // If creating default, use the updates provided (e.g., if updating to "processing", don't default to "pending")
  let existing: Manifest;
  const existingOrNull = await tryReadManifest(churchId, jobId);
  if (existingOrNull) {
    existing = existingOrNull;
  } else {
    // Manifest doesn't exist - create one, but use updates to inform defaults
    existing = {
      jobId: String(jobId),
      churchId,
      recordType: updates.recordType || 'baptism',
      status: updates.status || 'pending', // Use the status from updates if provided
      page_year: updates.page_year ?? null,
      draftCounts: {
        draft: 0,
        in_review: 0,
        finalized: 0,
        committed: 0,
      },
      updatedAt: new Date().toISOString(),
      paths: {
        drafts: 'drafts.json',
        header: 'header_ocr.json',
        layout: 'layout.json',
      },
    };
  }

  // Merge updates
  const updated: Manifest = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
    // Preserve draftCounts if not being updated
    draftCounts: updates.draftCounts || existing.draftCounts,
  };

  await ensureDir(bundleDir);
  await atomicWrite(manifestPath, JSON.stringify(updated, null, 2));
  console.log(`[JobBundle] ✅ Wrote manifest for job ${jobId} (church ${churchId}) - Status: ${updated.status}, Path: ${manifestPath}`);
  return updated;
}

// ============================================================================
// Drafts Operations
// ============================================================================

/**
 * Read drafts.json, creating default if missing
 */
export async function readDrafts(
  churchId: number,
  jobId: string | number,
  defaults?: Partial<DraftsFile>
): Promise<DraftsFile> {
  const bundleDir = getJobBundleDir(churchId, jobId);
  const draftsPath = path.join(bundleDir, 'drafts.json');

  try {
    const content = await fs.readFile(draftsPath, 'utf8');
    const drafts = JSON.parse(content) as DraftsFile;
    console.log(`[JobBundle] Read drafts for job ${jobId} (church ${churchId}): ${drafts.entries.length} entries`);
    return drafts;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Create default drafts file
      console.log(`[JobBundle] Creating default drafts for job ${jobId} (church ${churchId})`);
      const manifest = await readManifest(churchId, jobId, defaults);
      const defaultDrafts: DraftsFile = {
        jobId: String(jobId),
        churchId,
        recordType: manifest.recordType,
        entries: [],
      };

      await ensureDir(bundleDir);
      await atomicWrite(draftsPath, JSON.stringify(defaultDrafts, null, 2));
      
      // Ensure stub files exist
      const headerPath = path.join(bundleDir, 'header_ocr.json');
      const layoutPath = path.join(bundleDir, 'layout.json');
      try {
        const headerExists = await fs.access(headerPath).then(() => true).catch(() => false);
        const layoutExists = await fs.access(layoutPath).then(() => true).catch(() => false);
        if (!headerExists) {
          await fs.writeFile(headerPath, JSON.stringify({ page_year: null }, null, 2), 'utf8');
        }
        if (!layoutExists) {
          await fs.writeFile(layoutPath, JSON.stringify({}, null, 2), 'utf8');
        }
      } catch (e) {
        // Non-critical
        console.warn(`[JobBundle] Could not ensure stub files (non-critical):`, e);
      }
      
      return defaultDrafts;
    }
    throw error;
  }
}

/**
 * Write drafts.json and update manifest draftCounts atomically
 */
export async function writeDrafts(
  churchId: number,
  jobId: string | number,
  draftsObj: DraftsFile
): Promise<void> {
  const bundleDir = getJobBundleDir(churchId, jobId);
  const draftsPath = path.join(bundleDir, 'drafts.json');

  // Calculate draft counts
  const draftCounts = {
    draft: 0,
    in_review: 0,
    finalized: 0,
    committed: 0,
  };

  for (const entry of draftsObj.entries) {
    const status = entry.workflow_status;
    if (status in draftCounts) {
      draftCounts[status as keyof typeof draftCounts]++;
    }
  }

  // Write drafts file
  await ensureDir(bundleDir);
  await atomicWrite(draftsPath, JSON.stringify(draftsObj, null, 2));
  console.log(`[JobBundle] Wrote drafts for job ${jobId} (church ${churchId}): ${draftsObj.entries.length} entries`);

  // Update manifest with draft counts
  await writeManifest(churchId, jobId, { draftCounts });
}

/**
 * Upsert entries in drafts.json by entry_index
 */
export async function upsertDraftEntries(
  churchId: number,
  jobId: string | number,
  newEntries: Array<{
    entry_index: number;
    record_type?: 'baptism' | 'marriage' | 'funeral';
    record_number?: string | null;
    payload_json: Record<string, any>;
    bbox_json?: {
      entryBbox?: { x: number; y: number; w: number; h: number };
      fieldBboxes?: Record<string, any>;
    };
    workflow_status?: 'draft' | 'in_review' | 'finalized' | 'committed';
  }>
): Promise<DraftsFile> {
  const drafts = await readDrafts(churchId, jobId);
  const now = new Date().toISOString();

  // Get manifest for recordType if needed
  const manifest = await readManifest(churchId, jobId);
  const recordType = manifest.recordType;

  // Upsert each entry
  for (const newEntry of newEntries) {
    const existingIndex = drafts.entries.findIndex(
      e => e.entry_index === newEntry.entry_index
    );

    const draftEntry: DraftEntry = {
      entry_index: newEntry.entry_index,
      workflow_status: newEntry.workflow_status || 'draft',
      record_number: newEntry.record_number ?? null,
      payload: newEntry.payload_json || {},
      bbox: newEntry.bbox_json || {},
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      // Update existing entry, preserve committed_record_id and commit_error
      drafts.entries[existingIndex] = {
        ...drafts.entries[existingIndex],
        ...draftEntry,
        committed_record_id: drafts.entries[existingIndex].committed_record_id,
        commit_error: drafts.entries[existingIndex].commit_error,
      };
    } else {
      // Add new entry
      drafts.entries.push(draftEntry);
    }
  }

  // Update recordType if provided
  if (newEntries.length > 0 && newEntries[0].record_type) {
    drafts.recordType = newEntries[0].record_type;
  } else {
    drafts.recordType = recordType;
  }

  // Sort by entry_index
  drafts.entries.sort((a, b) => a.entry_index - b.entry_index);

  // Write drafts
  await writeDrafts(churchId, jobId, drafts);
  return drafts;
}

