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
// FRIEND SEARCH AND DISCOVERY
// =============================================================================

// GET /api/social/friends/search - Search for users to add as friends
router.get('/search', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { q: searchTerm, limit = 20, offset = 0 } = req.query;

        if (!searchTerm || searchTerm.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search term must be at least 2 characters'
            });
        }

        const [users] = await promisePool.query(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                up.display_name,
                up.bio,
                up.profile_image_url,
                up.location,
                up.is_online,
                up.last_seen,
                CASE 
                    WHEN f.id IS NOT NULL THEN f.status
                    ELSE NULL
                END as friendship_status,
                CASE 
                    WHEN f.requester_id = ? THEN 'sent'
                    WHEN f.addressee_id = ? THEN 'received'
                    ELSE NULL
                END as friendship_direction
            FROM users u
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN friendships f ON (
                (f.requester_id = ? AND f.addressee_id = u.id) OR 
                (f.requester_id = u.id AND f.addressee_id = ?)
            )
            WHERE u.id != ? 
            AND u.is_active = 1
            AND (
                u.first_name LIKE ? OR 
                u.last_name LIKE ? OR 
                u.email LIKE ? OR
                up.display_name LIKE ?
            )
            ORDER BY 
                CASE WHEN f.status = 'accepted' THEN 0 ELSE 1 END,
                CASE WHEN up.is_online THEN 0 ELSE 1 END,
                up.display_name ASC,
                CONCAT(u.first_name, ' ', u.last_name) ASC
            LIMIT ? OFFSET ?
        `, [
            userId, userId, userId, userId, userId,
            `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`,
            parseInt(limit), parseInt(offset)
        ]);

        // Get total count
        const [countResult] = await promisePool.query(`
            SELECT COUNT(*) as total
            FROM users u
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.id != ? 
            AND u.is_active = 1
            AND (
                u.first_name LIKE ? OR 
                u.last_name LIKE ? OR 
                u.email LIKE ? OR
                up.display_name LIKE ?
            )
        `, [
            userId,
            `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`
        ]);

        res.json({
            success: true,
            users: users.map(user => ({
                ...user,
                can_send_request: !user.friendship_status,
                is_friend: user.friendship_status === 'accepted',
                has_pending_request: user.friendship_status === 'pending'
            })),
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('Error searching for friends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search for friends',
            error: error.message
        });
    }
});

// =============================================================================
// FRIEND REQUESTS
// =============================================================================

// POST /api/social/friends/request/:userId - Send friend request
router.post('/request/:userId', requireAuth, async (req, res) => {
    try {
        const requesterId = req.session.user.id;
        const { userId: addresseeId } = req.params;
        const { message } = req.body;

        if (requesterId == addresseeId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself'
            });
        }

        // Check if target user exists and is active
        const [targetUser] = await promisePool.query(
            'SELECT id, first_name, last_name FROM users WHERE id = ? AND is_active = 1',
            [addresseeId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if friendship already exists
        const [existing] = await promisePool.query(`
            SELECT id, status FROM friendships 
            WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
        `, [requesterId, addresseeId, addresseeId, requesterId]);

        if (existing.length > 0) {
            const status = existing[0].status;
            let message = 'Friend request already exists';
            
            switch (status) {
                case 'pending':
                    message = 'Friend request is already pending';
                    break;
                case 'accepted':
                    message = 'You are already friends';
                    break;
                case 'declined':
                    message = 'Previous friend request was declined';
                    break;
                case 'blocked':
                    message = 'Cannot send friend request';
                    break;
            }

            return res.status(400).json({
                success: false,
                message,
                status
            });
        }

        // Send friend request using stored procedure
        await promisePool.query(
            'CALL SendFriendRequest(?, ?, ?)',
            [requesterId, addresseeId, message || '']
        );

        res.status(201).json({
            success: true,
            message: 'Friend request sent successfully'
        });

    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send friend request',
            error: error.message
        });
    }
});

// GET /api/social/friends/requests - Get friend requests (sent and received)
router.get('/requests', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { type = 'all', status = 'pending' } = req.query;

        let query = '';
        let params = [];

        if (type === 'sent' || type === 'all') {
            // Requests sent by user
            const sentQuery = `
                SELECT 
                    f.id,
                    f.status,
                    f.requested_at,
                    f.responded_at,
                    f.notes,
                    'sent' as direction,
                    u.id as user_id,
                    u.first_name,
                    u.last_name,
                    up.display_name,
                    up.profile_image_url,
                    up.is_online,
                    up.last_seen
                FROM friendships f
                JOIN users u ON u.id = f.addressee_id
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE f.requester_id = ?
            `;
            params.push(userId);

            if (status !== 'all') {
                query += sentQuery + ' AND f.status = ?';
                params.push(status);
            } else {
                query += sentQuery;
            }
        }

        if (type === 'received' || type === 'all') {
            if (query) query += ' UNION ALL ';
            
            // Requests received by user
            const receivedQuery = `
                SELECT 
                    f.id,
                    f.status,
                    f.requested_at,
                    f.responded_at,
                    f.notes,
                    'received' as direction,
                    u.id as user_id,
                    u.first_name,
                    u.last_name,
                    up.display_name,
                    up.profile_image_url,
                    up.is_online,
                    up.last_seen
                FROM friendships f
                JOIN users u ON u.id = f.requester_id
                LEFT JOIN user_profiles up ON up.user_id = u.id
                WHERE f.addressee_id = ?
            `;
            params.push(userId);

            if (status !== 'all') {
                query += receivedQuery + ' AND f.status = ?';
                params.push(status);
            } else {
                query += receivedQuery;
            }
        }

        query += ' ORDER BY f.requested_at DESC';

        const [requests] = await promisePool.query(query, params);

        res.json({
            success: true,
            requests: requests.map(request => ({
                ...request,
                can_accept: request.direction === 'received' && request.status === 'pending',
                can_decline: request.direction === 'received' && request.status === 'pending',
                can_cancel: request.direction === 'sent' && request.status === 'pending'
            }))
        });

    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch friend requests',
            error: error.message
        });
    }
});

// PUT /api/social/friends/requests/:requestId - Respond to friend request
router.put('/requests/:requestId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { requestId } = req.params;
        const { action } = req.body; // 'accept', 'decline', 'cancel'

        if (!['accept', 'decline', 'cancel'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Must be accept, decline, or cancel'
            });
        }

        // Get request details
        const [requests] = await promisePool.query(
            'SELECT requester_id, addressee_id, status FROM friendships WHERE id = ?',
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        const request = requests[0];

        // Check permissions
        if (action === 'cancel' && request.requester_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only cancel your own friend requests'
            });
        }

        if ((action === 'accept' || action === 'decline') && request.addressee_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only respond to friend requests sent to you'
            });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'This friend request has already been responded to'
            });
        }

        // Process the action
        if (action === 'accept') {
            await promisePool.query('CALL AcceptFriendRequest(?)', [requestId]);
            
            res.json({
                success: true,
                message: 'Friend request accepted successfully'
            });
        } else {
            // Decline or cancel
            const newStatus = action === 'decline' ? 'declined' : 'cancelled';
            await promisePool.query(
                'UPDATE friendships SET status = ?, responded_at = NOW() WHERE id = ?',
                [newStatus, requestId]
            );

            res.json({
                success: true,
                message: `Friend request ${action}ed successfully`
            });
        }

    } catch (error) {
        console.error('Error responding to friend request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to respond to friend request',
            error: error.message
        });
    }
});

// =============================================================================
// FRIENDS LIST AND MANAGEMENT
// =============================================================================

// GET /api/social/friends - Get user's friends list
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { 
            online_only = false, 
            limit = 50, 
            offset = 0,
            search = ''
        } = req.query;

        let query = `
            SELECT 
                friend_id,
                first_name,
                last_name,
                display_name,
                profile_image_url,
                is_online,
                last_seen,
                friends_since
            FROM user_friends_view
            WHERE user_id = ?
        `;

        const params = [userId];

        if (online_only === 'true') {
            query += ' AND is_online = true';
        }

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR display_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY 
            CASE WHEN is_online THEN 0 ELSE 1 END,
            display_name ASC,
            CONCAT(first_name, ' ', last_name) ASC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));

        const [friends] = await promisePool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total
            FROM user_friends_view
            WHERE user_id = ?
        `;
        const countParams = [userId];

        if (online_only === 'true') {
            countQuery += ' AND is_online = true';
        }

        if (search) {
            countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR display_name LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [countResult] = await promisePool.query(countQuery, countParams);

        res.json({
            success: true,
            friends: friends.map(friend => ({
                ...friend,
                full_name: `${friend.first_name} ${friend.last_name}`.trim(),
                online_status: friend.is_online ? 'online' : 'offline',
                last_seen_relative: friend.last_seen ? getRelativeTime(friend.last_seen) : null
            })),
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            },
            summary: {
                total_friends: countResult[0].total,
                online_friends: friends.filter(f => f.is_online).length
            }
        });

    } catch (error) {
        console.error('Error fetching friends list:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch friends list',
            error: error.message
        });
    }
});

// DELETE /api/social/friends/:friendId - Remove friend
router.delete('/:friendId', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { friendId } = req.params;

        // Remove friendship (both directions)
        const [result] = await promisePool.query(`
            DELETE FROM friendships 
            WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
            AND status = 'accepted'
        `, [userId, friendId, friendId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found'
            });
        }

        res.json({
            success: true,
            message: 'Friend removed successfully'
        });

    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove friend',
            error: error.message
        });
    }
});

// =============================================================================
// ONLINE STATUS AND PRESENCE
// =============================================================================

// POST /api/social/friends/status/online - Update online status
router.post('/status/online', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        await promisePool.query(`
            UPDATE user_profiles 
            SET is_online = true, last_seen = NOW() 
            WHERE user_id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'Online status updated'
        });

    } catch (error) {
        console.error('Error updating online status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update online status',
            error: error.message
        });
    }
});

// POST /api/social/friends/status/offline - Update offline status
router.post('/status/offline', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        await promisePool.query(`
            UPDATE user_profiles 
            SET is_online = false, last_seen = NOW() 
            WHERE user_id = ?
        `, [userId]);

        res.json({
            success: true,
            message: 'Offline status updated'
        });

    } catch (error) {
        console.error('Error updating offline status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update offline status',
            error: error.message
        });
    }
});

// GET /api/social/friends/online - Get online friends
router.get('/online', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;

        const [friends] = await promisePool.query(`
            SELECT 
                friend_id,
                first_name,
                last_name,
                display_name,
                profile_image_url,
                last_seen
            FROM user_friends_view
            WHERE user_id = ? AND is_online = true
            ORDER BY display_name ASC, CONCAT(first_name, ' ', last_name) ASC
        `, [userId]);

        res.json({
            success: true,
            online_friends: friends.map(friend => ({
                ...friend,
                full_name: `${friend.first_name} ${friend.last_name}`.trim(),
                status: 'online'
            })),
            count: friends.length
        });

    } catch (error) {
        console.error('Error fetching online friends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch online friends',
            error: error.message
        });
    }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getRelativeTime(timestamp) {
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

module.exports = router; 