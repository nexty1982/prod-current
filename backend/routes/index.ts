/**
 * Routes Index
 * Central export for all API routes
 */

import express from 'express';
import interactiveReportsRouter from './interactiveReports';

const router = express.Router();

// Mount interactive reports routes
router.use('/records/interactive-reports', interactiveReportsRouter);
router.use('/r/interactive', interactiveReportsRouter);

export default router;
