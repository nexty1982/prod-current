const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');

// GET /api/kanban/boards - Get all boards for current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const [boards] = await promisePool.execute(`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.created_by,
        b.created_at,
        b.updated_at,
        b.is_archived,
        b.board_color,
        bm.role as user_role,
        COUNT(DISTINCT t.id) as task_count,
        u.name as created_by_name
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      LEFT JOIN kanban_tasks t ON b.id = t.board_id AND t.completed_at IS NULL
      LEFT JOIN orthodoxmetrics_auth_db.users u ON b.created_by = u.id
      WHERE (b.created_by = ? OR bm.user_id = ?) AND b.is_archived = 0
      GROUP BY b.id
      ORDER BY b.updated_at DESC
    `, [req.user.id, req.user.id, req.user.id]);
    
    res.json({
      success: true,
      boards
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/kanban/boards/:id - Get board details with columns, tasks, members, labels
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    
    // Check user access to board
    const [accessCheck] = await promisePool.execute(`
      SELECT b.*, bm.role as user_role
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, boardId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Board not found or access denied'
      });
    }
    
    const board = accessCheck[0];
    
    // Get board columns
    const [columns] = await promisePool.execute(`
      SELECT id, board_id, name, position, color, wip_limit
      FROM kanban_columns 
      WHERE board_id = ?
      ORDER BY position ASC
    `, [boardId]);
    
    // Get board tasks
    const [tasks] = await promisePool.execute(`
      SELECT 
        t.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as created_by_name
      FROM kanban_tasks t
      LEFT JOIN orthodoxmetrics_auth_db.users u1 ON t.assigned_to = u1.id
      LEFT JOIN orthodoxmetrics_auth_db.users u2 ON t.created_by = u2.id
      WHERE t.board_id = ?
      ORDER BY t.column_id, t.position
    `, [boardId]);
    
    // Get task labels for each task
    for (let task of tasks) {
      const [labels] = await promisePool.execute(`
        SELECT l.id, l.name, l.color
        FROM kanban_labels l
        JOIN kanban_task_labels tl ON l.id = tl.label_id
        WHERE tl.task_id = ?
      `, [task.id]);
      task.labels = labels;
    }
    
    // Get board members
    const [members] = await promisePool.execute(`
      SELECT 
        bm.user_id,
        bm.role,
        bm.added_at,
        u.name,
        u.email
      FROM kanban_board_members bm
      JOIN orthodoxmetrics_auth_db.users u ON bm.user_id = u.id
      WHERE bm.board_id = ?
    `, [boardId]);
    
    // Get board labels
    const [labels] = await promisePool.execute(`
      SELECT id, board_id, name, color
      FROM kanban_labels
      WHERE board_id = ?
      ORDER BY name
    `, [boardId]);
    
    res.json({
      success: true,
      board: {
        ...board,
        columns,
        tasks,
        members,
        labels
      }
    });
  } catch (error) {
    console.error('Error fetching board details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/kanban/boards - Create new board
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, board_color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Board name is required'
      });
    }
    
    // Create board
    const [result] = await promisePool.execute(`
      INSERT INTO kanban_boards (name, description, created_by, board_color)
      VALUES (?, ?, ?, ?)
    `, [name.trim(), description || '', req.user.id, board_color || '#1976d2']);
    
    const boardId = result.insertId;
    
    // Create default columns
    const defaultColumns = [
      { name: 'To Do', position: 0, color: '#e3f2fd' },
      { name: 'In Progress', position: 1, color: '#fff3e0' },
      { name: 'Review', position: 2, color: '#f3e5f5' },
      { name: 'Done', position: 3, color: '#e8f5e8' }
    ];
    
    for (const column of defaultColumns) {
      await promisePool.execute(`
        INSERT INTO kanban_columns (board_id, name, position, color)
        VALUES (?, ?, ?, ?)
      `, [boardId, column.name, column.position, column.color]);
    }
    
    // Add creator as board owner
    await promisePool.execute(`
      INSERT INTO kanban_board_members (board_id, user_id, role)
      VALUES (?, ?, 'owner')
    `, [boardId, req.user.id]);
    
    res.status(201).json({
      success: true,
      board_id: boardId,
      message: 'Board created successfully'
    });
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/kanban/boards/:id - Update board
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    const { name, description, board_color } = req.body;
    
    // Check user access (owner or admin)
    const [accessCheck] = await promisePool.execute(`
      SELECT b.*, bm.role
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (b.created_by = ? OR bm.role IN ('owner', 'admin'))
    `, [req.user.id, boardId, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or board not found'
      });
    }
    
    await promisePool.execute(`
      UPDATE kanban_boards 
      SET name = ?, description = ?, board_color = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, description, board_color, boardId]);
    
    res.json({
      success: true,
      message: 'Board updated successfully'
    });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/kanban/boards/:id - Archive board
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const boardId = parseInt(req.params.id);
    
    // Check user access (owner only)
    const [accessCheck] = await promisePool.execute(`
      SELECT b.*
      FROM kanban_boards b
      WHERE b.id = ? AND b.created_by = ?
    `, [boardId, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied or board not found'
      });
    }
    
    await promisePool.execute(`
      UPDATE kanban_boards 
      SET is_archived = 1, updated_at = NOW()
      WHERE id = ?
    `, [boardId]);
    
    res.json({
      success: true,
      message: 'Board archived successfully'
    });
  } catch (error) {
    console.error('Error archiving board:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
