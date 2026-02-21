/**
 * OM Charts API
 * Provides chart data from church sacramental records (baptisms, marriages, funerals)
 *
 * Endpoint: GET /api/churches/:churchId/charts/summary
 */

const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth } = require('../middleware/auth');
const { getTenantPool } = require('../config/db');
const { getAppPool } = require('../config/db-compat');
const { getEffectiveFeatures } = require('../utils/featureFlags');
const { detectColumns } = require('../utils/detectColumns');

/**
 * GET /summary
 * Returns 6 chart datasets from the church's sacramental records
 */
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const churchId = req.params.churchId;
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Church ID is required' });
    }

    // Check feature flag
    const appPool = getAppPool();
    const { effective } = await getEffectiveFeatures(appPool, churchId);
    if (!effective.om_charts_enabled) {
      return res.status(403).json({
        success: false,
        error: 'OM Charts is not enabled for this church'
      });
    }

    const pool = getTenantPool(churchId);
    const cols = await detectColumns(pool);

    // Build UNION parts only for tables that have the right columns
    const yearParts = [];
    const monthParts = [];
    const seasonParts = [];
    const clergyParts = [];

    if (cols.baptismDate) {
      yearParts.push(`SELECT YEAR(${cols.baptismDate}) AS year_val, 'baptism' AS type FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL`);
      monthParts.push(`SELECT DATE_FORMAT(${cols.baptismDate}, '%Y-%m') AS month_val, 'baptism' AS type FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL`);
      seasonParts.push(`SELECT MONTH(${cols.baptismDate}) AS month_num, 'baptism' AS type FROM baptism_records WHERE ${cols.baptismDate} IS NOT NULL`);
    }
    if (cols.marriageDate) {
      yearParts.push(`SELECT YEAR(${cols.marriageDate}) AS year_val, 'marriage' AS type FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL`);
      monthParts.push(`SELECT DATE_FORMAT(${cols.marriageDate}, '%Y-%m') AS month_val, 'marriage' AS type FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL`);
      seasonParts.push(`SELECT MONTH(${cols.marriageDate}) AS month_num, 'marriage' AS type FROM marriage_records WHERE ${cols.marriageDate} IS NOT NULL`);
    }
    if (cols.funeralDate) {
      yearParts.push(`SELECT YEAR(${cols.funeralDate}) AS year_val, 'funeral' AS type FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL`);
      monthParts.push(`SELECT DATE_FORMAT(${cols.funeralDate}, '%Y-%m') AS month_val, 'funeral' AS type FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL`);
      seasonParts.push(`SELECT MONTH(${cols.funeralDate}) AS month_num, 'funeral' AS type FROM funeral_records WHERE ${cols.funeralDate} IS NOT NULL`);
    }
    if (cols.baptismClergy) {
      clergyParts.push(`SELECT TRIM(${cols.baptismClergy}) AS clergy_name FROM baptism_records WHERE ${cols.baptismClergy} IS NOT NULL AND TRIM(${cols.baptismClergy}) != ''`);
    }
    if (cols.marriageClergy) {
      clergyParts.push(`SELECT TRIM(${cols.marriageClergy}) AS clergy_name FROM marriage_records WHERE ${cols.marriageClergy} IS NOT NULL AND TRIM(${cols.marriageClergy}) != ''`);
    }
    if (cols.funeralClergy) {
      clergyParts.push(`SELECT TRIM(${cols.funeralClergy}) AS clergy_name FROM funeral_records WHERE ${cols.funeralClergy} IS NOT NULL AND TRIM(${cols.funeralClergy}) != ''`);
    }

    // Build queries (return empty results if no date columns found)
    const yearQuery = yearParts.length > 0
      ? `SELECT year_val AS year, type, COUNT(*) AS count FROM (${yearParts.join(' UNION ALL ')}) combined WHERE year_val IS NOT NULL GROUP BY year_val, type ORDER BY year_val`
      : null;

    const monthQuery = monthParts.length > 0
      ? `SELECT month_val AS month, type, COUNT(*) AS count FROM (${monthParts.join(' UNION ALL ')}) combined WHERE month_val IS NOT NULL GROUP BY month_val, type ORDER BY month_val`
      : null;

    const seasonQuery = seasonParts.length > 0
      ? `SELECT month_num, type, COUNT(*) AS count FROM (${seasonParts.join(' UNION ALL ')}) combined WHERE month_num IS NOT NULL GROUP BY month_num, type ORDER BY month_num`
      : null;

    const clergyQuery = clergyParts.length > 0
      ? `SELECT clergy_name, COUNT(*) AS count FROM (${clergyParts.join(' UNION ALL ')}) combined GROUP BY clergy_name ORDER BY count DESC LIMIT 15`
      : null;

    const ageQuery = (cols.baptismDate && cols.birthDate)
      ? `SELECT
          CASE
            WHEN age_days <= 90 THEN '0-3 months'
            WHEN age_days <= 180 THEN '3-6 months'
            WHEN age_days <= 365 THEN '6-12 months'
            WHEN age_days <= 730 THEN '1-2 years'
            WHEN age_days <= 1825 THEN '2-5 years'
            ELSE '5+ years'
          END AS age_range,
          COUNT(*) AS count
        FROM (
          SELECT DATEDIFF(${cols.baptismDate}, ${cols.birthDate}) AS age_days
          FROM baptism_records
          WHERE ${cols.baptismDate} IS NOT NULL AND ${cols.birthDate} IS NOT NULL
        ) ages
        WHERE age_days >= 0
        GROUP BY age_range
        ORDER BY MIN(age_days)`
      : null;

    // Run all queries in parallel
    const [
      sacramentsByYear,
      monthlyTrends,
      byPriest,
      baptismAge,
      typeDistribution,
      seasonalPatterns
    ] = await Promise.all([
      yearQuery ? pool.query(yearQuery) : [[]],
      monthQuery ? pool.query(monthQuery) : [[]],
      clergyQuery ? pool.query(clergyQuery) : [[]],
      ageQuery ? pool.query(ageQuery) : [[]],
      pool.query(`
        SELECT 'Baptisms' AS type, COUNT(*) AS count FROM baptism_records
        UNION ALL
        SELECT 'Marriages' AS type, COUNT(*) AS count FROM marriage_records
        UNION ALL
        SELECT 'Funerals' AS type, COUNT(*) AS count FROM funeral_records
      `),
      seasonQuery ? pool.query(seasonQuery) : [[]],
    ]);

    // Extract rows (mysql2 returns [rows, fields])
    const getRows = (result) => Array.isArray(result[0]) ? result[0] : result;

    // Pivot helpers for Recharts format
    const pivotByYear = (rows) => {
      const map = {};
      rows.forEach(r => {
        if (!map[r.year]) map[r.year] = { year: r.year, baptism: 0, marriage: 0, funeral: 0 };
        map[r.year][r.type] = Number(r.count);
      });
      return Object.values(map).sort((a, b) => a.year - b.year);
    };

    const pivotByMonth = (rows) => {
      const map = {};
      rows.forEach(r => {
        if (!map[r.month]) map[r.month] = { month: r.month, baptism: 0, marriage: 0, funeral: 0 };
        map[r.month][r.type] = Number(r.count);
      });
      return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
    };

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pivotBySeason = (rows) => {
      const map = {};
      rows.forEach(r => {
        const key = r.month_num;
        if (!map[key]) map[key] = { month: monthNames[key] || key, baptism: 0, marriage: 0, funeral: 0 };
        map[key][r.type] = Number(r.count);
      });
      return Object.values(map).sort((a, b) => monthNames.indexOf(a.month) - monthNames.indexOf(b.month));
    };

    res.json({
      success: true,
      data: {
        sacramentsByYear: pivotByYear(getRows(sacramentsByYear)),
        monthlyTrends: pivotByMonth(getRows(monthlyTrends)),
        byPriest: getRows(byPriest).map(r => ({ name: r.clergy_name, count: Number(r.count) })),
        baptismAge: getRows(baptismAge).map(r => ({ range: r.age_range, count: Number(r.count) })),
        typeDistribution: getRows(typeDistribution).map(r => ({ name: r.type, value: Number(r.count) })),
        seasonalPatterns: pivotBySeason(getRows(seasonalPatterns))
      }
    });

  } catch (error) {
    console.error('[OM Charts] Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chart data',
      message: error.message
    });
  }
});

module.exports = router;
