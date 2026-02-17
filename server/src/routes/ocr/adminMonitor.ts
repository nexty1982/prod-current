/**
 * OCR Admin Monitor Routes
 * Admin-only endpoints for monitoring and managing OCR jobs across all churches.
 * Extracted from index.ts lines ~940-1010.
 */
const express = require('express');
const router = express.Router();
const { requireRole } = require('../../utils/roles');
const ocrMonitor = require('../../controllers/ocrAdminMonitorController');
const ocrTable = require('../../controllers/ocrTableExtractorController');
const ocrLayout = require('../../controllers/ocrLayoutTemplateController');

// Admin OCR Monitor routes (super_admin only)
router.get('/admin/ocr/jobs', requireRole('super_admin'), ocrMonitor.listAllJobs);
router.get('/admin/ocr/jobs/:churchId/:jobId', requireRole('super_admin'), ocrMonitor.getJobDetail);
router.post('/admin/ocr/jobs/bulk', requireRole('super_admin'), ocrMonitor.bulkAction);
router.post('/admin/ocr/jobs/clear-processed', requireRole('super_admin'), ocrMonitor.clearProcessed);
router.post('/admin/ocr/jobs/cleanup-stale', requireRole('super_admin'), ocrMonitor.cleanupStale);
router.post('/admin/ocr/jobs/:churchId/:jobId/kill', requireRole('super_admin'), ocrMonitor.killJob);
router.post('/admin/ocr/jobs/:churchId/:jobId/reprocess', requireRole('super_admin'), ocrMonitor.reprocessJob);
router.post('/admin/ocr/jobs/:churchId/:jobId/clear', requireRole('super_admin'), ocrMonitor.clearJob);

// OCR Table Extractor (Marriage Ledger v1)
router.get('/admin/ocr/table-jobs', requireRole('super_admin'), ocrTable.listTableJobs);
router.get('/admin/ocr/table-jobs/:jobId', requireRole('super_admin'), ocrTable.getTableResult);
router.post('/admin/ocr/table-jobs/:jobId/extract', requireRole('super_admin'), ocrTable.runExtraction);
router.get('/admin/ocr/table-jobs/:jobId/artifacts/:filename', requireRole('super_admin'), ocrTable.downloadArtifact);

// Layout Template CRUD + Preview
router.get('/admin/ocr/layout-templates', requireRole('super_admin'), ocrLayout.listTemplates);
router.get('/admin/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.getTemplate);
router.post('/admin/ocr/layout-templates', requireRole('super_admin'), ocrLayout.createTemplate);
router.put('/admin/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.updateTemplate);
router.delete('/admin/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.deleteTemplate);
router.post('/admin/ocr/layout-templates/preview-inline', requireRole('super_admin'), ocrLayout.previewInline);
router.post('/admin/ocr/layout-templates/:id/preview', requireRole('super_admin'), ocrLayout.previewExtraction);
router.get('/admin/ocr/layout-templates/:id/learning-stats', requireRole('super_admin'), ocrLayout.learningStats);

// Admin endpoint: normalize tenant OCR schema
router.post('/admin/ocr/normalize-schema/:churchId', requireRole('super_admin'), async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'churchId is required' });
    const { normalizeTenantOcrSchema } = require('../../config/db');
    const result = await normalizeTenantOcrSchema(churchId);
    console.log(`[OCR Admin] Schema normalization for church ${churchId}: ${JSON.stringify(result)}`);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[OCR Admin] Schema normalization error:', error);
    res.status(500).json({ error: 'Failed to normalize schema', message: error.message });
  }
});

// Canonical /api/ocr/* aliases — same handlers, same auth
router.get('/ocr/monitor/jobs', requireRole('super_admin'), ocrMonitor.listAllJobs);
router.get('/ocr/monitor/jobs/:churchId/:jobId', requireRole('super_admin'), ocrMonitor.getJobDetail);
router.post('/ocr/monitor/jobs/bulk', requireRole('super_admin'), ocrMonitor.bulkAction);
router.post('/ocr/monitor/jobs/clear-processed', requireRole('super_admin'), ocrMonitor.clearProcessed);
router.post('/ocr/monitor/jobs/cleanup-stale', requireRole('super_admin'), ocrMonitor.cleanupStale);
router.post('/ocr/monitor/jobs/:churchId/:jobId/kill', requireRole('super_admin'), ocrMonitor.killJob);
router.post('/ocr/monitor/jobs/:churchId/:jobId/reprocess', requireRole('super_admin'), ocrMonitor.reprocessJob);
router.post('/ocr/monitor/jobs/:churchId/:jobId/clear', requireRole('super_admin'), ocrMonitor.clearJob);

router.get('/ocr/layout-templates', requireRole('super_admin'), ocrLayout.listTemplates);
router.get('/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.getTemplate);
router.post('/ocr/layout-templates', requireRole('super_admin'), ocrLayout.createTemplate);
router.put('/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.updateTemplate);
router.delete('/ocr/layout-templates/:id', requireRole('super_admin'), ocrLayout.deleteTemplate);
router.post('/ocr/layout-templates/preview-inline', requireRole('super_admin'), ocrLayout.previewInline);
router.post('/ocr/layout-templates/:id/preview', requireRole('super_admin'), ocrLayout.previewExtraction);
router.get('/ocr/layout-templates/:id/learning-stats', requireRole('super_admin'), ocrLayout.learningStats);

router.get('/ocr/table-jobs', requireRole('super_admin'), ocrTable.listTableJobs);
router.get('/ocr/table-jobs/:jobId', requireRole('super_admin'), ocrTable.getTableResult);
router.post('/ocr/table-jobs/:jobId/extract', requireRole('super_admin'), ocrTable.runExtraction);
router.get('/ocr/table-jobs/:jobId/artifacts/:filename', requireRole('super_admin'), ocrTable.downloadArtifact);

router.post('/ocr/normalize-schema/:churchId', requireRole('super_admin'), async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (!churchId) return res.status(400).json({ error: 'churchId is required' });
    const { normalizeTenantOcrSchema } = require('../../config/db');
    const result = await normalizeTenantOcrSchema(churchId);
    console.log(`[OCR Admin] Schema normalization for church ${churchId}: ${JSON.stringify(result)}`);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[OCR Admin] Schema normalization error:', error);
    res.status(500).json({ error: 'Failed to normalize schema', message: error.message });
  }
});

// Start the stale job sweeper (every 30s, timeout 90s)
ocrMonitor.startStaleSweeper(30000, 90);

console.log('✅ [OCR Monitor] Admin OCR monitor routes registered (8 + 13 canonical aliases)');

module.exports = router;
export {};
