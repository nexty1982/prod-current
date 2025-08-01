const express = require('express');
const router = express.Router();

// Import individual social route modules
const blogRoutes = require('./blog');
const chatRoutes = require('./chat');
const friendsRoutes = require('./friends');
const notificationsRoutes = require('./notifications');

// Mount individual routes
router.use('/blog', blogRoutes);
router.use('/chat', chatRoutes);
router.use('/friends', friendsRoutes);
router.use('/notifications', notificationsRoutes);

module.exports = router; 