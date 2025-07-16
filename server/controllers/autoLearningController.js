// server/controllers/autoLearningController.js
// API controller for auto-learning OCR task management

const AutoLearningTaskService = require('../services/ai/autoLearningTaskService');
const logger = require('../utils/logger');

class AutoLearningController {
  constructor() {
    this.taskService = new AutoLearningTaskService();
  }

  /**
   * Start auto-learning task
   * POST /api/ai/auto-learning/start
   */
  async startTask(req, res) {
    try {
      const { path = 'data/records/', hours = 24 } = req.body;

      // Validate inputs
      if (typeof path !== 'string' || path.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Path must be a valid non-empty string'
        });
      }

      if (!Number.isInteger(hours) || hours < 1 || hours > 72) {
        return res.status(400).json({
          success: false,
          error: 'Hours must be an integer between 1 and 72'
        });
      }

      // Check if task is already running
      const currentStatus = this.taskService.getStatus();
      if (currentStatus.isRunning) {
        return res.status(409).json({
          success: false,
          error: 'Auto-learning task is already running',
          status: currentStatus
        });
      }

      // Start the task
      const taskStarted = await this.taskService.startTask(path, hours);

      if (taskStarted) {
        logger.info('AutoLearningController', 'Task started successfully', {
          path,
          hours,
          startedBy: req.user?.username || 'anonymous'
        });

        res.json({
          success: true,
          message: 'Auto-learning task started successfully',
          status: this.taskService.getStatus()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to start auto-learning task'
        });
      }

    } catch (error) {
      logger.error('AutoLearningController', 'Error starting task', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while starting task',
        details: error.message
      });
    }
  }

  /**
   * Stop auto-learning task
   * POST /api/ai/auto-learning/stop
   */
  async stopTask(req, res) {
    try {
      const currentStatus = this.taskService.getStatus();
      
      if (!currentStatus.isRunning) {
        return res.status(400).json({
          success: false,
          error: 'No auto-learning task is currently running'
        });
      }

      const taskStopped = await this.taskService.stopTask();

      if (taskStopped) {
        logger.info('AutoLearningController', 'Task stopped successfully', {
          stoppedBy: req.user?.username || 'anonymous',
          finalStatus: this.taskService.getStatus()
        });

        res.json({
          success: true,
          message: 'Auto-learning task stopped successfully',
          status: this.taskService.getStatus()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to stop auto-learning task'
        });
      }

    } catch (error) {
      logger.error('AutoLearningController', 'Error stopping task', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while stopping task',
        details: error.message
      });
    }
  }

  /**
   * Get task status
   * GET /api/ai/auto-learning/status
   */
  async getStatus(req, res) {
    try {
      const status = this.taskService.getStatus();

      res.json({
        success: true,
        status
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting status', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting status',
        details: error.message
      });
    }
  }

  /**
   * Get task progress details
   * GET /api/ai/auto-learning/progress
   */
  async getProgress(req, res) {
    try {
      const status = this.taskService.getStatus();

      // Enhanced progress response with more details
      const progressData = {
        isRunning: status.isRunning,
        progress: status.progress || 0,
        recordsProcessed: status.recordsProcessed || 0,
        totalRecords: status.totalRecords || 0,
        successRate: status.successRate || 0,
        averageConfidence: status.averageConfidence || 0,
        errorCount: status.errorCount || 0,
        trainingRulesGenerated: status.trainingRulesGenerated || 0,
        timeRemaining: status.timeRemaining || null,
        startTime: status.startTime || null,
        currentBatch: status.currentBatch || null,
        totalBatches: status.totalBatches || null,
        lastProcessedRecord: status.lastProcessedRecord || null,
        processingRate: status.processingRate || null, // records per minute
        estimatedCompletion: status.estimatedCompletion || null
      };

      res.json({
        success: true,
        progress: progressData
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting progress', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting progress',
        details: error.message
      });
    }
  }

  /**
   * Get task logs
   * GET /api/ai/auto-learning/logs
   */
  async getLogs(req, res) {
    try {
      const { type = 'all', limit = 100 } = req.query;

      const logs = await this.taskService.getLogs(type, parseInt(limit));

      res.json({
        success: true,
        logs,
        type,
        limit: parseInt(limit)
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting logs', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting logs',
        details: error.message
      });
    }
  }

  /**
   * Get task results
   * GET /api/ai/auto-learning/results
   */
  async getResults(req, res) {
    try {
      const { format = 'summary' } = req.query;

      const results = await this.taskService.getResults(format);

      if (!results) {
        return res.status(404).json({
          success: false,
          error: 'No results available'
        });
      }

      res.json({
        success: true,
        results,
        format
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting results', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting results',
        details: error.message
      });
    }
  }

  /**
   * Get generated learning rules
   * GET /api/ai/auto-learning/rules
   */
  async getLearningRules(req, res) {
    try {
      const rules = await this.taskService.getLearningRules();

      if (!rules) {
        return res.status(404).json({
          success: false,
          error: 'No learning rules available'
        });
      }

      res.json({
        success: true,
        rules
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting learning rules', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting learning rules',
        details: error.message
      });
    }
  }

  /**
   * Reset task state
   * POST /api/ai/auto-learning/reset
   */
  async resetTask(req, res) {
    try {
      const currentStatus = this.taskService.getStatus();
      
      if (currentStatus.isRunning) {
        return res.status(400).json({
          success: false,
          error: 'Cannot reset while task is running. Stop the task first.'
        });
      }

      const reset = await this.taskService.resetTask();

      if (reset) {
        logger.info('AutoLearningController', 'Task reset successfully', {
          resetBy: req.user?.username || 'anonymous'
        });

        res.json({
          success: true,
          message: 'Auto-learning task reset successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to reset auto-learning task'
        });
      }

    } catch (error) {
      logger.error('AutoLearningController', 'Error resetting task', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while resetting task',
        details: error.message
      });
    }
  }

  /**
   * Get task configuration
   * GET /api/ai/auto-learning/config
   */
  async getConfig(req, res) {
    try {
      const config = this.taskService.getConfig();

      res.json({
        success: true,
        config
      });

    } catch (error) {
      logger.error('AutoLearningController', 'Error getting config', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while getting config',
        details: error.message
      });
    }
  }

  /**
   * Update task configuration
   * PUT /api/ai/auto-learning/config
   */
  async updateConfig(req, res) {
    try {
      const currentStatus = this.taskService.getStatus();
      
      if (currentStatus.isRunning) {
        return res.status(400).json({
          success: false,
          error: 'Cannot update configuration while task is running'
        });
      }

      const { config } = req.body;

      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Valid configuration object is required'
        });
      }

      const updated = await this.taskService.updateConfig(config);

      if (updated) {
        logger.info('AutoLearningController', 'Configuration updated', {
          updatedBy: req.user?.username || 'anonymous',
          config
        });

        res.json({
          success: true,
          message: 'Configuration updated successfully',
          config: this.taskService.getConfig()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update configuration'
        });
      }

    } catch (error) {
      logger.error('AutoLearningController', 'Error updating config', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error while updating config',
        details: error.message
      });
    }
  }
}

module.exports = new AutoLearningController();
