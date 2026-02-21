/**
 * Dashboard Home API
 * Provides summary data for the church dashboard home page
 *
 * Endpoint: GET /api/churches/:churchId/dashboard
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { getTenantPool } = require('../config/db');
const { detectColumns } = require('../utils/detectColumns');

/**
 * GET /
 * Returns dashboard summary: counts, recent activity, type distribution,
 * monthly activity, year-over-year, completeness, date range
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const churchId = req.params.churchId;
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Church ID is required' });
    }

    const pool = getTenantPool(churchId);
    const cols = await detectColumns(pool);

    // --- 1. Record counts ---
    const [countRows] = await pool.query(`
      SELECT 'baptisms' AS type, COUNT(*) AS count FROM baptism_records
      UNION ALL
      SELECT 'marriages' AS type, COUNT(*) AS count FROM marriage_records
      UNION ALL
      SELECT 'funerals' AS type, COUNT(*) AS count FROM funeral_records
    `);
    const counts = { baptisms: 0, marriages: 0, funerals: 0, total: 0 };
    countRows.forEach(r => {
      counts[r.type] = Number(r.count);
      counts.total += Number(r.count);
    });

    // --- 2. Recent activity (10 most recent records across all types) ---
    const recentParts = [];
    if (cols.baptismDate) {
      const nameCol = cols.baptismName || `'Baptism Record'`;
      recentParts.push(`(SELECT ${nameCol} AS name, 'baptism' AS type, ${cols.baptismDate} AS record_date FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL ORDER BY ${cols.baptismDate} DESC LIMIT 10)`);
    }
    if (cols.marriageDate) {
      const nameCol = cols.marriageName || `'Marriage Record'`;
      recentParts.push(`(SELECT ${nameCol} AS name, 'marriage' AS type, ${cols.marriageDate} AS record_date FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL ORDER BY ${cols.marriageDate} DESC LIMIT 10)`);
    }
    if (cols.funeralDate) {
      const nameCol = cols.funeralName || `'Funeral Record'`;
      recentParts.push(`(SELECT ${nameCol} AS name, 'funeral' AS type, ${cols.funeralDate} AS record_date FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL ORDER BY ${cols.funeralDate} DESC LIMIT 10)`);
    }

    let recentActivity = [];
    if (recentParts.length > 0) {
      const [recentRows] = await pool.query(
        `SELECT * FROM (${recentParts.join(' UNION ALL ')}) AS combined ORDER BY record_date DESC LIMIT 10`
      );
      recentActivity = recentRows.map(r => ({
        name: r.name || 'Unknown',
        type: r.type,
        date: r.record_date
      }));
    }

    // --- 3. Type distribution (for pie/donut chart) ---
    const typeDistribution = [
      { name: 'Baptisms', value: counts.baptisms },
      { name: 'Marriages', value: counts.marriages },
      { name: 'Funerals', value: counts.funerals },
    ];

    // --- 4. Monthly activity (last 12 months grouped by type) ---
    const monthlyParts = [];
    if (cols.baptismDate) {
      monthlyParts.push(`SELECT DATE_FORMAT(${cols.baptismDate}, '%Y-%m') AS month, 'baptism' AS type FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL AND ${cols.baptismDate} >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`);
    }
    if (cols.marriageDate) {
      monthlyParts.push(`SELECT DATE_FORMAT(${cols.marriageDate}, '%Y-%m') AS month, 'marriage' AS type FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL AND ${cols.marriageDate} >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`);
    }
    if (cols.funeralDate) {
      monthlyParts.push(`SELECT DATE_FORMAT(${cols.funeralDate}, '%Y-%m') AS month, 'funeral' AS type FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL AND ${cols.funeralDate} >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)`);
    }

    let monthlyActivity = [];
    if (monthlyParts.length > 0) {
      const [monthRows] = await pool.query(
        `SELECT month, type, COUNT(*) AS count FROM (${monthlyParts.join(' UNION ALL ')}) combined GROUP BY month, type ORDER BY month`
      );
      const monthMap = {};
      monthRows.forEach(r => {
        if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, baptism: 0, marriage: 0, funeral: 0 };
        monthMap[r.month][r.type] = Number(r.count);
      });
      monthlyActivity = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
    }

    // --- 5. Year-over-year comparison ---
    const currentYear = new Date().getFullYear();
    const yoyParts = [];
    if (cols.baptismDate) {
      yoyParts.push(`SELECT YEAR(${cols.baptismDate}) AS yr, 'baptism' AS type FROM baptism_records WHERE YEAR(${cols.baptismDate}) IN (${currentYear}, ${currentYear - 1})`);
    }
    if (cols.marriageDate) {
      yoyParts.push(`SELECT YEAR(${cols.marriageDate}) AS yr, 'marriage' AS type FROM marriage_records WHERE YEAR(${cols.marriageDate}) IN (${currentYear}, ${currentYear - 1})`);
    }
    if (cols.funeralDate) {
      yoyParts.push(`SELECT YEAR(${cols.funeralDate}) AS yr, 'funeral' AS type FROM funeral_records WHERE YEAR(${cols.funeralDate}) IN (${currentYear}, ${currentYear - 1})`);
    }

    let yearOverYear = { currentYear, previousYear: currentYear - 1, current: 0, previous: 0, changePercent: 0 };
    if (yoyParts.length > 0) {
      const [yoyRows] = await pool.query(
        `SELECT yr, COUNT(*) AS count FROM (${yoyParts.join(' UNION ALL ')}) combined GROUP BY yr`
      );
      yoyRows.forEach(r => {
        if (Number(r.yr) === currentYear) yearOverYear.current = Number(r.count);
        else yearOverYear.previous = Number(r.count);
      });
      if (yearOverYear.previous > 0) {
        yearOverYear.changePercent = Math.round(((yearOverYear.current - yearOverYear.previous) / yearOverYear.previous) * 100);
      }
    }

    // --- 6. Data completeness ---
    // Check what % of records have key fields filled
    const completenessChecks = [];
    if (cols.baptismDate && cols.baptismName) {
      completenessChecks.push(`SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.baptismName} IS NOT NULL AND ${cols.baptismName} != '' AND ${cols.baptismDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM baptism_records`);
    }
    if (cols.marriageDate && cols.marriageName) {
      completenessChecks.push(`SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.marriageName} IS NOT NULL AND ${cols.marriageName} != '' AND ${cols.marriageDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM marriage_records`);
    }
    if (cols.funeralDate && cols.funeralName) {
      completenessChecks.push(`SELECT COUNT(*) AS total, SUM(CASE WHEN ${cols.funeralName} IS NOT NULL AND ${cols.funeralName} != '' AND ${cols.funeralDate} IS NOT NULL THEN 1 ELSE 0 END) AS complete FROM funeral_records`);
    }

    let completeness = 0;
    if (completenessChecks.length > 0) {
      const results = await Promise.all(completenessChecks.map(q => pool.query(q)));
      let totalRecords = 0;
      let completeRecords = 0;
      results.forEach(([rows]) => {
        totalRecords += Number(rows[0]?.total || 0);
        completeRecords += Number(rows[0]?.complete || 0);
      });
      completeness = totalRecords > 0 ? Math.round((completeRecords / totalRecords) * 100) : 0;
    }

    // --- 7. Date range ---
    const rangeParts = [];
    if (cols.baptismDate) rangeParts.push(`SELECT MIN(${cols.baptismDate}) AS earliest, MAX(${cols.baptismDate}) AS latest FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL`);
    if (cols.marriageDate) rangeParts.push(`SELECT MIN(${cols.marriageDate}) AS earliest, MAX(${cols.marriageDate}) AS latest FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL`);
    if (cols.funeralDate) rangeParts.push(`SELECT MIN(${cols.funeralDate}) AS earliest, MAX(${cols.funeralDate}) AS latest FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL`);

    let dateRange = { earliest: null, latest: null };
    if (rangeParts.length > 0) {
      const [rangeRows] = await pool.query(
        `SELECT MIN(earliest) AS earliest, MAX(latest) AS latest FROM (${rangeParts.join(' UNION ALL ')}) combined`
      );
      if (rangeRows[0]) {
        const e = rangeRows[0].earliest;
        const l = rangeRows[0].latest;
        dateRange.earliest = e ? new Date(e).getFullYear() : null;
        dateRange.latest = l ? new Date(l).getFullYear() : null;
      }
    }

    res.json({
      success: true,
      data: {
        counts,
        recentActivity,
        typeDistribution,
        monthlyActivity,
        yearOverYear,
        completeness,
        dateRange
      }
    });

  } catch (error) {
    console.error('[Dashboard Home] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

module.exports = router;
