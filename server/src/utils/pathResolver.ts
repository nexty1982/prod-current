/**
 * Path Resolver Utility
 * 
 * Handles path resolution for local and remote (Samba-mounted) sources.
 * Assumes Samba shares are pre-configured in /etc/fstab and mounted at boot.
 * 
 * Remote connection: 192.168.1.221:/var/refactor-src/
 * Mount point: /mnt/refactor-remote
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const REMOTE_SAMBA_HOST = '192.168.1.221';
const REMOTE_SAMBA_PATH = '/var/refactor-src';
const REMOTE_SAMBA_FULL = `${REMOTE_SAMBA_HOST}:${REMOTE_SAMBA_PATH}`;
const MOUNT_POINT = '/mnt/refactor-remote';

export interface PathResolutionResult {
  isRemote: boolean;
  originalPath: string;
  resolvedPath: string;
  mountPoint?: string;
  isMounted: boolean;
  error?: string;
}

/**
 * Check if a path refers to the remote Samba share
 */
export function isSambaPath(inputPath: string): boolean {
  if (!inputPath) return false;
  
  // Check if path explicitly references the remote host
  if (inputPath.includes(REMOTE_SAMBA_HOST)) {
    return true;
  }
  
  // Check if path is under the mount point
  const normalized = path.resolve(inputPath);
  return normalized.startsWith(MOUNT_POINT);
}

/**
 * Get the mount point for a remote path
 */
export function getMountPoint(remotePath?: string): string {
  return MOUNT_POINT;
}

/**
 * Check if the Samba share is currently mounted
 */
export async function isMounted(): Promise<boolean> {
  try {
    // Check using 'mount' command
    const { stdout } = await execAsync('mount');
    const isMountedInSystem = stdout.includes(REMOTE_SAMBA_FULL) && stdout.includes(MOUNT_POINT);
    
    if (!isMountedInSystem) {
      return false;
    }
    
    // Verify mount point exists and is accessible
    const exists = await fs.pathExists(MOUNT_POINT);
    if (!exists) {
      return false;
    }
    
    // Try to read directory to verify it's actually mounted
    try {
      await fs.readdir(MOUNT_POINT);
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    console.error('[PathResolver] Error checking mount status:', error);
    return false;
  }
}

/**
 * Verify Samba mount is accessible
 * (Assumes fstab configuration - does not attempt to mount)
 */
export async function verifySambaMount(): Promise<{ ok: boolean; error?: string }> {
  try {
    const mounted = await isMounted();
    
    if (!mounted) {
      return {
        ok: false,
        error: `Samba share is not mounted at ${MOUNT_POINT}. Please ensure it is configured in /etc/fstab and mounted.`
      };
    }
    
    // Verify we can read the directory
    try {
      await fs.readdir(MOUNT_POINT);
    } catch (error) {
      return {
        ok: false,
        error: `Samba mount exists but is not readable: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
    
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to verify Samba mount: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Resolve a path, handling both local and remote (Samba) paths
 */
export async function resolvePath(inputPath: string, sourceType?: 'local' | 'remote'): Promise<PathResolutionResult> {
  const result: PathResolutionResult = {
    isRemote: false,
    originalPath: inputPath,
    resolvedPath: inputPath,
    isMounted: false
  };
  
  try {
    // Determine if this is a remote path
    const isRemote = sourceType === 'remote' || isSambaPath(inputPath);
    result.isRemote = isRemote;
    
    if (isRemote) {
      // Check if Samba is mounted
      const mounted = await isMounted();
      result.isMounted = mounted;
      result.mountPoint = MOUNT_POINT;
      
      if (!mounted) {
        result.error = `Samba share not mounted at ${MOUNT_POINT}`;
        return result;
      }
      
      // If input path already includes mount point, use as-is
      if (inputPath.startsWith(MOUNT_POINT)) {
        result.resolvedPath = path.resolve(inputPath);
      } else {
        // Otherwise, prepend mount point
        result.resolvedPath = path.join(MOUNT_POINT, inputPath.replace(/^\/+/, ''));
      }
    } else {
      // Local path - just resolve it
      result.resolvedPath = path.resolve(inputPath);
    }
    
    // Verify resolved path exists
    const exists = await fs.pathExists(result.resolvedPath);
    if (!exists) {
      result.error = `Path does not exist: ${result.resolvedPath}`;
    }
    
    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

/**
 * Get the base source path for a given source type
 */
export function getBaseSourcePath(sourceType: 'local' | 'remote'): string {
  if (sourceType === 'remote') {
    return MOUNT_POINT;
  }
  return '/var/www/orthodoxmetrics/prod/refactor-src';
}

/**
 * Build a snapshot path from base path and snapshot ID
 */
export function buildSnapshotPath(basePath: string, snapshotId: string): string {
  return path.join(basePath, snapshotId, 'prod');
}

/**
 * Get mount information for diagnostics
 */
export async function getMountInfo(): Promise<{
  remotePath: string;
  mountPoint: string;
  isMounted: boolean;
  isAccessible: boolean;
  error?: string;
}> {
  const mounted = await isMounted();
  let isAccessible = false;
  let error: string | undefined;
  
  if (mounted) {
    try {
      await fs.readdir(MOUNT_POINT);
      isAccessible = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    }
  }
  
  return {
    remotePath: REMOTE_SAMBA_FULL,
    mountPoint: MOUNT_POINT,
    isMounted: mounted,
    isAccessible,
    error
  };
}

/**
 * Export configuration constants for use in other modules
 */
export const CONFIG = {
  REMOTE_SAMBA_HOST,
  REMOTE_SAMBA_PATH,
  REMOTE_SAMBA_FULL,
  MOUNT_POINT
};
