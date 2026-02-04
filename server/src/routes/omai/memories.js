const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middleware/auth');
const { promisePool } = require('../../config/db');

// Apply authentication to all routes
router.use(authMiddleware);

// GET /api/omai/memories - Retrieve user's memories
router.get('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      category,
      priority,
      tags,
      collection_id,
      search,
      is_active = true,
      page = 1,
      limit = 50,
      sort_by = 'updated_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        um.*,
        GROUP_CONCAT(DISTINCT mc.name) as collections,
        COUNT(DISTINCT mal.id) as access_count
      FROM omai_user_memories um
      LEFT JOIN omai_memory_collection_items mci ON um.id = mci.memory_id
      LEFT JOIN omai_memory_collections mc ON mci.collection_id = mc.id
      LEFT JOIN omai_memory_access_log mal ON um.id = mal.memory_id
      WHERE (um.user_id = ? OR um.access_level IN ('global', 'team'))
        AND um.is_active = ?
    `;
    
    const queryParams = [userId, is_active];

    // Add filters
    if (category) {
      query += ` AND um.category = ?`;
      queryParams.push(category);
    }
    
    if (priority) {
      query += ` AND um.priority = ?`;
      queryParams.push(priority);
    }
    
    if (search) {
      query += ` AND (MATCH(um.title, um.content) AGAINST(? IN NATURAL LANGUAGE MODE) 
                    OR um.title LIKE ? OR um.content LIKE ?)`;
      queryParams.push(search, `%${search}%`, `%${search}%`);
    }
    
    if (collection_id) {
      query += ` AND mci.collection_id = ?`;
      queryParams.push(collection_id);
    }

    query += ` GROUP BY um.id ORDER BY um.${sort_by} ${sort_order}`;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [memories] = await promisePool.execute(query, queryParams);
    
    // Get total count for pagination
    const [countResult] = await promisePool.execute(
      `SELECT COUNT(DISTINCT um.id) as total 
       FROM omai_user_memories um 
       WHERE (um.user_id = ? OR um.access_level IN ('global', 'team')) 
         AND um.is_active = ?`,
      [userId, is_active]
    );

    res.json({
      success: true,
      data: {
        memories: memories.map(memory => ({
          ...memory,
          tags: JSON.parse(memory.tags || '[]'),
          context_data: JSON.parse(memory.context_data || '{}'),
          collections: memory.collections ? memory.collections.split(',') : []
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memories' });
  }
});

// POST /api/omai/memories - Create new memory
router.post('/', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const {
      title,
      content,
      category = 'note',
      priority = 'medium',
      tags = [],
      access_level = 'private',
      context_data = {},
      expires_at,
      collection_ids = []
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required'
      });
    }

    // Insert memory
    const [result] = await promisePool.execute(`
      INSERT INTO omai_user_memories 
      (user_id, title, content, category, priority, tags, access_level, context_data, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, title, content, category, priority, 
      JSON.stringify(tags), access_level, JSON.stringify(context_data), expires_at
    ]);

    const memoryId = result.insertId;

    // Add to collections if specified
    if (collection_ids.length > 0) {
      const collectionInserts = collection_ids.map(collectionId => [collectionId, memoryId]);
      await promisePool.execute(`
        INSERT INTO omai_memory_collection_items (collection_id, memory_id) 
        VALUES ${collection_ids.map(() => '(?, ?)').join(', ')}
      `, collectionInserts.flat());
    }

    // Log the creation
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'view', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'created' })]);

    res.status(201).json({
      success: true,
      data: { id: memoryId, message: 'Memory created successfully' }
    });
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ success: false, error: 'Failed to create memory' });
  }
});

// PUT /api/omai/memories/:id - Update memory
router.put('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;
    const {
      title,
      content,
      category,
      priority,
      tags,
      access_level,
      context_data,
      expires_at,
      is_active
    } = req.body;

    // Check ownership
    const [existing] = await promisePool.execute(
      'SELECT user_id, access_level FROM omai_user_memories WHERE id = ?',
      [memoryId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    if (existing[0].user_id !== userId && existing[0].access_level !== 'global') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (access_level !== undefined) { updates.push('access_level = ?'); values.push(access_level); }
    if (context_data !== undefined) { updates.push('context_data = ?'); values.push(JSON.stringify(context_data)); }
    if (expires_at !== undefined) { updates.push('expires_at = ?'); values.push(expires_at); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No updates provided' });
    }

    values.push(memoryId);

    await promisePool.execute(`
      UPDATE omai_user_memories 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    // Log the update
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'update', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'updated', fields: updates })]);

    res.json({ success: true, message: 'Memory updated successfully' });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ success: false, error: 'Failed to update memory' });
  }
});

// DELETE /api/omai/memories/:id - Delete memory
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;

    // Check ownership
    const [existing] = await promisePool.execute(
      'SELECT user_id, access_level FROM omai_user_memories WHERE id = ?',
      [memoryId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    if (existing[0].user_id !== userId && existing[0].access_level !== 'global') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Soft delete by default, hard delete if requested
    const { hard_delete = false } = req.query;

    if (hard_delete) {
      await promisePool.execute('DELETE FROM omai_user_memories WHERE id = ?', [memoryId]);
    } else {
      await promisePool.execute(
        'UPDATE omai_user_memories SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [memoryId]
      );
    }

    // Log the deletion
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'delete', ?)
    `, [memoryId, userId, JSON.stringify({ action: hard_delete ? 'hard_delete' : 'soft_delete' })]);

    res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ success: false, error: 'Failed to delete memory' });
  }
});

// GET /api/omai/memories/:id - Get specific memory
router.get('/:id', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const memoryId = req.params.id;

    const [memories] = await promisePool.execute(`
      SELECT um.*, 
        GROUP_CONCAT(DISTINCT mc.name) as collections,
        GROUP_CONCAT(DISTINCT CONCAT(mr.relationship_type, ':', mr2.title)) as related_memories
      FROM omai_user_memories um
      LEFT JOIN omai_memory_collection_items mci ON um.id = mci.memory_id
      LEFT JOIN omai_memory_collections mc ON mci.collection_id = mc.id
      LEFT JOIN omai_memory_relationships mr ON um.id = mr.parent_memory_id
      LEFT JOIN omai_user_memories mr2 ON mr.child_memory_id = mr2.id
      WHERE um.id = ? AND (um.user_id = ? OR um.access_level IN ('global', 'team'))
      GROUP BY um.id
    `, [memoryId, userId]);

    if (memories.length === 0) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    const memory = {
      ...memories[0],
      tags: JSON.parse(memories[0].tags || '[]'),
      context_data: JSON.parse(memories[0].context_data || '{}'),
      collections: memories[0].collections ? memories[0].collections.split(',') : [],
      related_memories: memories[0].related_memories ? memories[0].related_memories.split(',') : []
    };

    // Update access count and timestamp
    await promisePool.execute(`
      UPDATE omai_user_memories 
      SET usage_count = usage_count + 1, last_accessed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [memoryId]);

    // Log the access
    await promisePool.execute(`
      INSERT INTO omai_memory_access_log (memory_id, user_id, access_type, context_info)
      VALUES (?, ?, 'reference', ?)
    `, [memoryId, userId, JSON.stringify({ action: 'accessed' })]);

    res.json({ success: true, data: memory });
  } catch (error) {
    console.error('Error fetching memory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memory' });
  }
});

module.exports = router; 