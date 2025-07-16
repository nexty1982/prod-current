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

// ============================================================================
// API Routes
// ============================================================================

// Get user notifications
router.get('/notifications', requireAuth, async (req, res) => {
    try {
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
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
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
        res.status(500).json({ success: false, message: 'Failed to fetch notification counts' });
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
        res.status(500).json({ success: false, message: 'Failed to fetch notification counts' });
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
        const [queue] = await connection.execute(`
            SELECT nq.*, nt.name as type_name, u.email as user_email
            FROM notification_queue nq
            JOIN notification_types nt ON nq.notification_type_id = nt.id
            JOIN users u ON nq.user_id = u.id
            ORDER BY nq.priority DESC, nq.scheduled_at ASC
            LIMIT 100
        `);
        res.json({ success: true, queue });
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

// Export the service and router
module.exports = { router, notificationService };
