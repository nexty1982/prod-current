const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for markdown file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../misc/uploads/kanban/markdown');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `task-${req.params.id || 'new'}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only markdown files
    if (file.mimetype === 'text/markdown' || 
        file.mimetype === 'text/plain' || 
        path.extname(file.originalname).toLowerCase() === '.md') {
      cb(null, true);
    } else {
      cb(new Error('Only markdown (.md) files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// GET /api/kanban/tasks - Get all tasks for a board
router.get('/', requireAuth, async (req, res) => {
  try {
    const { board_id } = req.query;
    
    if (!board_id) {
      return res.status(400).json({
        success: false,
        error: 'Board ID is required'
      });
    }
    
    // Check user access to board
    const [accessCheck] = await promisePool.execute(`
      SELECT b.id
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, board_id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Board not found or access denied'
      });
    }
    
    const [tasks] = await promisePool.execute(`
      SELECT 
        t.*,
        COALESCE(u1.full_name, CONCAT(u1.first_name, ' ', u1.last_name), u1.email) as assigned_to_name,
        u1.email as assigned_to_email,
        COALESCE(u2.full_name, CONCAT(u2.first_name, ' ', u2.last_name), u2.email) as created_by_name
      FROM kanban_tasks t
      LEFT JOIN orthodoxmetrics_db.users u1 ON t.assigned_to = u1.id
      LEFT JOIN orthodoxmetrics_db.users u2 ON t.created_by = u2.id
      WHERE t.board_id = ?
      ORDER BY t.column_id, t.position
    `, [board_id]);
    
    // Get labels for each task
    for (let task of tasks) {
      const [labels] = await promisePool.execute(`
        SELECT l.id, l.name, l.color
        FROM kanban_labels l
        JOIN kanban_task_labels tl ON l.id = tl.label_id
        WHERE tl.task_id = ?
      `, [task.id]);
      task.labels = labels;
    }
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/kanban/tasks - Create new task
router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      board_id, 
      column_id, 
      title, 
      description, 
      priority, 
      due_date, 
      assigned_to, 
      estimated_hours,
      task_color,
      labels 
    } = req.body;
    
    if (!board_id || !column_id || !title) {
      return res.status(400).json({
        success: false,
        error: 'Board ID, column ID, and title are required'
      });
    }
    
    // Check user access to board
    const [accessCheck] = await promisePool.execute(`
      SELECT b.id
      FROM kanban_boards b
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE b.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, board_id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Board not found or access denied'
      });
    }
    
    // Get next position in column
    const [positionResult] = await promisePool.execute(`
      SELECT COALESCE(MAX(position), -1) + 1 as next_position
      FROM kanban_tasks
      WHERE board_id = ? AND column_id = ?
    `, [board_id, column_id]);
    
    const nextPosition = positionResult[0].next_position;
    
    // Create task
    const [result] = await promisePool.execute(`
      INSERT INTO kanban_tasks (
        board_id, column_id, title, description, priority, due_date, 
        assigned_to, created_by, position, estimated_hours, task_color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      board_id, column_id, title, description || '', priority || 'medium',
      due_date || null, assigned_to || null, req.user.id, nextPosition,
      estimated_hours || null, task_color || null
    ]);
    
    const taskId = result.insertId;
    
    // Add labels if provided
    if (labels && Array.isArray(labels)) {
      for (const labelId of labels) {
        await promisePool.execute(`
          INSERT INTO kanban_task_labels (task_id, label_id)
          VALUES (?, ?)
        `, [taskId, labelId]);
      }
    }
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'created', 'Task created')
    `, [taskId, req.user.id]);
    
    res.status(201).json({
      success: true,
      task_id: taskId,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/kanban/tasks/:id - Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { 
      title, 
      description, 
      priority, 
      due_date, 
      assigned_to, 
      estimated_hours,
      actual_hours,
      task_color,
      labels 
    } = req.body;
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.*, b.created_by as board_creator
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ? OR t.assigned_to = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    // Update task
    await promisePool.execute(`
      UPDATE kanban_tasks 
      SET title = ?, description = ?, priority = ?, due_date = ?, 
          assigned_to = ?, estimated_hours = ?, actual_hours = ?, 
          task_color = ?, updated_at = NOW()
      WHERE id = ?
    `, [title, description, priority, due_date, assigned_to, estimated_hours, actual_hours, task_color, taskId]);
    
    // Update labels
    if (labels !== undefined && Array.isArray(labels)) {
      // Remove existing labels
      await promisePool.execute(`
        DELETE FROM kanban_task_labels WHERE task_id = ?
      `, [taskId]);
      
      // Add new labels
      for (const labelId of labels) {
        await promisePool.execute(`
          INSERT INTO kanban_task_labels (task_id, label_id)
          VALUES (?, ?)
        `, [taskId, labelId]);
      }
    }
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'updated', 'Task updated')
    `, [taskId, req.user.id]);
    
    res.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/kanban/tasks/:id/move - Move task to different column/position
router.put('/:id/move', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { column_id, position } = req.body;
    
    if (column_id === undefined || position === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Column ID and position are required'
      });
    }
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.*, b.created_by as board_creator
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    const task = accessCheck[0];
    const oldColumnId = task.column_id;
    const oldPosition = task.position;
    
    // Update positions of other tasks
    if (oldColumnId === column_id) {
      // Moving within same column
      if (position > oldPosition) {
        // Moving down - shift tasks up
        await promisePool.execute(`
          UPDATE kanban_tasks 
          SET position = position - 1 
          WHERE board_id = ? AND column_id = ? AND position > ? AND position <= ?
        `, [task.board_id, column_id, oldPosition, position]);
      } else if (position < oldPosition) {
        // Moving up - shift tasks down
        await promisePool.execute(`
          UPDATE kanban_tasks 
          SET position = position + 1 
          WHERE board_id = ? AND column_id = ? AND position >= ? AND position < ?
        `, [task.board_id, column_id, position, oldPosition]);
      }
    } else {
      // Moving to different column
      // Shift tasks up in old column
      await promisePool.execute(`
        UPDATE kanban_tasks 
        SET position = position - 1 
        WHERE board_id = ? AND column_id = ? AND position > ?
      `, [task.board_id, oldColumnId, oldPosition]);
      
      // Shift tasks down in new column
      await promisePool.execute(`
        UPDATE kanban_tasks 
        SET position = position + 1 
        WHERE board_id = ? AND column_id = ? AND position >= ?
      `, [task.board_id, column_id, position]);
    }
    
    // Update the task
    await promisePool.execute(`
      UPDATE kanban_tasks 
      SET column_id = ?, position = ?, updated_at = NOW()
      WHERE id = ?
    `, [column_id, position, taskId]);
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'moved', CONCAT('Moved to column ', ?))
    `, [taskId, req.user.id, column_id]);
    
    res.json({
      success: true,
      message: 'Task moved successfully'
    });
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/kanban/tasks/:id - Delete task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.*, b.created_by as board_creator
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ? OR t.created_by = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    const task = accessCheck[0];
    
    // Delete related records
    await promisePool.execute(`DELETE FROM kanban_task_labels WHERE task_id = ?`, [taskId]);
    await promisePool.execute(`DELETE FROM kanban_task_comments WHERE task_id = ?`, [taskId]);
    await promisePool.execute(`DELETE FROM kanban_task_attachments WHERE task_id = ?`, [taskId]);
    await promisePool.execute(`DELETE FROM kanban_task_activity WHERE task_id = ?`, [taskId]);
    
    // Delete task
    await promisePool.execute(`DELETE FROM kanban_tasks WHERE id = ?`, [taskId]);
    
    // Update positions of remaining tasks in column
    await promisePool.execute(`
      UPDATE kanban_tasks 
      SET position = position - 1 
      WHERE board_id = ? AND column_id = ? AND position > ?
    `, [task.board_id, task.column_id, task.position]);
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/kanban/tasks/:id/comments - Add comment to task
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const { comment } = req.body;
    
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Comment text is required'
      });
    }
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.id
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    // Add comment
    const [result] = await promisePool.execute(`
      INSERT INTO kanban_task_comments (task_id, user_id, comment)
      VALUES (?, ?, ?)
    `, [taskId, req.user.id, comment.trim()]);
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'commented', 'Added a comment')
    `, [taskId, req.user.id]);
    
    res.status(201).json({
      success: true,
      comment_id: result.insertId,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/kanban/tasks/:id/comments - Get task comments
router.get('/:id/comments', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.id
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    const [comments] = await promisePool.execute(`
      SELECT 
        c.id,
        c.task_id,
        c.user_id,
        c.comment,
        c.created_at,
        COALESCE(u.full_name, CONCAT(u.first_name, ' ', u.last_name), u.email) as user_name
      FROM kanban_task_comments c
      JOIN orthodoxmetrics_db.users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at ASC
    `, [taskId]);
    
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/kanban/tasks/comments/:id - Delete comment
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    
    // Check if user owns the comment or has board access
    const [accessCheck] = await promisePool.execute(`
      SELECT 
        c.id,
        c.task_id,
        c.user_id,
        t.board_id,
        b.created_by as board_creator
      FROM kanban_task_comments c
      JOIN kanban_tasks t ON c.task_id = t.id
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE c.id = ? AND (c.user_id = ? OR b.created_by = ? OR bm.role IN ('owner', 'admin'))
    `, [req.user.id, commentId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found or access denied'
      });
    }
    
    const comment = accessCheck[0];
    
    // Delete comment
    await promisePool.execute(`DELETE FROM kanban_task_comments WHERE id = ?`, [commentId]);
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'comment_deleted', 'Deleted a comment')
    `, [comment.task_id, req.user.id]);
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/kanban/tasks/:id/markdown - Upload markdown file for task
router.post('/:id/markdown', requireAuth, upload.single('markdown'), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No markdown file uploaded'
      });
    }
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.*, b.created_by as board_creator
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ? OR t.assigned_to = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      // Delete uploaded file if access denied
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    // Read markdown content
    const markdownContent = await fs.readFile(req.file.path, 'utf-8');
    
    // Update task with markdown content and filename
    await promisePool.execute(`
      UPDATE kanban_tasks 
      SET markdown_content = ?, markdown_filename = ?, updated_at = NOW()
      WHERE id = ?
    `, [markdownContent, req.file.originalname, taskId]);
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'markdown_uploaded', CONCAT('Uploaded markdown file: ', ?))
    `, [taskId, req.user.id, req.file.originalname]);
    
    res.json({
      success: true,
      message: 'Markdown file uploaded successfully',
      filename: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    console.error('Error uploading markdown:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/kanban/tasks/:id/markdown - Get markdown content for task
router.get('/:id/markdown', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.markdown_content, t.markdown_filename
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    const task = accessCheck[0];
    
    res.json({
      success: true,
      markdown_content: task.markdown_content || '',
      markdown_filename: task.markdown_filename || null
    });
  } catch (error) {
    console.error('Error fetching markdown:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/kanban/tasks/:id/markdown - Remove markdown from task
router.delete('/:id/markdown', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    // Check user access to task
    const [accessCheck] = await promisePool.execute(`
      SELECT t.*, b.created_by as board_creator
      FROM kanban_tasks t
      JOIN kanban_boards b ON t.board_id = b.id
      LEFT JOIN kanban_board_members bm ON b.id = bm.board_id AND bm.user_id = ?
      WHERE t.id = ? AND (b.created_by = ? OR bm.user_id = ? OR t.assigned_to = ?)
    `, [req.user.id, taskId, req.user.id, req.user.id, req.user.id]);
    
    if (accessCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or access denied'
      });
    }
    
    // Remove markdown content and filename
    await promisePool.execute(`
      UPDATE kanban_tasks 
      SET markdown_content = NULL, markdown_filename = NULL, updated_at = NOW()
      WHERE id = ?
    `, [taskId]);
    
    // Log activity
    await promisePool.execute(`
      INSERT INTO kanban_task_activity (task_id, user_id, action_type, description)
      VALUES (?, ?, 'markdown_removed', 'Removed markdown file')
    `, [taskId, req.user.id]);
    
    res.json({
      success: true,
      message: 'Markdown file removed successfully'
    });
  } catch (error) {
    console.error('Error removing markdown:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
