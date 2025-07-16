// server/routes/autoLearningRoutes.js
// REST API routes for auto-learning OCR task management

const express = require('express');
const router = express.Router();
const autoLearningController = require('../controllers/autoLearningController');

// Middleware to check authentication (if required)
const requireAuth = (req, res, next) => {
  // Add authentication check here if needed
  // For now, allowing all requests for development
  next();
};

// Middleware to check admin privileges (for destructive operations)
const requireAdmin = (req, res, next) => {
  // Add admin check here if needed
  // For now, allowing all requests for development
  next();
};

/**
 * @route   POST /api/ai/auto-learning/start
 * @desc    Start auto-learning OCR task
 * @access  Private (authenticated users)
 * @body    { path: string, hours: number }
 */
router.post('/start', requireAuth, autoLearningController.startTask.bind(autoLearningController));

/**
 * @route   POST /api/ai/auto-learning/stop
 * @desc    Stop auto-learning OCR task
 * @access  Private (authenticated users)
 */
router.post('/stop', requireAuth, autoLearningController.stopTask.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/status
 * @desc    Get current task status
 * @access  Private (authenticated users)
 */
router.get('/status', requireAuth, autoLearningController.getStatus.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/progress
 * @desc    Get detailed task progress information
 * @access  Private (authenticated users)
 */
router.get('/progress', requireAuth, autoLearningController.getProgress.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/logs
 * @desc    Get task execution logs
 * @access  Private (authenticated users)
 * @query   type: string (all|error|success), limit: number
 */
router.get('/logs', requireAuth, autoLearningController.getLogs.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/results
 * @desc    Get task results
 * @access  Private (authenticated users)
 * @query   format: string (summary|detailed|raw)
 */
router.get('/results', requireAuth, autoLearningController.getResults.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/rules
 * @desc    Get generated learning rules
 * @access  Private (authenticated users)
 */
router.get('/rules', requireAuth, autoLearningController.getLearningRules.bind(autoLearningController));

/**
 * @route   POST /api/ai/auto-learning/reset
 * @desc    Reset task state and clear results
 * @access  Private (admin users)
 */
router.post('/reset', requireAdmin, autoLearningController.resetTask.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/config
 * @desc    Get task configuration
 * @access  Private (authenticated users)
 */
router.get('/config', requireAuth, autoLearningController.getConfig.bind(autoLearningController));

/**
 * @route   PUT /api/ai/auto-learning/config
 * @desc    Update task configuration
 * @access  Private (admin users)
 * @body    { config: object }
 */
router.put('/config', requireAdmin, autoLearningController.updateConfig.bind(autoLearningController));

/**
 * @route   GET /api/ai/auto-learning/health
 * @desc    Health check endpoint for auto-learning system
 * @access  Public
 */
router.get('/health', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Auto-learning OCR system is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Auto-learning OCR processing',
        'Confidence analysis',
        'Learning rule generation',
        'Real-time progress tracking',
        'Batch processing',
        'Error recovery'
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/ai/auto-learning
 * @desc    Get auto-learning system information
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Orthodox Metrics Auto-Learning OCR System API',
    version: '1.0.0',
    description: 'AI-powered OCR improvement system with continuous learning capabilities',
    endpoints: {
      'POST /start': 'Start auto-learning task',
      'POST /stop': 'Stop auto-learning task',
      'GET /status': 'Get current task status',
      'GET /progress': 'Get detailed progress information',
      'GET /logs': 'Get execution logs',
      'GET /results': 'Get task results',
      'GET /rules': 'Get generated learning rules',
      'POST /reset': 'Reset task state',
      'GET /config': 'Get configuration',
      'PUT /config': 'Update configuration',
      'GET /health': 'Health check'
    },
    documentation: {
      github: 'https://github.com/orthodoxmetrics/ai-learning',
      wiki: 'https://wiki.orthodoxmetrics.com/auto-learning'
    }
  });
});

module.exports = router;
