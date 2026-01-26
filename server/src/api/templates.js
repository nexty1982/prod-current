// server/routes/templates.js
const express = require('express');
const router = express.Router();
const TemplateService = require('../services/templateService');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    // Accept CSV and JSON files
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/json' || 
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * POST /api/templates/generate
 * Generate a new template file from field definitions
 */
router.post('/generate', async (req, res) => {
  try {
    const { templateName, fields, options = {}, churchId } = req.body;

    // Validate request
    if (!templateName || !fields) {
      return res.status(400).json({
        success: false,
        error: 'Template name and fields are required'
      });
    }

    // Validate template name (should be PascalCase, no spaces)
    const templateNameRegex = /^[A-Z][a-zA-Z0-9]*$/;
    if (!templateNameRegex.test(templateName)) {
      return res.status(400).json({
        success: false,
        error: 'Template name must be in PascalCase format (e.g., "BaptismRecords")'
      });
    }

    // Validate fields structure
    if (!TemplateService.validateFields(fields)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fields structure. Each field must have "field" and "label" properties'
      });
    }

    // Add church ID to options if provided
    if (churchId) {
      options.churchId = churchId;
    }

    // Generate the template
    const filePath = await TemplateService.generateTemplate(templateName, fields, options);

    res.json({
      success: true,
      message: 'Template generated successfully',
      data: {
        templateName,
        filePath,
        fieldsCount: fields.length
      }
    });

  } catch (error) {
    console.error('Error generating template:', error);
    
    if (error.message.includes('EEXIST') || error.message.includes('Duplicate entry')) {
      return res.status(409).json({
        success: false,
        error: 'Template with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/templates
 * Get all templates with metadata (with optional church filtering)
 */
router.get('/', async (req, res) => {
  try {
    const { churchId, includeGlobal = 'true' } = req.query;
    
    const templates = await TemplateService.getAllTemplates(
      churchId ? parseInt(churchId) : null,
      includeGlobal === 'true'
    );

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/templates/:name
 * Get a specific template by name (with optional church filtering)
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { churchId } = req.query;
    
    const template = await TemplateService.getTemplateByName(
      name, 
      churchId ? parseInt(churchId) : null
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/templates/:name
 * Update an existing template (with church permission check)
 */
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { fields, churchId, ...updates } = req.body;

    // Check if template exists
    const existingTemplate = await TemplateService.getTemplateByName(
      name, 
      churchId ? parseInt(churchId) : null
    );
    
    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (fields) {
      // Validate fields structure
      if (!TemplateService.validateFields(fields)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid fields structure. Each field must have "field" and "label" properties'
        });
      }

      // Regenerate the template with new fields
      const filePath = await TemplateService.generateTemplate(name, fields, {
        ...updates,
        churchId: churchId ? parseInt(churchId) : null
      });

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: {
          templateName: name,
          filePath,
          fieldsCount: fields.length
        }
      });
    } else {
      // Update only metadata
      await TemplateService.updateTemplate(
        name, 
        updates, 
        churchId ? parseInt(churchId) : null
      );

      res.json({
        success: true,
        message: 'Template metadata updated successfully'
      });
    }

  } catch (error) {
    console.error('Error updating template:', error);
    
    if (error.message.includes('Permission denied') || error.message.includes('Cannot modify')) {
      return res.status(403).json({
        success: false,
        error: error.message
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
 * DELETE /api/templates/:name
 * Delete a template and its file (with church permission check)
 */
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { churchId } = req.body;

    const success = await TemplateService.deleteTemplate(
      name, 
      churchId ? parseInt(churchId) : null
    );

    if (success) {
      res.json({
        success: true,
        message: 'Template deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

  } catch (error) {
    console.error('Error deleting template:', error);
    
    if (error.message === 'Template not found') {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    if (error.message.includes('Permission denied') || error.message.includes('Cannot delete')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/validate
 * Validate template fields structure without creating a template
 */
router.post('/validate', async (req, res) => {
  try {
    const { templateName, fields } = req.body;

    const validation = {
      templateName: {
        valid: templateName && /^[A-Z][a-zA-Z0-9]*$/.test(templateName),
        message: 'Template name must be in PascalCase format'
      },
      fields: {
        valid: TemplateService.validateFields(fields),
        message: 'Each field must have "field" and "label" properties'
      }
    };

    const isValid = validation.templateName.valid && validation.fields.valid;

    res.json({
      success: true,
      valid: isValid,
      validation
    });

  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate template'
    });
  }
});

/**
 * GET /api/templates/type/:recordType
 * Get templates by record type (with optional church filtering)
 */
router.get('/type/:recordType', async (req, res) => {
  try {
    const { recordType } = req.params;
    const { churchId, includeGlobal = 'true' } = req.query;
    
    // Validate record type
    const validTypes = ['baptism', 'marriage', 'funeral', 'custom'];
    if (!validTypes.includes(recordType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record type. Must be one of: ' + validTypes.join(', ')
      });
    }

    const templates = await TemplateService.getTemplatesByType(
      recordType,
      churchId ? parseInt(churchId) : null,
      includeGlobal === 'true'
    );
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Error getting templates by type:', error);
    res.status(500).json({
      success: false,
      error: 'Error retrieving templates by type',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/upload
 * Upload and parse CSV/JSON file to generate field definitions
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    let fields = [];

    try {
      if (originalName.endsWith('.json')) {
        // Parse JSON file
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          // If it's an array of objects, use the keys from the first object
          const sampleObject = jsonData[0];
          fields = Object.keys(sampleObject).map(key => ({
            field: key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: typeof sampleObject[key] === 'number' ? 'number' : 
                  (key.toLowerCase().includes('date') ? 'date' : 'string')
          }));
        } else if (typeof jsonData === 'object') {
          // If it's a single object, use its keys
          fields = Object.keys(jsonData).map(key => ({
            field: key,
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            type: typeof jsonData[key] === 'number' ? 'number' : 
                  (key.toLowerCase().includes('date') ? 'date' : 'string')
          }));
        }
      } else if (originalName.endsWith('.csv')) {
        // Parse CSV file
        const results = [];
        
        await new Promise((resolve, reject) => {
          fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve())
            .on('error', (error) => reject(error));
        });

        if (results.length > 0) {
          const headers = Object.keys(results[0]);
          const sampleRow = results[0];
          
          fields = headers.map(header => ({
            field: header.toLowerCase().replace(/\s+/g, '_'),
            label: header,
            type: isNaN(sampleRow[header]) ? 
                  (header.toLowerCase().includes('date') ? 'date' : 'string') : 
                  'number'
          }));
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Unable to parse fields from the uploaded file'
        });
      }

      res.json({
        success: true,
        message: 'File parsed successfully',
        data: {
          fields,
          suggestedTemplateName: originalName.replace(/\.(csv|json)$/i, 'Records')
        }
      });

    } catch (parseError) {
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw parseError;
    }

  } catch (error) {
    console.error('Error processing uploaded file:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing uploaded file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/init
 * Initialize the templates database table
 */
router.post('/init', async (req, res) => {
  try {
    await TemplateService.initializeDatabase();
    
    res.json({
      success: true,
      message: 'Templates database initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing templates database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize templates database',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/sync
 * Sync existing template files with database
 */
router.post('/sync', async (req, res) => {
  try {
    await TemplateService.syncExistingTemplates();

    res.json({
      success: true,
      message: 'Templates synced successfully'
    });

  } catch (error) {
    console.error('Error syncing templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/templates/predefined/definitions
 * Get predefined template definitions
 */
router.get('/predefined/definitions', async (req, res) => {
  try {
    const predefinedTemplates = TemplateService.getPredefinedTemplates();

    res.json({
      success: true,
      data: predefinedTemplates
    });

  } catch (error) {
    console.error('Error getting predefined templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve predefined templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/predefined/initialize
 * Initialize predefined templates
 */
router.post('/predefined/initialize', async (req, res) => {
  try {
    await TemplateService.initializePredefinedTemplates();

    res.json({
      success: true,
      message: 'Predefined templates initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing predefined templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize predefined templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/analyze/:filename
 * Analyze an existing template file and extract field definitions
 */
router.post('/analyze/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const path = require('path');
    
    // Construct file path
    const filePath = path.resolve(__dirname, `../../front-end/src/views/records/${filename}`);
    
    // Extract fields from the template
    const fields = TemplateService.extractFieldsFromTemplate(filePath);

    res.json({
      success: true,
      data: {
        filename,
        fields,
        fieldCount: fields.length
      }
    });

  } catch (error) {
    console.error('Error analyzing template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/templates/types/record-types
 * Get available record types
 */
router.get('/types/record-types', async (req, res) => {
  try {
    const recordTypes = [
      { value: 'baptism', label: 'Baptism Records', description: 'Orthodox baptism ceremonies' },
      { value: 'marriage', label: 'Marriage Records', description: 'Orthodox wedding ceremonies' },
      { value: 'funeral', label: 'Funeral Records', description: 'Orthodox funeral services' },
      { value: 'custom', label: 'Custom Records', description: 'Custom record types' }
    ];

    res.json({
      success: true,
      data: recordTypes
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve record types'
    });
  }
});

/**
 * GET /api/templates/church/:churchId
 * Get all templates for a specific church (including global templates)
 */
router.get('/church/:churchId', async (req, res) => {
  try {
    const { churchId } = req.params;
    const templates = await TemplateService.getTemplatesForChurch(parseInt(churchId));

    res.json({
      success: true,
      data: templates,
      count: templates.length
    });

  } catch (error) {
    console.error('Error getting templates for church:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch church templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/templates/global/available
 * Get available global templates that can be duplicated
 */
router.get('/global/available', async (req, res) => {
  try {
    const globalTemplates = await TemplateService.getGlobalTemplates();

    res.json({
      success: true,
      data: globalTemplates,
      count: globalTemplates.length
    });

  } catch (error) {
    console.error('Error getting global templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global templates',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/templates/duplicate
 * Duplicate a global template for a specific church
 */
router.post('/duplicate', async (req, res) => {
  try {
    const { globalTemplateName, churchId, newName, options = {} } = req.body;

    if (!globalTemplateName || !churchId || !newName) {
      return res.status(400).json({
        success: false,
        error: 'Global template name, church ID, and new name are required'
      });
    }

    // Validate new template name
    const templateNameRegex = /^[A-Z][a-zA-Z0-9]*$/;
    if (!templateNameRegex.test(newName)) {
      return res.status(400).json({
        success: false,
        error: 'New template name must be in PascalCase format'
      });
    }

    const filePath = await TemplateService.duplicateGlobalTemplate(
      globalTemplateName,
      parseInt(churchId),
      newName,
      options
    );

    res.json({
      success: true,
      message: 'Global template duplicated successfully',
      data: {
        originalTemplate: globalTemplateName,
        newTemplateName: newName,
        churchId,
        filePath
      }
    });

  } catch (error) {
    console.error('Error duplicating global template:', error);
    
    if (error.message.includes('not found') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to duplicate global template',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
