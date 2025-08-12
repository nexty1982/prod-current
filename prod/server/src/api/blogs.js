const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { body, validationResult, param } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'orthodoxmetrics_db',
  port: process.env.DB_PORT || 3306
};

// Get all blogs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      status = 'published', 
      visibility = 'public', 
      author_id, 
      page = 1, 
      limit = 10,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const connection = await mysql.createConnection(dbConfig);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (visibility !== 'all') {
      whereClause += ' AND visibility = ?';
      params.push(visibility);
    }

    if (author_id) {
      whereClause += ' AND author_id = ?';
      params.push(author_id);
    }

    const validSortColumns = ['created_at', 'updated_at', 'published_at', 'title'];
    const validOrder = ['ASC', 'DESC'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    const query = `
      SELECT ub.*, u.name as author_name, u.email as author_email
      FROM user_blogs ub
      LEFT JOIN orthodoxmetrics_auth_db.users u ON ub.author_id = u.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [blogs] = await getAppPool().query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_blogs ub
      ${whereClause}
    `;
    const [countResult] = await getAppPool().query(countQuery, params.slice(0, -2));

    await connection.end();

    res.json({
      blogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single blog by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const connection = await mysql.createConnection(dbConfig);

    const query = `
      SELECT ub.*, u.name as author_name, u.email as author_email
      FROM user_blogs ub
      LEFT JOIN orthodoxmetrics_auth_db.users u ON ub.author_id = u.id
      WHERE ub.slug = ?
    `;

    const [blogs] = await getAppPool().query(query, [slug]);
    await connection.end();

    if (blogs.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json(blogs[0]);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update blog
router.put('/:slug', 
  requireAuth,
  [
    param('slug').notEmpty().withMessage('Slug is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    body('status').isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    body('visibility').isIn(['public', 'internal', 'church-only']).withMessage('Invalid visibility')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { slug } = req.params;
      const { title, content, meta_description, status, visibility } = req.body;
      const author_id = req.user.id;

      const connection = await mysql.createConnection(dbConfig);

      // Check if blog exists
      const [existingBlogs] = await getAppPool().query(
        'SELECT id, author_id FROM user_blogs WHERE slug = ?',
        [slug]
      );

      let result;
      if (existingBlogs.length > 0) {
        // Update existing blog
        const existingBlog = existingBlogs[0];
        
        // Check if user owns the blog or is admin
        if (existingBlog.author_id !== author_id && req.user.role !== 'super_admin' && req.user.role !== 'church_admin') {
          await connection.end();
          return res.status(403).json({ error: 'Not authorized to edit this blog' });
        }

        const updateQuery = `
          UPDATE user_blogs 
          SET title = ?, content = ?, meta_description = ?, status = ?, visibility = ?,
              published_at = CASE WHEN status = 'published' AND published_at IS NULL THEN NOW() ELSE published_at END
          WHERE slug = ?
        `;

        await getAppPool().query(updateQuery, [
          title, JSON.stringify(content), meta_description, status, visibility, slug
        ]);

        // Fetch updated blog
        const [updatedBlogs] = await getAppPool().query(
          'SELECT * FROM user_blogs WHERE slug = ?',
          [slug]
        );
        result = updatedBlogs[0];
      } else {
        // Create new blog
        const insertQuery = `
          INSERT INTO user_blogs (author_id, title, slug, content, meta_description, status, visibility, published_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const published_at = status === 'published' ? new Date() : null;

        await getAppPool().query(insertQuery, [
          author_id, title, slug, JSON.stringify(content), meta_description, status, visibility, published_at
        ]);

        // Fetch created blog
        const [newBlogs] = await getAppPool().query(
          'SELECT * FROM user_blogs WHERE slug = ?',
          [slug]
        );
        result = newBlogs[0];
      }

      await connection.end();
      res.json(result);
    } catch (error) {
      console.error('Error saving blog:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete blog
router.delete('/:slug', 
  requireAuth,
  async (req, res) => {
    try {
      const { slug } = req.params;
      const connection = await mysql.createConnection(dbConfig);

      // Check if blog exists and user owns it
      const [blogs] = await getAppPool().query(
        'SELECT id, author_id FROM user_blogs WHERE slug = ?',
        [slug]
      );

      if (blogs.length === 0) {
        await connection.end();
        return res.status(404).json({ error: 'Blog not found' });
      }

      const blog = blogs[0];
      
      // Check authorization
      if (blog.author_id !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'church_admin') {
        await connection.end();
        return res.status(403).json({ error: 'Not authorized to delete this blog' });
      }

      await getAppPool().query('DELETE FROM user_blogs WHERE slug = ?', [slug]);
      await connection.end();

      res.json({ message: 'Blog deleted successfully' });
    } catch (error) {
      console.error('Error deleting blog:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get blogs by author (for blog admin panel)
router.get('/author/:authorId', 
  requireAuth,
  async (req, res) => {
    try {
      const { authorId } = req.params;
      
      // Users can only view their own blogs unless they're admin
      if (parseInt(authorId) !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'church_admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const connection = await mysql.createConnection(dbConfig);

      const query = `
        SELECT ub.*, u.name as author_name
        FROM user_blogs ub
        LEFT JOIN orthodoxmetrics_auth_db.users u ON ub.author_id = u.id
        WHERE ub.author_id = ?
        ORDER BY ub.updated_at DESC
      `;

      const [blogs] = await getAppPool().query(query, [authorId]);
      await connection.end();

      res.json(blogs);
    } catch (error) {
      console.error('Error fetching author blogs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router; 