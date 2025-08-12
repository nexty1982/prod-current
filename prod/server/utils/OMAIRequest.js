// server/utils/OMAIRequest.js
// OMAI Task Assignment System Utility Module
// Provides logging, validation, and reusable functions for OMAI task operations

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class OMAIRequest {
    constructor() {
        this.logsPath = path.join(__dirname, '../logs/omai-task-assignment.log');
        this.debugMode = process.env.NODE_ENV !== 'production';
    }

    /**
     * Log OMAI action for audit/debug purposes
     * @param {string} action - Action type (e.g., 'TASK_LINK_GENERATED', 'TASK_SUBMITTED')
     * @param {Object} data - Action data to log
     * @param {string} email - Associated email
     * @param {string} token - Associated token (optional)
     */
    async logAction(action, data, email, token = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            action,
            email,
            token: token ? token.substring(0, 8) + '...' : null, // Partial token for security
            data: this.sanitizeLogData(data),
            ip: data.ip || 'unknown',
            userAgent: data.userAgent || 'unknown'
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        try {
            // Ensure logs directory exists
            await this.ensureLogsDirectory();
            
            // Append to log file
            await fs.appendFile(this.logsPath, logLine);
            
            if (this.debugMode) {
                console.log(`[OMAI Task Assignment] ${action}:`, logEntry);
            }
        } catch (error) {
            console.error('Failed to log OMAI action:', error);
        }
    }

    /**
     * Generate a secure UUID token for task links
     * @returns {string} UUID token
     */
    generateSecureToken() {
        return uuidv4();
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} Is valid email
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Sanitize task input data
     * @param {Array} tasks - Array of task objects
     * @returns {Array} Sanitized tasks
     */
    sanitizeTasks(tasks) {
        if (!Array.isArray(tasks)) {
            return [];
        }

        return tasks.map(task => ({
            title: this.sanitizeString(task.title, 200),
            description: this.sanitizeString(task.description, 1000),
            priority: this.validatePriority(task.priority)
        })).filter(task => task.title && task.title.trim().length > 0);
    }

    /**
     * Validate task priority
     * @param {string} priority - Priority value
     * @returns {string} Valid priority
     */
    validatePriority(priority) {
        const validPriorities = ['🔥', '⚠️', '🧊', 'high', 'medium', 'low'];
        return validPriorities.includes(priority) ? priority : 'medium';
    }

    /**
     * Sanitize string input
     * @param {string} input - Input string
     * @param {number} maxLength - Maximum length
     * @returns {string} Sanitized string
     */
    sanitizeString(input, maxLength = 255) {
        if (typeof input !== 'string') {
            return '';
        }
        
        return input
            .trim()
            .substring(0, maxLength)
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/[<>]/g, ''); // Remove angle brackets
    }

    /**
     * Get task assignment link URL
     * @param {string} token - Task link token
     * @returns {string} Full task assignment URL
     */
    getTaskAssignmentURL(token) {
        const baseURL = process.env.FRONTEND_URL || 'https://orthodoxmetrics.com';
        return `${baseURL}/assign-task?token=${token}`;
    }

    /**
     * Format tasks for email display
     * @param {Array} tasks - Array of task objects
     * @returns {string} HTML formatted tasks
     */
    formatTasksForEmail(tasks) {
        if (!Array.isArray(tasks) || tasks.length === 0) {
            return '<p><em>No tasks provided</em></p>';
        }

        let html = '<ol style="margin: 20px 0; padding-left: 20px;">';
        
        tasks.forEach(task => {
            const priorityIcon = this.getPriorityIcon(task.priority);
            html += `
                <li style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-left: 4px solid #8c249d; border-radius: 4px;">
                    <strong>${priorityIcon} ${this.escapeHtml(task.title)}</strong>
                    ${task.description ? `<br><span style="color: #666; font-size: 14px;">${this.escapeHtml(task.description)}</span>` : ''}
                </li>
            `;
        });
        
        html += '</ol>';
        return html;
    }

    /**
     * Get priority icon for display
     * @param {string} priority - Priority value
     * @returns {string} Priority icon/text
     */
    getPriorityIcon(priority) {
        const priorityMap = {
            '🔥': '🔥 HIGH',
            'high': '🔥 HIGH',
            '⚠️': '⚠️ MEDIUM',
            'medium': '⚠️ MEDIUM',
            '🧊': '🧊 LOW',
            'low': '🧊 LOW'
        };
        return priorityMap[priority] || '⚠️ MEDIUM';
    }

    /**
     * Escape HTML characters
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Sanitize data for logging (remove sensitive info)
     * @param {Object} data - Data to sanitize
     * @returns {Object} Sanitized data
     */
    sanitizeLogData(data) {
        const sanitized = { ...data };
        
        // Remove sensitive fields
        delete sanitized.password;
        delete sanitized.token;
        delete sanitized.authorization;
        
        return sanitized;
    }

    /**
     * Ensure logs directory exists
     * @private
     */
    async ensureLogsDirectory() {
        const logsDir = path.dirname(this.logsPath);
        try {
            await fs.access(logsDir);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(logsDir, { recursive: true });
        }
    }

    /**
     * Get recent task assignment logs
     * @param {number} limit - Number of logs to retrieve
     * @returns {Array} Array of log entries
     */
    async getRecentLogs(limit = 50) {
        try {
            const logContent = await fs.readFile(this.logsPath, 'utf8');
            const lines = logContent.trim().split('\n').filter(line => line.trim());
            
            const logs = lines
                .slice(-limit) // Get last N lines
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (error) {
                        return null;
                    }
                })
                .filter(log => log !== null)
                .reverse(); // Most recent first
            
            return logs;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Log file doesn't exist yet
                return [];
            }
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new OMAIRequest(); 