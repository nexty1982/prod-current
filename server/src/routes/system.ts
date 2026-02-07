/**
 * System Update Routes
 * Provides endpoints for version detection and update execution
 * 
 * Endpoints:
 * - GET /api/system/build-info - Get current build information
 * - GET /api/system/update-status - Check for available updates
 * - POST /api/system/update/run - Start an update job
 * - GET /api/system/update/jobs/:jobId - Get job status and logs
 * - GET /api/system/update/jobs - Get all jobs (admin)
 * - POST /api/system/update/jobs/:jobId/cancel - Cancel a running job
 */

import express, { Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth';
import * as UpdateService from '../services/updateService';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/system/build-info
 * Returns current build information
 * Accessible to authenticated users
 */
router.get('/build-info', async (req: Request, res: Response) => {
  try {
    const buildInfo = await UpdateService.getBuildInfo();
    
    return res.json({
      success: true,
      buildInfo: {
        backend: buildInfo,
        frontend: {
          // Frontend shares same git SHA in monorepo
          gitSha: buildInfo.gitSha,
          branch: buildInfo.branch,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting build info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get build info',
      message: error.message,
    });
  }
});

/**
 * GET /api/system/update-status
 * Checks for available updates
 * Super admin only
 */
router.get('/update-status', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const updateStatus = await UpdateService.checkForUpdates();
    
    return res.json({
      success: true,
      ...updateStatus,
    });
  } catch (error: any) {
    console.error('Error checking for updates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check for updates',
      message: error.message,
    });
  }
});

/**
 * POST /api/system/update/run
 * Starts an update job
 * Super admin only
 * 
 * Body: { target: 'frontend' | 'backend' | 'all' }
 */
router.post('/update/run', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    
    // Validate target
    if (!target || !['frontend', 'backend', 'all'].includes(target)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target. Must be "frontend", "backend", or "all"',
      });
    }

    // Check if update is already running
    if (await UpdateService.isUpdateLocked()) {
      return res.status(409).json({
        success: false,
        error: 'Another update is already in progress',
        code: 'UPDATE_IN_PROGRESS',
      });
    }

    // Get user info
    const user = (req as any).session?.user;
    const userId = user?.email || user?.username || 'unknown';

    // Start update job
    const jobId = await UpdateService.startUpdateJob(target, userId);

    return res.json({
      success: true,
      message: 'Update job started',
      jobId,
    });
  } catch (error: any) {
    console.error('Error starting update:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start update',
      message: error.message,
    });
  }
});

/**
 * GET /api/system/update/jobs/:jobId
 * Gets job status and logs
 * Super admin only
 */
router.get('/update/jobs/:jobId', requireRole(['super_admin']), (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const job = UpdateService.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    return res.json({
      success: true,
      job,
    });
  } catch (error: any) {
    console.error('Error getting job:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get job',
      message: error.message,
    });
  }
});

/**
 * GET /api/system/update/jobs
 * Gets all jobs
 * Super admin only
 */
router.get('/update/jobs', requireRole(['super_admin']), (req: Request, res: Response) => {
  try {
    const jobs = UpdateService.getAllJobs();
    
    return res.json({
      success: true,
      jobs,
      count: jobs.length,
    });
  } catch (error: any) {
    console.error('Error getting jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get jobs',
      message: error.message,
    });
  }
});

/**
 * POST /api/system/update/jobs/:jobId/cancel
 * Cancels a running job
 * Super admin only
 */
router.post('/update/jobs/:jobId/cancel', requireRole(['super_admin']), async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    await UpdateService.cancelJob(jobId);
    
    return res.json({
      success: true,
      message: 'Job cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling job:', error);
    
    if (error.message === 'Job not found') {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel job',
      message: error.message,
    });
  }
});

// CommonJS export for compatibility
module.exports = router;
