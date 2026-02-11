const express = require('express');
const router = express.Router();

// Import kanban route modules
const boardsRouter = require('./boards');
const tasksRouter = require('./tasks');

// Mount the sub-routers
router.use('/boards', boardsRouter);
router.use('/tasks', tasksRouter);

// Health check endpoint for kanban system
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kanban system is operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
