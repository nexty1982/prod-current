const express = require('express');
const { promisePool } = require('../../config/db');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

// =============================================================================
// NOTIFICATION MANAGEMENT
// =============================================================================

// GET /api/social/notifications - Get user's notifications
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { 
            limit = 20, 
            offset = 0, 
            type, 
            is_read, 
            priority 
        } = req.query;

        let query = `
            SELECT 
                n.id,
                nt.name as type,
                n.title,
                n.message,
                n.data,
                n.is_read,
                n.priority,
                n.expires_at,
                n.action_url,
                n.created_at,
                n.read_at,
                u.id as sender_id,
                u.first_name as sender_first_name,
                u.last_name as sender_last_name,
                up.display_name as sender_display_name,
                up.profile_image_url as sender_avatar
            FROM notifications n
            LEFT JOIN notification_types nt ON n.notification_type_id = nt.id
            LEFT JOIN orthodoxmetrics_auth_db.users u ON n.sender_id = u.id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE n.user_id = ?
            AND (n.expires_at IS NULL OR n.expires_at > NOW())
        `;

        const params = [userId];

        // Add filters
        if (type) {
            query += ' AND nt.name = ?';
            params.push(type);
        }

        if (is_read !== undefined) {
            query += ' AND n.is_read = ?';
            params.push(is_read === 'true' ? 1 : 0);
        }

        if (priority) {
            query += ' AND n.priority = ?';
            params.push(priority);
        }

        query += ' ORDER BY n.priority DESC, n.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [notifications] = await promisePool.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM notifications n
            LEFT JOIN notification_types nt ON n.notification_type_id = nt.id
            WHERE n.user_id = ?
            AND (n.expires_at IS NULL OR n.expires_at > NOW())
        `;
        const countParams = [userId];

        if (type) {
            countQuery += ' AND nt.name = ?';
            countParams.push(type);
        }

        if (is_read !== undefined) {
            countQuery += ' AND n.is_read = ?';
            countParams.push(is_read === 'true' ? 1 : 0);
        }

        if (priority) {
            countQuery += ' AND n.priority = ?';
            countParams.push(priority);
        }

        const [countResult] = await promisePool.query(countQuery, countParams);

        // Get unread count
        const [unreadResult] = await promisePool.query(`
            SELECT COUNT(*) as unread_count
            FROM notifications 
            WHERE user_id = ? AND is_read = 0
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [userId]);

        // Process notifications data
        const processedNotifications = notifications.map(notification => ({
            ...notification,
            data: notification.data ? JSON.parse(notification.data) : {},
            sender: notification.sender_id ? {
                id: notification.sender_id,
                first_name: notification.sender_first_name,
                last_name: notification.sender_last_name,
                display_name: notification.sender_display_name,
                profile_image_url: notification.sender_avatar,
                full_name: `${notification.sender_first_name} ${notification.sender_last_name}`.trim()
            } : null,
            time_ago: getTimeAgo(notification.created_at),
            is_expired: notification.expires_at ? new Date(notification.expires_at) < new Date() : false
        }));

        res.json({
            success: true,
            notifications: processedNotifications,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                unread_count: unreadResult[0].unread_count
            }
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
});

// GET /api/social/notifications/unread - Get unread notifications count
router.get('/unread', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [result] = await promisePool.query(`
            SELECT 
                COUNT(*) as total_unread,
                SUM(CASE WHEN type = 'friend_request' THEN 1 ELSE 0 END) as friend_requests,
                SUM(CASE WHEN type = 'chat_message' THEN 1 ELSE 0 END) as chat_messages,
                SUM(CASE WHEN type = 'blog_comment' THEN 1 ELSE 0 END) as blog_comments,
                SUM(CASE WHEN type = 'blog_like' THEN 1 ELSE 0 END) as blog_likes,
                SUM(CASE WHEN type = 'blog_access_request' THEN 1 ELSE 0 END) as blog_access_requests,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_notifications
            FROM notifications 
            WHERE user_id = ? AND is_read = 0
            AND (expires_at IS NULL OR expires_at > NOW())
        `, [userId]);

        res.json({
            success: true,
            counts: result[0]
        });

    } catch (error) {
        console.error('Error fetching unread notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread notifications',
            error: error.message
        });
    }
});

// PUT /api/social/notifications/:id/read - Mark notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: notificationId } = req.params;

        const [result] = await promisePool.query(`
            UPDATE notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
});

// PUT /api/social/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        await promisePool.query(`
            UPDATE notifications 
            SET is_read = 1, read_at = NOW() 
            WHERE user_id = ? AND is_read = 0
        `, [userId]);

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
});

// DELETE /api/social/notifications/:id - Delete notification
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: notificationId } = req.params;

        const [result] = await promisePool.query(`
            DELETE FROM notifications 
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
});

// DELETE /api/social/notifications/clear-read - Delete all read notifications
router.delete('/clear-read', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [result] = await promisePool.query(`
            DELETE FROM notifications 
            WHERE user_id = ? AND is_read = 1
        `, [userId]);

        res.json({
            success: true,
            message: `${result.affectedRows} read notifications cleared`
        });

    } catch (error) {
        console.error('Error clearing read notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear read notifications',
            error: error.message
        });
    }
});

// POST /api/social/notifications/:id/action - Handle notification actions (accept/decline friend requests, etc.)
router.post('/:id/action', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id: notificationId } = req.params;
        const { action } = req.body;

        // Get the notification
        const [notifications] = await promisePool.query(`
            SELECT n.*, nt.name as type_name
            FROM notifications n
            JOIN notification_types nt ON nt.id = n.notification_type_id
            WHERE n.id = ? AND n.user_id = ?
        `, [notificationId, userId]);

        if (notifications.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        const notification = notifications[0];
        const notificationData = JSON.parse(notification.data || '{}');

        // Handle friend request actions
        if (notification.type_name === 'friend_request' && notificationData.action_type === 'friend_request_received') {
            const requestId = notificationData.request_id;
            const requesterId = notificationData.requester_id;

            if (action === 'accept') {
                // Accept the friend request
                const [updateResult] = await promisePool.query(`
                    UPDATE friendships 
                    SET status = 'accepted', accepted_at = NOW()
                    WHERE id = ? AND addressee_id = ? AND status = 'pending'
                `, [requestId, userId]);

                if (updateResult.affectedRows === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Friend request not found or already processed'
                    });
                }

                // Mark the notification as read and update data
                await promisePool.query(`
                    UPDATE notifications 
                    SET is_read = 1, read_at = NOW(), data = ?
                    WHERE id = ?
                `, [JSON.stringify({...notificationData, action_taken: 'accepted'}), notificationId]);

                // Create notification for the requester that their request was accepted
                const [requesterInfo] = await promisePool.query(`
                    SELECT first_name, last_name FROM orthodoxmetrics_auth_db.users WHERE id = ?
                `, [userId]);

                const [friendRequestTypeId] = await promisePool.query(`
                    SELECT id FROM notification_types WHERE name = 'friend_accepted'
                `);

                if (requesterInfo.length > 0 && friendRequestTypeId.length > 0) {
                    await promisePool.query(`
                        INSERT INTO notifications (user_id, notification_type_id, title, message, data, sender_id)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        requesterId,
                        friendRequestTypeId[0].id,
                        'Friend Request Accepted',
                        `${requesterInfo[0].first_name} ${requesterInfo[0].last_name} accepted your friend request`,
                        JSON.stringify({
                            request_id: requestId,
                            action_type: 'friend_request_accepted',
                            accepter_id: userId
                        }),
                        userId
                    ]);
                }

                res.json({
                    success: true,
                    message: 'Friend request accepted',
                    action: 'accepted'
                });

            } else if (action === 'decline') {
                // Decline the friend request
                const [updateResult] = await promisePool.query(`
                    UPDATE friendships 
                    SET status = 'declined', declined_at = NOW()
                    WHERE id = ? AND addressee_id = ? AND status = 'pending'
                `, [requestId, userId]);

                if (updateResult.affectedRows === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Friend request not found or already processed'
                    });
                }

                // Mark the notification as read and update data
                await promisePool.query(`
                    UPDATE notifications 
                    SET is_read = 1, read_at = NOW(), data = ?
                    WHERE id = ?
                `, [JSON.stringify({...notificationData, action_taken: 'declined'}), notificationId]);

                res.json({
                    success: true,
                    message: 'Friend request declined',
                    action: 'declined'
                });

            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action. Use "accept", "decline", or "unsend"'
                });
            }
        } else if (notification.type_name === 'friend_request' && notificationData.action_type === 'friend_request_sent') {
            const requestId = notificationData.request_id;
            const targetUserId = notificationData.target_user_id;

            if (action === 'unsend') {
                // Unsend (delete) the friend request
                const [deleteResult] = await promisePool.query(`
                    DELETE FROM friendships 
                    WHERE id = ? AND requester_id = ? AND status = 'pending'
                `, [requestId, userId]);

                if (deleteResult.affectedRows === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Friend request not found or already processed'
                    });
                }

                // Mark the notification as read and update data
                await promisePool.query(`
                    UPDATE notifications 
                    SET is_read = 1, read_at = NOW(), data = ?
                    WHERE id = ?
                `, [JSON.stringify({...notificationData, action_taken: 'unsent'}), notificationId]);

                // Remove any pending notification for the recipient
                await promisePool.query(`
                    DELETE FROM notifications 
                    WHERE JSON_EXTRACT(data, '$.request_id') = ? 
                    AND JSON_EXTRACT(data, '$.action_type') = 'friend_request_received'
                `, [requestId]);

                res.json({
                    success: true,
                    message: 'Friend request unsent',
                    action: 'unsent'
                });

            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action for sent friend request. Use "unsend"'
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: 'This notification does not support actions'
            });
        }

    } catch (error) {
        console.error('Error handling notification action:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to handle notification action',
            error: error.message
        });
    }
});

// =============================================================================
// NOTIFICATION SETTINGS
// =============================================================================

// GET /api/social/notifications/settings - Get notification settings
router.get('/settings', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [settings] = await promisePool.query(`
            SELECT 
                notifications_enabled,
                email_notifications,
                push_notifications,
                custom_settings
            FROM user_social_settings 
            WHERE user_id = ?
        `, [userId]);

        if (settings.length === 0) {
            // Create default settings if not found
            await promisePool.query(`
                INSERT INTO user_social_settings (user_id)
                VALUES (?)
            `, [userId]);

            res.json({
                success: true,
                settings: {
                    notifications_enabled: true,
                    email_notifications: true,
                    push_notifications: true,
                    custom_settings: {}
                }
            });
        } else {
            res.json({
                success: true,
                settings: {
                    ...settings[0],
                    custom_settings: settings[0].custom_settings ? JSON.parse(settings[0].custom_settings) : {}
                }
            });
        }

    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification settings',
            error: error.message
        });
    }
});

// PUT /api/social/notifications/settings - Update notification settings
router.put('/settings', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { 
            notifications_enabled,
            email_notifications,
            push_notifications,
            custom_settings = {}
        } = req.body;

        await promisePool.query(`
            UPDATE user_social_settings 
            SET 
                notifications_enabled = COALESCE(?, notifications_enabled),
                email_notifications = COALESCE(?, email_notifications),
                push_notifications = COALESCE(?, push_notifications),
                custom_settings = COALESCE(?, custom_settings),
                updated_at = NOW()
            WHERE user_id = ?
        `, [
            notifications_enabled,
            email_notifications,
            push_notifications,
            JSON.stringify(custom_settings),
            userId
        ]);

        res.json({
            success: true,
            message: 'Notification settings updated successfully'
        });

    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification settings',
            error: error.message
        });
    }
});

// =============================================================================
// NOTIFICATION CREATION HELPERS
// =============================================================================

// POST /api/social/notifications/send - Send custom notification (admin only)
router.post('/send', requireAuth, async (req, res) => {
    try {
        const senderId = req.session.user.id;
        const { 
            user_id, 
            type, 
            title, 
            message, 
            data = {}, 
            priority = 'normal',
            action_url,
            expires_at
        } = req.body;

        // Check if sender has permission (admin/super_admin)
        const [sender] = await promisePool.query(
            'SELECT role FROM orthodoxmetrics_auth_db.users WHERE id = ?',
            [senderId]
        );

        if (!['admin', 'super_admin'].includes(sender[0]?.role)) {
            return res.status(403).json({
                success: false,
                message: 'Permission denied. Admin access required.'
            });
        }

        if (!user_id || !type || !title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: user_id, type, title, message'
            });
        }

        const [result] = await promisePool.query(`
            INSERT INTO notifications 
            (user_id, notification_type_id, title, message, data, priority, action_url, expires_at, sender_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user_id,
            type,
            title,
            message,
            JSON.stringify(data),
            priority,
            action_url,
            expires_at,
            senderId
        ]);

        res.status(201).json({
            success: true,
            message: 'Notification sent successfully',
            notification_id: result.insertId
        });

    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification',
            error: error.message
        });
    }
});

// =============================================================================
// REAL-TIME NOTIFICATION HELPERS
// =============================================================================

// Function to create notification (can be called from other modules)
const createNotification = async (notificationData) => {
    try {
        const {
            user_id,
            type,
            title,
            message,
            data = {},
            priority = 'normal',
            action_url,
            expires_at,
            sender_id
        } = notificationData;

        const [result] = await promisePool.query(`
            INSERT INTO notifications 
            (user_id, notification_type_id, title, message, data, priority, action_url, expires_at, sender_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user_id,
            type,
            title,
            message,
            JSON.stringify(data),
            priority,
            action_url,
            expires_at,
            sender_id
        ]);

        return {
            success: true,
            notification_id: result.insertId
        };

    } catch (error) {
        console.error('Error creating notification:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Function to send bulk notifications
const createBulkNotifications = async (notifications) => {
    try {
        const values = notifications.map(n => [
            n.user_id,
            n.type,
            n.title,
            n.message,
            JSON.stringify(n.data || {}),
            n.priority || 'normal',
            n.action_url || null,
            n.expires_at || null,
            n.sender_id || null
        ]);

        await promisePool.query(`
            INSERT INTO notifications 
            (user_id, notification_type_id, title, message, data, priority, action_url, expires_at, sender_id)
            VALUES ?
        `, [values]);

        return {
            success: true,
            count: notifications.length
        };

    } catch (error) {
        console.error('Error creating bulk notifications:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / 60000);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    
    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears}y ago`;
}

// Export helper functions for use in other modules
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.createBulkNotifications = createBulkNotifications; 