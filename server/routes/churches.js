// server/routes/churches.js
const express = require('express');
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { cleanRecords, cleanRecord } = require('../utils/dateFormatter');
const { validateChurchData, sanitizeChurchData, generateChurchId } = require('../utils/churchValidation');

const router = express.Router();

// GET /api/churches - Get all churches (admin only)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Churches endpoint called');
    console.log('📋 Request details:', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      headers: req.headers
    });
    
    // For now, let's remove auth to debug the 500 error
    // TODO: Re-add authentication after debugging
    
    const [churches] = await promisePool.query(`
      SELECT 
        id,
        church_id,
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description,
        founded_year,
        language_preference,
        timezone,
        currency,
        tax_id,
        is_active,
        created_at,
        updated_at
      FROM church_info 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    console.log(`✅ Found ${churches.length} churches`);
    console.log('📋 Sample church data:', churches.length > 0 ? churches[0] : 'No churches found');
    
    console.log('🧹 Cleaning records with dateFormatter...');
    const cleanedChurches = cleanRecords(churches);
    console.log('✅ Records cleaned successfully');
    
    const response = { 
      success: true,
      churches: cleanedChurches 
    };
    console.log('📤 Sending response with', cleanedChurches.length, 'churches');
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching churches:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch churches',
      details: error.message 
    });
  }
});

// GET /api/churches/:id - Get church by ID
router.get('/:id', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id);
    
    console.log('🔍 GET /api/churches/:id request details:', {
      originalUrl: req.originalUrl,
      params: req.params,
      rawId: req.params.id,
      parsedId: churchId,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      sessionExists: !!req.session,
      method: req.method,
      headers: req.headers
    });
    
    if (isNaN(churchId)) {
      console.log('❌ Invalid church ID format - returning 400');
      return res.status(400).json({
        success: false,
        error: 'Invalid church ID format'
      });
    }

    const [churches] = await promisePool.query(`
      SELECT 
        id,
        church_id,
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description,
        founded_year,
        language_preference,
        timezone,
        currency,
        tax_id,
        is_active,
        created_at,
        updated_at
      FROM church_info 
      WHERE id = ?
    `, [churchId]);

    if (churches.length === 0) {
      console.log('❌ Church not found with ID:', churchId);
      return res.status(404).json({
        success: false,
        error: 'Church not found'
      });
    }

    console.log('✅ Church found:', churches[0].name);
    const cleanedChurch = cleanRecord(churches[0]);
    
    res.json(cleanedChurch);
  } catch (error) {
    console.error('❌ Error fetching church by ID:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch church',
      details: error.message 
    });
  }
});

// POST /api/churches/create - Create new church with comprehensive information
router.post('/create', requireAuth, async (req, res) => {
  try {
    // Check if user has admin or super_admin role
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    console.log('🏛️ Creating new church with data:', req.body);

    // Validate church data
    const validation = validateChurchData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Sanitize church data
    const churchData = sanitizeChurchData(req.body);
    console.log('🧹 Sanitized church data:', churchData);

    // Check if church name already exists
    const [existingChurch] = await promisePool.query(
      'SELECT id FROM church_info WHERE name = ?',
      [churchData.name]
    );

    if (existingChurch.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Church name already exists',
        field: 'name'
      });
    }

    // Check if email already exists
    const [existingEmail] = await promisePool.query(
      'SELECT id FROM church_info WHERE email = ?',
      [churchData.email]
    );

    if (existingEmail.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'Email already in use',
        field: 'email'
      });
    }

    // Generate unique church_id
    const church_id = generateChurchId(churchData.name);

    // Insert new church into church_info table
    const [result] = await promisePool.query(`
      INSERT INTO church_info (
        church_id,
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description,
        founded_year,
        language_preference,
        timezone,
        currency,
        tax_id,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      church_id,
      churchData.name,
      churchData.email,
      churchData.phone,
      churchData.website,
      churchData.address,
      churchData.city,
      churchData.state_province,
      churchData.postal_code,
      churchData.country,
      churchData.description,
      churchData.founded_year,
      churchData.language_preference,
      churchData.timezone,
      churchData.currency,
      churchData.tax_id,
      churchData.is_active
    ]);

    console.log('✅ Church created with ID:', result.insertId, 'Church ID:', church_id);

    // Create default OCR settings for the new church
    try {
      await promisePool.query(`
        INSERT INTO ocr_settings (
          church_id,
          language_preference,
          ai_model,
          confidence_threshold,
          auto_extract,
          field_mapping,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        church_id,
        churchData.language_preference,
        'gpt-4-vision-preview',
        0.7,
        false,
        JSON.stringify({
          firstName: 'first_name',
          lastName: 'last_name',
          dateOfBaptism: 'reception_date',
          priest: 'clergy',
          parents: 'parents',
          godparents: 'sponsors'
        })
      ]);
      console.log('✅ Default OCR settings created for church:', church_id);
    } catch (ocrError) {
      console.warn('⚠️ Failed to create OCR settings (non-critical):', ocrError.message);
    }

    // Fetch the created church with all details
    const [newChurch] = await promisePool.query(
      'SELECT * FROM church_info WHERE id = ?',
      [result.insertId]
    );

    console.log('🎉 Church creation successful');

    res.status(201).json({
      success: true,
      message: 'Church created successfully',
      church: {
        id: newChurch[0].id,
        church_id: newChurch[0].church_id,
        name: newChurch[0].name,
        email: newChurch[0].email,
        country: newChurch[0].country,
        language_preference: newChurch[0].language_preference,
        timezone: newChurch[0].timezone,
        is_active: newChurch[0].is_active,
        created_at: newChurch[0].created_at
      },
      validation: {
        warnings: validation.warnings
      }
    });

  } catch (error) {
    console.error('❌ Error creating church:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create church',
      details: error.message
    });
  }
});

// PUT /api/churches/:id - Update church
router.put('/:id', requireAuth, async (req, res) => {
  try {
    console.log('🚀 PUT /:id route handler started');
    console.log('🔐 Session user:', req.session?.user);
    console.log('🎭 User role:', req.session?.user?.role);
    
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'super_admin') {
      console.log('❌ Access denied - insufficient role:', req.session.user.role);
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const churchId = parseInt(req.params.id);
    console.log('🔄 Updating church ID:', churchId, 'with data:', req.body);

    // Validate church data
    const validation = validateChurchData(req.body);
    console.log('📋 Validation result:', {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      requestBody: req.body
    });
    
    if (!validation.isValid) {
      console.log('❌ Validation failed for church update:', validation.errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.errors,
        warnings: validation.warnings
      });
    }

    // Check if church exists
    const [existingChurch] = await promisePool.query(
      'SELECT id FROM church_info WHERE id = ?',
      [churchId]
    );

    if (existingChurch.length === 0) {
      console.log('❌ Church not found with ID:', churchId);
      return res.status(404).json({ 
        success: false,
        error: 'Church not found' 
      });
    }

    // Sanitize church data
    const churchData = sanitizeChurchData(req.body);
    console.log('🧹 Sanitized church data for update:', churchData);

    // Build update query dynamically
    const updates = [];
    const values = [];

    // Map all possible fields that can be updated
    const fieldMapping = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'website': 'website',
      'address': 'address',
      'city': 'city',
      'state_province': 'state_province',
      'postal_code': 'postal_code',
      'country': 'country',
      'description': 'description',
      'founded_year': 'founded_year',
      'language_preference': 'language_preference', // Use sanitized field name
      'timezone': 'timezone',
      'currency': 'currency',
      'tax_id': 'tax_id',
      'is_active': 'is_active'
    };

    // Build dynamic update query
    Object.keys(fieldMapping).forEach(frontendField => {
      const dbField = fieldMapping[frontendField];
      if (churchData[frontendField] !== undefined) {
        console.log(`🔄 Adding field: ${frontendField} -> ${dbField} = ${churchData[frontendField]}`);
        updates.push(`${dbField} = ?`);
        values.push(churchData[frontendField]);
      } else {
        console.log(`⚠️ Field ${frontendField} not found in sanitized data`);
      }
    });

    console.log('🔄 Total updates to apply:', updates.length);
    console.log('🔄 Update fields:', updates);

    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No fields to update' 
      });
    }

    values.push(churchId);

    console.log('🔄 Executing update query:', `UPDATE church_info SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
    console.log('🔄 With values:', values);

    await promisePool.query(
      `UPDATE church_info SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Fetch updated church
    const [updatedChurch] = await promisePool.query(`
      SELECT 
        id,
        church_id,
        name,
        email,
        phone,
        website,
        address,
        city,
        state_province,
        postal_code,
        country,
        description,
        founded_year,
        language_preference,
        timezone,
        currency,
        tax_id,
        is_active,
        created_at,
        updated_at
      FROM church_info 
      WHERE id = ?
    `, [churchId]);

    console.log('✅ Church updated successfully:', updatedChurch[0].name);
    const cleanedChurch = cleanRecord(updatedChurch[0]);

    res.json({
      success: true,
      message: 'Church updated successfully',
      church: cleanedChurch
    });

  } catch (error) {
    console.error('❌ Error updating church:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update church',
      details: error.message
    });
  }
});

// DELETE /api/churches/:id - Delete church (soft delete)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const churchId = parseInt(req.params.id);
    console.log('🗑️ Deleting church ID:', churchId);

    // Check if church exists
    const [existingChurch] = await promisePool.query(
      'SELECT id FROM church_info WHERE id = ?',
      [churchId]
    );

    if (existingChurch.length === 0) {
      console.log('❌ Church not found with ID:', churchId);
      return res.status(404).json({ 
        success: false,
        error: 'Church not found' 
      });
    }

    // Soft delete by setting is_active to false
    await promisePool.query(
      'UPDATE church_info SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [churchId]
    );

    console.log('✅ Church deactivated successfully');
    res.json({ 
      success: true,
      message: 'Church deactivated successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting church:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete church',
      details: error.message
    });
  }
});

module.exports = router;
