const { getAppPool } = require('../config/db-compat');
const express = require('express');
const db = require('../config/db-compat');

const router = express.Router();

// GET /api/pages/:slug - Get page by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const query = `
      SELECT id, slug, title, content, meta_description, created_at, updated_at
      FROM pages 
      WHERE slug = ?
    `;
    
    const pages = await getAppPool().query(query, [slug]);
    
    if (pages.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(pages[0]);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// PUT /api/pages/:slug - Create or update page
router.put('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, meta_description } = req.body;
    
    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Check if page exists
    const existingPageQuery = 'SELECT id FROM pages WHERE slug = ?';
    const existingPages = await getAppPool().query(existingPageQuery, [slug]);
    
    let result;
    let pageData;
    
    if (existingPages.length > 0) {
      // Update existing page
      const updateQuery = `
        UPDATE pages 
        SET title = ?, content = ?, meta_description = ?, updated_at = NOW()
        WHERE slug = ?
      `;
      
      await getAppPool().query(updateQuery, [title, content || '', meta_description || '', slug]);
      
      // Fetch updated page data
      const fetchQuery = `
        SELECT id, slug, title, content, meta_description, created_at, updated_at
        FROM pages 
        WHERE slug = ?
      `;
      const updatedPages = await getAppPool().query(fetchQuery, [slug]);
      pageData = updatedPages[0];
      
    } else {
      // Create new page
      const insertQuery = `
        INSERT INTO pages (slug, title, content, meta_description, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `;
      
      result = await getAppPool().query(insertQuery, [slug, title, content || '', meta_description || '']);
      
      // Fetch created page data
      const fetchQuery = `
        SELECT id, slug, title, content, meta_description, created_at, updated_at
        FROM pages 
        WHERE id = ?
      `;
      const createdPages = await getAppPool().query(fetchQuery, [result.insertId]);
      pageData = createdPages[0];
    }
    
    res.json(pageData);
  } catch (error) {
    console.error('Error saving page:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A page with this slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to save page' });
  }
});

// GET /api/pages - List all pages (with pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM pages';
    const countResult = await getAppPool().query(countQuery);
    const total = countResult[0].total;
    
    // Get pages
    const query = `
      SELECT id, slug, title, meta_description, created_at, updated_at,
             LEFT(content, 200) as content_preview
      FROM pages 
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const pages = await getAppPool().query(query, [limit, offset]);
    
    res.json({
      pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing pages:', error);
    res.status(500).json({ error: 'Failed to list pages' });
  }
});

// DELETE /api/pages/:slug - Delete page
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const deleteQuery = 'DELETE FROM pages WHERE slug = ?';
    const result = await getAppPool().query(deleteQuery, [slug]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// POST /api/pages/:slug/duplicate - Duplicate page with new slug
router.post('/:slug/duplicate', async (req, res) => {
  try {
    const { slug } = req.params;
    const { newSlug, newTitle } = req.body;
    
    if (!newSlug || !newTitle) {
      return res.status(400).json({ error: 'New slug and title are required' });
    }
    
    // Check if source page exists
    const sourceQuery = `
      SELECT title, content, meta_description
      FROM pages 
      WHERE slug = ?
    `;
    const sourcePages = await getAppPool().query(sourceQuery, [slug]);
    
    if (sourcePages.length === 0) {
      return res.status(404).json({ error: 'Source page not found' });
    }
    
    const sourcePage = sourcePages[0];
    
    // Create duplicate
    const insertQuery = `
      INSERT INTO pages (slug, title, content, meta_description, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `;
    
    const result = await getAppPool().query(insertQuery, [
      newSlug,
      newTitle,
      sourcePage.content,
      sourcePage.meta_description
    ]);
    
    // Fetch created page data
    const fetchQuery = `
      SELECT id, slug, title, content, meta_description, created_at, updated_at
      FROM pages 
      WHERE id = ?
    `;
    const createdPages = await getAppPool().query(fetchQuery, [result.insertId]);
    
    res.status(201).json(createdPages[0]);
  } catch (error) {
    console.error('Error duplicating page:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A page with the new slug already exists' });
    }
    
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

module.exports = router;
