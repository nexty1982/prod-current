// routes/church/ocr.js
const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent route
const controller = require('../../controllers/churchOcrController');

// Middleware to ensure church-level authentication (add your auth middleware here)
// const requireAuth = require('../../middleware/auth');
// const requireChurchAccess = require('../../middleware/churchAccess');
// router.use(requireAuth);
// router.use(requireChurchAccess);

/**
 * POST /api/church/:id/ocr/upload
 * Upload image for OCR processing
 * Body: multipart/form-data with 'image' file and metadata
 */
router.post('/upload', controller.uploadImage);

/**
 * GET /api/church/:id/ocr/jobs
 * Get paginated list of OCR jobs for the church
 * Query params: page, limit, status, recordType, language, dateFrom, dateTo
 */
router.get('/jobs', controller.getOcrJobs);

/**
 * GET /api/church/:id/ocr/result/:jobId
 * Get specific OCR job result with full details
 */
router.get('/result/:jobId', controller.getOcrResult);

/**
 * GET /api/church/:id/ocr/jobs/:jobId/details
 * Get specific OCR job details including extracted text and entities
 */
router.get('/jobs/:jobId/details', controller.getOcrJobDetails);

/**
 * GET /api/church/:id/ocr/jobs/:jobId/image
 * Get the original image file for an OCR job
 */
router.get('/jobs/:jobId/image', controller.getOcrJobImage);

/**
 * POST /api/church/:id/ocr/jobs/:jobId/update
 * Update OCR job extracted fields
 */
router.post('/jobs/:jobId/update', controller.updateOcrJobFields);

/**
 * GET /api/church/:id/ocr/jobs/:jobId/export
 * Export OCR job results as JSON
 */
router.get('/jobs/:jobId/export', controller.exportOcrJobResults);

/**
 * POST /api/church/:id/ocr/parse-enhanced
 * Enhanced OCR parsing with preprocessing options
 */
router.post('/parse-enhanced', controller.parseEnhanced);

/**
 * POST /api/church/:id/ocr/extract-fields
 * Extract structured fields from OCR results
 */
router.post('/extract-fields', controller.extractFields);

/**
 * POST /api/church/:id/ocr/save-wizard
 * Save results from the OCR wizard
 */
router.post('/save-wizard', controller.saveWizardResults);

module.exports = router;
