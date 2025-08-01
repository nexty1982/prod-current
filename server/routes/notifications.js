const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { requireAuth, requireRole } = require('../middleware/auth');
const { promisePool } = require('../config/db');

// Email service (you might want to use nodemailer or another service)
const nodemailer = require('nodemailer');

// Use the existing connection pool instead of creating new connections
const getConnection = () => promisePool;

// Initialize email transporter (configure with your email service)
const emailTransporter = nodemailer.createTransport({
    // Configure your email service here
    // Example for Gmail:
    // service: 'gmail',
    // auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    // }

    // Example for SMTP:
    host: process.env.SMTP_HOST || 'localhost',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// ============================================================================
// Notification Service Class
// ============================================================================
class NotificationService {
    // Create a new notification
    async createNotification(userId, typeName, title, message, options = {}) {
        try {
            const {
                data = null,
                priority = 'normal',
                actionUrl = null,
                actionText = null,
                expiresAt = null,
                icon = null,
                imageUrl = null
            } = options;

            // Get notification type
            const [typeRows] = await promisePool.execute(
                'SELECT id FROM notification_types WHERE name = ? AND is_active = TRUE',
                [typeName]
            );

            if (typeRows.length === 0) {
                throw new Error(`Notification type '${typeName}' not found or inactive`);
            }

            const typeId = typeRows[0].id;

            // Create notification
            const [result] = await promisePool.execute(`
                INSERT INTO notifications (
                    user_id, notification_type_id, title, message, data, 
                    priority, action_url, action_text, expires_at, icon, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [userId, typeId, title, message, JSON.stringify(data), priority, actionUrl, actionText, expiresAt, icon, imageUrl]);

            return result.insertId;
        } catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }

    // Get user notifications
    async getUserNotifications(userId, options = {}) {
        const connection = getConnection();

        try {
            const {
                limit = 20,
                offset = 0,
                unreadOnly = false,
                category = null,
                priority = null
            } = options;

            let query = `
                SELECT n.*, nt.name as type_name, nt.category
                FROM notifications n
                JOIN notification_types nt ON n.notification_type_id = nt.id
                WHERE n.user_id = ? 
                AND n.is_dismissed = FALSE
                AND (n.expires_at IS NULL OR n.expires_at > NOW())
            `;

            const params = [userId];

            if (unreadOnly) {
                query += ' AND n.is_read = FALSE';
            }

            if (category) {
                query += ' AND nt.category = ?';
                params.push(category);
            }

            if (priority) {
                query += ' AND n.priority = ?';
                params.push(priority);
            }

            query += ' ORDER BY n.priority DESC, n.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [notifications] = await connection.execute(query, params);

            // Parse JSON data
            notifications.forEach(notification => {
                if (notification.data) {
                    try {
                        notification.data = JSON.parse(notification.data);
                    } catch (e) {
                        notification.data = null;
                    }
                }
            });

            return notifications;
        } catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }

    // Mark notification as read
    async markAsRead(notificationId, userId) {
        const connection = getConnection();

        try {
            const [result] = await connection.execute(`
                UPDATE notifications 
                SET is_read = TRUE, read_at = NOW() 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Mark all notifications as read
    async markAllAsRead(userId) {
        const connection = getConnection();

        try {
            const [result] = await connection.execute(`
                UPDATE notifications 
                SET is_read = TRUE, read_at = NOW() 
                WHERE user_id = ? AND is_read = FALSE
            `, [userId]);

            return result.affectedRows;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    }

    // Dismiss notification
    async dismissNotification(notificationId, userId) {
        const connection = getConnection();

        try {
            const [result] = await connection.execute(`
                UPDATE notifications 
                SET is_dismissed = TRUE, dismissed_at = NOW() 
                WHERE id = ? AND user_id = ?
            `, [notificationId, userId]);

            return result.affectedRows > 0;
        } catch (error) {
            console.error('Error dismissing notification:', error);
            throw error;
        }
    }

    // Get notification counts
    async getNotificationCounts(userId) {
        const connection = getConnection();

        try {
            const [countRows] = await connection.execute(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread,
                    SUM(CASE WHEN priority = 'urgent' AND is_read = FALSE THEN 1 ELSE 0 END) as urgent,
                    SUM(CASE WHEN priority = 'high' AND is_read = FALSE THEN 1 ELSE 0 END) as high
                FROM notifications 
                WHERE user_id = ? 
                AND is_dismissed = FALSE
                AND (expires_at IS NULL OR expires_at > NOW())
            `, [userId]);

            return countRows[0];
        } catch (error) {
            console.error('Error getting notification counts:', error);
            throw error;
        }
    }

    // Queue email notification
    async queueEmailNotification(userId, typeName, templateData, options = {}) {
        const connection = getConnection();

        try {
            const {
                priority = 'normal',
                scheduledAt = null,
                recipientEmail = null
            } = options;

            // Get notification type and template
            const [typeRows] = await connection.execute(`
                SELECT nt.id, nt.name, ntp.id as template_id, ntp.subject, ntp.body_html, ntp.body_text
                FROM notification_types nt
                LEFT JOIN notification_templates ntp ON nt.id = ntp.notification_type_id
                WHERE nt.name = ? AND nt.is_active = TRUE
                ORDER BY ntp.language = 'en' DESC
                LIMIT 1
            `, [typeName]);

            if (typeRows.length === 0) {
                throw new Error(`Notification type '${typeName}' not found`);
            }

            const type = typeRows[0];
            let emailBody = type.body_html || type.body_text;
            let subject = type.subject;

            // Replace template variables
            if (emailBody && templateData) {
                Object.keys(templateData).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    emailBody = emailBody.replace(regex, templateData[key]);
                    if (subject) {
                        subject = subject.replace(regex, templateData[key]);
                    }
                });
            }

            // Get recipient email if not provided
            if (!recipientEmail) {
                const [userRows] = await connection.execute(
                    'SELECT email FROM users WHERE id = ?',
                    [userId]
                );

                if (userRows.length === 0) {
                    throw new Error('User not found');
                }
                recipientEmail = userRows[0].email;
            }

            // Queue the email
            const [result] = await connection.execute(`
                INSERT INTO notification_queue (
                    user_id, notification_type_id, template_id, recipient_email,
                    subject, message, html_message, data, priority, delivery_method,
                    scheduled_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'email', ?)
            `, [
                userId, type.id, type.template_id, recipientEmail,
                subject, type.body_text, emailBody, JSON.stringify(templateData),
                priority, scheduledAt || new Date()
            ]);

            return result.insertId;
        } catch (error) {
            console.error('Error queuing email notification:', error);
            throw error;
        }
    }

    // Process email queue
    async processEmailQueue() {
        const connection = getConnection();

        try {
            // Get pending emails
            const [pendingEmails] = await connection.execute(`
                SELECT * FROM notification_queue
                WHERE delivery_method = 'email' 
                AND status = 'pending'
                AND scheduled_at <= NOW()
                AND attempts < max_attempts
                ORDER BY priority DESC, scheduled_at ASC
                LIMIT 50
            `);

            for (const email of pendingEmails) {
                try {
                    // Update status to processing
                    await connection.execute(
                        'UPDATE notification_queue SET status = "processing", attempts = attempts + 1 WHERE id = ?',
                        [email.id]
                    );

                    // Send email
                    const mailOptions = {
                        from: process.env.EMAIL_FROM || 'noreply@orthodoxmetrics.com',
                        to: email.recipient_email,
                        subject: email.subject,
                        text: email.message,
                        html: email.html_message
                    };

                    await emailTransporter.sendMail(mailOptions);

                    // Mark as sent
                    await connection.execute(
                        'UPDATE notification_queue SET status = "sent", sent_at = NOW() WHERE id = ?',
                        [email.id]
                    );

                    // Record in history
                    await connection.execute(`
                        INSERT INTO notification_history (
                            user_id, notification_type_id, template_id, delivery_method,
                            recipient, subject, message, status, sent_at
                        ) VALUES (?, ?, ?, 'email', ?, ?, ?, 'sent', NOW())
                    `, [
                        email.user_id, email.notification_type_id, email.template_id,
                        email.recipient_email, email.subject, email.message
                    ]);

                    console.log(`Email sent successfully to ${email.recipient_email}`);
                } catch (error) {
                    console.error(`Error sending email to ${email.recipient_email}:`, error);

                    // Mark as failed if max attempts reached
                    if (email.attempts >= email.max_attempts - 1) {
                        await connection.execute(
                            'UPDATE notification_queue SET status = "failed", failed_at = NOW(), error_message = ? WHERE id = ?',
                            [error.message, email.id]
                        );
                    } else {
                        await connection.execute(
                            'UPDATE notification_queue SET status = "pending" WHERE id = ?',
                            [email.id]
                        );
                    }
                }
            }

            return pendingEmails.length;
        } catch (error) {
            console.error('Error processing email queue:', error);
            throw error;
        }
    }

    // Get user notification preferences
    async getUserPreferences(userId) {
        const connection = getConnection();

        try {
            const [preferences] = await connection.execute(`
                SELECT 
                    nt.name as type_name,
                    nt.category,
                    COALESCE(unp.email_enabled, nt.default_enabled) as email_enabled,
                    COALESCE(unp.push_enabled, nt.default_enabled) as push_enabled,
                    COALESCE(unp.in_app_enabled, nt.default_enabled) as in_app_enabled,
                    COALESCE(unp.sms_enabled, FALSE) as sms_enabled,
                    COALESCE(unp.frequency, 'immediate') as frequency
                FROM notification_types nt
                LEFT JOIN user_notification_preferences unp ON nt.id = unp.notification_type_id AND unp.user_id = ?
                WHERE nt.is_active = TRUE
                ORDER BY nt.category, nt.name
            `, [userId]);

            return preferences;
        } catch (error) {
            console.error('Error getting user preferences:', error);
            throw error;
        }
    }

    // Update user notification preferences
    async updateUserPreferences(userId, preferences) {
        const connection = getConnection();

        try {
            for (const pref of preferences) {
                const [typeRows] = await connection.execute(
                    'SELECT id FROM notification_types WHERE name = ?',
                    [pref.type_name]
                );

                if (typeRows.length > 0) {
                    await connection.execute(`
                        INSERT INTO user_notification_preferences (
                            user_id, notification_type_id, email_enabled, push_enabled, 
                            in_app_enabled, sms_enabled, frequency
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                        email_enabled = VALUES(email_enabled),
                        push_enabled = VALUES(push_enabled),
                        in_app_enabled = VALUES(in_app_enabled),
                        sms_enabled = VALUES(sms_enabled),
                        frequency = VALUES(frequency),
                        updated_at = NOW()
                    `, [
                        userId, typeRows[0].id, pref.email_enabled, pref.push_enabled,
                        pref.in_app_enabled, pref.sms_enabled, pref.frequency
                    ]);
                }
            }

            return true;
        } catch (error) {
            console.error('Error updating user preferences:', error);
            throw error;
        }
    }
}

// Create notification service instance
const notificationService = new NotificationService();

// Initialize notification types if they don't exist (only run on first API call)
let initializationAttempted = false;

async function initializeNotificationTypes() {
    if (initializationAttempted) return;
    initializationAttempted = true;
    
    try {
        console.log('📢 Checking notification types...');
        const [types] = await promisePool.execute('SELECT COUNT(*) as count FROM notification_types');
        console.log(`✅ Found ${types[0].count} notification types in database`);
        
        if (types[0].count === 0) {
            console.log('📢 No notification types found, creating defaults...');
            await promisePool.execute(`
                INSERT INTO notification_types (name, description, category, default_enabled) VALUES
                ('welcome', 'Welcome message for new users', 'user', TRUE),
                ('password_reset', 'Password reset notifications', 'security', TRUE),
                ('login_alert', 'Login alert notifications', 'security', TRUE),
                ('profile_updated', 'Profile update confirmations', 'user', TRUE),
                ('backup_completed', 'Backup completion notifications', 'backup', TRUE),
                ('backup_failed', 'Backup failure notifications', 'backup', TRUE),
                ('certificate_ready', 'Certificate ready notifications', 'certificates', TRUE),
                ('certificate_expiring', 'Certificate expiring reminders', 'certificates', TRUE),
                ('invoice_created', 'New invoice notifications', 'billing', TRUE),
                ('invoice_paid', 'Invoice payment confirmations', 'billing', TRUE),
                ('invoice_overdue', 'Overdue invoice reminders', 'billing', TRUE),
                ('system_maintenance', 'System maintenance notifications', 'system', TRUE),
                ('system_alert', 'System alert notifications', 'system', TRUE),
                ('user_activity', 'User activity notifications', 'admin', FALSE),
                ('data_export_ready', 'Data export ready notifications', 'system', TRUE),
                ('reminder_baptism', 'Baptism anniversary reminders', 'reminders', TRUE),
                ('reminder_marriage', 'Marriage anniversary reminders', 'reminders', TRUE),
                ('reminder_funeral', 'Memorial service reminders', 'reminders', TRUE),
                ('note_shared', 'Note sharing notifications', 'user', TRUE),
                ('note_comment', 'Note comment notifications', 'user', TRUE),
                ('church_invitation', 'Church invitation notifications', 'user', TRUE),
                ('role_changed', 'Role change notifications', 'admin', TRUE),
                ('account_locked', 'Account security notifications', 'security', TRUE),
                ('weekly_digest', 'Weekly activity digest', 'user', FALSE),
                ('monthly_report', 'Monthly report notifications', 'admin', FALSE)
            `);
            console.log('✅ Default notification types created');
        }
    } catch (error) {
        console.error('Warning: Could not initialize notification types:', error.message);
        // Don't throw error - let the system continue working
    }
}

// ============================================================================
// API Routes
// ============================================================================

// Get user notifications
router.get('/notifications', requireAuth, async (req, res) => {
    try {
        // Initialize notification types on first API call (when database connection is established)
        await initializeNotificationTypes();
        
        const { limit = 20, offset = 0, unread_only = false, category, priority } = req.query;
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const notifications = await notificationService.getUserNotifications(userId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            unreadOnly: unread_only === 'true',
            category,
            priority
        });

        res.json({
            success: true,
            notifications,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: notifications.length
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        
        // If it's a database connection issue, return empty notifications instead of error
        if (error.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || error.code === 'ECONNREFUSED') {
            console.log('Database connection issue, returning empty notifications');
            res.json({
                success: true,
                notifications: [],
                pagination: { limit: 20, offset: 0, total: 0 },
                message: 'Notifications temporarily unavailable'
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
        }
    }
});

// Get notification counts - /api/notifications/counts
router.get('/notifications/counts', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const counts = await notificationService.getNotificationCounts(userId);
        res.json({ success: true, counts });
    } catch (error) {
        console.error('Error fetching notification counts:', error);
        
        // If it's a database connection issue, return zero counts instead of error
        if (error.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || error.code === 'ECONNREFUSED') {
            console.log('Database connection issue, returning zero counts');
            res.json({
                success: true,
                counts: { total: 0, unread: 0, urgent: 0, high: 0 }
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to fetch notification counts' });
        }
    }
});

// Get notification counts - /notifications/counts (direct route for proxy compatibility)
router.get('/counts', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const counts = await notificationService.getNotificationCounts(userId);
        res.json({ success: true, counts });
    } catch (error) {
        console.error('Error fetching notification counts:', error);
        
        // If it's a database connection issue, return zero counts instead of error
        if (error.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' || error.code === 'ECONNREFUSED') {
            console.log('Database connection issue, returning zero counts');
            res.json({
                success: true,
                counts: { total: 0, unread: 0, urgent: 0, high: 0 }
            });
        } else {
            res.status(500).json({ success: false, message: 'Failed to fetch notification counts' });
        }
    }
});

// Mark notification as read
router.put('/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const success = await notificationService.markAsRead(id, userId);

        if (success) {
            res.json({ success: true, message: 'Notification marked as read' });
        } else {
            res.status(404).json({ success: false, message: 'Notification not found' });
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const updatedCount = await notificationService.markAllAsRead(userId);
        res.json({ success: true, message: `${updatedCount} notifications marked as read` });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
    }
});

// Dismiss notification
router.delete('/notifications/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const success = await notificationService.dismissNotification(id, userId);

        if (success) {
            res.json({ success: true, message: 'Notification dismissed' });
        } else {
            res.status(404).json({ success: false, message: 'Notification not found' });
        }
    } catch (error) {
        console.error('Error dismissing notification:', error);
        res.status(500).json({ success: false, message: 'Failed to dismiss notification' });
    }
});

// Get user notification preferences
router.get('/notifications/preferences', requireAuth, async (req, res) => {
    try {
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const preferences = await notificationService.getUserPreferences(userId);
        res.json({ success: true, preferences });
    } catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notification preferences' });
    }
});

// Update user notification preferences
router.put('/notifications/preferences', requireAuth, async (req, res) => {
    try {
        const { preferences } = req.body;
        const userId = req.session?.user?.id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        await notificationService.updateUserPreferences(userId, preferences);
        res.json({ success: true, message: 'Notification preferences updated' });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
    }
});

// Admin routes
router.get('/admin/notifications/types', requireRole(['super_admin']), async (req, res) => {
    try {
        const connection = getConnection();
        const [types] = await connection.execute('SELECT * FROM notification_types ORDER BY category, name');
        res.json({ success: true, types });
    } catch (error) {
        console.error('Error fetching notification types:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notification types' });
    }
});

router.get('/admin/notifications/templates', requireRole(['super_admin']), async (req, res) => {
    try {
        const connection = getConnection();
        const [templates] = await connection.execute(`
            SELECT nt.*, ntp.name as type_name, ntp.category
            FROM notification_templates nt
            JOIN notification_types ntp ON nt.notification_type_id = ntp.id
            ORDER BY ntp.category, ntp.name, nt.language
        `);
        res.json({ success: true, templates });
    } catch (error) {
        console.error('Error fetching notification templates:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notification templates' });
    }
});

router.get('/admin/notifications/queue', requireRole(['super_admin']), async (req, res) => {
    try {
        const connection = getConnection();
        
        // Get custom notifications (drafts and scheduled)
        const [customNotifications] = await connection.execute(`
            SELECT 
                n.id,
                n.title,
                n.message,
                n.priority,
                n.created_at,
                n.data,
                CASE 
                    WHEN JSON_EXTRACT(n.data, '$.is_draft') = true THEN 'draft'
                    WHEN JSON_EXTRACT(n.data, '$.scheduled_at') IS NOT NULL THEN 'pending'
                    ELSE 'sent'
                END as status,
                COALESCE(JSON_EXTRACT(n.data, '$.scheduled_at'), n.created_at) as scheduled_at,
                COALESCE(JSON_EXTRACT(n.data, '$.target_audience'), 'unknown') as target_audience,
                COALESCE(JSON_EXTRACT(n.data, '$.target_user_count'), 1) as user_count
            FROM notifications n
            WHERE JSON_EXTRACT(n.data, '$.custom_notification') = true
            ORDER BY n.created_at DESC
            LIMIT 50
        `);
        
        // Also get email queue if it exists
        let emailQueue = [];
        try {
            const [emailResults] = await connection.execute(`
                SELECT nq.*, nt.name as type_name, u.email as user_email
                FROM notification_queue nq
                JOIN notification_types nt ON nq.notification_type_id = nt.id
                JOIN users u ON nq.user_id = u.id
                ORDER BY nq.priority DESC, nq.scheduled_at ASC
                LIMIT 50
            `);
            emailQueue = emailResults;
        } catch (emailError) {
            // Email queue table might not exist, that's okay
            console.log('Email queue table not found, skipping...');
        }
        
        // Process custom notifications to clean up the data
        const processedCustom = customNotifications.map(notif => ({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            priority: notif.priority,
            scheduled_at: notif.scheduled_at,
            target_audience: notif.target_audience?.replace(/"/g, '') || 'all',
            status: notif.status,
            created_at: notif.created_at,
            user_count: parseInt(notif.user_count) || 0
        }));
        
        res.json({ 
            success: true, 
            queue: processedCustom,
            emailQueue: emailQueue 
        });
    } catch (error) {
        console.error('Error fetching notification queue:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notification queue' });
    }
});

// Process email queue manually (for testing)
router.post('/admin/notifications/process-queue', requireRole(['super_admin']), async (req, res) => {
    try {
        const processedCount = await notificationService.processEmailQueue();
        res.json({ success: true, message: `Processed ${processedCount} emails` });
    } catch (error) {
        console.error('Error processing email queue:', error);
        res.status(500).json({ success: false, message: 'Failed to process email queue' });
    }
});

// Get all notification types for admin management
router.get('/admin/notifications/types', requireRole(['super_admin']), async (req, res) => {
    try {
        const connection = getConnection();
        const [types] = await connection.execute(`
            SELECT id, name, description, category, default_enabled, is_active
            FROM notification_types
            ORDER BY category, name
        `);
        res.json({ success: true, types });
    } catch (error) {
        console.error('Error fetching notification types:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notification types' });
    }
});

// Toggle notification type system-wide
router.put('/admin/notifications/types/:id/toggle', requireRole(['super_admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;
        
        const connection = getConnection();
        const [result] = await connection.execute(`
            UPDATE notification_types 
            SET default_enabled = ?
            WHERE id = ?
        `, [enabled, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Notification type not found' });
        }
        
        console.log(`📢 Notification type ${id} ${enabled ? 'enabled' : 'disabled'} system-wide by ${req.session.user?.email}`);
        res.json({ success: true, message: `Notification type ${enabled ? 'enabled' : 'disabled'} system-wide` });
    } catch (error) {
        console.error('Error toggling notification type:', error);
        res.status(500).json({ success: false, message: 'Failed to update notification type' });
    }
});

// Create custom system-wide notification
router.post('/admin/notifications/custom', requireRole(['super_admin']), async (req, res) => {
    try {
        const {
            title,
            message,
            priority = 'normal',
            scheduled_at = null,
            target_audience = 'all',
            church_id = null,
            icon = '📢',
            action_url = null,
            action_text = null,
            is_draft = false
        } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        
        const connection = getConnection();
        
        // If not a draft and no scheduled time, send immediately
        const shouldSendNow = !is_draft && !scheduled_at;
        const scheduledDate = scheduled_at ? new Date(scheduled_at) : (shouldSendNow ? new Date() : null);
        
        // Get target users based on audience
        let userQuery = '';
        let userParams = [];
        
        switch (target_audience) {
            case 'all':
                userQuery = 'SELECT id FROM users WHERE is_active = 1';
                break;
            case 'admins':
                userQuery = "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1";
                break;
            case 'users':
                userQuery = "SELECT id FROM users WHERE role NOT IN ('admin', 'super_admin') AND is_active = 1";
                break;
            case 'church_specific':
                if (!church_id) {
                    return res.status(400).json({ success: false, message: 'Church ID required for church-specific notifications' });
                }
                userQuery = 'SELECT id FROM users WHERE church_id = ? AND is_active = 1';
                userParams = [church_id];
                break;
            default:
                return res.status(400).json({ success: false, message: 'Invalid target audience' });
        }
        
        // Get target user IDs
        const [users] = await connection.execute(userQuery, userParams);
        
        if (users.length === 0) {
            return res.status(400).json({ success: false, message: 'No target users found for this audience' });
        }
        
        // If sending now, create notifications for all target users
        if (shouldSendNow) {
            const notifications = users.map(user => [
                user.id,
                1, // Use 'system_alert' notification type
                title,
                message,
                JSON.stringify({
                    target_audience,
                    church_id,
                    custom_notification: true,
                    created_by: req.session.user?.email
                }),
                priority,
                action_url,
                action_text,
                null, // expires_at
                icon,
                null // image_url
            ]);
            
            await connection.execute(`
                INSERT INTO notifications (
                    user_id, notification_type_id, title, message, data, 
                    priority, action_url, action_text, expires_at, icon, image_url
                ) VALUES ?
            `, [notifications]);
            
            console.log(`📢 Custom notification "${title}" sent to ${users.length} users by ${req.session.user?.email}`);
            res.json({ 
                success: true, 
                message: `Notification sent to ${users.length} users`,
                recipients: users.length
            });
        } else {
            // Store in custom notifications queue/history table (you may need to create this table)
            // For now, we'll create a single notification record to track the custom notification
            const [result] = await connection.execute(`
                INSERT INTO notifications (
                    user_id, notification_type_id, title, message, data, 
                    priority, action_url, action_text, expires_at, icon, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.session.user.id, // Store under the creator's ID for drafts
                1, // system_alert type
                title,
                message,
                JSON.stringify({
                    target_audience,
                    church_id,
                    scheduled_at: scheduledDate?.toISOString(),
                    is_draft,
                    target_user_count: users.length,
                    custom_notification: true,
                    created_by: req.session.user?.email
                }),
                priority,
                action_url,
                action_text,
                null,
                icon,
                null
            ]);
            
            const status = is_draft ? 'saved as draft' : 'scheduled';
            console.log(`📢 Custom notification "${title}" ${status} by ${req.session.user?.email}`);
            res.json({ 
                success: true, 
                message: `Notification ${status} successfully`,
                id: result.insertId,
                scheduled_recipients: users.length
            });
        }
    } catch (error) {
        console.error('Error creating custom notification:', error);
        res.status(500).json({ success: false, message: 'Failed to create custom notification' });
    }
});

// Export the service and router
module.exports = { router, notificationService };
