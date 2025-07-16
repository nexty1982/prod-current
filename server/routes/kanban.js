const express = require('express');
const router = express.Router();

// Import the sub-routers directly
const boardsRouter = require('./kanban/boards');
const tasksRouter = require('./kanban/tasks');

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
