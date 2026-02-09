/**
 * Daily Tasks API
 * Manages daily task markdown files with versioning and archiving
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { requireAuth } = require('../middleware/auth');
const { getAppPool } = require('../config/db-compat');

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Forbidden - Super Admin only' });
  }
  next();
};

// Configuration - can be overridden via environment variables
const TASKS_BASE_DIR = process.env.DAILY_TASKS_DIR || path.join(__dirname, '../../docs');
const DOCS_DIR = TASKS_BASE_DIR;
const ARCHIVE_DIR = path.join(DOCS_DIR, 'archive');
const CURRENT_TASKS_FILE = path.join(DOCS_DIR, 'DAILY_TASKS.md');

console.log('📝 Daily Tasks Configuration:');
console.log(`   Base Directory: ${DOCS_DIR}`);
console.log(`   Archive Directory: ${ARCHIVE_DIR}`);
console.log(`   Current Tasks File: ${CURRENT_TASKS_FILE}`);

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(DOCS_DIR, { recursive: true });
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating directories:', err);
  }
};

// GET /api/admin/tasks/config - Get current configuration
router.get('/config', requireAuth, async (req, res) => {
  try {
    // Only allow super_admin access
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    res.json({
      success: true,
      config: {
        baseDirectory: DOCS_DIR,
        archiveDirectory: ARCHIVE_DIR,
        currentTasksFile: CURRENT_TASKS_FILE,
        envVariable: 'DAILY_TASKS_DIR',
        currentValue: process.env.DAILY_TASKS_DIR || '(using default)'
      }
    });
  } catch (err) {
    console.error('Error getting config:', err);
    res.status(500).json({ 
      error: 'Failed to get configuration',
      message: err.message 
    });
  }
});

// GET /api/admin/tasks/list - List all available task files
router.get('/list', requireAuth, async (req, res) => {
  try {
    // Only allow super_admin access
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    await ensureDirectories();

    // Read archive directory
    const files = await fs.readdir(ARCHIVE_DIR);
    
    // Filter for DAILY_TASKS_*.md files and extract dates
    const taskFiles = files
      .filter(file => file.startsWith('DAILY_TASKS_') && file.endsWith('.md'))
      .map(file => {
        const match = file.match(/DAILY_TASKS_(\d{4}-\d{2}-\d{2})\.md/);
        if (match) {
          return {
            date: match[1],
            filename: file,
            label: formatDateLabel(match[1])
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    // Add "Today" option (current file)
    const today = new Date().toISOString().split('T')[0];
    const options = [
      { date: today, filename: 'DAILY_TASKS.md', label: 'Today' },
      ...taskFiles
    ];

    res.json({
      success: true,
      options
    });

  } catch (err) {
    console.error('Error listing task files:', err);
    res.status(500).json({ 
      error: 'Failed to list task files',
      message: err.message 
    });
  }
});

// =====================================================
// DAILY_WORK TABLE ENDPOINTS (must be before /:date catch-all)
// =====================================================

// GET /api/admin/tasks/work/items - List daily work items (filter by date, type)
router.get('/work/items', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { date, task_type, status, archived } = req.query;
    let sql = 'SELECT * FROM daily_work WHERE 1=1';
    const params = [];

    if (date) {
      sql += ' AND DATE(created_at) = ?';
      params.push(date);
    }
    if (task_type) {
      sql += ' AND task_type = ?';
      params.push(task_type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (archived !== undefined) {
      sql += ' AND archived = ?';
      params.push(archived === 'true' ? 1 : 0);
    } else {
      sql += ' AND archived = 0';
    }

    sql += ' ORDER BY priority ASC, created_at DESC';

    const [rows] = await getAppPool().query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing daily work items:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/tasks/work/items - Create a new work item
router.post('/work/items', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { task_type, content, status, priority, source, category, due_at, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }
    const userId = req.session?.user?.id || req.user?.id || null;
    const [result] = await getAppPool().query(
      `INSERT INTO daily_work (task_type, content, status, priority, source, created_by, category, due_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task_type || 'task',
        content,
        status || 'pending',
        priority || 3,
        source || 'human',
        userId,
        category || null,
        due_at || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    const [rows] = await getAppPool().query('SELECT * FROM daily_work WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating daily work item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/tasks/work/items/:id - Update a work item
router.put('/work/items/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = ['task_type', 'content', 'status', 'priority', 'source', 'category', 'due_at', 'started_at', 'completed_at', 'metadata', 'archived', 'assigned_to'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === 'metadata' && typeof fields[key] === 'object' ? JSON.stringify(fields[key]) : fields[key]);
      }
    }

    // Auto-set timestamps based on status changes
    if (fields.status === 'in_progress' && !fields.started_at) {
      sets.push('started_at = NOW()');
    }
    if ((fields.status === 'completed' || fields.status === 'failed') && !fields.completed_at) {
      sets.push('completed_at = NOW()');
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    params.push(id);
    await getAppPool().query(`UPDATE daily_work SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await getAppPool().query('SELECT * FROM daily_work WHERE id = ?', [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error updating daily work item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/tasks/work/items/:id - Delete a work item
router.delete('/work/items/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await getAppPool().query('DELETE FROM daily_work WHERE id = ?', [id]);
    res.json({ success: true, message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting daily work item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/admin/tasks/work/dates - Get list of dates that have work items
router.get('/work/dates', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await getAppPool().query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM daily_work WHERE archived = 0
       GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 90`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching work dates:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================================================
// LEGACY MARKDOWN FILE ENDPOINTS
// =====================================================

// GET /api/admin/tasks/:date - Get task file for specific date
router.get('/:date', requireAuth, async (req, res) => {
  try {
    // Only allow super_admin access
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    const { date } = req.params;
    const today = new Date().toISOString().split('T')[0];

    await ensureDirectories();

    let content = '';
    let filename = '';

    if (date === today) {
      // Read current tasks file
      filename = 'DAILY_TASKS.md';
      try {
        content = await fs.readFile(CURRENT_TASKS_FILE, 'utf-8');
      } catch (err) {
        // File doesn't exist yet, return empty content
        content = `# Daily Tasks - ${today}\n\n## Tasks\n\n- [ ] Task 1\n- [ ] Task 2\n\n## Notes\n\n`;
      }
    } else {
      // Read archived file
      filename = `DAILY_TASKS_${date}.md`;
      const archivePath = path.join(ARCHIVE_DIR, filename);
      
      try {
        content = await fs.readFile(archivePath, 'utf-8');
      } catch (err) {
        return res.status(404).json({ 
          error: 'Task file not found',
          date 
        });
      }
    }

    res.json({
      success: true,
      date,
      filename,
      content
    });

  } catch (err) {
    console.error('Error reading task file:', err);
    res.status(500).json({ 
      error: 'Failed to read task file',
      message: err.message 
    });
  }
});

// POST /api/admin/tasks/save - Save current tasks and create archive
router.post('/save', requireAuth, async (req, res) => {
  try {
    // Only allow super_admin access
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden - Super Admin only' });
    }

    const { content, date } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    await ensureDirectories();

    const today = new Date().toISOString().split('T')[0];
    const saveDate = date || today;

    // Save to current file
    await fs.writeFile(CURRENT_TASKS_FILE, content, 'utf-8');

    // Create dated archive copy
    const archiveFilename = `DAILY_TASKS_${saveDate}.md`;
    const archivePath = path.join(ARCHIVE_DIR, archiveFilename);
    
    // Only create archive if it doesn't exist (don't overwrite historical data)
    try {
      await fs.access(archivePath);
      // File exists, don't overwrite
    } catch {
      // File doesn't exist, create it
      await fs.writeFile(archivePath, content, 'utf-8');
    }

    res.json({
      success: true,
      message: 'Tasks saved successfully',
      date: saveDate,
      archived: archiveFilename
    });

  } catch (err) {
    console.error('Error saving task file:', err);
    res.status(500).json({ 
      error: 'Failed to save task file',
      message: err.message 
    });
  }
});

// Helper function to format date labels
function formatDateLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = dateStr;
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateOnly === todayStr) return 'Today';
  if (dateOnly === yesterdayStr) return 'Yesterday';

  // Format as "Mon, Feb 5, 2026"
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

module.exports = router;
