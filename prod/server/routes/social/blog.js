const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { promisePool } = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
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

// Helper function to create URL-friendly slug
const createSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
};

// Helper function to generate unique slug
const generateUniqueSlug = async (userId, baseSlug) => {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const [existing] = await promisePool.query(
            'SELECT id FROM blog_posts WHERE user_id = ? AND slug = ?',
            [userId, slug]
        );

        if (existing.length === 0) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;
        counter++;
    }
};

// Configure multer for blog image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../../front-end/public/uploads/blog');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// =============================================================================
// BLOG POST ENDPOINTS
// =============================================================================

// GET /api/social/blog/posts - Get blog posts with filters
router.get('/posts', async (req, res) => {
    try {
        const {
            user_id,
            visibility = 'public',
            status = 'published',
            limit = 20,
            offset = 0,
            search,
            tags,
            category,
            sort = 'latest'
        } = req.query;

        let query = `
            SELECT 
                bp.*,
                u.first_name,
                u.last_name,
                up.display_name,
                up.profile_image_url,
                (SELECT COUNT(*) FROM social_reactions sr WHERE sr.target_type = 'blog_post' AND sr.target_id = bp.id) as reaction_count,
                (SELECT COUNT(*) FROM blog_comments bc WHERE bc.post_id = bp.id) as comment_count
            FROM blog_posts bp
            JOIN orthodoxmetrics_db.users u ON u.id = bp.user_id
            LEFT JOIN user_profiles up ON up.user_id = bp.user_id
            WHERE 1=1
        `;

        const params = [];

        // Add filters
        if (user_id) {
            query += ' AND bp.user_id = ?';
            params.push(user_id);
        }

        if (visibility && visibility !== 'all') {
            query += ' AND bp.visibility = ?';
            params.push(visibility);
        }

        if (status && status !== 'all') {
            query += ' AND bp.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (bp.title LIKE ? OR bp.content LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        if (tags) {
            query += ' AND JSON_CONTAINS(bp.tags, ?)';
            params.push(JSON.stringify(tags.split(',')));
        }

        // Add sorting
        switch (sort) {
            case 'latest':
                query += ' ORDER BY bp.published_at DESC, bp.created_at DESC';
                break;
            case 'oldest':
                query += ' ORDER BY bp.published_at ASC, bp.created_at ASC';
                break;
            case 'popular':
                query += ' ORDER BY bp.view_count DESC, bp.like_count DESC';
                break;
            case 'title':
                query += ' ORDER BY bp.title ASC';
                break;
            default:
                query += ' ORDER BY bp.published_at DESC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [posts] = await promisePool.query(query, params);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total
            FROM blog_posts bp
            WHERE 1=1
        `;
        const countParams = params.slice(0, -2); // Remove limit and offset

        if (user_id) countQuery += ' AND bp.user_id = ?';
        if (visibility && visibility !== 'all') countQuery += ' AND bp.visibility = ?';
        if (status && status !== 'all') countQuery += ' AND bp.status = ?';
        if (search) countQuery += ' AND (bp.title LIKE ? OR bp.content LIKE ?)';
        if (tags) countQuery += ' AND JSON_CONTAINS(bp.tags, ?)';

        const [countResult] = await promisePool.query(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            posts: posts.map(post => ({
                ...post,
                tags: post.tags ? JSON.parse(post.tags) : [],
                metadata: post.metadata ? JSON.parse(post.metadata) : {}
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });

    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog posts',
            error: error.message
        });
    }
});

// GET /api/social/blog/posts/:id - Get single blog post
router.get('/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session?.user?.id;

        const [posts] = await promisePool.query(`
            SELECT 
                bp.*,
                u.first_name,
                u.last_name,
                up.display_name,
                up.profile_image_url,
                up.bio,
                (SELECT COUNT(*) FROM social_reactions sr WHERE sr.target_type = 'blog_post' AND sr.target_id = bp.id) as reaction_count
            FROM blog_posts bp
            JOIN orthodoxmetrics_db.users u ON u.id = bp.user_id
            LEFT JOIN user_profiles up ON up.user_id = bp.user_id
            WHERE bp.id = ?
        `, [id]);

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        const post = posts[0];

        // Check access permissions
        if (post.status !== 'published' && post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (post.visibility === 'private' && post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'This blog post is private'
            });
        }

        if (post.visibility === 'friends_only' && post.user_id !== userId) {
            // Check if users are friends
            const [friendship] = await promisePool.query(`
                SELECT id FROM friendships 
                WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
                AND status = 'accepted'
            `, [userId, post.user_id, post.user_id, userId]);

            if (friendship.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'This blog post is only visible to friends'
                });
            }
        }

        // Increment view count (if not the author)
        if (post.user_id !== userId) {
            await promisePool.query(
                'UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?',
                [id]
            );
            post.view_count += 1;
        }

        // Get user's reaction to this post
        let userReaction = null;
        if (userId) {
            const [reactions] = await promisePool.query(
                'SELECT reaction_type FROM social_reactions WHERE user_id = ? AND target_type = "blog_post" AND target_id = ?',
                [userId, id]
            );
            userReaction = reactions.length > 0 ? reactions[0].reaction_type : null;
        }

        // Get comments
        const [comments] = await promisePool.query(`
            SELECT 
                bc.*,
                u.first_name,
                u.last_name,
                up.display_name,
                up.profile_image_url
            FROM blog_comments bc
            JOIN orthodoxmetrics_db.users u ON u.id = bc.user_id
            LEFT JOIN user_profiles up ON up.user_id = bc.user_id
            WHERE bc.post_id = ? AND bc.is_approved = 1
            ORDER BY bc.created_at ASC
        `, [id]);

        res.json({
            success: true,
            post: {
                ...post,
                tags: post.tags ? JSON.parse(post.tags) : [],
                metadata: post.metadata ? JSON.parse(post.metadata) : {},
                user_reaction: userReaction,
                comments: comments.map(comment => ({
                    ...comment,
                    can_edit: comment.user_id === userId,
                    can_delete: comment.user_id === userId || post.user_id === userId
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch blog post',
            error: error.message
        });
    }
});

// POST /api/social/blog/posts - Create new blog post
router.post('/posts', requireAuth, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const {
            title,
            content,
            excerpt,
            status = 'draft',
            visibility = 'public',
            tags = [],
            featured_image_url,
            is_pinned = false,
            scheduled_at
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        // Generate unique slug
        const baseSlug = createSlug(title);
        const slug = await generateUniqueSlug(userId, baseSlug);

        // Create excerpt if not provided
        const autoExcerpt = excerpt || content.replace(/<[^>]*>/g, '').substring(0, 200) + '...';

        const published_at = status === 'published' ? new Date() : null;

        const [result] = await promisePool.query(`
            INSERT INTO blog_posts 
            (user_id, title, slug, content, excerpt, status, visibility, tags, featured_image_url, is_pinned, scheduled_at, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            title,
            slug,
            content,
            autoExcerpt,
            status,
            visibility,
            JSON.stringify(tags),
            featured_image_url,
            is_pinned,
            scheduled_at,
            published_at
        ]);

        // Create activity feed entry if published
        if (status === 'published' && visibility !== 'private') {
            await promisePool.query(`
                INSERT INTO activity_feed (user_id, actor_id, activity_type, target_type, target_id, title, description, visibility)
                VALUES (?, ?, 'blog_post', 'blog_post', ?, ?, ?, ?)
            `, [
                userId,
                userId,
                result.insertId,
                'New Blog Post',
                `Published: ${title}`,
                visibility === 'friends_only' ? 'friends' : 'public'
            ]);
        }

        res.status(201).json({
            success: true,
            message: 'Blog post created successfully',
            post: {
                id: result.insertId,
                title,
                slug,
                status,
                visibility
            }
        });

    } catch (error) {
        console.error('Error creating blog post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create blog post',
            error: error.message
        });
    }
});

// PUT /api/social/blog/posts/:id - Update blog post
router.put('/posts/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;
        const updateData = req.body;

        // Check if user owns the post
        const [existing] = await promisePool.query(
            'SELECT user_id, status FROM blog_posts WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        if (existing[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own blog posts'
            });
        }

        // Generate new slug if title changed
        if (updateData.title) {
            const baseSlug = createSlug(updateData.title);
            updateData.slug = await generateUniqueSlug(userId, baseSlug);
        }

        // Handle status change to published
        if (updateData.status === 'published' && existing[0].status !== 'published') {
            updateData.published_at = new Date();
        }

        // Serialize tags if provided
        if (updateData.tags) {
            updateData.tags = JSON.stringify(updateData.tags);
        }

        // Build update query dynamically
        const fields = Object.keys(updateData).filter(key => 
            ['title', 'slug', 'content', 'excerpt', 'status', 'visibility', 'tags', 'featured_image_url', 'is_pinned', 'scheduled_at', 'published_at'].includes(key)
        );

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => updateData[field]);
        values.push(id);

        await promisePool.query(
            `UPDATE blog_posts SET ${setClause}, updated_at = NOW() WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'Blog post updated successfully'
        });

    } catch (error) {
        console.error('Error updating blog post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update blog post',
            error: error.message
        });
    }
});

// DELETE /api/social/blog/posts/:id - Delete blog post
router.delete('/posts/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user.id;

        // Check if user owns the post
        const [existing] = await promisePool.query(
            'SELECT user_id FROM blog_posts WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        if (existing[0].user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own blog posts'
            });
        }

        // Delete the post (cascade will handle comments, reactions, etc.)
        await promisePool.query('DELETE FROM blog_posts WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Blog post deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting blog post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete blog post',
            error: error.message
        });
    }
});

// =============================================================================
// BLOG COMMENT ENDPOINTS
// =============================================================================

// POST /api/social/blog/posts/:id/comments - Add comment to blog post
router.post('/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.session.user.id;
        const { content, parent_id } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required'
            });
        }

        // Check if post exists and is accessible
        const [posts] = await promisePool.query(
            'SELECT user_id, visibility, status FROM blog_posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        const post = posts[0];

        if (post.status !== 'published') {
            return res.status(403).json({
                success: false,
                message: 'Cannot comment on unpublished posts'
            });
        }

        // Check visibility permissions
        if (post.visibility === 'private' && post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Cannot comment on private posts'
            });
        }

        if (post.visibility === 'friends_only' && post.user_id !== userId) {
            const [friendship] = await promisePool.query(`
                SELECT id FROM friendships 
                WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
                AND status = 'accepted'
            `, [userId, post.user_id, post.user_id, userId]);

            if (friendship.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Cannot comment on friends-only posts'
                });
            }
        }

        // Add comment
        const [result] = await promisePool.query(`
            INSERT INTO blog_comments (post_id, user_id, parent_id, content)
            VALUES (?, ?, ?, ?)
        `, [postId, userId, parent_id, content]);

        // Create notification for post author (if not self-comment)
        if (post.user_id !== userId) {
            await promisePool.query(`
                INSERT INTO notifications (user_id, type, title, message, sender_id, data)
                VALUES (?, 'blog_comment', 'New Comment', 'Someone commented on your blog post', ?, ?)
            `, [
                post.user_id,
                userId,
                JSON.stringify({ comment_id: result.insertId, post_id: postId })
            ]);
        }

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            comment: {
                id: result.insertId,
                content,
                created_at: new Date()
            }
        });

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment',
            error: error.message
        });
    }
});

// =============================================================================
// BLOG REACTION ENDPOINTS
// =============================================================================

// POST /api/social/blog/posts/:id/react - Add/update reaction to blog post
router.post('/posts/:id/react', requireAuth, async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.session.user.id;
        const { reaction_type } = req.body;

        const validReactions = ['like', 'love', 'laugh', 'wow', 'sad', 'angry', 'pray', 'amen'];
        if (!validReactions.includes(reaction_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reaction type'
            });
        }

        // Check if post exists and is accessible
        const [posts] = await promisePool.query(
            'SELECT user_id, visibility, status FROM blog_posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Blog post not found'
            });
        }

        // Insert or update reaction
        await promisePool.query(`
            INSERT INTO social_reactions (user_id, target_type, target_id, reaction_type)
            VALUES (?, 'blog_post', ?, ?)
            ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type)
        `, [userId, postId, reaction_type]);

        // Create notification for post author (if not self-reaction)
        const post = posts[0];
        if (post.user_id !== userId) {
            await promisePool.query(`
                INSERT INTO notifications (user_id, type, title, message, sender_id, data)
                VALUES (?, 'blog_like', 'Post Reaction', 'Someone reacted to your blog post', ?, ?)
            `, [
                post.user_id,
                userId,
                JSON.stringify({ reaction_type, post_id: postId })
            ]);
        }

        res.json({
            success: true,
            message: 'Reaction added successfully'
        });

    } catch (error) {
        console.error('Error adding reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add reaction',
            error: error.message
        });
    }
});

// DELETE /api/social/blog/posts/:id/react - Remove reaction from blog post
router.delete('/posts/:id/react', requireAuth, async (req, res) => {
    try {
        const { id: postId } = req.params;
        const userId = req.session.user.id;

        await promisePool.query(
            'DELETE FROM social_reactions WHERE user_id = ? AND target_type = "blog_post" AND target_id = ?',
            [userId, postId]
        );

        res.json({
            success: true,
            message: 'Reaction removed successfully'
        });

    } catch (error) {
        console.error('Error removing reaction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove reaction',
            error: error.message
        });
    }
});

// =============================================================================
// BLOG IMAGE UPLOAD ENDPOINT
// =============================================================================

// POST /api/social/blog/upload-image - Upload blog image
router.post('/upload-image', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const userId = req.session.user.id;
        const file = req.file;
        const fileUrl = `/uploads/blog/${file.filename}`;

        // Save file info to database
        const [result] = await promisePool.query(`
            INSERT INTO social_media 
            (user_id, filename, original_filename, file_path, file_url, file_type, file_size, mime_type, usage_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'blog_image')
        `, [
            userId,
            file.filename,
            file.originalname,
            file.path,
            fileUrl,
            path.extname(file.originalname).substring(1),
            file.size,
            file.mimetype
        ]);

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            image: {
                id: result.insertId,
                url: fileUrl,
                filename: file.filename,
                size: file.size
            }
        });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image',
            error: error.message
        });
    }
});

// =============================================================================
// BLOG ACCESS REQUEST ENDPOINTS
// =============================================================================

// POST /api/social/blog/request-access/:userId - Request access to private blog
router.post('/request-access/:userId', requireAuth, async (req, res) => {
    try {
        const { userId: blogOwnerId } = req.params;
        const requesterId = req.session.user.id;
        const { message } = req.body;

        if (blogOwnerId == requesterId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot request access to your own blog'
            });
        }

        // Check if request already exists
        const [existing] = await promisePool.query(
            'SELECT id, status FROM blog_access_requests WHERE blog_owner_id = ? AND requester_id = ?',
            [blogOwnerId, requesterId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Access request already exists',
                status: existing[0].status
            });
        }

        // Create access request
        const [result] = await promisePool.query(`
            INSERT INTO blog_access_requests (blog_owner_id, requester_id, message)
            VALUES (?, ?, ?)
        `, [blogOwnerId, requesterId, message]);

        // Create notification
        await promisePool.query(`
            INSERT INTO notifications (user_id, type, title, message, sender_id, data)
            VALUES (?, 'blog_access_request', 'Blog Access Request', 'Someone requested access to your blog', ?, ?)
        `, [
            blogOwnerId,
            requesterId,
            JSON.stringify({ request_id: result.insertId })
        ]);

        res.status(201).json({
            success: true,
            message: 'Access request sent successfully'
        });

    } catch (error) {
        console.error('Error requesting blog access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send access request',
            error: error.message
        });
    }
});

module.exports = router; 