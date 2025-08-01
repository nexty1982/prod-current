// server/routes/churches.js - REFACTORED for API v2 consistency
const express = require('express');
const { promisePool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');
const { validateChurchData, sanitizeChurchData, generateChurchId } = require('../utils/churchValidation');

const router = express.Router();

// Create middleware using requireRole - allows admin, super_admin, and manager access
const requireChurchAccess = requireRole(['admin', 'super_admin', 'manager']);

/**
 * Standard API v2 response wrapper
 */
function apiResponse(success, data = null, error = null, meta = null) {
  const response = { success };
  if (data !== null) response.data = data;
  if (error !== null) response.error = error;
  if (meta !== null) response.meta = meta;
  return response;
}

/**
 * Validate church access for user - ensures proper church_id scoping
 */
function validateChurchAccess(user, churchId = null) {
  // Super admins can access all churches
  if (user.role === 'super_admin') {
    return { allowed: true };
  }

  // Admins can access churches (allow access even without church assignment for Records Management)
  if (user.role === 'admin') {
    // If no church_id specified, allow access to see available churches
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
    if (!user.church_id) {
      return { allowed: false, reason: 'Admin user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  // Managers can access their assigned church only
  if (user.role === 'manager') {
    // If no church_id specified, allow access to see their assigned church
    if (!churchId) {
      return { allowed: true, church_id: user.church_id };
    }

    // If church_id specified, check if user has access to that specific church
    if (!user.church_id) {
      return { allowed: false, reason: 'Manager user has no church assignment' };
    }
    if (parseInt(churchId) !== user.church_id) {
      return { allowed: false, reason: 'Access denied to church outside your assignment' };
    }
    return { allowed: true, church_id: user.church_id };
  }

  return { allowed: false, reason: 'Insufficient role for church management' };
}

// GET /api/churches - Get all churches (admin, super_admin, and manager roles)
router.get('/', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    console.log('🔍 Churches GET endpoint - User:', req.user?.email, 'Role:', req.user?.role);

    // 🔧 SAFETY CHECK: Ensure req.user exists (should be set by auth middleware)
    if (!req.user) {
      console.error('❌ req.user is missing after auth middleware');
      return res.status(401).json(apiResponse(false, null, {
        message: 'Authentication error - user context missing',
        code: 'USER_CONTEXT_MISSING'
      }));
    }

    // Validate user access
    const access = validateChurchAccess(req.user);
    if (!access.allowed) {
      console.log('❌ Access denied:', access.reason);
      return res.status(403).json(apiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: access.reason
      }));
    }

    // Build query based on user permissions
    let query = `
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        settings,
        is_active,
        database_name,
        setup_complete,
        created_at,
        updated_at
      FROM churches 
      WHERE is_active = 1
    `;

    const params = [];

    // If admin or manager (not super_admin), restrict to their church only
    if ((req.user.role === 'admin' || req.user.role === 'manager') && access.church_id) {
      query += ' AND id = ?';
      params.push(access.church_id);
    }

    query += ' ORDER BY name ASC';

    // Execute query against orthodmetrics_dev (via promisePool)
    const [churches] = await promisePool.query(query, params);

    console.log(`✅ Found ${churches.length} churches from orthodmetrics_dev`);

    // Clean records using dateFormatter
    const cleanedChurches = cleanRecords(churches);

    const response = apiResponse(true, { churches: cleanedChurches }, null, {
      total: churches.length,
      user_role: req.user.role,
      access_level: req.user.role === 'super_admin' ? 'all_churches' : 'assigned_church'
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching churches:', error);
    res.status(500).json(apiResponse(false, null, {
      message: 'Failed to fetch churches',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// GET /api/churches/:id - Get church by ID
router.get('/:id', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🔍 GET church by ID - User:', req.user?.email, 'Church ID:', churchId);

    // 🔧 SAFETY CHECK: Ensure req.user exists (should be set by auth middleware)
    if (!req.user) {
      console.error('❌ req.user is missing after auth middleware');
      return res.status(401).json(apiResponse(false, null, {
        message: 'Authentication error - user context missing',
        code: 'USER_CONTEXT_MISSING'
      }));
    }

    if (isNaN(churchId)) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Validate user access to this specific church
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      console.log('❌ Access denied to church:', access.reason);
      return res.status(403).json(apiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: access.reason
      }));
    }

    // Query orthodmetrics_dev for church details
    const [churches] = await promisePool.query(`
      SELECT 
        id,
        name,
        email,
        phone,
        address,
        city,
        state_province,
        postal_code,
        country,
        preferred_language,
        timezone,
        currency,
        tax_id,
        website,
        description_multilang,
        is_active,
        database_name,
        setup_complete,
        created_at,
        updated_at
      FROM churches 
      WHERE id = ? AND is_active = 1
    `, [churchId]);

    if (churches.length === 0) {
      console.log('❌ Church not found with ID:', churchId);
      return res.status(404).json(apiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    console.log('✅ Church found:', churches[0].name);
    const cleanedChurch = cleanRecord(churches[0]);

    res.json(apiResponse(true, { church: cleanedChurch }));
  } catch (error) {
    console.error('❌ Error fetching church by ID:', error);
    res.status(500).json(apiResponse(false, null, {
      message: 'Failed to fetch church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// POST /api/churches/create - Create new church (super_admin only)
router.post('/create', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    console.log('🏛️ Creating new church - User:', req.user?.email);
    console.log('📝 Church data received:', req.body);

    // Validate church data
    const validation = validateChurchData(req.body);
    if (!validation.isValid) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors,
        warnings: validation.warnings
      }));
    }

    // Sanitize church data
    const churchData = sanitizeChurchData(req.body);
    console.log('🧹 Sanitized church data');

    // Check for existing church name in orthodmetrics_dev
    const [existingChurch] = await promisePool.query(
      'SELECT id FROM churches WHERE name = ?',
      [churchData.name]
    );

    if (existingChurch.length > 0) {
      return res.status(409).json(apiResponse(false, null, {
        message: 'Church name already exists',
        code: 'DUPLICATE_CHURCH_NAME',
        field: 'name'
      }));
    }

    // Check for existing email
    const [existingEmail] = await promisePool.query(
      'SELECT id FROM churches WHERE email = ?',
      [churchData.email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json(apiResponse(false, null, {
        message: 'Email already in use',
        code: 'DUPLICATE_EMAIL',
        field: 'email'
      }));
    }

    // Generate unique church identifier
    const church_id = generateChurchId(churchData.name);

    // Insert new church into orthodmetrics_dev.churches
    const [result] = await promisePool.query(`
      INSERT INTO churches (
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description_multilang,
        preferred_language,
        timezone,
        currency,
        tax_id,
        is_active,
        database_name,
        created_by,
        setup_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      churchData.name,
      churchData.email,
      churchData.phone || null,
      churchData.website || null,
      churchData.address || null,
      churchData.city || null,
      churchData.state_province || null,
      churchData.postal_code || null,
      churchData.country || 'US',
      churchData.description || null,
      churchData.preferred_language || 'en',
      churchData.timezone || 'America/New_York',
      churchData.currency || 'USD',
      churchData.tax_id || null,
      true, // is_active
      null, // database_name (will be set if/when church-specific DB is created)
      req.user.id, // created_by
      false // setup_complete
    ]);

    const newChurchId = result.insertId;
    console.log('✅ Church created with ID:', newChurchId);

    // Get the created church for response
    const [newChurch] = await promisePool.query(
      'SELECT * FROM churches WHERE id = ?',
      [newChurchId]
    );

    const cleanedChurch = cleanRecord(newChurch[0]);

    res.status(201).json(apiResponse(true, {
      church: cleanedChurch,
      message: 'Church created successfully'
    }, null, {
      church_id: newChurchId,
      created_by: req.user.email
    }));

  } catch (error) {
    console.error('❌ Error creating church:', error);
    res.status(500).json(apiResponse(false, null, {
      message: 'Failed to create church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// PUT /api/churches/:id - Update church (admin for own church, super_admin for any)
router.put('/:id', requireAuth, requireChurchAccess, async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🔧 Updating church ID:', churchId, 'User:', req.user?.email);

    if (isNaN(churchId)) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Validate user access to this church
    const access = validateChurchAccess(req.user, churchId);
    if (!access.allowed) {
      return res.status(403).json(apiResponse(false, null, {
        message: 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS',
        details: access.reason
      }));
    }

    // Validate update data
    const validation = validateChurchData(req.body, true); // true = update mode
    if (!validation.isValid) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: validation.errors
      }));
    }

    // Sanitize update data
    const updateData = sanitizeChurchData(req.body, true);

    // Check if church exists
    const [existing] = await promisePool.query(
      'SELECT id, name, email FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (existing.length === 0) {
      return res.status(404).json(apiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Check for name conflicts (if name is being changed)
    if (updateData.name && updateData.name !== existing[0].name) {
      const [nameConflict] = await promisePool.query(
        'SELECT id FROM churches WHERE name = ? AND id != ?',
        [updateData.name, churchId]
      );

      if (nameConflict.length > 0) {
        return res.status(409).json(apiResponse(false, null, {
          message: 'Church name already exists',
          code: 'DUPLICATE_CHURCH_NAME'
        }));
      }
    }

    // Check for email conflicts (if email is being changed)
    if (updateData.email && updateData.email !== existing[0].email) {
      const [emailConflict] = await promisePool.query(
        'SELECT id FROM churches WHERE email = ? AND id != ?',
        [updateData.email, churchId]
      );

      if (emailConflict.length > 0) {
        return res.status(409).json(apiResponse(false, null, {
          message: 'Email already in use',
          code: 'DUPLICATE_EMAIL'
        }));
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'No valid fields to update',
        code: 'NO_UPDATE_DATA'
      }));
    }

    // Add updated_at and updated_by
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateFields.push('updated_by = ?');
    updateValues.push(req.user.id);
    updateValues.push(churchId); // for WHERE clause

    // Execute update
    await promisePool.query(
      `UPDATE churches SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated church
    const [updatedChurch] = await promisePool.query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId]
    );

    const cleanedChurch = cleanRecord(updatedChurch[0]);

    console.log('✅ Church updated successfully');

    res.json(apiResponse(true, {
      church: cleanedChurch,
      message: 'Church updated successfully'
    }, null, {
      updated_by: req.user.email,
      fields_updated: Object.keys(updateData)
    }));

  } catch (error) {
    console.error('❌ Error updating church:', error);
    res.status(500).json(apiResponse(false, null, {
      message: 'Failed to update church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

// DELETE /api/churches/:id - Soft delete church (super_admin only)
router.delete('/:id', requireAuth, requireRole(['super_admin']), async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);

    console.log('🗑️ Soft deleting church ID:', churchId, 'User:', req.user?.email);

    if (isNaN(churchId)) {
      return res.status(400).json(apiResponse(false, null, {
        message: 'Invalid church ID format',
        code: 'INVALID_CHURCH_ID'
      }));
    }

    // Check if church exists
    const [existing] = await promisePool.query(
      'SELECT id, name FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (existing.length === 0) {
      return res.status(404).json(apiResponse(false, null, {
        message: 'Church not found',
        code: 'CHURCH_NOT_FOUND'
      }));
    }

    // Soft delete (set is_active = 0)
    await promisePool.query(
      'UPDATE churches SET is_active = 0, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?',
      [req.user.id, churchId]
    );

    console.log('✅ Church soft deleted successfully');

    res.json(apiResponse(true, {
      message: 'Church deleted successfully',
      church_name: existing[0].name
    }, null, {
      deleted_by: req.user.email,
      church_id: churchId
    }));

  } catch (error) {
    console.error('❌ Error deleting church:', error);
    res.status(500).json(apiResponse(false, null, {
      message: 'Failed to delete church',
      code: 'DATABASE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
});

module.exports = router;
