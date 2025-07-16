/**
 * OCR Admin Test Routes
 * API routes for OCR system testing functionality
 */

const express = require('express');
const router = express.Router();
const OcrAdminTestController = require('../controllers/OcrAdminTestController');

const testController = new OcrAdminTestController();

// Apply superadmin validation to all test routes
router.use(testController.validateSuperAdmin.bind(testController));

// Basic Tests
router.post('/database-connection', testController.testDatabaseConnection.bind(testController));
router.post('/ocr-schema', testController.testOcrSchema.bind(testController));
router.post('/google-vision', testController.testGoogleVision.bind(testController));

// Advanced Tests
router.post('/ocr-queue', testController.testOcrQueue.bind(testController));
router.post('/entity-extraction', testController.testEntityExtraction.bind(testController));
router.post('/cross-database', testController.testCrossDatabase.bind(testController));
router.post('/translation', testController.testTranslation.bind(testController));

// Full Integration Tests (placeholders for future implementation)
router.post('/e2e-upload', async (req, res) => {
  res.json({
    success: false,
    message: 'End-to-end upload test not yet implemented',
    details: { status: 'coming_soon' }
  });
});

router.post('/field-mapping', async (req, res) => {
  res.json({
    success: false,
    message: 'Field mapping test not yet implemented - Phase 1 feature',
    details: { status: 'phase_1' }
  });
});

router.post('/record-transfer', async (req, res) => {
  res.json({
    success: false,
    message: 'Record transfer test not yet implemented - Phase 1 feature',
    details: { status: 'phase_1' }
  });
});

router.post('/permissions', async (req, res) => {
  res.json({
    success: false,
    message: 'Permissions test not yet implemented',
    details: { status: 'coming_soon' }
  });
});

router.post('/performance', async (req, res) => {
  res.json({
    success: false,
    message: 'Performance test not yet implemented',
    details: { status: 'coming_soon' }
  });
});

// Utility Actions
router.post('/retry-failed-jobs', testController.retryFailedJobs.bind(testController));

module.exports = router;
