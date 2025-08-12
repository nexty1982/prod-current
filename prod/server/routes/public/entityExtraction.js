// routes/public/entityExtraction.js
const express = require('express');
const router = express.Router();
const entityExtractionController = require('../../controllers/entityExtractionController');

/**
 * Entity Extraction API Routes
 * Entity extraction routes
 */

// Get extracted entities for a specific job
router.get('/jobs/:jobId/entities', entityExtractionController.getJobEntities);

// Update extracted entities with user corrections
router.put('/jobs/:jobId/entities', entityExtractionController.updateJobEntities);

// Manually trigger entity extraction for a job
router.post('/jobs/:jobId/extract', entityExtractionController.extractJobEntities);

// Get extraction statistics for the church
router.get('/extraction/stats', entityExtractionController.getExtractionStats);

// Get jobs that need review
router.get('/extraction/review', entityExtractionController.getJobsNeedingReview);

// Bulk entity extraction for multiple jobs
router.post('/extraction/bulk', entityExtractionController.bulkExtractEntities);

module.exports = router;
