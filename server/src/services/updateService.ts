/**
 * Update Service
 * Manages system updates for frontend and backend
 * 
 * Features:
 * - Git-based version detection
 * - Safe update execution with job queue
 * - Lock file to prevent concurrent updates
 * - Comprehensive logging
 */

import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

const ROOT_DIR = '/var/www/orthodoxmetrics/prod';
const LOCK_FILE = '/tmp/om-update.lock';
const LOGS_DIR = path.join(ROOT_DIR, 'server', 'logs', 'updates');

// Ensure logs directory exists
fs.ensureDirSync(LOGS_DIR);

export interface BuildInfo {
  gitSha: string;
  branch: string;
  buildTime: string;
  version: string;
  isClean: boolean;
}

export interface UpdateStatus {
  updatesAvailable: boolean;
  frontend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  backend: {
    available: boolean;
    currentSha: string;
    remoteSha: string;
    behind: number;
  };
  lastCheckedAt: string;
}

export interface UpdateJob {
  id: string;
  target: 'frontend' | 'backend' | 'all';
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  logs: string[];
  startedAt?: string;
  endedAt?: string;
  error?: string;
  userId: string;
}

// In-memory job storage
const jobs = new Map<string, UpdateJob>();

// Cache for update status (5 minutes)
let updateStatusCache: { data: UpdateStatus; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get current git information
 */
export async function getBuildInfo(): Promise<BuildInfo> {
  try {
    // Get current commit SHA
    const { stdout: sha } = await execAsync('git rev-parse HEAD', { cwd: ROOT_DIR });
    const gitSha = sha.trim().substring(0, 8); // Short SHA

    // Get current branch
    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: ROOT_DIR });
    
    // Check if working directory is clean
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: ROOT_DIR });
    const isClean = status.trim() === '';

    // Get backend version from package.json
    const packagePath = path.join(ROOT_DIR, 'server', 'package.json');
    const packageJson = await fs.readJSON(packagePath);

    // Get build time from dist folder modification time (or current time)
    const distPath = path.join(ROOT_DIR, 'server', 'dist');
    let buildTime = new Date().toISOString();
    try {
      const distStats = await fs.stat(distPath);
      buildTime = distStats.mtime.toISOString();
    } catch {
      // dist folder doesn't exist, use current time
    }

    return {
      gitSha,
      branch: branch.trim(),
      buildTime,
      version: packageJson.version,
      isClean,
    };
  } catch (error) {
    console.error('Error getting build info:', error);
    throw new Error(`Failed to get build info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check for available updates
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  // Return cached result if still valid
  if (updateStatusCache && (Date.now() - updateStatusCache.timestamp < CACHE_TTL)) {
    return updateStatusCache.data;
  }

  try {
    // Fetch latest from remote
    await execAsync('git fetch --all --quiet', { cwd: ROOT_DIR });

    // Get current branch
    const { stdout: branchOutput } = await execAsync('git branch --show-current', { cwd: ROOT_DIR });
    const branch = branchOutput.trim();

    // Get local HEAD SHA
    const { stdout: localSha } = await execAsync('git rev-parse HEAD', { cwd: ROOT_DIR });
    const currentSha = localSha.trim().substring(0, 8);

    // Get remote HEAD SHA
    const { stdout: remoteSha } = await execAsync(`git rev-parse origin/${branch}`, { cwd: ROOT_DIR });
    const remoteShaShort = remoteSha.trim().substring(0, 8);

    // Count commits behind
    let behind = 0;
    try {
      const { stdout: behindOutput } = await execAsync(
        `git rev-list --count HEAD..origin/${branch}`,
        { cwd: ROOT_DIR }
      );
      behind = parseInt(behindOutput.trim(), 10) || 0;
    } catch {
      // Branch might not have upstream, treat as 0
      behind = 0;
    }

    const updatesAvailable = behind > 0;

    // For monorepo: both frontend and backend share same git state
    const result: UpdateStatus = {
      updatesAvailable,
      frontend: {
        available: updatesAvailable,
        currentSha,
        remoteSha: remoteShaShort,
        behind,
      },
      backend: {
        available: updatesAvailable,
        currentSha,
        remoteSha: remoteShaShort,
        behind,
      },
      lastCheckedAt: new Date().toISOString(),
    };

    // Cache the result
    updateStatusCache = {
      data: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error('Error checking for updates:', error);
    throw new Error(`Failed to check for updates: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if update lock exists
 */
export async function isUpdateLocked(): Promise<boolean> {
  try {
    await fs.access(LOCK_FILE);
    // Check if lock is stale (older than 2 hours)
    const stats = await fs.stat(LOCK_FILE);
    const ageMs = Date.now() - stats.mtimeMs;
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    
    if (ageMs > TWO_HOURS) {
      console.warn('Stale lock file detected, removing...');
      await fs.remove(LOCK_FILE);
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Create update lock
 */
export async function createUpdateLock(jobId: string): Promise<void> {
  await fs.writeFile(LOCK_FILE, `${jobId}\n${new Date().toISOString()}`);
}

/**
 * Remove update lock
 */
export async function removeUpdateLock(): Promise<void> {
  try {
    await fs.remove(LOCK_FILE);
  } catch (error) {
    console.warn('Failed to remove lock file:', error);
  }
}

/**
 * Generate unique job ID
 */
function generateJobId(): string {
  return `update-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Add log entry to job
 */
function addJobLog(jobId: string, message: string): void {
  const job = jobs.get(jobId);
  if (job) {
    job.logs.push(`[${new Date().toISOString()}] ${message}`);
    
    // Also append to log file
    const logFile = path.join(LOGS_DIR, `${jobId}.log`);
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${message}\n`);
  }
}

/**
 * Execute update job
 */
async function executeUpdateJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  try {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    addJobLog(jobId, `🚀 Starting ${job.target} update...`);

    // Create lock
    await createUpdateLock(jobId);
    addJobLog(jobId, '🔒 Lock acquired');

    // Invalidate cache
    updateStatusCache = null;

    // Run om-deploy.sh script
    const deployScript = path.join(ROOT_DIR, 'scripts', 'om-deploy.sh');
    addJobLog(jobId, `📝 Running: ${deployScript} ${job.target}`);

    const { stdout, stderr } = await execAsync(`bash ${deployScript} ${job.target}`, {
      cwd: ROOT_DIR,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for logs
    });

    // Log output
    if (stdout) {
      stdout.split('\n').forEach(line => {
        if (line.trim()) addJobLog(jobId, line);
      });
    }
    if (stderr) {
      stderr.split('\n').forEach(line => {
        if (line.trim()) addJobLog(jobId, `⚠️  ${line}`);
      });
    }

    job.status = 'success';
    job.endedAt = new Date().toISOString();
    addJobLog(jobId, '✅ Update completed successfully');
    
    // Verify backend is healthy (if backend was updated)
    if (job.target === 'backend' || job.target === 'all') {
      addJobLog(jobId, '🏥 Checking backend health...');
      try {
        await execAsync('curl -fsSL http://127.0.0.1:3001/api/health', { timeout: 30000 });
        addJobLog(jobId, '✅ Backend health check passed');
      } catch (error) {
        addJobLog(jobId, '⚠️  Backend health check failed, but deployment may still be OK');
      }
    }
  } catch (error) {
    job.status = 'failed';
    job.endedAt = new Date().toISOString();
    job.error = error instanceof Error ? error.message : String(error);
    addJobLog(jobId, `❌ Update failed: ${job.error}`);
    
    // Log full error details
    if (error instanceof Error && error.stack) {
      addJobLog(jobId, `Stack trace: ${error.stack}`);
    }
  } finally {
    // Remove lock
    await removeUpdateLock();
    addJobLog(jobId, '🔓 Lock released');
  }
}

/**
 * Start an update job
 */
export async function startUpdateJob(
  target: 'frontend' | 'backend' | 'all',
  userId: string
): Promise<string> {
  // Check if another update is running
  if (await isUpdateLocked()) {
    throw new Error('Another update is already in progress');
  }

  // Create job
  const jobId = generateJobId();
  const job: UpdateJob = {
    id: jobId,
    target,
    status: 'queued',
    logs: [],
    userId,
  };

  jobs.set(jobId, job);

  // Create log file
  const logFile = path.join(LOGS_DIR, `${jobId}.log`);
  await fs.writeFile(logFile, `Update Job: ${jobId}\nTarget: ${target}\nUser: ${userId}\n\n`);

  // Start execution asynchronously
  executeUpdateJob(jobId).catch(error => {
    console.error('Update job execution error:', error);
  });

  return jobId;
}

/**
 * Get job status
 */
export function getJob(jobId: string): UpdateJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Get all jobs (for admin)
 */
export function getAllJobs(): UpdateJob[] {
  return Array.from(jobs.values()).sort((a, b) => {
    const aTime = a.startedAt || '';
    const bTime = b.startedAt || '';
    return bTime.localeCompare(aTime);
  });
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status === 'running') {
    job.status = 'cancelled';
    job.endedAt = new Date().toISOString();
    addJobLog(jobId, '🛑 Job cancelled by user');
    
    // Note: We can't actually kill the running script safely, so this is more of a flag
    // The script will complete but the job will be marked as cancelled
  }
}

export default {
  getBuildInfo,
  checkForUpdates,
  isUpdateLocked,
  startUpdateJob,
  getJob,
  getAllJobs,
  cancelJob,
};
