/**
 * Restore History Logger
 * 
 * Logs all file restore operations to a JSON file for audit purposes.
 * Tracks who restored what, when, and from which source.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

const HISTORY_FILE = path.join(__dirname, '../../../.analysis/restore-history.json');

export interface RestoreHistoryEntry {
  id: string;                    // Unique ID for this restore event
  timestamp: string;             // ISO timestamp
  user: string | null;          // Username (from auth) or null
  userEmail: string | null;     // User email (from auth) or null
  relPath: string;              // Relative path of restored file
  sourcePath: string;           // Full source path
  targetPath: string;           // Full target path
  sourceType: 'local' | 'remote'; // Source type
  snapshotId: string | null;    // Snapshot ID if applicable
  fileSize: number;             // File size in bytes
  success: boolean;             // Whether restore succeeded
  error: string | null;         // Error message if failed
}

export interface RestoreHistory {
  version: string;              // Schema version
  createdAt: string;            // When history file was created
  lastUpdated: string;          // Last update timestamp
  totalRestores: number;        // Total restore count
  entries: RestoreHistoryEntry[];
}

/**
 * Initialize history file if it doesn't exist
 */
async function initializeHistoryFile(): Promise<void> {
  if (await fs.pathExists(HISTORY_FILE)) {
    return;
  }
  
  // Ensure directory exists
  await fs.ensureDir(path.dirname(HISTORY_FILE));
  
  const initialHistory: RestoreHistory = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalRestores: 0,
    entries: []
  };
  
  await fs.writeJson(HISTORY_FILE, initialHistory, { spaces: 2 });
  console.log('[RestoreHistory] Initialized history file:', HISTORY_FILE);
}

/**
 * Read restore history from file
 */
async function readHistory(): Promise<RestoreHistory> {
  await initializeHistoryFile();
  
  try {
    const history = await fs.readJson(HISTORY_FILE);
    return history;
  } catch (error) {
    console.error('[RestoreHistory] Error reading history file:', error);
    // Return empty history on error
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalRestores: 0,
      entries: []
    };
  }
}

/**
 * Write restore history to file
 */
async function writeHistory(history: RestoreHistory): Promise<void> {
  try {
    await fs.writeJson(HISTORY_FILE, history, { spaces: 2 });
  } catch (error) {
    console.error('[RestoreHistory] Error writing history file:', error);
    throw error;
  }
}

/**
 * Log a restore operation
 */
export async function logRestore(entry: Omit<RestoreHistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const history = await readHistory();
    
    // Generate unique ID
    const id = `restore-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create entry with ID and timestamp
    const fullEntry: RestoreHistoryEntry = {
      id,
      timestamp: new Date().toISOString(),
      ...entry
    };
    
    // Add to entries (newest first)
    history.entries.unshift(fullEntry);
    
    // Update metadata
    history.lastUpdated = fullEntry.timestamp;
    history.totalRestores++;
    
    // Keep only last 1000 entries to prevent file from growing too large
    if (history.entries.length > 1000) {
      history.entries = history.entries.slice(0, 1000);
    }
    
    await writeHistory(history);
    
    console.log('[RestoreHistory] Logged restore:', {
      id: fullEntry.id,
      relPath: entry.relPath,
      user: entry.user || 'anonymous',
      success: entry.success
    });
  } catch (error) {
    console.error('[RestoreHistory] Failed to log restore:', error);
    // Don't throw - logging failure shouldn't break restore operation
  }
}

/**
 * Get restore history (with pagination)
 */
export async function getHistory(
  limit: number = 50,
  offset: number = 0
): Promise<{
  total: number;
  limit: number;
  offset: number;
  entries: RestoreHistoryEntry[];
}> {
  const history = await readHistory();
  
  const paginatedEntries = history.entries.slice(offset, offset + limit);
  
  return {
    total: history.entries.length,
    limit,
    offset,
    entries: paginatedEntries
  };
}

/**
 * Get history for a specific file
 */
export async function getFileHistory(relPath: string): Promise<RestoreHistoryEntry[]> {
  const history = await readHistory();
  return history.entries.filter(entry => entry.relPath === relPath);
}

/**
 * Get history for a specific user
 */
export async function getUserHistory(user: string): Promise<RestoreHistoryEntry[]> {
  const history = await readHistory();
  return history.entries.filter(entry => entry.user === user || entry.userEmail === user);
}

/**
 * Get restore statistics
 */
export async function getStatistics(): Promise<{
  totalRestores: number;
  successfulRestores: number;
  failedRestores: number;
  uniqueFiles: number;
  uniqueUsers: number;
  lastRestore: RestoreHistoryEntry | null;
  restoresBySourceType: { local: number; remote: number };
  restoresBySnapshot: Record<string, number>;
}> {
  const history = await readHistory();
  
  const successfulRestores = history.entries.filter(e => e.success).length;
  const failedRestores = history.entries.filter(e => !e.success).length;
  
  const uniqueFiles = new Set(history.entries.map(e => e.relPath)).size;
  const uniqueUsers = new Set(
    history.entries
      .map(e => e.user || e.userEmail)
      .filter(u => u !== null)
  ).size;
  
  const restoresBySourceType = {
    local: history.entries.filter(e => e.sourceType === 'local').length,
    remote: history.entries.filter(e => e.sourceType === 'remote').length
  };
  
  const restoresBySnapshot: Record<string, number> = {};
  history.entries.forEach(entry => {
    if (entry.snapshotId) {
      restoresBySnapshot[entry.snapshotId] = (restoresBySnapshot[entry.snapshotId] || 0) + 1;
    }
  });
  
  return {
    totalRestores: history.totalRestores,
    successfulRestores,
    failedRestores,
    uniqueFiles,
    uniqueUsers,
    lastRestore: history.entries.length > 0 ? history.entries[0] : null,
    restoresBySourceType,
    restoresBySnapshot
  };
}

/**
 * Clear history (use with caution!)
 */
export async function clearHistory(): Promise<void> {
  const initialHistory: RestoreHistory = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    totalRestores: 0,
    entries: []
  };
  
  await writeHistory(initialHistory);
  console.log('[RestoreHistory] History cleared');
}

/**
 * Export history to CSV
 */
export function exportToCSV(entries: RestoreHistoryEntry[]): string {
  const headers = [
    'Timestamp',
    'User',
    'Email',
    'File Path',
    'Source Type',
    'Snapshot',
    'File Size (bytes)',
    'Success',
    'Error'
  ];
  
  const rows = entries.map(entry => [
    entry.timestamp,
    entry.user || '',
    entry.userEmail || '',
    entry.relPath,
    entry.sourceType,
    entry.snapshotId || '',
    entry.fileSize.toString(),
    entry.success ? 'Yes' : 'No',
    entry.error || ''
  ]);
  
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ];
  
  return csvLines.join('\n');
}
