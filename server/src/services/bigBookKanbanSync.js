const TaskDiscoveryService = require('./taskDiscoveryService');
const KanbanIntegrationService = require('./kanbanIntegrationService');
const logger = require('../utils/logger');
const { info, warn, error, debug } = require('../utils/dbLogger');
const fs = require('fs').promises;
const path = require('path');

class BigBookKanbanSync {
  constructor() {
    this.taskDiscovery = new TaskDiscoveryService();
    this.kanbanIntegration = new KanbanIntegrationService();
    this.logPath = '/var/log/omai/bigbook-kanban-sync.log';
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncStatistics = {
      totalSyncs: 0,
      successfulSyncs: 0,
      errorCount: 0,
      lastError: null
    };
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    try {
      await this.ensureLogDirectory();
      await this.taskDiscovery.initialize?.();
      await this.kanbanIntegration.initialize();
      
      this.log('BigBook-Kanban sync service initialized');
      logger.info('BigBook-Kanban sync service initialized');
    } catch (error) {
      this.log(`Failed to initialize sync service: ${error.message}`, 'ERROR');
      logger.error('Failed to initialize BigBook-Kanban sync service:', error);
      throw error;
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logPath);
      await fs.mkdir(logDir, { recursive: true, mode: 0o755 });
    } catch (error) {
      logger.warn(`Could not create log directory: ${error.message}`);
    }
  }

  /**
   * Log sync operations to database
   */
  async log(message, level = 'INFO', meta = {}) {
    try {
      // Map level to database logger function
      const logFunc = {
        'INFO': info,
        'WARN': warn,
        'ERROR': error,
        'DEBUG': debug
      }[level] || info;

      // Log to database
      await logFunc(
        'BigBookKanbanSync',
        message,
        { 
          syncInProgress: this.syncInProgress,
          lastSyncTime: this.lastSyncTime,
          ...this.syncStatistics,
          ...meta 
        },
        null,
        'bigbook-kanban-sync'
      );

      // Also log to legacy logger for backward compatibility
      if (level === 'ERROR') {
        logger.error(`BigBook-Kanban Sync: ${message}`);
      } else if (level === 'WARN') {
        logger.warn(`BigBook-Kanban Sync: ${message}`);
      } else {
        logger.info(`BigBook-Kanban Sync: ${message}`);
      }
    } catch (logError) {
      console.error('Failed to write sync log:', logError);
      // Fallback to console
      console.log(`[BigBookKanbanSync] [${level}] ${message}`);
    }
  }

  /**
   * Perform complete bidirectional sync
   */
  async performFullSync() {
    if (this.syncInProgress) {
      const message = 'Sync already in progress, skipping';
      this.log(message, 'WARN');
      return { success: false, message, inProgress: true };
    }

    this.syncInProgress = true;
    const syncStartTime = new Date();
    
    try {
      this.log('Starting full bidirectional sync');
      
      const syncResult = {
        startTime: syncStartTime,
        endTime: null,
        success: false,
        tasks: {
          discovered: 0,
          synced: 0,
          created: 0,
          updated: 0,
          errors: []
        },
        kanban: {
          cards: 0,
          synced: 0,
          updated: 0,
          orphaned: 0,
          errors: []
        },
        changes: []
      };

      // Step 1: Discover all tasks
      this.log('Discovering task files...');
      const tasks = await this.taskDiscovery.discoverTasks();
      syncResult.tasks.discovered = tasks.length;
      this.log(`Discovered ${tasks.length} task files`);

      // Step 2: Sync tasks to Kanban
      this.log('Syncing tasks to Kanban...');
      const taskSyncResults = await this.syncTasksToKanban(tasks);
      syncResult.tasks.synced = taskSyncResults.synced;
      syncResult.tasks.created = taskSyncResults.created;
      syncResult.tasks.updated = taskSyncResults.updated;
      syncResult.tasks.errors = taskSyncResults.errors;

      // Step 3: Get all Kanban cards
      this.log('Retrieving Kanban cards...');
      const cards = await this.kanbanIntegration.getAllCards();
      syncResult.kanban.cards = cards.length;

      // Step 4: Sync Kanban changes back to tasks
      this.log('Syncing Kanban changes to tasks...');
      const kanbanSyncResults = await this.syncKanbanToTasks(cards, tasks);
      syncResult.kanban.synced = kanbanSyncResults.synced;
      syncResult.kanban.updated = kanbanSyncResults.updated;
      syncResult.kanban.errors = kanbanSyncResults.errors;

      // Step 5: Clean up orphaned cards
      this.log('Cleaning up orphaned cards...');
      const validTaskIds = tasks.map(task => task.id);
      const orphanedCount = await this.kanbanIntegration.cleanupOrphanedCards(validTaskIds);
      syncResult.kanban.orphaned = orphanedCount;

      // Step 6: Update sync metadata
      await this.updateSyncMetadata(syncResult);

      syncResult.endTime = new Date();
      syncResult.success = true;

      // Update statistics
      this.syncStatistics.totalSyncs++;
      this.syncStatistics.successfulSyncs++;
      this.lastSyncTime = syncResult.endTime;

      const duration = syncResult.endTime - syncResult.startTime;
      this.log(`Full sync completed successfully in ${duration}ms`);
      this.log(`Tasks: ${syncResult.tasks.synced} synced, Kanban: ${syncResult.kanban.synced} synced`);

      return syncResult;

    } catch (error) {
      this.syncStatistics.errorCount++;
      this.syncStatistics.lastError = error.message;
      
      this.log(`Full sync failed: ${error.message}`, 'ERROR');
      
      return {
        success: false,
        error: error.message,
        startTime: syncStartTime,
        endTime: new Date()
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync tasks to Kanban cards
   */
  async syncTasksToKanban(tasks) {
    const results = {
      synced: 0,
      created: 0,
      updated: 0,
      errors: []
    };

    for (const task of tasks) {
      try {
        let isNewCard = !task.kanban.cardId;
        
        const card = await this.kanbanIntegration.syncTaskToCard(task);
        
        if (isNewCard) {
          results.created++;
          this.log(`Created Kanban card for task: ${task.filename}`);
        } else {
          results.updated++;
          this.log(`Updated Kanban card for task: ${task.filename}`);
        }

        // Update task metadata with card info
        await this.taskDiscovery.updateTaskMetadata(task.id, {
          cardId: card.id,
          column: card.column,
          synced: true,
          lastSync: new Date()
        });

        results.synced++;

      } catch (error) {
        const errorMsg = `Failed to sync task ${task.filename}: ${error.message}`;
        results.errors.push({ taskId: task.id, filename: task.filename, error: error.message });
        this.log(errorMsg, 'ERROR');
      }
    }

    return results;
  }

  /**
   * Sync Kanban changes back to tasks
   */
  async syncKanbanToTasks(cards, tasks) {
    const results = {
      synced: 0,
      updated: 0,
      errors: []
    };

    const taskMap = new Map(tasks.map(task => [task.kanban.cardId, task]));

    for (const card of cards) {
      if (!card.metadata.taskId) {
        continue; // Skip cards not linked to tasks
      }

      try {
        const task = taskMap.get(card.id);
        if (!task) {
          this.log(`Warning: Card ${card.id} references missing task ${card.metadata.taskId}`, 'WARN');
          continue;
        }

        // Check if card has been updated more recently than task
        const cardUpdated = new Date(card.updated);
        const taskUpdated = new Date(task.modifiedAt);

        if (cardUpdated > taskUpdated) {
          // Update task with card changes
          const updates = {
            status: card.column,
            priority: card.priority,
            tags: card.tags
          };

          // Update task metadata
          const updatedTask = await this.taskDiscovery.updateTaskMetadata(task.id, {
            column: card.column,
            lastSync: new Date()
          });

          results.updated++;
          results.synced++;
          
          this.log(`Updated task ${task.filename} from Kanban card changes`);
        } else {
          results.synced++;
        }

      } catch (error) {
        const errorMsg = `Failed to sync card ${card.id} to task: ${error.message}`;
        results.errors.push({ cardId: card.id, error: error.message });
        this.log(errorMsg, 'ERROR');
      }
    }

    return results;
  }

  /**
   * Sync a single task
   */
  async syncSingleTask(taskId) {
    try {
      this.log(`Starting single task sync for: ${taskId}`);
      
      const tasks = await this.taskDiscovery.discoverTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const card = await this.kanbanIntegration.syncTaskToCard(task);
      
      await this.taskDiscovery.updateTaskMetadata(task.id, {
        cardId: card.id,
        column: card.column,
        synced: true,
        lastSync: new Date()
      });

      this.log(`Successfully synced single task: ${task.filename}`);
      
      return {
        success: true,
        task: task,
        card: card,
        timestamp: new Date()
      };

    } catch (error) {
      this.log(`Failed to sync single task ${taskId}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Sync a single Kanban card
   */
  async syncSingleCard(cardId) {
    try {
      this.log(`Starting single card sync for: ${cardId}`);
      
      const card = await this.kanbanIntegration.getCard(cardId);
      if (!card) {
        throw new Error(`Card not found: ${cardId}`);
      }

      if (!card.metadata.taskId) {
        throw new Error(`Card ${cardId} is not linked to a task`);
      }

      const tasks = await this.taskDiscovery.discoverTasks();
      const task = tasks.find(t => t.id === card.metadata.taskId);
      
      if (!task) {
        throw new Error(`Task not found for card: ${card.metadata.taskId}`);
      }

      // Update task with card data
      await this.taskDiscovery.updateTaskMetadata(task.id, {
        column: card.column,
        lastSync: new Date()
      });

      this.log(`Successfully synced single card: ${cardId}`);
      
      return {
        success: true,
        card: card,
        task: task,
        timestamp: new Date()
      };

    } catch (error) {
      this.log(`Failed to sync single card ${cardId}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Detect sync conflicts
   */
  async detectSyncConflicts() {
    try {
      this.log('Detecting sync conflicts...');
      
      const tasks = await this.taskDiscovery.discoverTasks();
      const cards = await this.kanbanIntegration.getAllCards();
      
      const conflicts = [];
      const taskMap = new Map(tasks.map(task => [task.kanban.cardId, task]));

      for (const card of cards) {
        if (!card.metadata.taskId) continue;

        const task = taskMap.get(card.id);
        if (!task) continue;

        const cardUpdated = new Date(card.updated);
        const taskUpdated = new Date(task.modifiedAt);
        const lastSync = task.kanban.lastSync ? new Date(task.kanban.lastSync) : new Date(0);

        // Check for conflicts (both updated after last sync)
        if (cardUpdated > lastSync && taskUpdated > lastSync && 
            Math.abs(cardUpdated - taskUpdated) > 60000) { // 1 minute tolerance
          
          conflicts.push({
            taskId: task.id,
            cardId: card.id,
            taskFile: task.filename,
            cardUpdated: cardUpdated,
            taskUpdated: taskUpdated,
            lastSync: lastSync,
            differences: this.comparTaskAndCard(task, card)
          });
        }
      }

      this.log(`Detected ${conflicts.length} sync conflicts`);
      return conflicts;

    } catch (error) {
      this.log(`Failed to detect sync conflicts: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Compare task and card for differences
   */
  compareTaskAndCard(task, card) {
    const differences = [];

    if (task.title !== card.title) {
      differences.push({ field: 'title', task: task.title, card: card.title });
    }

    if (task.status !== card.column) {
      differences.push({ field: 'status', task: task.status, card: card.column });
    }

    if (task.priority !== card.priority) {
      differences.push({ field: 'priority', task: task.priority, card: card.priority });
    }

    if (task.description !== card.description) {
      differences.push({ field: 'description', task: task.description, card: card.description });
    }

    return differences;
  }

  /**
   * Resolve sync conflict by choosing source
   */
  async resolveSyncConflict(taskId, cardId, source = 'task') {
    try {
      this.log(`Resolving sync conflict for task ${taskId}, card ${cardId}, source: ${source}`);

      if (source === 'task') {
        await this.syncSingleTask(taskId);
      } else if (source === 'card') {
        await this.syncSingleCard(cardId);
      } else {
        throw new Error(`Invalid conflict resolution source: ${source}`);
      }

      this.log(`Successfully resolved sync conflict for task ${taskId}`);
      
      return {
        success: true,
        resolution: source,
        timestamp: new Date()
      };

    } catch (error) {
      this.log(`Failed to resolve sync conflict: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(syncResult) {
    try {
      const metadata = {
        lastSync: syncResult.endTime,
        syncResults: syncResult,
        statistics: this.syncStatistics
      };

      const metadataPath = '/var/log/omai/sync-metadata.json';
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      
    } catch (error) {
      this.log(`Failed to update sync metadata: ${error.message}`, 'WARN');
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const tasks = await this.taskDiscovery.getTaskStatistics();
      const kanban = await this.kanbanIntegration.getBoardStatistics();
      const conflicts = await this.detectSyncConflicts();

      const status = {
        isActive: this.syncInProgress,
        lastSync: this.lastSyncTime,
        statistics: this.syncStatistics,
        tasks: tasks,
        kanban: kanban,
        conflicts: conflicts.length,
        health: this.calculateSyncHealth(tasks, kanban, conflicts)
      };

      return status;

    } catch (error) {
      this.log(`Failed to get sync status: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Calculate sync health score
   */
  calculateSyncHealth(taskStats, kanbanStats, conflicts) {
    let score = 100;

    // Deduct for unsynced tasks
    const unsyncedRatio = taskStats.syncStatus.unsynced / taskStats.total;
    score -= unsyncedRatio * 30;

    // Deduct for sync errors
    if (taskStats.syncStatus.errors > 0) {
      score -= Math.min(taskStats.syncStatus.errors * 5, 20);
    }

    // Deduct for conflicts
    score -= Math.min(conflicts.length * 10, 30);

    // Deduct for recent errors
    if (this.syncStatistics.errorCount > this.syncStatistics.successfulSyncs * 0.1) {
      score -= 20;
    }

    return {
      score: Math.max(0, Math.round(score)),
      status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor',
      issues: []
    };
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(limit = 100) {
    try {
      const logContent = await fs.readFile(this.logPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const logs = lines.slice(-limit).map(line => {
        const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3]
          };
        }
        return { timestamp: null, level: 'INFO', message: line };
      });

      return logs.reverse(); // Most recent first

    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear sync logs
   */
  async clearSyncLogs() {
    try {
      await fs.writeFile(this.logPath, '');
      this.log('Sync logs cleared');
      return true;
    } catch (error) {
      this.log(`Failed to clear sync logs: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Export sync data
   */
  async exportSyncData() {
    try {
      const tasks = await this.taskDiscovery.discoverTasks();
      const kanbanData = await this.kanbanIntegration.exportBoardData();
      const syncStatus = await this.getSyncStatus();
      const logs = await this.getSyncLogs(500);

      const exportData = {
        exportTimestamp: new Date(),
        tasks: tasks,
        kanban: kanbanData,
        syncStatus: syncStatus,
        logs: logs,
        metadata: {
          version: '1.0.0',
          generator: 'BigBook-Kanban Sync Service'
        }
      };

      return exportData;

    } catch (error) {
      this.log(`Failed to export sync data: ${error.message}`, 'ERROR');
      throw error;
    }
  }
}

module.exports = BigBookKanbanSync; 