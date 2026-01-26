/**
 * OMAI-Spin Admin Controller
 * Web interface for environment mirroring operations
 */

const { promisePool } = require('../../config/db');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class OmaiSpinController {
    constructor() {
        this.activeOperations = new Map();
        this.eventEmitter = new EventEmitter();
        this.spinScriptPath = path.join(__dirname, '../../../scripts/omai-spin/omai-spin.sh');
    }

    /**
     * Get OMAI-Spin dashboard data
     */
    async getDashboard(req, res) {
        try {
            // Get recent sessions
            const [recentSessions] = await promisePool.execute(`
                SELECT id, session_uuid, timestamp, src_path, dest_path, triggered_by, 
                       status, total_files_copied, total_files_excluded, total_files_modified,
                       databases_migrated, duration_seconds, error_message
                FROM spin_sessions 
                ORDER BY timestamp DESC 
                LIMIT 10
            `);

            // Get session statistics
            const [sessionStats] = await promisePool.execute(`
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_sessions,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_sessions,
                    AVG(duration_seconds) as avg_duration,
                    SUM(total_files_copied) as total_files_copied,
                    MAX(timestamp) as last_operation
                FROM spin_sessions
            `);

            // Get database operation stats
            const [dbStats] = await promisePool.execute(`
                SELECT 
                    operation_type,
                    COUNT(*) as count,
                    AVG(duration_seconds) as avg_duration
                FROM database_operations 
                WHERE operation_status = 'completed'
                GROUP BY operation_type
            `);

            // Check for active operations
            const activeOperations = Array.from(this.activeOperations.entries()).map(([sessionId, operation]) => ({
                sessionId,
                status: operation.status,
                progress: operation.progress,
                startTime: operation.startTime,
                currentStep: operation.currentStep
            }));

            res.json({
                success: true,
                data: {
                    recentSessions: recentSessions.map(session => ({
                        ...session,
                        databases_migrated: JSON.parse(session.databases_migrated || '[]')
                    })),
                    statistics: sessionStats[0] || {},
                    databaseStats: dbStats,
                    activeOperations,
                    systemInfo: {
                        scriptPath: this.spinScriptPath,
                        scriptExists: await this.checkScriptExists(),
                        databaseConnected: true
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching OMAI-Spin dashboard:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Start a new OMAI-Spin operation
     */
    async startOperation(req, res) {
        try {
            const {
                prodPath = '/var/www/orthodox-church-mgmt/orthodoxmetrics_db/prod',
                devPath = '/var/www/orthodoxmetrics_db/dev',
                dryRun = false,
                skipDatabase = false,
                skipFiles = false,
                force = false
            } = req.body;

            const triggeredBy = req.user?.username || req.user?.email || 'web-admin';

            // Validate paths
            if (!await this.validatePath(prodPath)) {
                return res.status(400).json({
                    success: false,
                    error: `Production path does not exist: ${prodPath}`
                });
            }

            // Check if script exists
            if (!await this.checkScriptExists()) {
                return res.status(500).json({
                    success: false,
                    error: 'OMAI-Spin script not found'
                });
            }

            // Check for existing active operations
            const activeCount = this.activeOperations.size;
            if (activeCount > 0 && !force) {
                return res.status(409).json({
                    success: false,
                    error: `There are ${activeCount} active operations. Use force=true to override.`
                });
            }

            // Build command arguments
            const args = [];
            if (dryRun) args.push('--dry-run');
            if (skipDatabase) args.push('--skip-database');
            if (skipFiles) args.push('--skip-files');
            if (force) args.push('--force');
            args.push('--verbose');
            args.push(`--prod-path=${prodPath}`);
            args.push(`--dev-path=${devPath}`);
            args.push(`--triggered-by=${triggeredBy}`);

            // Start the operation
            const operationId = await this.executeSpinOperation(args, {
                prodPath,
                devPath,
                dryRun,
                skipDatabase,
                skipFiles,
                triggeredBy
            });

            res.json({
                success: true,
                data: {
                    operationId,
                    message: 'OMAI-Spin operation started successfully',
                    config: {
                        prodPath,
                        devPath,
                        dryRun,
                        skipDatabase,
                        skipFiles,
                        triggeredBy
                    }
                }
            });

        } catch (error) {
            console.error('Error starting OMAI-Spin operation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get operation status
     */
    async getOperationStatus(req, res) {
        try {
            const { operationId } = req.params;

            // Check active operations
            const activeOperation = this.activeOperations.get(operationId);
            if (activeOperation) {
                return res.json({
                    success: true,
                    data: {
                        operationId,
                        status: activeOperation.status,
                        progress: activeOperation.progress,
                        currentStep: activeOperation.currentStep,
                        startTime: activeOperation.startTime,
                        logs: activeOperation.logs.slice(-50), // Last 50 log entries
                        isActive: true
                    }
                });
            }

            // Check database for completed operations
            const [sessions] = await promisePool.execute(`
                SELECT s.*, 
                       (SELECT COUNT(*) FROM file_changes WHERE session_id = s.id) as file_operations,
                       (SELECT COUNT(*) FROM database_operations WHERE session_id = s.id) as db_operations
                FROM spin_sessions s 
                WHERE s.id = ? OR s.session_uuid = ?
            `, [operationId, operationId]);

            if (sessions.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Operation not found'
                });
            }

            const session = sessions[0];
            
            // Get recent logs for this session
            const [logs] = await promisePool.execute(`
                SELECT timestamp, log_level, component, operation, message
                FROM agent_logs 
                WHERE session_id = ?
                ORDER BY timestamp DESC 
                LIMIT 100
            `, [session.id]);

            res.json({
                success: true,
                data: {
                    operationId: session.session_uuid,
                    sessionId: session.id,
                    status: session.status,
                    startTime: session.start_time,
                    endTime: session.end_time,
                    duration: session.duration_seconds,
                    statistics: {
                        filesCopied: session.total_files_copied,
                        filesExcluded: session.total_files_excluded,
                        filesModified: session.total_files_modified,
                        fileOperations: session.file_operations,
                        dbOperations: session.db_operations
                    },
                    config: {
                        srcPath: session.src_path,
                        destPath: session.dest_path,
                        triggeredBy: session.triggered_by
                    },
                    error: session.error_message,
                    logs: logs.reverse(), // Show chronological order
                    isActive: false
                }
            });

        } catch (error) {
            console.error('Error getting operation status:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Cancel an active operation
     */
    async cancelOperation(req, res) {
        try {
            const { operationId } = req.params;

            const activeOperation = this.activeOperations.get(operationId);
            if (!activeOperation) {
                return res.status(404).json({
                    success: false,
                    error: 'Operation not found or not active'
                });
            }

            // Kill the process
            if (activeOperation.process && !activeOperation.process.killed) {
                activeOperation.process.kill('SIGTERM');
                
                // Give it a moment, then force kill if necessary
                setTimeout(() => {
                    if (!activeOperation.process.killed) {
                        activeOperation.process.kill('SIGKILL');
                    }
                }, 5000);
            }

            // Update status
            activeOperation.status = 'cancelled';
            activeOperation.endTime = new Date();

            res.json({
                success: true,
                message: 'Operation cancelled successfully'
            });

        } catch (error) {
            console.error('Error cancelling operation:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get session history
     */
    async getSessionHistory(req, res) {
        try {
            const { page = 1, limit = 20, status, triggeredBy } = req.query;
            const offset = (page - 1) * limit;

            let whereClause = '1=1';
            const params = [];

            if (status) {
                whereClause += ' AND status = ?';
                params.push(status);
            }

            if (triggeredBy) {
                whereClause += ' AND triggered_by LIKE ?';
                params.push(`%${triggeredBy}%`);
            }

            // Get sessions with pagination
            const [sessions] = await promisePool.execute(`
                SELECT s.*,
                       (SELECT COUNT(*) FROM file_changes WHERE session_id = s.id) as file_operations,
                       (SELECT COUNT(*) FROM database_operations WHERE session_id = s.id) as db_operations,
                       (SELECT COUNT(*) FROM config_replacements WHERE session_id = s.id) as config_replacements
                FROM spin_sessions s 
                WHERE ${whereClause}
                ORDER BY timestamp DESC 
                LIMIT ? OFFSET ?
            `, [...params, parseInt(limit), offset]);

            // Get total count
            const [countResult] = await promisePool.execute(`
                SELECT COUNT(*) as total 
                FROM spin_sessions 
                WHERE ${whereClause}
            `, params);

            const totalSessions = countResult[0].total;
            const totalPages = Math.ceil(totalSessions / limit);

            res.json({
                success: true,
                data: {
                    sessions: sessions.map(session => ({
                        ...session,
                        databases_migrated: JSON.parse(session.databases_migrated || '[]')
                    })),
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalSessions,
                        limit: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching session history:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get detailed session logs
     */
    async getSessionLogs(req, res) {
        try {
            const { sessionId } = req.params;
            const { level, component, limit = 500 } = req.query;

            let whereClause = 'session_id = ?';
            const params = [sessionId];

            if (level) {
                whereClause += ' AND log_level = ?';
                params.push(level);
            }

            if (component) {
                whereClause += ' AND component = ?';
                params.push(component);
            }

            const [logs] = await promisePool.execute(`
                SELECT timestamp, log_level, component, operation, message, details
                FROM agent_logs 
                WHERE ${whereClause}
                ORDER BY timestamp DESC 
                LIMIT ?
            `, [...params, parseInt(limit)]);

            res.json({
                success: true,
                data: {
                    logs: logs.map(log => ({
                        ...log,
                        details: log.details ? JSON.parse(log.details) : null
                    }))
                }
            });

        } catch (error) {
            console.error('Error fetching session logs:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Execute OMAI-Spin operation
     * @private
     */
    async executeSpinOperation(args, config) {
        const operationId = `spin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const operation = {
            id: operationId,
            status: 'starting',
            progress: 0,
            currentStep: 'Initializing',
            startTime: new Date(),
            config,
            logs: [],
            process: null
        };

        this.activeOperations.set(operationId, operation);

        try {
            // Spawn the OMAI-Spin process
            const spinProcess = spawn(this.spinScriptPath, args, {
                cwd: path.dirname(this.spinScriptPath),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            operation.process = spinProcess;
            operation.status = 'running';

            // Handle stdout
            spinProcess.stdout.on('data', (data) => {
                const output = data.toString();
                this.processOutput(operationId, output, 'stdout');
            });

            // Handle stderr
            spinProcess.stderr.on('data', (data) => {
                const output = data.toString();
                this.processOutput(operationId, output, 'stderr');
            });

            // Handle process completion
            spinProcess.on('close', (code) => {
                const operation = this.activeOperations.get(operationId);
                if (operation) {
                    operation.status = code === 0 ? 'completed' : 'failed';
                    operation.endTime = new Date();
                    operation.exitCode = code;
                    
                    // Remove from active operations after a delay
                    setTimeout(() => {
                        this.activeOperations.delete(operationId);
                    }, 30000); // Keep for 30 seconds for final status checks
                }

                this.eventEmitter.emit('operationComplete', {
                    operationId,
                    status: code === 0 ? 'completed' : 'failed',
                    exitCode: code
                });
            });

            // Handle process errors
            spinProcess.on('error', (error) => {
                const operation = this.activeOperations.get(operationId);
                if (operation) {
                    operation.status = 'failed';
                    operation.error = error.message;
                    operation.endTime = new Date();
                }

                this.eventEmitter.emit('operationError', {
                    operationId,
                    error: error.message
                });
            });

        } catch (error) {
            operation.status = 'failed';
            operation.error = error.message;
            operation.endTime = new Date();
            throw error;
        }

        return operationId;
    }

    /**
     * Process command output
     * @private
     */
    processOutput(operationId, output, stream) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        const lines = output.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            const logEntry = {
                timestamp: new Date(),
                stream,
                message: line.trim()
            };

            operation.logs.push(logEntry);

            // Keep only last 1000 log entries
            if (operation.logs.length > 1000) {
                operation.logs = operation.logs.slice(-1000);
            }

            // Parse progress and status from output
            this.parseProgress(operation, line);

            // Emit real-time updates
            this.eventEmitter.emit('operationUpdate', {
                operationId,
                logEntry,
                status: operation.status,
                progress: operation.progress,
                currentStep: operation.currentStep
            });
        }
    }

    /**
     * Parse progress from log output
     * @private
     */
    parseProgress(operation, line) {
        // Update current step based on log messages
        if (line.includes('Starting file synchronization')) {
            operation.currentStep = 'File Synchronization';
            operation.progress = 20;
        } else if (line.includes('Applying configuration replacements')) {
            operation.currentStep = 'Configuration Replacement';
            operation.progress = 40;
        } else if (line.includes('Starting database processing')) {
            operation.currentStep = 'Database Processing';
            operation.progress = 60;
        } else if (line.includes('Dumping database')) {
            operation.currentStep = 'Database Dumping';
            operation.progress = 70;
        } else if (line.includes('Sanitizing database')) {
            operation.currentStep = 'Database Sanitization';
            operation.progress = 80;
        } else if (line.includes('Operation completed successfully')) {
            operation.currentStep = 'Completed';
            operation.progress = 100;
        } else if (line.includes('Progress:')) {
            // Try to extract specific progress numbers
            const progressMatch = line.match(/(\d+)\/(\d+)/);
            if (progressMatch) {
                const [, current, total] = progressMatch;
                const percent = Math.round((parseInt(current) / parseInt(total)) * 100);
                if (operation.currentStep === 'File Synchronization') {
                    operation.progress = Math.min(20 + (percent * 0.2), 39);
                }
            }
        }
    }

    /**
     * Check if script exists
     * @private
     */
    async checkScriptExists() {
        try {
            await fs.access(this.spinScriptPath, fs.constants.F_OK | fs.constants.X_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validate path exists
     * @private
     */
    async validatePath(path) {
        try {
            const stats = await fs.stat(path);
            return stats.isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Get event emitter for real-time updates
     */
    getEventEmitter() {
        return this.eventEmitter;
    }
}

module.exports = new OmaiSpinController();