/**
 * Orthodox Metrics - Church Records API Routes
 * Unified CRUD routes for baptism, marriage, and funeral records
 */

const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/records');
const { requireAuth } = require('../middleware/auth');
const { auditLogger } = require('../middleware/auditLogger');

// Middleware to validate record type
const validateRecordType = (req, res, next) => {
  const validTypes = ['baptism', 'marriage', 'funeral'];
  const { recordType } = req.params;
  
  if (!validTypes.includes(recordType)) {
    return res.status(400).json({
      error: 'Invalid record type',
      message: `Record type must be one of: ${validTypes.join(', ')}`,
      received: recordType
    });
  }
  
  req.recordType = recordType;
  next();
};

// Middleware to check record editing permissions
const checkRecordPermissions = (req, res, next) => {
  const user = req.user;
  const allowedRoles = ['super_admin', 'admin', 'priest', 'deacon'];
  
  // Check if user has permission to edit records
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Only priests, deacons, and administrators can edit church records',
      userRole: user.role,
      requiredRoles: allowedRoles
    });
  }
  
  next();
};

// GET /api/records/:recordType - List all records of a specific type
router.get('/:recordType', 
  requireAuth,
  validateRecordType,
  recordsController.listRecords
);

// GET /api/records/:recordType/:id - Fetch single record
router.get('/:recordType/:id',
  requireAuth,
  validateRecordType,
  recordsController.getRecordById
);

// POST /api/records/:recordType - Create new record
router.post('/:recordType',
  requireAuth,
  validateRecordType,
  checkRecordPermissions,
  auditLogger('record_create'),
  recordsController.createRecord
);

// PUT /api/records/:recordType/:id - Update existing record
router.put('/:recordType/:id',
  requireAuth,
  validateRecordType,
  checkRecordPermissions,
  auditLogger('record_update'),
  recordsController.updateRecord
);

// DELETE /api/records/:recordType/:id - Delete record
router.delete('/:recordType/:id',
  requireAuth,
  validateRecordType,
  checkRecordPermissions,
  auditLogger('record_delete'),
  recordsController.deleteRecord
);

// GET /api/records/:recordType/:id/history - Get record audit history
router.get('/:recordType/:id/history',
  requireAuth,
  validateRecordType,
  recordsController.getRecordHistory
);

// POST /api/records/:recordType/:id/validate - Validate record data
router.post('/:recordType/:id/validate',
  requireAuth,
  validateRecordType,
  recordsController.validateRecord
);

// GET /api/records/stats/summary - Get records statistics
router.get('/stats/summary',
  requireAuth,
  recordsController.getRecordStats
);

module.exports = router;
