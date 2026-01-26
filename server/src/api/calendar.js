const { getAppPool } = require('../../config/db-compat');
/**
 * Calendar Routes for OrthodoxMetrics AI Task Coordination
 * Handles AI task management, Kanban synchronization, and real-time updates
 */

const express = require('express');
const router = express.Router();
const { promisePool } = require('../../config/db-compat');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// ===== AI TASK MANAGEMENT ROUTES =====

// Get all AI tasks
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      ORDER BY due_date ASC, created_at DESC
    `);

    // Parse JSON fields
    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching AI tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE id = ?
    `, [id]);

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const parsedTask = {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    res.json(parsedTask);
  } catch (error) {
    logger.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create new AI task
router.post('/tasks', requireAuth, async (req, res) => {
  try {
    const {
      title, description, assignedTo, status, dueDate, startDate,
      tags, linkedKanbanId, agent, priority, estimatedHours, actualHours,
      logs, metadata
    } = req.body;

    // Validate required fields
    if (!title || !dueDate || !agent || !status || !priority) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const taskId = `OM-AI-TASK-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const [result] = await getAppPool().query(`
      INSERT INTO ai_tasks (
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskId, title, description, assignedTo, status, dueDate, startDate,
      JSON.stringify(tags || []), linkedKanbanId, agent, priority, estimatedHours, actualHours,
      JSON.stringify(logs || []), JSON.stringify(metadata || {}), now, now
    ]);

    // Fetch the created task
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE id = ?
    `, [taskId]);

    const task = tasks[0];
    const parsedTask = {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    res.status(201).json(parsedTask);
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update existing task
router.put('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if task exists
    const [existingTasks] = await getAppPool().query(
      'SELECT id FROM ai_tasks WHERE id = ?',
      [id]
    );

    if (existingTasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const fieldMappings = {
      title: 'title',
      description: 'description',
      assignedTo: 'assigned_to',
      status: 'status',
      dueDate: 'due_date',
      startDate: 'start_date',
      tags: 'tags',
      linkedKanbanId: 'linked_kanban_id',
      agent: 'agent',
      priority: 'priority',
      estimatedHours: 'estimated_hours',
      actualHours: 'actual_hours',
      logs: 'logs',
      metadata: 'metadata'
    };

    Object.keys(updateData).forEach(key => {
      if (fieldMappings[key] && updateData[key] !== undefined) {
        updateFields.push(`${fieldMappings[key]} = ?`);
        
        // Handle JSON fields
        if (['tags', 'logs', 'metadata'].includes(key)) {
          updateValues.push(JSON.stringify(updateData[key]));
        } else {
          updateValues.push(updateData[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(id);

    const query = `UPDATE ai_tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    await getAppPool().query(query, updateValues);

    // Fetch updated task
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE id = ?
    `, [id]);

    const task = tasks[0];
    const parsedTask = {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    res.json(parsedTask);
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/tasks/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await getAppPool().query(
      'DELETE FROM ai_tasks WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get tasks by date range
router.get('/tasks/range', requireAuth, async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE due_date BETWEEN ? AND ?
      ORDER BY due_date ASC
    `, [start, end]);

    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching tasks by date range:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks by agent
router.get('/tasks/agent/:agent', requireAuth, async (req, res) => {
  try {
    const { agent } = req.params;

    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE agent = ?
      ORDER BY due_date ASC
    `, [agent]);

    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching tasks by agent:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks by status
router.get('/tasks/status/:status', requireAuth, async (req, res) => {
  try {
    const { status } = req.params;

    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE status = ?
      ORDER BY due_date ASC
    `, [status]);

    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching tasks by status:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get tasks by priority
router.get('/tasks/priority/:priority', requireAuth, async (req, res) => {
  try {
    const { priority } = req.params;

    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE priority = ?
      ORDER BY due_date ASC
    `, [priority]);

    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching tasks by priority:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Bulk update tasks
router.put('/tasks/bulk', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates must be an array' });
    }

    const results = [];

    for (const update of updates) {
      const { id, updates: updateData } = update;

      // Build update query
      const updateFields = [];
      const updateValues = [];

      const fieldMappings = {
        title: 'title',
        description: 'description',
        assignedTo: 'assigned_to',
        status: 'status',
        dueDate: 'due_date',
        startDate: 'start_date',
        tags: 'tags',
        linkedKanbanId: 'linked_kanban_id',
        agent: 'agent',
        priority: 'priority',
        estimatedHours: 'estimated_hours',
        actualHours: 'actual_hours',
        logs: 'logs',
        metadata: 'metadata'
      };

      Object.keys(updateData).forEach(key => {
        if (fieldMappings[key] && updateData[key] !== undefined) {
          updateFields.push(`${fieldMappings[key]} = ?`);
          
          if (['tags', 'logs', 'metadata'].includes(key)) {
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateValues.push(updateData[key]);
          }
        }
      });

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?');
        updateValues.push(new Date().toISOString());
        updateValues.push(id);

        const query = `UPDATE ai_tasks SET ${updateFields.join(', ')} WHERE id = ?`;
        await getAppPool().query(query, updateValues);
      }

      // Fetch updated task
      const [tasks] = await getAppPool().query(`
        SELECT 
          id, title, description, assigned_to, status, due_date, start_date,
          tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
          logs, metadata, created_at, updated_at
        FROM ai_tasks 
        WHERE id = ?
      `, [id]);

      if (tasks.length > 0) {
        const task = tasks[0];
        const parsedTask = {
          ...task,
          tags: task.tags ? JSON.parse(task.tags) : [],
          logs: task.logs ? JSON.parse(task.logs) : [],
          metadata: task.metadata ? JSON.parse(task.metadata) : {},
          dueDate: task.due_date,
          startDate: task.start_date,
          linkedKanbanId: task.linked_kanban_id,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        };
        results.push(parsedTask);
      }
    }

    res.json(results);
  } catch (error) {
    logger.error('Error bulk updating tasks:', error);
    res.status(500).json({ error: 'Failed to bulk update tasks' });
  }
});

// Get task statistics
router.get('/tasks/stats', requireAuth, async (req, res) => {
  try {
    const [stats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM ai_tasks
    `);

    const [agentStats] = await getAppPool().query(`
      SELECT agent, COUNT(*) as count
      FROM ai_tasks
      GROUP BY agent
    `);

    const [priorityStats] = await getAppPool().query(`
      SELECT priority, COUNT(*) as count
      FROM ai_tasks
      GROUP BY priority
    `);

    const byAgent = {};
    agentStats.forEach(stat => {
      byAgent[stat.agent] = stat.count;
    });

    const byPriority = {};
    priorityStats.forEach(stat => {
      byPriority[stat.priority] = stat.count;
    });

    res.json({
      total: stats[0].total,
      pending: stats[0].pending,
      inProgress: stats[0].in_progress,
      completed: stats[0].completed,
      blocked: stats[0].blocked,
      byAgent,
      byPriority
    });
  } catch (error) {
    logger.error('Error fetching task statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ===== KANBAN INTEGRATION ROUTES =====

// Get Kanban tasks
router.get('/kanban/tasks', requireAuth, async (req, res) => {
  try {
    const [tasks] = await getAppPool().query(`
      SELECT 
        kt.id, kt.title, kt.description, kt.status, kt.column_id, kt.position,
        kt.assignee, kt.priority, kt.due_date, kt.tags, kt.created_at, kt.updated_at
      FROM kanban_tasks kt
      ORDER BY kt.column_id, kt.position
    `);

    const parsedTasks = tasks.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      dueDate: task.due_date,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }));

    res.json(parsedTasks);
  } catch (error) {
    logger.error('Error fetching Kanban tasks:', error);
    res.status(500).json({ error: 'Failed to fetch Kanban tasks' });
  }
});

// Sync task with Kanban
router.post('/tasks/:id/sync-kanban', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { kanbanId } = req.body;

    if (!kanbanId) {
      return res.status(400).json({ error: 'Kanban ID is required' });
    }

    // Update the task with Kanban ID
    await getAppPool().query(
      'UPDATE ai_tasks SET linked_kanban_id = ?, updated_at = ? WHERE id = ?',
      [kanbanId, new Date().toISOString(), id]
    );

    // Fetch updated task
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE id = ?
    `, [id]);

    const task = tasks[0];
    const parsedTask = {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    res.json(parsedTask);
  } catch (error) {
    logger.error('Error syncing task with Kanban:', error);
    res.status(500).json({ error: 'Failed to sync task' });
  }
});

// Unsync task from Kanban
router.delete('/tasks/:id/sync-kanban', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove Kanban ID from task
    await getAppPool().query(
      'UPDATE ai_tasks SET linked_kanban_id = NULL, updated_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );

    // Fetch updated task
    const [tasks] = await getAppPool().query(`
      SELECT 
        id, title, description, assigned_to, status, due_date, start_date,
        tags, linked_kanban_id, agent, priority, estimated_hours, actual_hours,
        logs, metadata, created_at, updated_at
      FROM ai_tasks 
      WHERE id = ?
    `, [id]);

    const task = tasks[0];
    const parsedTask = {
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      logs: task.logs ? JSON.parse(task.logs) : [],
      metadata: task.metadata ? JSON.parse(task.metadata) : {},
      dueDate: task.due_date,
      startDate: task.start_date,
      linkedKanbanId: task.linked_kanban_id,
      estimatedHours: task.estimated_hours,
      actualHours: task.actual_hours,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };

    res.json(parsedTask);
  } catch (error) {
    logger.error('Error unsyncing task from Kanban:', error);
    res.status(500).json({ error: 'Failed to unsync task' });
  }
});

// Get sync status
router.get('/kanban/sync-status', requireAuth, async (req, res) => {
  try {
    const [stats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN linked_kanban_id IS NOT NULL THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN linked_kanban_id IS NULL THEN 1 ELSE 0 END) as unsynced
      FROM ai_tasks
    `);

    res.json({
      synced: stats[0].synced,
      unsynced: stats[0].unsynced,
      conflicts: 0, // TODO: Implement conflict detection
      lastSync: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

// Get Kanban columns
router.get('/kanban/columns', requireAuth, async (req, res) => {
  try {
    const [columns] = await getAppPool().query(`
      SELECT 
        kc.id, kc.name, kc.position, kc.color,
        COUNT(kt.id) as task_count
      FROM kanban_columns kc
      LEFT JOIN kanban_tasks kt ON kc.id = kt.column_id
      GROUP BY kc.id, kc.name, kc.position, kc.color
      ORDER BY kc.position
    `);

    res.json(columns);
  } catch (error) {
    logger.error('Error fetching Kanban columns:', error);
    res.status(500).json({ error: 'Failed to fetch Kanban columns' });
  }
});

// ===== AI AGENT MANAGEMENT ROUTES =====

// Get all agents
router.get('/agents', requireAuth, async (req, res) => {
  try {
    // Mock agent data - in production this would come from a real agent management system
    const agents = [
      {
        name: 'Ninja',
        status: 'online',
        currentTask: null,
        queueLength: 0,
        performance: {
          tasksCompleted: 45,
          averageTime: 2.5,
          successRate: 0.95
        }
      },
      {
        name: 'Claude',
        status: 'online',
        currentTask: null,
        queueLength: 0,
        performance: {
          tasksCompleted: 32,
          averageTime: 3.2,
          successRate: 0.92
        }
      },
      {
        name: 'Cursor',
        status: 'busy',
        currentTask: 'OM-AI-TASK-001',
        queueLength: 2,
        performance: {
          tasksCompleted: 28,
          averageTime: 1.8,
          successRate: 0.88
        }
      },
      {
        name: 'OM-AI',
        status: 'online',
        currentTask: null,
        queueLength: 1,
        performance: {
          tasksCompleted: 67,
          averageTime: 2.1,
          successRate: 0.97
        }
      },
      {
        name: 'Junie',
        status: 'offline',
        currentTask: null,
        queueLength: 0,
        performance: {
          tasksCompleted: 23,
          averageTime: 4.1,
          successRate: 0.85
        }
      },
      {
        name: 'GitHub Copilot',
        status: 'online',
        currentTask: null,
        queueLength: 0,
        performance: {
          tasksCompleted: 89,
          averageTime: 1.2,
          successRate: 0.91
        }
      }
    ];

    res.json(agents);
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// ===== REAL-TIME UPDATES ROUTES =====

// Server-Sent Events for real-time updates
router.get('/realtime/tasks', requireAuth, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Store the response object for broadcasting updates
  if (!req.app.locals.sseClients) {
    req.app.locals.sseClients = new Set();
  }
  req.app.locals.sseClients.add(res);

  // Remove client when connection closes
  req.on('close', () => {
    req.app.locals.sseClients.delete(res);
  });
});

// Get recent updates
router.get('/realtime/recent', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Mock recent updates - in production this would come from a real-time log
    const recentUpdates = [
      {
        timestamp: new Date().toISOString(),
        type: 'update',
        task: {
          id: 'OM-AI-TASK-001',
          title: 'Build OM AI Learning Component',
          status: 'in_progress'
        },
        user: 'admin'
      }
    ];

    res.json(recentUpdates.slice(0, limit));
  } catch (error) {
    logger.error('Error fetching recent updates:', error);
    res.status(500).json({ error: 'Failed to fetch recent updates' });
  }
});

// ===== UTILITY ROUTES =====

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
