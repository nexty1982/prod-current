/**
 * Snapshot Scanner Utility
 * 
 * Discovers and manages MM-YYYY/prod snapshot folders.
 * Scans a source directory for date-formatted folders and validates structure.
 * 
 * Expected pattern: MM-YYYY/prod (e.g., 09-2025/prod, 01-2024/prod)
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export interface Snapshot {
  id: string;           // e.g., "09-2025"
  label: string;        // e.g., "September 2025"
  path: string;         // Full path to the snapshot/prod directory
  date: Date;           // Parsed date for sorting
  month: number;        // Month number (1-12)
  year: number;         // Full year
  exists: boolean;      // Whether the prod subdirectory exists
  isValid: boolean;     // Whether this is a valid snapshot
}

// Month names for label generation
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Parse a folder name in MM-YYYY format
 * Returns null if format is invalid
 */
function parseSnapshotId(folderName: string): { month: number; year: number } | null {
  // Regex: exactly 2 digits, hyphen, exactly 4 digits
  const match = folderName.match(/^(\d{2})-(\d{4})$/);
  
  if (!match) {
    return null;
  }
  
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10);
  
  // Validate month range
  if (month < 1 || month > 12) {
    return null;
  }
  
  // Validate year range (reasonable bounds)
  if (year < 2020 || year > 2100) {
    return null;
  }
  
  return { month, year };
}

/**
 * Generate a human-readable label for a snapshot
 */
function generateLabel(month: number, year: number): string {
  const monthName = MONTH_NAMES[month - 1];
  return `${monthName} ${year}`;
}

/**
 * Create a Date object from month and year
 * (Sets to first day of the month for comparison)
 */
function createDate(month: number, year: number): Date {
  return new Date(year, month - 1, 1);
}

/**
 * Scan a directory for MM-YYYY snapshot folders
 * @param sourcePath - Base directory to scan
 * @returns Array of Snapshot objects, sorted by date (most recent first)
 */
export async function scanForSnapshots(sourcePath: string): Promise<Snapshot[]> {
  const snapshots: Snapshot[] = [];
  
  try {
    // Verify source path exists
    const exists = await fs.pathExists(sourcePath);
    if (!exists) {
      console.warn(`[SnapshotScanner] Source path does not exist: ${sourcePath}`);
      return [];
    }
    
    // Read directory contents
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    
    // Process each directory entry
    for (const entry of entries) {
      // Skip non-directories
      if (!entry.isDirectory()) {
        continue;
      }
      
      const folderName = entry.name;
      
      // Try to parse as MM-YYYY
      const parsed = parseSnapshotId(folderName);
      if (!parsed) {
        continue;
      }
      
      const { month, year } = parsed;
      
      // Check if prod subdirectory exists
      const prodPath = path.join(sourcePath, folderName, 'prod');
      const prodExists = await fs.pathExists(prodPath);
      
      // Create snapshot object
      const snapshot: Snapshot = {
        id: folderName,
        label: generateLabel(month, year),
        path: prodPath,
        date: createDate(month, year),
        month,
        year,
        exists: prodExists,
        isValid: prodExists // Valid only if prod subdirectory exists
      };
      
      snapshots.push(snapshot);
    }
    
    // Sort by date, most recent first
    snapshots.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    console.log(`[SnapshotScanner] Found ${snapshots.length} snapshots in ${sourcePath}`);
    console.log(`[SnapshotScanner] Valid snapshots: ${snapshots.filter(s => s.isValid).length}`);
    
    return snapshots;
  } catch (error) {
    console.error(`[SnapshotScanner] Error scanning ${sourcePath}:`, error);
    return [];
  }
}

/**
 * Get the most recent valid snapshot
 * @param sourcePath - Base directory to scan
 * @returns The most recent valid snapshot, or null if none found
 */
export async function getMostRecentSnapshot(sourcePath: string): Promise<Snapshot | null> {
  const snapshots = await scanForSnapshots(sourcePath);
  
  // Filter to only valid snapshots
  const validSnapshots = snapshots.filter(s => s.isValid);
  
  if (validSnapshots.length === 0) {
    return null;
  }
  
  // Return first (most recent due to sorting)
  return validSnapshots[0];
}

/**
 * Get a specific snapshot by ID
 * @param sourcePath - Base directory to scan
 * @param snapshotId - Snapshot ID (e.g., "09-2025")
 * @returns The snapshot if found and valid, or null
 */
export async function getSnapshotById(sourcePath: string, snapshotId: string): Promise<Snapshot | null> {
  // Validate ID format
  const parsed = parseSnapshotId(snapshotId);
  if (!parsed) {
    console.warn(`[SnapshotScanner] Invalid snapshot ID format: ${snapshotId}`);
    return null;
  }
  
  const { month, year } = parsed;
  
  // Build expected path
  const prodPath = path.join(sourcePath, snapshotId, 'prod');
  const exists = await fs.pathExists(prodPath);
  
  if (!exists) {
    console.warn(`[SnapshotScanner] Snapshot prod directory does not exist: ${prodPath}`);
    return null;
  }
  
  return {
    id: snapshotId,
    label: generateLabel(month, year),
    path: prodPath,
    date: createDate(month, year),
    month,
    year,
    exists: true,
    isValid: true
  };
}

/**
 * Validate a snapshot ID format
 * @param snapshotId - Snapshot ID to validate
 * @returns true if format is valid (MM-YYYY)
 */
export function isValidSnapshotId(snapshotId: string): boolean {
  return parseSnapshotId(snapshotId) !== null;
}

/**
 * Get snapshots within a date range
 * @param sourcePath - Base directory to scan
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of snapshots within the range, sorted by date (most recent first)
 */
export async function getSnapshotsInRange(
  sourcePath: string,
  startDate: Date,
  endDate: Date
): Promise<Snapshot[]> {
  const allSnapshots = await scanForSnapshots(sourcePath);
  
  return allSnapshots.filter(snapshot => {
    return snapshot.isValid &&
           snapshot.date >= startDate &&
           snapshot.date <= endDate;
  });
}

/**
 * Get snapshot statistics
 * @param sourcePath - Base directory to scan
 * @returns Statistics about available snapshots
 */
export async function getSnapshotStats(sourcePath: string): Promise<{
  total: number;
  valid: number;
  invalid: number;
  oldest: Snapshot | null;
  newest: Snapshot | null;
  yearCounts: Record<number, number>;
}> {
  const snapshots = await scanForSnapshots(sourcePath);
  const validSnapshots = snapshots.filter(s => s.isValid);
  const invalidSnapshots = snapshots.filter(s => !s.isValid);
  
  // Count by year
  const yearCounts: Record<number, number> = {};
  for (const snapshot of validSnapshots) {
    yearCounts[snapshot.year] = (yearCounts[snapshot.year] || 0) + 1;
  }
  
  return {
    total: snapshots.length,
    valid: validSnapshots.length,
    invalid: invalidSnapshots.length,
    oldest: validSnapshots.length > 0 ? validSnapshots[validSnapshots.length - 1] : null,
    newest: validSnapshots.length > 0 ? validSnapshots[0] : null,
    yearCounts
  };
}
