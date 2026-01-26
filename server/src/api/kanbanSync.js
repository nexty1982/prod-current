const express = require('express');
const router = express.Router();
const BigBookKanbanSync = require('../services/bigBookKanbanSync');
const TaskDiscoveryService = require('../services/taskDiscoveryService');
const KanbanIntegrationService = require('../services/kanbanIntegrationService');
const logger = require('../utils/logger');

// Initialize services
let syncService = null;
let taskDiscovery = null;
let kanbanIntegration = null;

// Middleware to check sync permissions (super admin only)
const requireSyncPermission = (req, res, next) => {
  console.log('🔐 Kanban sync permission check - Session user:', req.session?.user);
  
  if (!req.session?.user) {
    console.log('❌ No authenticated user found in sync permission check');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  const userRole = req.session.user.role;
  console.log('🔐 Kanban sync permission check - User role:', userRole);
  
  if (!userRole || !['super_admin'].includes(userRole)) {
    console.log('❌ Kanban sync access denied - User role not authorized:', userRole);
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions. Kanban sync access requires super_admin role.'
    });
  }
  
  console.log('✅ Kanban sync permission check passed for role:', userRole);
  next();
};

// Initialize services
const initializeServices = async () => {
  if (!syncService) {
    syncService = new BigBookKanbanSync();
    await syncService.initialize();
  }
  if (!taskDiscovery) {
    taskDiscovery = new TaskDiscoveryService();
  }
  if (!kanbanIntegration) {
    kanbanIntegration = new KanbanIntegrationService();
  }
};

// Apply permission check to all routes
router.use(requireSyncPermission);

/**
 * GET /api/admin/kanban-sync/status
 * Get current sync status
 */
router.get('/status', async (req, res) => {
  try {
    await initializeServices();
    const status = await syncService.getSyncStatus();
    
    res.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/full-sync
 * Perform full bidirectional sync
 */
router.post('/full-sync', async (req, res) => {
  try {
    await initializeServices();
    
    logger.info('Full sync initiated via API', {
      user: req.session.user.email
    });
    
    const syncResult = await syncService.performFullSync();
    
    res.json({
      success: syncResult.success,
      result: syncResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to perform full sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/tasks
 * Get all discovered tasks
 */
router.get('/tasks', async (req, res) => {
  try {
    await initializeServices();
    
    const { 
      status, 
      priority, 
      tags, 
      synced, 
      search, 
      sortBy = 'modifiedAt', 
      sortOrder = 'desc',
      limit = 50 
    } = req.query;
    
    const criteria = {
      status,
      priority,
      tags: tags ? tags.split(',') : undefined,
      synced: synced !== undefined ? synced === 'true' : undefined,
      search,
      sortBy,
      sortOrder,
      limit: parseInt(limit)
    };
    
    const tasks = await taskDiscovery.searchTasks(criteria);
    
    res.json({
      success: true,
      tasks: tasks,
      count: tasks.length,
      filters: criteria,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/tasks/:id
 * Get specific task details
 */
router.get('/tasks/:id', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    
    const tasks = await taskDiscovery.discoverTasks();
    const task = tasks.find(t => t.id === id);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      task: task,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get task ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/tasks
 * Create new task
 */
router.post('/tasks', async (req, res) => {
  try {
    await initializeServices();
    const taskData = req.body;
    
    // Validate task data
    const errors = taskDiscovery.validateTaskData(taskData);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const task = await taskDiscovery.createTaskFile(taskData);
    
    // Sync to Kanban
    const card = await kanbanIntegration.syncTaskToCard(task);
    
    // Update task with card info
    await taskDiscovery.updateTaskMetadata(task.id, {
      cardId: card.id,
      column: card.column,
      synced: true,
      lastSync: new Date()
    });
    
    logger.info('Task created via API', {
      taskId: task.id,
      filename: task.filename,
      user: req.session.user.email
    });
    
    res.status(201).json({
      success: true,
      task: task,
      card: card,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to create task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/kanban-sync/tasks/:id
 * Update task and sync to Kanban
 */
router.put('/tasks/:id', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    const updates = req.body;
    
    const syncResult = await syncService.syncSingleTask(id);
    
    logger.info('Task updated via API', {
      taskId: id,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      result: syncResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to update task ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/tasks/:id/sync
 * Sync specific task to Kanban
 */
router.post('/tasks/:id/sync', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    
    const syncResult = await syncService.syncSingleTask(id);
    
    logger.info('Task synced via API', {
      taskId: id,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      result: syncResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to sync task ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/kanban/cards
 * Get all Kanban cards
 */
router.get('/kanban/cards', async (req, res) => {
  try {
    await initializeServices();
    
    const { 
      column, 
      priority, 
      tags, 
      search, 
      taskId 
    } = req.query;
    
    const criteria = {
      column,
      priority,
      tags: tags ? tags.split(',') : undefined,
      search,
      taskId
    };
    
    const cards = await kanbanIntegration.searchCards(criteria);
    
    res.json({
      success: true,
      cards: cards,
      count: cards.length,
      filters: criteria,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get Kanban cards:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/kanban/cards/:id
 * Get specific Kanban card
 */
router.get('/kanban/cards/:id', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    
    const card = await kanbanIntegration.getCard(id);
    
    if (!card) {
      return res.status(404).json({
        success: false,
        error: 'Card not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      card: card,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to get card ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * PUT /api/admin/kanban-sync/kanban/cards/:id
 * Update Kanban card and sync to task
 */
router.put('/kanban/cards/:id', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    const updates = req.body;
    
    // Validate card data
    const errors = kanbanIntegration.validateCardData(updates);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }
    
    const card = await kanbanIntegration.updateCard(id, updates);
    
    // Sync back to task if linked
    if (card.metadata.taskId) {
      await syncService.syncSingleCard(id);
    }
    
    logger.info('Card updated via API', {
      cardId: id,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      card: card,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to update card ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/kanban/cards/:id/move
 * Move card to different column
 */
router.post('/kanban/cards/:id/move', async (req, res) => {
  try {
    await initializeServices();
    const { id } = req.params;
    const { column } = req.body;
    
    if (!column) {
      return res.status(400).json({
        success: false,
        error: 'Column is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const card = await kanbanIntegration.moveCard(id, column);
    
    // Sync back to task if linked
    if (card.metadata.taskId) {
      await syncService.syncSingleCard(id);
    }
    
    logger.info('Card moved via API', {
      cardId: id,
      newColumn: column,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      card: card,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to move card ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/conflicts
 * Get sync conflicts
 */
router.get('/conflicts', async (req, res) => {
  try {
    await initializeServices();
    const conflicts = await syncService.detectSyncConflicts();
    
    res.json({
      success: true,
      conflicts: conflicts,
      count: conflicts.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get sync conflicts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/conflicts/resolve
 * Resolve sync conflict
 */
router.post('/conflicts/resolve', async (req, res) => {
  try {
    await initializeServices();
    const { taskId, cardId, source } = req.body;
    
    if (!taskId || !cardId || !source) {
      return res.status(400).json({
        success: false,
        error: 'taskId, cardId, and source are required',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['task', 'card'].includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'source must be either "task" or "card"',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await syncService.resolveSyncConflict(taskId, cardId, source);
    
    logger.info('Sync conflict resolved via API', {
      taskId,
      cardId,
      source,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to resolve sync conflict:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/logs
 * Get sync logs
 */
router.get('/logs', async (req, res) => {
  try {
    await initializeServices();
    const { limit = 100 } = req.query;
    
    const logs = await syncService.getSyncLogs(parseInt(limit));
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get sync logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/admin/kanban-sync/logs
 * Clear sync logs
 */
router.delete('/logs', async (req, res) => {
  try {
    await initializeServices();
    
    await syncService.clearSyncLogs();
    
    logger.info('Sync logs cleared via API', {
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Sync logs cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to clear sync logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/statistics
 * Get sync statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    await initializeServices();
    
    const taskStats = await taskDiscovery.getTaskStatistics();
    const kanbanStats = await kanbanIntegration.getBoardStatistics();
    const syncHealth = await kanbanIntegration.getSyncHealth();
    
    const statistics = {
      tasks: taskStats,
      kanban: kanbanStats,
      syncHealth: syncHealth,
      lastSync: syncService.lastSyncTime,
      syncStatistics: syncService.syncStatistics
    };
    
    res.json({
      success: true,
      statistics: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/admin/kanban-sync/export
 * Export all sync data
 */
router.get('/export', async (req, res) => {
  try {
    await initializeServices();
    
    const exportData = await syncService.exportSyncData();
    
    logger.info('Sync data exported via API', {
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      data: exportData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to export sync data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/admin/kanban-sync/test
 * Test sync functionality with sample data
 */
router.post('/test', async (req, res) => {
  try {
    await initializeServices();
    
    // Create a test task
    const testTaskData = {
      title: 'Test Sync Task',
      description: 'This is a test task created via API for sync testing',
      status: 'To Do',
      priority: 'medium',
      tags: ['test', 'api', 'sync']
    };
    
    const task = await taskDiscovery.createTaskFile(testTaskData);
    
    // Sync to Kanban
    const syncResult = await syncService.syncSingleTask(task.id);
    
    logger.info('Test sync performed via API', {
      taskId: task.id,
      user: req.session.user.email
    });
    
    res.json({
      success: true,
      message: 'Test sync completed successfully',
      task: task,
      syncResult: syncResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to perform test sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 