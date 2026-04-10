/**
 * Church OCR Statistics Routes
 * Lightweight aggregate counts for the church admin dashboard widget.
 * Mounted at /api/church/:churchId/ocr/stats
 */
const express = require('express');
const router = express.Router({ mergeParams: true });
import { promisePool, resolveChurchDb } from './helpers';

// GET /api/church/:churchId/ocr/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const churchId = parseInt(req.params.churchId);
    if (!Number.isFinite(churchId)) {
      return res.status(400).json({ error: 'Invalid churchId' });
    }

    // Resolve church DB for fused-draft counts
    const resolved = await resolveChurchDb(churchId);
    if (!resolved) return res.status(404).json({ error: 'Church not found' });
    const { db } = resolved;

    // 1. Total OCR jobs successfully processed for this church (platform DB)
    const [totalRows] = await promisePool.query(
      `SELECT COUNT(*) AS n
         FROM ocr_jobs
        WHERE church_id = ?
          AND status IN ('completed', 'complete')`,
      [churchId]
    );
    const totalDigitized = Number(totalRows?.[0]?.n || 0);

    // 2. Pages processed in the current calendar month (platform DB)
    const [monthRows] = await promisePool.query(
      `SELECT COUNT(*) AS n
         FROM ocr_jobs
        WHERE church_id = ?
          AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
          AND created_at <  DATE_FORMAT(NOW() + INTERVAL 1 MONTH, '%Y-%m-01')`,
      [churchId]
    );
    const pagesThisMonth = Number(monthRows?.[0]?.n || 0);

    // 3. Records pending review (church DB — fused drafts not yet committed)
    let pendingReview = 0;
    try {
      const [pendingRows] = await db.query(
        `SELECT COUNT(*) AS n
           FROM ocr_fused_drafts
          WHERE workflow_status IN ('draft', 'in_review')`
      );
      pendingReview = Number(pendingRows?.[0]?.n || 0);
    } catch (e: any) {
      // ocr_fused_drafts may not exist on older church DBs — treat as 0
      console.warn(`[OCR Stats] ocr_fused_drafts query skipped: ${e.message}`);
    }

    // Human-readable month label, e.g. "April 2026"
    const now = new Date();
    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    res.json({
      totalDigitized,
      pagesThisMonth,
      pendingReview,
      monthLabel,
    });
  } catch (error: any) {
    console.error('[OCR Stats] Error:', error);
    res.status(500).json({ error: 'Failed to load OCR stats', message: error.message });
  }
});

module.exports = router;
