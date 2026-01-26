/**
 * Build Events Service
 * Handles build lifecycle events and notifications
 */

const { getAppPool } = require('../config/db-compat');
const { notificationService } = require('./notifications');

class BuildEventsService {
    /**
     * Process a build event
     * @param {Object} eventData - Build event data
     * @returns {Promise<Object>} Result with runId and eventId
     */
    async processBuildEvent(eventData) {
        const {
            runId,
            event,
            env,
            origin,
            command,
            host,
            pid,
            stage,
            message,
            durationMs,
            ts,
            repo,
            branch,
            commit
        } = eventData;

        // Validate required fields
        if (!runId || !event || !env || !origin || !command) {
            throw new Error('Missing required fields: runId, event, env, origin, command');
        }

        const pool = getAppPool();
        // Convert ISO timestamp string to Date object
        // mysql2 driver handles Date objects correctly for TIMESTAMP columns
        const timestamp = ts ? new Date(ts) : new Date();

        try {
            // Start transaction
            await pool.query('START TRANSACTION');

            // Handle build_started - create or update build_runs record
            if (event === 'build_started') {
                const metaJson = JSON.stringify({
                    repo: repo || null,
                    branch: branch || null,
                    commit: commit || null
                });

                await pool.query(`
                    INSERT INTO build_runs (
                        run_id, env, origin, command, host, pid, status, started_at, last_heartbeat_at, meta_json
                    ) VALUES (?, ?, ?, ?, ?, ?, 'running', ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        last_heartbeat_at = VALUES(last_heartbeat_at),
                        status = 'running'
                `, [runId, env, origin, command, host, pid, timestamp, timestamp, metaJson]);

                // Create notification for admins/super_admins
                await this.notifyAdmins('build_started', {
                    runId,
                    env,
                    origin,
                    command,
                    host
                });
            }

            // Handle heartbeat - update last_heartbeat_at
            if (event === 'heartbeat') {
                await pool.query(`
                    UPDATE build_runs
                    SET last_heartbeat_at = ?
                    WHERE run_id = ?
                `, [timestamp, runId]);
            }

            // Handle build_completed - update build_runs status
            if (event === 'build_completed') {
                await pool.query(`
                    UPDATE build_runs
                    SET status = 'success', ended_at = ?, last_heartbeat_at = ?
                    WHERE run_id = ?
                `, [timestamp, timestamp, runId]);

                // Get duration
                const [runRows] = await pool.query(`
                    SELECT TIMESTAMPDIFF(SECOND, started_at, ended_at) as duration_seconds
                    FROM build_runs
                    WHERE run_id = ?
                `, [runId]);

                const durationSeconds = runRows[0]?.duration_seconds || 0;

                // Create notification
                await this.notifyAdmins('build_completed', {
                    runId,
                    env,
                    origin,
                    command,
                    host,
                    durationSeconds,
                    stage: stage || null
                });
            }

            // Handle build_failed - update build_runs status
            if (event === 'build_failed') {
                await pool.query(`
                    UPDATE build_runs
                    SET status = 'failed', ended_at = ?, last_heartbeat_at = ?
                    WHERE run_id = ?
                `, [timestamp, timestamp, runId]);

                // Create notification
                await this.notifyAdmins('build_failed', {
                    runId,
                    env,
                    origin,
                    command,
                    host,
                    message: message || 'Build failed',
                    stage: stage || null
                });
            }

            // Insert event into build_run_events
            const payloadJson = JSON.stringify({
                repo: repo || null,
                branch: branch || null,
                commit: commit || null,
                pid: pid || null
            });

            const [eventResult] = await pool.query(`
                INSERT INTO build_run_events (
                    run_id, event, stage, message, duration_ms, created_at, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [runId, event, stage || null, message || null, durationMs || null, timestamp, payloadJson]);

            // Commit transaction
            await pool.query('COMMIT');

            return {
                success: true,
                runId,
                eventId: eventResult.insertId
            };
        } catch (error) {
            // Rollback on error
            await pool.query('ROLLBACK');
            console.error('Error processing build event:', error);
            throw error;
        }
    }

    /**
     * Get current build status
     * @param {number} heartbeatTimeoutSeconds - Seconds before considering build stale (default 90)
     * @returns {Promise<Object>} Build status
     */
    async getBuildStatus(heartbeatTimeoutSeconds = 90) {
        const pool = getAppPool();
        const timeoutThreshold = new Date(Date.now() - heartbeatTimeoutSeconds * 1000);

        try {
            // Find active builds (running status with recent heartbeat)
            const [activeRuns] = await pool.query(`
                SELECT 
                    run_id,
                    env,
                    origin,
                    command,
                    host,
                    pid,
                    status,
                    started_at,
                    last_heartbeat_at,
                    meta_json
                FROM build_runs
                WHERE status = 'running'
                AND last_heartbeat_at >= ?
                ORDER BY started_at DESC
                LIMIT 1
            `, [timeoutThreshold]);

            const running = activeRuns.length > 0;
            const activeRun = running ? {
                runId: activeRuns[0].run_id,
                env: activeRuns[0].env,
                origin: activeRuns[0].origin,
                command: activeRuns[0].command,
                host: activeRuns[0].host,
                pid: activeRuns[0].pid,
                startedAt: activeRuns[0].started_at,
                lastHeartbeatAt: activeRuns[0].last_heartbeat_at,
                meta: activeRuns[0].meta_json ? JSON.parse(activeRuns[0].meta_json) : null
            } : null;

            // Clean up stale builds (running but no heartbeat)
            if (!running) {
                await pool.query(`
                    UPDATE build_runs
                    SET status = 'failed', ended_at = NOW()
                    WHERE status = 'running'
                    AND last_heartbeat_at < ?
                `, [timeoutThreshold]);
            }

            return {
                running,
                activeRun,
                updatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting build status:', error);
            throw error;
        }
    }

    /**
     * Notify admins and super_admins about build events
     * @param {string} eventType - build_started, build_completed, build_failed
     * @param {Object} data - Event data
     */
    async notifyAdmins(eventType, data) {
        try {
            const pool = getAppPool();

            // Get all admin and super_admin users
            const [adminUsers] = await pool.query(`
                SELECT id, email, role
                FROM users
                WHERE role IN ('admin', 'super_admin')
                AND is_active = 1
            `);

            if (adminUsers.length === 0) {
                console.log('No admin users found for build notifications');
                return;
            }

            // Create notification for each admin
            const notifications = [];

            for (const user of adminUsers) {
                let title, message, priority;

                if (eventType === 'build_started') {
                    title = `Build Started: ${data.env} ${data.origin}`;
                    message = `Build started: ${data.command}\nRun ID: ${data.runId}\nHost: ${data.host}`;
                    priority = 'normal';
                } else if (eventType === 'build_completed') {
                    const duration = data.durationSeconds 
                        ? `${Math.floor(data.durationSeconds / 60)}m ${data.durationSeconds % 60}s`
                        : 'unknown';
                    title = `Build Completed: ${data.env} ${data.origin}`;
                    message = `Build completed successfully: ${data.command}\nDuration: ${duration}\nRun ID: ${data.runId}`;
                    priority = 'normal';
                } else if (eventType === 'build_failed') {
                    title = `Build Failed: ${data.env} ${data.origin}`;
                    message = `Build failed: ${data.command}\n${data.message || 'Unknown error'}\nRun ID: ${data.runId}${data.stage ? `\nStage: ${data.stage}` : ''}`;
                    priority = 'high';
                } else {
                    continue; // Skip unknown event types
                }

                try {
                    await notificationService.createNotification(
                        user.id,
                        eventType,
                        title,
                        message,
                        {
                            priority,
                            data: {
                                runId: data.runId,
                                env: data.env,
                                origin: data.origin,
                                command: data.command,
                                host: data.host
                            }
                        }
                    );
                    notifications.push(user.id);
                } catch (err) {
                    console.error(`Failed to create notification for user ${user.id}:`, err);
                }
            }

            console.log(`Created ${notifications.length} build notifications for ${eventType}`);
        } catch (error) {
            console.error('Error notifying admins:', error);
            // Don't throw - notification failure shouldn't break build event processing
        }
    }
}

module.exports = new BuildEventsService();
