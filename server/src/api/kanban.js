const express = require('express');
const router = express.Router();

// Import the sub-routers directly (bridge to routes/kanban/*)
const boardsRouter = require('../../routes/kanban/boards');
const tasksRouter = require('../../routes/kanban/tasks');

// Mount the sub-routers
router.use('/boards', boardsRouter);
router.use('/tasks', tasksRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kanban system is operational',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
