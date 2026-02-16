/**
 * Build Runs Summary API
 * GET /api/admin/build-runs/summary
 * 
 * Returns build activity summary derived from build_runs and build_run_events tables
 * Uses existing telemetry tables - no new tables created
 * 
 * Database: orthodoxmetrics_db (app DB, NOT auth DB)
 * 
 * Stage Detection:
 * - Frontend builds: stage = 'Frontend Build' OR stage LIKE 'Frontend%'
 * - Server builds: stage LIKE 'Backend%'
 * 
 * Based on schema:
 * - build_runs: run_id, env, origin, status, started_at, ended_at
 * - build_run_events: run_id, event, stage, message, duration_ms, created_at
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../../middleware/auth');
const { getAppPool } = require('../../config/db-compat');

// Middleware: require admin or super_admin
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * GET /api/admin/build-runs/summary
 * Get build activity summary for the last N hours
 * 
 * Query params:
 *   - hours: number of hours to look back (default 24, min 1, max 168)
 * 
 * Returns:
 *   - hours: hours parameter used
 *   - frontendBuilds: count of distinct runs with frontend stages
 *   - serverBuilds: count of distinct runs with backend stages
 *   - last10: array of last 10 runs with details
 */
router.get('/build-runs/summary', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Parse and validate hours parameter
        let hours = parseInt(req.query.hours) || 24;
        hours = Math.max(1, Math.min(168, hours)); // Clamp between 1 and 168 (1 week)

        const pool = getAppPool();

        // Query 1: Count frontend and server builds in the last N hours
        // Logic: Group events by run_id, detect if run has frontend/backend stages
        const [countResults] = await pool.query(`
            SELECT
                SUM(frontend_hit) AS frontend_builds,
                SUM(server_hit) AS server_builds
            FROM (
                SELECT
                    e.run_id,
                    MAX(e.stage = 'Frontend Build' OR e.stage LIKE 'Frontend%') AS frontend_hit,
                    MAX(e.stage LIKE 'Backend%') AS server_hit
                FROM build_run_events e
                WHERE e.created_at >= NOW() - INTERVAL ? HOUR
                GROUP BY e.run_id
            ) t
        `, [hours]);

        const frontendBuilds = countResults[0]?.frontend_builds || 0;
        const serverBuilds = countResults[0]?.server_builds || 0;

        // Query 2: Get last 10 runs with frontend/server detection
        const [last10Results] = await pool.query(`
            SELECT
                r.run_id,
                r.env,
                r.origin,
                r.status,
                r.started_at,
                r.ended_at,
                MAX(e.stage = 'Frontend Build' OR e.stage LIKE 'Frontend%') AS built_frontend,
                MAX(e.stage LIKE 'Backend%') AS built_server,
                TIMESTAMPDIFF(SECOND, r.started_at, COALESCE(r.ended_at, NOW())) AS duration_seconds
            FROM build_runs r
            LEFT JOIN build_run_events e ON e.run_id = r.run_id
            WHERE r.started_at >= NOW() - INTERVAL ? HOUR
            GROUP BY r.run_id, r.env, r.origin, r.status, r.started_at, r.ended_at
            ORDER BY r.started_at DESC
            LIMIT 10
        `, [hours]);

        // Format last10 results
        const last10 = last10Results.map(row => ({
            runId: row.run_id,
            env: row.env,
            origin: row.origin,
            status: row.status,
            startedAt: row.started_at,
            endedAt: row.ended_at,
            builtFrontend: !!row.built_frontend,
            builtServer: !!row.built_server,
            durationSeconds: row.duration_seconds
        }));

        res.json({
            success: true,
            hours,
            frontendBuilds,
            serverBuilds,
            last10
        });
    } catch (error) {
        console.error('Error getting build runs summary:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get build runs summary'
        });
    }
});

module.exports = router;
