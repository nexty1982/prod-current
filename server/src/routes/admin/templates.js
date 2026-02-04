// routes/admin/templates.js
// CRUD endpoints for record templates stored in orthodoxmetrics_db.templates

const express = require('express');
const router = express.Router();
const { getAppPool } = require('../../config/db');
const { requireAuth } = require('../../middleware/requireAuth');

const APP_DB = process.env.APP_DB_NAME || 'orthodoxmetrics_db';

// 🔍 Debug: Log route registration
console.log('✅ [Templates Router] Loading templates router for /api/admin/templates');

// 🔒 Apply authentication to ALL template routes
router.use(requireAuth);

/**
 * Middleware to check if user is admin or super_admin
 */
const requireAdmin = (req, res, next) => {
  const user = req.session?.user || req.user;
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const userRole = user.role;
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Administrative privileges required'
    });
  }

  next();
};

/**
 * Validate template.fields JSON structure
 * Fields must be an array of column definitions with required properties
 */
function validateTemplateFields(fields) {
  if (!fields) {
    return { valid: false, error: 'fields is required' };
  }

  if (typeof fields === 'string') {
    try {
      fields = JSON.parse(fields);
    } catch (e) {
      return { valid: false, error: 'fields must be valid JSON' };
    }
  }

  if (!Array.isArray(fields)) {
    return { valid: false, error: 'fields must be an array' };
  }

  if (fields.length === 0) {
    return { valid: false, error: 'fields must contain at least one column definition' };
  }

  // Validate each field definition
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    
    if (!field || typeof field !== 'object') {
      return { valid: false, error: `fields[${i}] must be an object` };
    }

    // Required: column name (used as database column)
    if (!field.column || typeof field.column !== 'string') {
      return { valid: false, error: `fields[${i}].column is required and must be a string` };
    }

    // Required: display label
    if (!field.label || typeof field.label !== 'string') {
      return { valid: false, error: `fields[${i}].label is required and must be a string` };
    }

    // Optional but validate if present
    if (field.type && typeof field.type !== 'string') {
      return { valid: false, error: `fields[${i}].type must be a string` };
    }

    if (field.required !== undefined && typeof field.required !== 'boolean') {
      return { valid: false, error: `fields[${i}].required must be a boolean` };
    }
  }

  return { valid: true };
}

/**
 * Generate slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * GET /api/admin/templates
 * List all templates (with optional filters)
 */
router.get('/', requireAdmin, async (req, res) => {
  console.log('✅ [Templates Router] GET /api/admin/templates - Route matched');
  try {
    const { record_type, is_global, church_id } = req.query;
    
    let query = `
      SELECT 
        id, name, slug, record_type, description, fields,
        grid_type, theme, layout_type, language_support,
        is_editable, created_by, created_at, updated_at,
        church_id, is_global
      FROM \`${APP_DB}\`.templates
      WHERE 1=1
    `;
    const params = [];

    if (record_type) {
      query += ' AND record_type = ?';
      params.push(record_type);
    }

    if (is_global !== undefined) {
      query += ' AND is_global = ?';
      params.push(is_global === 'true' || is_global === '1' ? 1 : 0);
    }

    if (church_id) {
      query += ' AND (church_id = ? OR is_global = 1)';
      params.push(parseInt(church_id));
    } else {
      // Default: show global templates and templates for user's church
      const user = req.session?.user || req.user;
      if (user?.church_id) {
        query += ' AND (church_id = ? OR is_global = 1)';
        params.push(user.church_id);
      } else {
        // Super admin sees all
        query += ' AND is_global = 1';
      }
    }

    query += ' ORDER BY is_global DESC, record_type, name';

    const [rows] = await getAppPool().query(query, params);

    // Parse JSON fields
    const templates = rows.map(row => ({
      ...row,
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : row.fields,
      language_support: row.language_support 
        ? (typeof row.language_support === 'string' ? JSON.parse(row.language_support) : row.language_support)
        : null
    }));

    res.json({
      success: true,
      templates,
      count: templates.length
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/templates/:slug
 * Get a single template by slug
 */
router.get('/:slug', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await getAppPool().query(
      `SELECT 
        id, name, slug, record_type, description, fields,
        grid_type, theme, layout_type, language_support,
        is_editable, created_by, created_at, updated_at,
        church_id, is_global
      FROM \`${APP_DB}\`.templates
      WHERE slug = ?
      LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const template = rows[0];
    
    // Parse JSON fields
    template.fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    
    template.language_support = template.language_support
      ? (typeof template.language_support === 'string' ? JSON.parse(template.language_support) : template.language_support)
      : null;

    res.json({
      success: true,
      template
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/templates
 * Create a new template
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const user = req.session?.user || req.user;
    const {
      name,
      slug,
      record_type,
      description,
      fields,
      grid_type = 'aggrid',
      theme = 'liturgicalBlueGold',
      layout_type = 'table',
      language_support,
      is_editable = true,
      church_id = null,
      is_global = false
    } = req.body;

    // Validate required fields
    if (!name || !record_type || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'record_type', 'fields']
      });
    }

    // Validate record_type enum
    const validRecordTypes = ['baptism', 'marriage', 'funeral', 'custom'];
    if (!validRecordTypes.includes(record_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid record_type. Must be one of: ${validRecordTypes.join(', ')}`
      });
    }

    // Validate fields JSON structure
    const fieldsValidation = validateTemplateFields(fields);
    if (!fieldsValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fields structure',
        details: fieldsValidation.error
      });
    }

    // Generate slug if not provided
    const finalSlug = slug || generateSlug(name);

    // Check for duplicate slug
    const [existing] = await getAppPool().query(
      `SELECT id FROM \`${APP_DB}\`.templates WHERE slug = ?`,
      [finalSlug]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Template with this slug already exists'
      });
    }

    // Prepare fields JSON
    const fieldsJson = typeof fields === 'string' ? fields : JSON.stringify(fields);
    const languageSupportJson = language_support 
      ? (typeof language_support === 'string' ? language_support : JSON.stringify(language_support))
      : null;

    // Insert template
    const [result] = await getAppPool().query(
      `INSERT INTO \`${APP_DB}\`.templates
        (name, slug, record_type, description, fields, grid_type, theme, 
         layout_type, language_support, is_editable, created_by, church_id, is_global)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        finalSlug,
        record_type,
        description || null,
        fieldsJson,
        grid_type,
        theme,
        layout_type,
        languageSupportJson,
        is_editable ? 1 : 0,
        user?.id || null,
        church_id,
        is_global ? 1 : 0
      ]
    );

    // Fetch created template
    const [created] = await getAppPool().query(
      `SELECT * FROM \`${APP_DB}\`.templates WHERE id = ?`,
      [result.insertId]
    );

    const template = created[0];
    template.fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    template.language_support = template.language_support
      ? (typeof template.language_support === 'string' ? JSON.parse(template.language_support) : template.language_support)
      : null;

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    
    // Handle duplicate key errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Template with this name or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/templates/:slug
 * Update an existing template
 */
router.put('/:slug', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      name,
      record_type,
      description,
      fields,
      grid_type,
      theme,
      layout_type,
      language_support,
      is_editable,
      church_id,
      is_global
    } = req.body;

    // Check if template exists
    const [existing] = await getAppPool().query(
      `SELECT id FROM \`${APP_DB}\`.templates WHERE slug = ?`,
      [slug]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Validate record_type if provided
    if (record_type) {
      const validRecordTypes = ['baptism', 'marriage', 'funeral', 'custom'];
      if (!validRecordTypes.includes(record_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid record_type. Must be one of: ${validRecordTypes.join(', ')}`
        });
      }
    }

    // Validate fields if provided
    if (fields !== undefined) {
      const fieldsValidation = validateTemplateFields(fields);
      if (!fieldsValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid fields structure',
          details: fieldsValidation.error
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (record_type !== undefined) {
      updates.push('record_type = ?');
      params.push(record_type);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (fields !== undefined) {
      updates.push('fields = ?');
      params.push(typeof fields === 'string' ? fields : JSON.stringify(fields));
    }

    if (grid_type !== undefined) {
      updates.push('grid_type = ?');
      params.push(grid_type);
    }

    if (theme !== undefined) {
      updates.push('theme = ?');
      params.push(theme);
    }

    if (layout_type !== undefined) {
      updates.push('layout_type = ?');
      params.push(layout_type);
    }

    if (language_support !== undefined) {
      updates.push('language_support = ?');
      params.push(
        language_support 
          ? (typeof language_support === 'string' ? language_support : JSON.stringify(language_support))
          : null
      );
    }

    if (is_editable !== undefined) {
      updates.push('is_editable = ?');
      params.push(is_editable ? 1 : 0);
    }

    if (church_id !== undefined) {
      updates.push('church_id = ?');
      params.push(church_id);
    }

    if (is_global !== undefined) {
      updates.push('is_global = ?');
      params.push(is_global ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add slug to params for WHERE clause
    params.push(slug);

    // Update template
    await getAppPool().query(
      `UPDATE \`${APP_DB}\`.templates
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE slug = ?`,
      params
    );

    // Fetch updated template
    const [updated] = await getAppPool().query(
      `SELECT * FROM \`${APP_DB}\`.templates WHERE slug = ?`,
      [slug]
    );

    const template = updated[0];
    template.fields = typeof template.fields === 'string' 
      ? JSON.parse(template.fields) 
      : template.fields;
    template.language_support = template.language_support
      ? (typeof template.language_support === 'string' ? JSON.parse(template.language_support) : template.language_support)
      : null;

    res.json({
      success: true,
      message: 'Template updated successfully',
      template
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        error: 'Template with this name or slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/admin/templates/:slug
 * Delete a template
 */
router.delete('/:slug', requireAdmin, async (req, res) => {
  try {
    const { slug } = req.params;

    // Check if template exists
    const [existing] = await getAppPool().query(
      `SELECT id, name FROM \`${APP_DB}\`.templates WHERE slug = ?`,
      [slug]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Delete template
    await getAppPool().query(
      `DELETE FROM \`${APP_DB}\`.templates WHERE slug = ?`,
      [slug]
    );

    res.json({
      success: true,
      message: 'Template deleted successfully',
      deleted: {
        slug,
        name: existing[0].name
      }
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 🔍 Debug: Log successful router export
console.log('✅ [Templates Router] Router exported successfully');

module.exports = router;
