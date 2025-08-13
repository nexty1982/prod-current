/**
 * Dashboard API Routes for Sacrament Records
 */

import { Router, Request, Response } from 'express';
import { getAppPool } from '../../../config/db';
import { RowDataPacket } from 'mysql2';

const router = Router();

/**
 * GET /api/records/dashboard
 * Get dashboard statistics and recent activity
 */
router.get('/api/records/dashboard', async (req: any, res: Response) => {
  try {
    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const pool = await getAppPool();

    // Get total counts per type
    const [baptismCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM baptism_records WHERE church_id = ?',
      [churchId]
    ) as [RowDataPacket[], any];

    const [marriageCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM marriage_records WHERE church_id = ?',
      [churchId]
    ) as [RowDataPacket[], any];

    const [funeralCount] = await pool.execute(
      'SELECT COUNT(*) as total FROM funeral_records WHERE church_id = ?',
      [churchId]
    ) as [RowDataPacket[], any];

    // Get last 30 days trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [baptismTrend] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM baptism_records 
       WHERE church_id = ? AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [churchId, thirtyDaysAgoStr]
    ) as [RowDataPacket[], any];

    const [marriageTrend] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM marriage_records 
       WHERE church_id = ? AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [churchId, thirtyDaysAgoStr]
    ) as [RowDataPacket[], any];

    const [funeralTrend] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM funeral_records 
       WHERE church_id = ? AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [churchId, thirtyDaysAgoStr]
    ) as [RowDataPacket[], any];

    // Get recent imports
    const [recentImports] = await pool.execute(
      `SELECT id, type, format, filename, status, total_rows, 
              processed_rows, inserted_rows, updated_rows, 
              error_rows, created_at, finished_at
       FROM import_jobs 
       WHERE church_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [churchId]
    ) as [RowDataPacket[], any];

    // Get duplicate statistics (records with same certificate numbers)
    const [baptismDupes] = await pool.execute(
      `SELECT certificate_no, COUNT(*) as count 
       FROM baptism_records 
       WHERE church_id = ? AND certificate_no IS NOT NULL
       GROUP BY certificate_no 
       HAVING COUNT(*) > 1
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    const [marriageDupes] = await pool.execute(
      `SELECT certificate_no, COUNT(*) as count 
       FROM marriage_records 
       WHERE church_id = ? AND certificate_no IS NOT NULL
       GROUP BY certificate_no 
       HAVING COUNT(*) > 1
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    const [funeralDupes] = await pool.execute(
      `SELECT certificate_no, COUNT(*) as count 
       FROM funeral_records 
       WHERE church_id = ? AND certificate_no IS NOT NULL
       GROUP BY certificate_no 
       HAVING COUNT(*) > 1
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    // Get recent records
    const [recentBaptisms] = await pool.execute(
      `SELECT id, first_name, last_name, baptism_date, created_at 
       FROM baptism_records 
       WHERE church_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    const [recentMarriages] = await pool.execute(
      `SELECT id, groom_first_name, groom_last_name, 
              bride_first_name, bride_last_name, 
              marriage_date, created_at 
       FROM marriage_records 
       WHERE church_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    const [recentFunerals] = await pool.execute(
      `SELECT id, first_name, last_name, funeral_date, created_at 
       FROM funeral_records 
       WHERE church_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [churchId]
    ) as [RowDataPacket[], any];

    // Calculate year-over-year statistics
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const [currentYearStats] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM baptism_records WHERE church_id = ? AND YEAR(created_at) = ?) as baptisms_current,
        (SELECT COUNT(*) FROM marriage_records WHERE church_id = ? AND YEAR(created_at) = ?) as marriages_current,
        (SELECT COUNT(*) FROM funeral_records WHERE church_id = ? AND YEAR(created_at) = ?) as funerals_current,
        (SELECT COUNT(*) FROM baptism_records WHERE church_id = ? AND YEAR(created_at) = ?) as baptisms_last,
        (SELECT COUNT(*) FROM marriage_records WHERE church_id = ? AND YEAR(created_at) = ?) as marriages_last,
        (SELECT COUNT(*) FROM funeral_records WHERE church_id = ? AND YEAR(created_at) = ?) as funerals_last`,
      [
        churchId, currentYear, churchId, currentYear, churchId, currentYear,
        churchId, lastYear, churchId, lastYear, churchId, lastYear
      ]
    ) as [RowDataPacket[], any];

    const stats = currentYearStats[0];
    const yearOverYear = {
      baptisms: {
        current: stats.baptisms_current,
        last: stats.baptisms_last,
        change: stats.baptisms_last > 0 ? 
          ((stats.baptisms_current - stats.baptisms_last) / stats.baptisms_last * 100).toFixed(1) : 
          null
      },
      marriages: {
        current: stats.marriages_current,
        last: stats.marriages_last,
        change: stats.marriages_last > 0 ? 
          ((stats.marriages_current - stats.marriages_last) / stats.marriages_last * 100).toFixed(1) : 
          null
      },
      funerals: {
        current: stats.funerals_current,
        last: stats.funerals_last,
        change: stats.funerals_last > 0 ? 
          ((stats.funerals_current - stats.funerals_last) / stats.funerals_last * 100).toFixed(1) : 
          null
      }
    };

    res.json({
      success: true,
      counts: {
        baptisms: baptismCount[0].total,
        marriages: marriageCount[0].total,
        funerals: funeralCount[0].total,
        total: baptismCount[0].total + marriageCount[0].total + funeralCount[0].total
      },
      trends: {
        baptisms: baptismTrend,
        marriages: marriageTrend,
        funerals: funeralTrend
      },
      recentImports,
      duplicates: {
        baptisms: baptismDupes,
        marriages: marriageDupes,
        funerals: funeralDupes
      },
      recentRecords: {
        baptisms: recentBaptisms,
        marriages: recentMarriages,
        funerals: recentFunerals
      },
      yearOverYear
    });

  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/records/dashboard/summary
 * Get quick summary statistics
 */
router.get('/api/records/dashboard/summary', async (req: any, res: Response) => {
  try {
    const churchId = req.tenantId || req.user?.church_id;
    if (!churchId) {
      return res.status(403).json({ error: 'Church context required' });
    }

    const pool = await getAppPool();

    // Get counts and last updated dates
    const [summary] = await pool.execute(
      `SELECT 
        (SELECT COUNT(*) FROM baptism_records WHERE church_id = ?) as baptisms_count,
        (SELECT MAX(updated_at) FROM baptism_records WHERE church_id = ?) as baptisms_updated,
        (SELECT COUNT(*) FROM marriage_records WHERE church_id = ?) as marriages_count,
        (SELECT MAX(updated_at) FROM marriage_records WHERE church_id = ?) as marriages_updated,
        (SELECT COUNT(*) FROM funeral_records WHERE church_id = ?) as funerals_count,
        (SELECT MAX(updated_at) FROM funeral_records WHERE church_id = ?) as funerals_updated,
        (SELECT COUNT(*) FROM import_jobs WHERE church_id = ? AND status = 'done') as successful_imports,
        (SELECT COUNT(*) FROM import_jobs WHERE church_id = ? AND status = 'error') as failed_imports`,
      [churchId, churchId, churchId, churchId, churchId, churchId, churchId, churchId]
    ) as [RowDataPacket[], any];

    res.json({
      success: true,
      summary: summary[0]
    });

  } catch (error: any) {
    console.error('Summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch summary' });
  }
});

export default router;
