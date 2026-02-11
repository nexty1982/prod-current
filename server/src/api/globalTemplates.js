/**
 * Global Template Management API Routes
 * Allows superadmin to edit permanent global template configurations
 */

const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');
const fs = require('fs').promises;
const path = require('path');

/**
 * GET /api/templates/global/predefined
 * Get all predefined global templates
 */
router.get('/predefined', async (req, res) => {
  try {
    // Get predefined templates from service
    const predefinedTemplates = templateService.getPredefinedTemplates();
    
    res.json({
      success: true,
      templates: predefinedTemplates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching predefined templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predefined templates',
      details: error.message
    });
  }
});

/**
 * PUT /api/templates/global/predefined/:recordType
 * Update a predefined global template (superadmin only)
 */
router.put('/predefined/:recordType', async (req, res) => {
  try {
    const { recordType } = req.params;
    const { template, userEmail } = req.body;

    // Verify superadmin access
    if (userEmail !== 'superadmin@orthodoxmetrics.com') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only superadmin can edit global templates.'
      });
    }

    // Validate record type
    const validTypes = ['baptism', 'marriage', 'funeral'];
    if (!validTypes.includes(recordType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid record type. Must be baptism, marriage, or funeral.'
      });
    }

    // Validate template structure
    if (!template || !template.fields || !Array.isArray(template.fields)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid template structure. Template must have fields array.'
      });
    }

    // Validate fields
    for (const field of template.fields) {
      if (!field.field || !field.label || !field.type) {
        return res.status(400).json({
          success: false,
          error: 'Invalid field structure. Each field must have field, label, and type properties.'
        });
      }
    }

    console.log(`Updating global ${recordType} template by ${userEmail}`);
    
    // Update the predefined templates using enhanced templateService
    const updateResult = await templateService.updatePredefinedTemplate(recordType, template);
    
    // Log the change
    console.log(`✅ Global ${recordType} template updated successfully`);
    console.log(`   Fields: ${template.fields.length}`);
    console.log(`   Updated by: ${userEmail}`);
    
    res.json({
      success: true,
      message: `Global ${recordType} template updated successfully`,
      template: template,
      recordType: recordType,
      fieldsCount: template.fields.length,
      updatedBy: userEmail,
      updateResult: updateResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating global template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update global template',
      details: error.message
    });
  }
});

/**
 * GET /api/templates/global/predefined/:recordType/history
 * Get change history for a global template (future enhancement)
 */
router.get('/predefined/:recordType/history', async (req, res) => {
  try {
    const { recordType } = req.params;
    
    // For now, return empty history - this can be enhanced later with proper audit logging
    res.json({
      success: true,
      recordType: recordType,
      history: [],
      message: 'Template history tracking coming soon'
    });
  } catch (error) {
    console.error('Error fetching template history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch template history'
    });
  }
});

/**
 * POST /api/templates/global/predefined/backup
 * Create backup of current global templates (superadmin only)
 */
router.post('/backup', async (req, res) => {
  try {
    const { userEmail } = req.body;

    // Verify superadmin access
    if (userEmail !== 'superadmin@orthodoxmetrics.com') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only superadmin can create template backups.'
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp: new Date().toISOString(),
      createdBy: userEmail,
      templates: templateService.getPredefinedTemplates()
    };

    const backupPath = path.join(__dirname, `../backups/global-templates-${timestamp}.json`);
    
    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    // Write backup file
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    console.log(`✅ Global templates backup created: ${backupPath}`);

    res.json({
      success: true,
      message: 'Global templates backup created successfully',
      backupPath: backupPath,
      timestamp: timestamp,
      createdBy: userEmail
    });

  } catch (error) {
    console.error('Error creating template backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template backup',
      details: error.message
    });
  }
});

/**
 * Helper function to update predefined template in templateService
 * @deprecated - Now handled directly by templateService.updatePredefinedTemplate()
 */
async function updatePredefinedTemplate(recordType, template) {
  // This function is now deprecated as the logic has been moved to templateService
  console.log('Using deprecated updatePredefinedTemplate - please use templateService.updatePredefinedTemplate()');
}

/**
 * Helper function to update global template in database
 * @deprecated - Now handled directly by templateService.updatePredefinedTemplate()
 */
async function updateGlobalTemplateInDatabase(recordType, template) {
  // This function is now deprecated as the logic has been moved to templateService
  console.log('Using deprecated updateGlobalTemplateInDatabase - please use templateService.updatePredefinedTemplate()');
}

module.exports = router;
