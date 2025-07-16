// server/routes/menu.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');           // your mysql2 pool/connection
// Import the auth middleware
const { requireAuth } = require('../middleware/auth');

// Note: The GET /api/get-visible-menu-items endpoint is implemented in users.js
// This file is kept for future menu-related endpoints

module.exports = router;
