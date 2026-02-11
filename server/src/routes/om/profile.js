const express = require('express');
const { promisePool } = require('../../config/db');
const { requireAuth, optionalAuth } = require('../../middleware/auth');
const router = express.Router();

// Helper to get user ID from either session or JWT
const getUserId = (req) => {
    return req.user?.id || req.session?.user?.id;
};

// GET /api/om/profile/:id - Get user profile
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const profileUserId = parseInt(req.params.id);
        const currentUserId = getUserId(req);

        if (!profileUserId || isNaN(profileUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        // Get user profile
        const [users] = await promisePool.query(`
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.display_name,
                u.role,
                u.is_active,
                u.created_at,
                u.last_login,
                up.bio,
                up.profile_image_url,
                up.cover_image_url,
                up.location,
                up.website,
                up.is_online,
                up.last_seen,
                c.church_name,
                c.id as church_id
            FROM orthodoxmetrics_db.users u
            LEFT JOIN orthodoxmetrics_db.user_profiles up ON u.id = up.user_id
            LEFT JOIN orthodoxmetrics_db.churches c ON u.church_id = c.id
            WHERE u.id = ? AND u.is_active = 1
        `, [profileUserId]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = users[0];

        // Get friendship status if current user is logged in
        let friendshipStatus = null;
        if (currentUserId && currentUserId !== profileUserId) {
            const [friendship] = await promisePool.query(`
                SELECT status, requester_id, addressee_id
                FROM orthodoxmetrics_db.friendships
                WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
                ORDER BY created_at DESC
                LIMIT 1
            `, [currentUserId, profileUserId, profileUserId, currentUserId]);

            if (friendship.length > 0) {
                const f = friendship[0];
                friendshipStatus = {
                    status: f.status,
                    isRequester: f.requester_id === currentUserId
                };
            }
        }

        // Get friend count
        const [friendCount] = await promisePool.query(`
            SELECT COUNT(*) as count
            FROM orthodoxmetrics_db.friendships
            WHERE (requester_id = ? OR addressee_id = ?)
            AND status = 'accepted'
        `, [profileUserId, profileUserId]);

        // Get follower count (people who follow this user)
        const [followerCount] = await promisePool.query(`
            SELECT COUNT(*) as count
            FROM orthodoxmetrics_db.friendships
            WHERE addressee_id = ? AND status = 'accepted'
        `, [profileUserId]);

        // Get following count (people this user follows)
        const [followingCount] = await promisePool.query(`
            SELECT COUNT(*) as count
            FROM orthodoxmetrics_db.friendships
            WHERE requester_id = ? AND status = 'accepted'
        `, [profileUserId]);

        res.json({
            success: true,
            profile: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                displayName: user.display_name || `${user.first_name} ${user.last_name}`,
                role: user.role,
                bio: user.bio || '',
                profileImage: user.profile_image_url || null,
                coverImage: user.cover_image_url || null,
                location: user.location || null,
                website: user.website || null,
                isOnline: user.is_online || false,
                lastSeen: user.last_seen || null,
                churchName: user.church_name || null,
                churchId: user.church_id || null,
                createdAt: user.created_at,
                lastLogin: user.last_login,
                friendCount: friendCount[0]?.count || 0,
                followerCount: followerCount[0]?.count || 0,
                followingCount: followingCount[0]?.count || 0,
                friendshipStatus: friendshipStatus
            }
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile',
            message: error.message
        });
    }
});

// GET /api/om/profile/:id/posts - Get user's blog posts
router.get('/:id/posts', optionalAuth, async (req, res) => {
    try {
        const profileUserId = parseInt(req.params.id);
        const { page = 1, limit = 50 } = req.query;

        if (!profileUserId || isNaN(profileUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get user's blog posts
        // Check if blog_post_likes table exists first
        let hasLikesTable = false;
        try {
            const [tableCheck] = await promisePool.query(`
                SELECT COUNT(*) as exists_count
                FROM information_schema.tables 
                WHERE table_schema = 'orthodoxmetrics_db' 
                AND table_name = 'blog_post_likes'
            `);
            hasLikesTable = tableCheck[0].exists_count > 0;
        } catch (e) {
            // Table doesn't exist
            hasLikesTable = false;
        }

        // Build query - handle missing blog_post_likes table gracefully
        let posts;
        if (hasLikesTable) {
            [posts] = await promisePool.query(`
                SELECT 
                    id,
                    title,
                    content,
                    excerpt,
                    slug,
                    user_id as author_id,
                    featured_image_url as featured_image,
                    status,
                    published_at,
                    created_at,
                    updated_at,
                    view_count,
                    0 as like_count,
                    0 as comment_count
                FROM orthodoxmetrics_db.blog_posts
                WHERE user_id = ? AND status = 'published'
                ORDER BY published_at DESC
                LIMIT ? OFFSET ?
            `, [profileUserId, parseInt(limit), offset]);
        } else {
            [posts] = await promisePool.query(`
                SELECT 
                    id,
                    title,
                    content,
                    excerpt,
                    slug,
                    user_id as author_id,
                    featured_image_url as featured_image,
                    status,
                    published_at,
                    created_at,
                    updated_at,
                    view_count,
                    0 as like_count,
                    0 as comment_count
                FROM orthodoxmetrics_db.blog_posts
                WHERE user_id = ? AND status = 'published'
                ORDER BY published_at DESC
                LIMIT ? OFFSET ?
            `, [profileUserId, parseInt(limit), offset]);
        }

        // Get total count
        const [countResult] = await promisePool.query(`
            SELECT COUNT(*) as total
            FROM orthodoxmetrics_db.blog_posts
            WHERE user_id = ? AND status = 'published'
        `, [profileUserId]);

        res.json({
            success: true,
            posts: posts || [],
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching profile posts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch profile posts',
            message: error.message
        });
    }
});

// GET /api/om/profile/:id/gallery - Get user's gallery images
router.get('/:id/gallery', optionalAuth, async (req, res) => {
    try {
        const profileUserId = parseInt(req.params.id);
        const { page = 1, limit = 50 } = req.query;

        if (!profileUserId || isNaN(profileUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get user's gallery images (if stored in a user_gallery table)
        // For now, return empty array if table doesn't exist
        const [images] = await promisePool.query(`
            SELECT 
                id,
                user_id,
                image_url,
                caption,
                created_at
            FROM orthodoxmetrics_db.user_gallery
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [profileUserId, parseInt(limit), offset]).catch(() => [[], []]);

        // Get total count
        const [countResult] = await promisePool.query(`
            SELECT COUNT(*) as total
            FROM orthodoxmetrics_db.user_gallery
            WHERE user_id = ?
        `, [profileUserId]).catch(() => [{ total: 0 }]);

        res.json({
            success: true,
            images: images || [],
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching profile gallery:', error);
        // Return empty gallery if table doesn't exist
        res.json({
            success: true,
            images: [],
            total: 0,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        });
    }
});

// GET /api/om/profile/:id/followers - Get user's followers
router.get('/:id/followers', optionalAuth, async (req, res) => {
    try {
        const profileUserId = parseInt(req.params.id);
        const { page = 1, limit = 50 } = req.query;

        if (!profileUserId || isNaN(profileUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get followers (people who follow this user)
        // Use requested_at instead of created_at (friendships table uses requested_at)
        const [followers] = await promisePool.query(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.display_name,
                u.email,
                up.profile_image_url,
                up.is_online,
                up.last_seen,
                f.requested_at as followed_at
            FROM orthodoxmetrics_db.friendships f
            JOIN orthodoxmetrics_db.users u ON f.requester_id = u.id
            LEFT JOIN orthodoxmetrics_db.user_profiles up ON u.id = up.user_id
            WHERE f.addressee_id = ? AND f.status = 'accepted'
            ORDER BY f.requested_at DESC
            LIMIT ? OFFSET ?
        `, [profileUserId, parseInt(limit), offset]);

        // Get total count
        const [countResult] = await promisePool.query(`
            SELECT COUNT(*) as total
            FROM orthodoxmetrics_db.friendships
            WHERE addressee_id = ? AND status = 'accepted'
        `, [profileUserId]);

        res.json({
            success: true,
            followers: followers.map(f => ({
                id: f.id,
                firstName: f.first_name,
                lastName: f.last_name,
                displayName: f.display_name || `${f.first_name} ${f.last_name}`,
                email: f.email,
                profileImage: f.profile_image_url || null,
                isOnline: f.is_online || false,
                lastSeen: f.last_seen || null,
                followedAt: f.followed_at
            })),
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching followers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch followers',
            message: error.message
        });
    }
});

// GET /api/om/profile/:id/following - Get users this person follows
router.get('/:id/following', optionalAuth, async (req, res) => {
    try {
        const profileUserId = parseInt(req.params.id);
        const { page = 1, limit = 50 } = req.query;

        if (!profileUserId || isNaN(profileUserId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID'
            });
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get following (people this user follows)
        const [following] = await promisePool.query(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.display_name,
                u.email,
                up.profile_image_url,
                up.is_online,
                up.last_seen,
                f.created_at as followed_at
            FROM orthodoxmetrics_db.friendships f
            JOIN orthodoxmetrics_db.users u ON f.addressee_id = u.id
            LEFT JOIN orthodoxmetrics_db.user_profiles up ON u.id = up.user_id
            WHERE f.requester_id = ? AND f.status = 'accepted'
            ORDER BY f.created_at DESC
            LIMIT ? OFFSET ?
        `, [profileUserId, parseInt(limit), offset]);

        // Get total count
        const [countResult] = await promisePool.query(`
            SELECT COUNT(*) as total
            FROM orthodoxmetrics_db.friendships
            WHERE requester_id = ? AND status = 'accepted'
        `, [profileUserId]);

        res.json({
            success: true,
            following: following.map(f => ({
                id: f.id,
                firstName: f.first_name,
                lastName: f.last_name,
                displayName: f.display_name || `${f.first_name} ${f.last_name}`,
                email: f.email,
                profileImage: f.profile_image_url || null,
                isOnline: f.is_online || false,
                lastSeen: f.last_seen || null,
                followedAt: f.followed_at
            })),
            total: countResult[0]?.total || 0,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Error fetching following:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch following',
            message: error.message
        });
    }
});

module.exports = router;

