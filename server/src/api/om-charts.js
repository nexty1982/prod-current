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

    // Run all 6 queries in parallel
    const [
      sacramentsByYear,
      monthlyTrends,
      byPriest,
      baptismAge,
      typeDistribution,
      seasonalPatterns
    ] = await Promise.all([
      // 1. Sacraments by Year
      pool.query(`
        SELECT year_val AS year, type, COUNT(*) AS count FROM (
          SELECT YEAR(reception_date) AS year_val, 'baptism' AS type FROM baptism_records WHERE reception_date IS NOT NULL
          UNION ALL
          SELECT YEAR(mdate) AS year_val, 'marriage' AS type FROM marriage_records WHERE mdate IS NOT NULL
          UNION ALL
          SELECT YEAR(burial_date) AS year_val, 'funeral' AS type FROM funeral_records WHERE burial_date IS NOT NULL
        ) combined
        WHERE year_val IS NOT NULL
        GROUP BY year_val, type
        ORDER BY year_val
      `),

      // 2. Monthly Trends
      pool.query(`
        SELECT month_val AS month, type, COUNT(*) AS count FROM (
          SELECT DATE_FORMAT(reception_date, '%Y-%m') AS month_val, 'baptism' AS type FROM baptism_records WHERE reception_date IS NOT NULL
          UNION ALL
          SELECT DATE_FORMAT(mdate, '%Y-%m') AS month_val, 'marriage' AS type FROM marriage_records WHERE mdate IS NOT NULL
          UNION ALL
          SELECT DATE_FORMAT(burial_date, '%Y-%m') AS month_val, 'funeral' AS type FROM funeral_records WHERE burial_date IS NOT NULL
        ) combined
        WHERE month_val IS NOT NULL
        GROUP BY month_val, type
        ORDER BY month_val
      `),

      // 3. By Priest
      pool.query(`
        SELECT clergy_name, COUNT(*) AS count FROM (
          SELECT TRIM(clergy) AS clergy_name FROM baptism_records WHERE clergy IS NOT NULL AND TRIM(clergy) != ''
          UNION ALL
          SELECT TRIM(clergy) AS clergy_name FROM marriage_records WHERE clergy IS NOT NULL AND TRIM(clergy) != ''
          UNION ALL
          SELECT TRIM(clergy) AS clergy_name FROM funeral_records WHERE clergy IS NOT NULL AND TRIM(clergy) != ''
        ) combined
        GROUP BY clergy_name
        ORDER BY count DESC
        LIMIT 15
      `),

      // 4. Baptism Age Distribution
      pool.query(`
        SELECT
          CASE
            WHEN age_days < 0 THEN 'Invalid'
            WHEN age_days <= 90 THEN '0-3 months'
            WHEN age_days <= 180 THEN '3-6 months'
            WHEN age_days <= 365 THEN '6-12 months'
            WHEN age_days <= 730 THEN '1-2 years'
            WHEN age_days <= 1825 THEN '2-5 years'
            ELSE '5+ years'
          END AS age_range,
          COUNT(*) AS count
        FROM (
          SELECT DATEDIFF(reception_date, birth_date) AS age_days
          FROM baptism_records
          WHERE reception_date IS NOT NULL AND birth_date IS NOT NULL
        ) ages
        WHERE age_days >= 0
        GROUP BY age_range
        ORDER BY MIN(age_days)
      `),

      // 5. Type Distribution (pie chart)
      pool.query(`
        SELECT 'Baptisms' AS type, COUNT(*) AS count FROM baptism_records
        UNION ALL
        SELECT 'Marriages' AS type, COUNT(*) AS count FROM marriage_records
        UNION ALL
        SELECT 'Funerals' AS type, COUNT(*) AS count FROM funeral_records
      `),

      // 6. Seasonal Patterns
      pool.query(`
        SELECT month_num, type, COUNT(*) AS count FROM (
          SELECT MONTH(reception_date) AS month_num, 'baptism' AS type FROM baptism_records WHERE reception_date IS NOT NULL
          UNION ALL
          SELECT MONTH(mdate) AS month_num, 'marriage' AS type FROM marriage_records WHERE mdate IS NOT NULL
          UNION ALL
          SELECT MONTH(burial_date) AS month_num, 'funeral' AS type FROM funeral_records WHERE burial_date IS NOT NULL
        ) combined
        WHERE month_num IS NOT NULL
        GROUP BY month_num, type
        ORDER BY month_num
      `)
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
