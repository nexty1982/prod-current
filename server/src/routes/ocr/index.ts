/**
 * OCR Routes Aggregator
 * Mounts all extracted OCR sub-routers onto the Express app.
 *
 * Usage in main index.ts:
 *   const { mountOcrRoutes } = require('./routes/ocr');
 *   mountOcrRoutes(app, upload);
 */
const express = require('express');

export function mountOcrRoutes(app: any, upload: any) {
  // -------------------------------------------------------------------------
  // 1. Admin OCR Monitor (mounted at /api — routes include /admin/ocr/... paths)
  // -------------------------------------------------------------------------
  const adminMonitorRouter = require('./adminMonitor');
  app.use('/api', adminMonitorRouter);

  // -------------------------------------------------------------------------
  // 2. Church-scoped OCR settings
  // -------------------------------------------------------------------------
  const settingsRouter = require('./settings');
  app.use('/api/church/:churchId/ocr', settingsRouter);

  // -------------------------------------------------------------------------
  // 3. Church-scoped OCR setup wizard
  // -------------------------------------------------------------------------
  const setupWizardRouter = require('./setupWizard');
  app.use('/api/church/:churchId/ocr', setupWizardRouter);

  // -------------------------------------------------------------------------
  // 4. Church-scoped & platform-scoped OCR jobs
  // -------------------------------------------------------------------------
  const createJobRouters = require('./jobs');
  const { churchJobsRouter, platformJobsRouter } = createJobRouters(upload);
  app.use('/api/church/:churchId/ocr', churchJobsRouter);
  app.use('/api/ocr', platformJobsRouter);

  // -------------------------------------------------------------------------
  // 5. OCR mapping (platform DB)
  // -------------------------------------------------------------------------
  const mappingRouter = require('./mapping');
  app.use('/api/church/:churchId/ocr', mappingRouter);

  // -------------------------------------------------------------------------
  // 6. OCR fusion workflow
  // -------------------------------------------------------------------------
  const fusionRouter = require('./fusion');
  app.use('/api/church/:churchId/ocr', fusionRouter);

  // -------------------------------------------------------------------------
  // 7. OCR review & commit
  // -------------------------------------------------------------------------
  const reviewRouter = require('./review');
  app.use('/api/church/:churchId/ocr', reviewRouter);

  console.log('✅ [OCR] All OCR routes mounted (admin + 6 church-scoped modules)');
}

// Re-export processOcrJobAsync from legacy module for feeder worker compatibility
const ocrLegacy = require('../ocrLegacy');
export const processOcrJobAsync = ocrLegacy.processOcrJobAsync;
