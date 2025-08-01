const logger = require('../utils/logger');

class KanbanIntegrationService {
  constructor() {
    this.boardId = 'dev';
    this.columns = {
      'To Do': 'todo',
      'In Progress': 'in_progress', 
      'Review': 'review',
      'Done': 'done'
    };
    
    // In-memory store for demo (replace with actual Kanban API)
    this.cards = new Map();
    this.nextCardId = 1;
    
    this.initialize();
  }

  /**
   * Initialize the Kanban integration
   */
  async initialize() {
    try {
      // Initialize demo board structure
      await this.setupDemoBoard();
      logger.info('Kanban integration service initialized');
    } catch (error) {
      logger.error('Failed to initialize Kanban integration:', error);
    }
  }

  /**
   * Setup demo board for testing
   */
  async setupDemoBoard() {
    // Create some sample cards for testing
    const sampleCards = [
      {
        title: 'Setup Authentication System',
        description: 'Implement OAuth2 authentication for the admin panel',
        column: 'To Do',
        priority: 'high',
        tags: ['auth', 'security']
      },
      {
        title: 'Database Optimization',
        description: 'Optimize database queries for better performance',
        column: 'In Progress', 
        priority: 'medium',
        tags: ['database', 'performance']
      }
    ];

    for (const cardData of sampleCards) {
      await this.createCard(cardData);
    }
  }

  /**
   * Create a new Kanban card
   */
  async createCard(cardData) {
    try {
      const cardId = `card_${this.nextCardId++}`;
      
      const card = {
        id: cardId,
        title: cardData.title,
        description: cardData.description || '',
        column: cardData.column || 'To Do',
        priority: cardData.priority || 'medium',
        tags: cardData.tags || [],
        created: new Date(),
        updated: new Date(),
        assignee: cardData.assignee || null,
        dueDate: cardData.dueDate || null,
        boardId: this.boardId,
        metadata: {
          taskId: cardData.taskId || null,
          sourceFile: cardData.sourceFile || null,
          syncTimestamp: new Date()
        }
      };

      this.cards.set(cardId, card);
      
      logger.info(`Created Kanban card: ${cardId} - ${card.title}`);
      return card;
    } catch (error) {
      logger.error('Failed to create Kanban card:', error);
      throw error;
    }
  }

  /**
   * Update an existing Kanban card
   */
  async updateCard(cardId, updates) {
    try {
      const card = this.cards.get(cardId);
      if (!card) {
        throw new Error(`Card not found: ${cardId}`);
      }

      // Update card properties
      Object.assign(card, updates, {
        updated: new Date(),
        metadata: {
          ...card.metadata,
          syncTimestamp: new Date()
        }
      });

      this.cards.set(cardId, card);
      
      logger.info(`Updated Kanban card: ${cardId}`);
      return card;
    } catch (error) {
      logger.error(`Failed to update Kanban card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a Kanban card
   */
  async deleteCard(cardId) {
    try {
      const card = this.cards.get(cardId);
      if (!card) {
        throw new Error(`Card not found: ${cardId}`);
      }

      this.cards.delete(cardId);
      
      logger.info(`Deleted Kanban card: ${cardId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete Kanban card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific Kanban card
   */
  async getCard(cardId) {
    try {
      const card = this.cards.get(cardId);
      if (!card) {
        return null;
      }
      
      return { ...card }; // Return copy
    } catch (error) {
      logger.error(`Failed to get Kanban card ${cardId}:`, error);
      throw error;
    }
  }

  /**
   * Get all cards for the dev board
   */
  async getAllCards() {
    try {
      const cards = Array.from(this.cards.values())
        .filter(card => card.boardId === this.boardId)
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return cards;
    } catch (error) {
      logger.error('Failed to get all Kanban cards:', error);
      throw error;
    }
  }

  /**
   * Get cards by column
   */
  async getCardsByColumn(column) {
    try {
      const cards = Array.from(this.cards.values())
        .filter(card => card.boardId === this.boardId && card.column === column)
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      return cards;
    } catch (error) {
      logger.error(`Failed to get cards for column ${column}:`, error);
      throw error;
    }
  }

  /**
   * Move card to different column
   */
  async moveCard(cardId, newColumn) {
    try {
      if (!Object.keys(this.columns).includes(newColumn)) {
        throw new Error(`Invalid column: ${newColumn}`);
      }

      const card = await this.updateCard(cardId, { 
        column: newColumn,
        updated: new Date()
      });

      logger.info(`Moved card ${cardId} to ${newColumn}`);
      return card;
    } catch (error) {
      logger.error(`Failed to move card ${cardId} to ${newColumn}:`, error);
      throw error;
    }
  }

  /**
   * Search cards by criteria
   */
  async searchCards(criteria = {}) {
    try {
      let cards = Array.from(this.cards.values())
        .filter(card => card.boardId === this.boardId);

      // Filter by column
      if (criteria.column) {
        cards = cards.filter(card => card.column === criteria.column);
      }

      // Filter by priority
      if (criteria.priority) {
        cards = cards.filter(card => card.priority === criteria.priority);
      }

      // Filter by tags
      if (criteria.tags && criteria.tags.length > 0) {
        cards = cards.filter(card => 
          criteria.tags.some(tag => card.tags.includes(tag))
        );
      }

      // Text search
      if (criteria.search) {
        const searchTerm = criteria.search.toLowerCase();
        cards = cards.filter(card => 
          card.title.toLowerCase().includes(searchTerm) ||
          card.description.toLowerCase().includes(searchTerm)
        );
      }

      // Filter by task ID
      if (criteria.taskId) {
        cards = cards.filter(card => card.metadata.taskId === criteria.taskId);
      }

      // Sort by creation date (newest first)
      cards.sort((a, b) => new Date(b.created) - new Date(a.created));

      return cards;
    } catch (error) {
      logger.error('Failed to search Kanban cards:', error);
      throw error;
    }
  }

  /**
   * Sync task data to Kanban card
   */
  async syncTaskToCard(taskData) {
    try {
      let card = null;
      
      // Check if card already exists
      if (taskData.kanban.cardId) {
        card = await this.getCard(taskData.kanban.cardId);
      }

      // Search for existing card by task ID
      if (!card && taskData.id) {
        const searchResults = await this.searchCards({ taskId: taskData.id });
        if (searchResults.length > 0) {
          card = searchResults[0];
        }
      }

      const cardData = {
        title: taskData.title,
        description: taskData.description,
        column: taskData.kanban.column,
        priority: taskData.priority,
        tags: taskData.tags,
        taskId: taskData.id,
        sourceFile: taskData.filename,
        assignee: taskData.assignee || null
      };

      if (card) {
        // Update existing card
        card = await this.updateCard(card.id, cardData);
        logger.info(`Synced task ${taskData.id} to existing card ${card.id}`);
      } else {
        // Create new card
        card = await this.createCard(cardData);
        logger.info(`Synced task ${taskData.id} to new card ${card.id}`);
      }

      return card;
    } catch (error) {
      logger.error(`Failed to sync task ${taskData.id} to Kanban:`, error);
      throw error;
    }
  }

  /**
   * Sync card data back to task format
   */
  async syncCardToTask(cardId) {
    try {
      const card = await this.getCard(cardId);
      if (!card) {
        throw new Error(`Card not found: ${cardId}`);
      }

      const taskData = {
        id: card.metadata.taskId,
        title: card.title,
        description: card.description,
        status: card.column,
        priority: card.priority,
        tags: card.tags,
        kanban: {
          cardId: card.id,
          column: card.column,
          boardId: card.boardId,
          synced: true,
          lastSync: new Date(),
          updated: card.updated
        }
      };

      logger.info(`Synced card ${cardId} to task data`);
      return taskData;
    } catch (error) {
      logger.error(`Failed to sync card ${cardId} to task:`, error);
      throw error;
    }
  }

  /**
   * Get board statistics
   */
  async getBoardStatistics() {
    try {
      const cards = await this.getAllCards();
      
      const stats = {
        totalCards: cards.length,
        byColumn: {},
        byPriority: {},
        recentActivity: [],
        syncedTasks: 0
      };

      // Initialize column counts
      Object.keys(this.columns).forEach(column => {
        stats.byColumn[column] = 0;
      });

      cards.forEach(card => {
        // By column
        stats.byColumn[card.column] = (stats.byColumn[card.column] || 0) + 1;
        
        // By priority
        stats.byPriority[card.priority] = (stats.byPriority[card.priority] || 0) + 1;
        
        // Synced tasks
        if (card.metadata.taskId) {
          stats.syncedTasks++;
        }
      });

      // Recent activity (last 10 updates)
      stats.recentActivity = cards
        .sort((a, b) => new Date(b.updated) - new Date(a.updated))
        .slice(0, 10)
        .map(card => ({
          cardId: card.id,
          title: card.title,
          column: card.column,
          updated: card.updated
        }));

      return stats;
    } catch (error) {
      logger.error('Failed to get board statistics:', error);
      throw error;
    }
  }

  /**
   * Validate card data
   */
  validateCardData(cardData) {
    const errors = [];

    if (!cardData.title || cardData.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (cardData.column && !Object.keys(this.columns).includes(cardData.column)) {
      errors.push(`Invalid column: ${cardData.column}. Must be one of: ${Object.keys(this.columns).join(', ')}`);
    }

    if (cardData.priority && !['low', 'medium', 'high', 'critical'].includes(cardData.priority)) {
      errors.push('Invalid priority. Must be one of: low, medium, high, critical');
    }

    return errors;
  }

  /**
   * Batch operations for sync
   */
  async batchSyncTasks(tasks) {
    try {
      const results = {
        created: 0,
        updated: 0,
        errors: []
      };

      for (const task of tasks) {
        try {
          const card = await this.syncTaskToCard(task);
          
          if (task.kanban.cardId) {
            results.updated++;
          } else {
            results.created++;
          }
        } catch (error) {
          results.errors.push({
            taskId: task.id,
            error: error.message
          });
        }
      }

      logger.info(`Batch sync completed: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`);
      return results;
    } catch (error) {
      logger.error('Failed to batch sync tasks:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned cards (cards without corresponding tasks)
   */
  async cleanupOrphanedCards(validTaskIds) {
    try {
      const cards = await this.getAllCards();
      const orphanedCards = cards.filter(card => 
        card.metadata.taskId && !validTaskIds.includes(card.metadata.taskId)
      );

      let deletedCount = 0;
      for (const card of orphanedCards) {
        try {
          await this.deleteCard(card.id);
          deletedCount++;
        } catch (error) {
          logger.warn(`Failed to delete orphaned card ${card.id}:`, error.message);
        }
      }

      logger.info(`Cleaned up ${deletedCount} orphaned cards`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup orphaned cards:', error);
      throw error;
    }
  }

  /**
   * Export board data
   */
  async exportBoardData() {
    try {
      const cards = await this.getAllCards();
      const stats = await this.getBoardStatistics();

      const exportData = {
        boardId: this.boardId,
        exportTimestamp: new Date(),
        statistics: stats,
        cards: cards,
        columns: this.columns
      };

      return exportData;
    } catch (error) {
      logger.error('Failed to export board data:', error);
      throw error;
    }
  }

  /**
   * Get sync health status
   */
  async getSyncHealth() {
    try {
      const cards = await this.getAllCards();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const health = {
        totalCards: cards.length,
        syncedCards: cards.filter(card => card.metadata.taskId).length,
        recentlyUpdated: cards.filter(card => card.updated > oneHourAgo).length,
        staleSyncs: cards.filter(card => 
          card.metadata.syncTimestamp && card.metadata.syncTimestamp < oneHourAgo
        ).length,
        status: 'healthy'
      };

      // Determine health status
      const syncRatio = health.syncedCards / health.totalCards;
      if (syncRatio < 0.5) {
        health.status = 'poor';
      } else if (syncRatio < 0.8) {
        health.status = 'fair';
      }

      return health;
    } catch (error) {
      logger.error('Failed to get sync health:', error);
      throw error;
    }
  }
}

module.exports = KanbanIntegrationService; 