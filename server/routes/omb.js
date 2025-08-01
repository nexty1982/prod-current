const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// OMB components storage path
const OMB_COMPONENTS_PATH = path.join(__dirname, '../../services/omb/layouts/omb-components.json');

// Ensure directory exists
const ensureDirectory = async () => {
  const dir = path.dirname(OMB_COMPONENTS_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Load components from file
const loadComponents = async () => {
  try {
    await ensureDirectory();
    const data = await fs.readFile(OMB_COMPONENTS_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
};

// Save components to file
const saveComponents = async (components) => {
  await ensureDirectory();
  await fs.writeFile(OMB_COMPONENTS_PATH, JSON.stringify(components, null, 2));
};

// GET /api/omb/components - Get all OMB components
router.get('/components', async (req, res) => {
  try {
    const components = await loadComponents();
    res.json(components);
  } catch (error) {
    console.error('OMB components load error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load components'
    });
  }
});

// POST /api/omb/components - Save a new OMB component
router.post('/components', async (req, res) => {
  try {
    const newComponent = req.body;
    
    // Validate required fields
    if (!newComponent.name || !newComponent.route || !newComponent.dbTable) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, route, dbTable'
      });
    }

    // Load existing components
    const components = await loadComponents();
    
    // Add new component
    components.push(newComponent);
    
    // Save to file
    await saveComponents(components);
    
    res.json(newComponent);
  } catch (error) {
    console.error('OMB component save error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save component'
    });
  }
});

// PUT /api/omb/components/:id - Update an OMB component
router.put('/components/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedComponent = req.body;
    
    const components = await loadComponents();
    const index = components.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Component not found'
      });
    }
    
    components[index] = { ...components[index], ...updatedComponent };
    await saveComponents(components);
    
    res.json(components[index]);
  } catch (error) {
    console.error('OMB component update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update component'
    });
  }
});

// DELETE /api/omb/components/:id - Delete an OMB component
router.delete('/components/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const components = await loadComponents();
    const filteredComponents = components.filter(c => c.id !== id);
    
    if (filteredComponents.length === components.length) {
      return res.status(404).json({
        success: false,
        error: 'Component not found'
      });
    }
    
    await saveComponents(filteredComponents);
    
    res.json({ success: true, message: 'Component deleted' });
  } catch (error) {
    console.error('OMB component delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete component'
    });
  }
});

// GET /api/omb/components/export - Export components as JSON
router.get('/components/export', async (req, res) => {
  try {
    const components = await loadComponents();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="omb-components.json"');
    res.json(components);
  } catch (error) {
    console.error('OMB components export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export components'
    });
  }
});

// POST /api/omb/components/import - Import components from JSON
router.post('/components/import', async (req, res) => {
  try {
    const importedComponents = req.body;
    
    if (!Array.isArray(importedComponents)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid import format: expected array of components'
      });
    }
    
    // Validate each component
    for (const component of importedComponents) {
      if (!component.name || !component.route || !component.dbTable) {
        return res.status(400).json({
          success: false,
          error: 'Invalid component: missing required fields'
        });
      }
    }
    
    await saveComponents(importedComponents);
    
    res.json({
      success: true,
      message: `Imported ${importedComponents.length} components`
    });
  } catch (error) {
    console.error('OMB components import error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import components'
    });
  }
});

// POST /api/omb/generate-code - Generate code from component
router.post('/generate-code', async (req, res) => {
  try {
    const { component, options = {} } = req.body;
    
    if (!component || !component.id || !component.name) {
      return res.status(400).json({
        success: false,
        error: 'Valid component data is required'
      });
    }
    
    // Import the code generator
    const { generateFromComponent } = require('../services/omb/generateFromComponent');
    
    // Generate code
    const generatedFiles = await generateFromComponent(component, options);
    
    res.json({
      success: true,
      message: 'Code generated successfully',
      files: generatedFiles
    });
    
  } catch (error) {
    console.error('OMB code generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate code'
    });
  }
});

// POST /api/omb/preview-code - Preview generated code without writing files
router.post('/preview-code', async (req, res) => {
  try {
    const { component } = req.body;
    
    if (!component || !component.id || !component.name) {
      return res.status(400).json({
        success: false,
        error: 'Valid component data is required'
      });
    }
    
    // Import the code generator
    const { previewGeneratedCode } = require('../services/omb/generateFromComponent');
    
    // Preview code
    const generatedFiles = await previewGeneratedCode(component);
    
    res.json({
      success: true,
      message: 'Code preview generated',
      files: generatedFiles
    });
    
  } catch (error) {
    console.error('OMB code preview error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to preview code'
    });
  }
});

// POST /api/omb/generate-and-commit - Generate code and commit to Git
router.post('/generate-and-commit', async (req, res) => {
  try {
    const { component, user = 'system' } = req.body;
    
    if (!component || !component.id || !component.name) {
      return res.status(400).json({
        success: false,
        error: 'Valid component data is required'
      });
    }
    
    // Import the code generator
    const { generateAndCommit } = require('../services/omb/generateFromComponent');
    
    // Generate and commit
    const generatedFiles = await generateAndCommit(component, user);
    
    res.json({
      success: true,
      message: 'Code generated and committed successfully',
      files: generatedFiles
    });
    
  } catch (error) {
    console.error('OMB generate and commit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate and commit code'
    });
  }
});

// GET /api/omb/generation-logs - Get code generation logs
router.get('/generation-logs', async (req, res) => {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const logFile = path.join(__dirname, '../../logs/omb-codegen.log');
    
    try {
      const logContent = await fs.readFile(logFile, 'utf8');
      const logs = logContent
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null);
      
      res.json({
        success: true,
        logs
      });
    } catch (fileError) {
      res.json({
        success: true,
        logs: []
      });
    }
    
  } catch (error) {
    console.error('OMB generation logs error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get generation logs'
    });
  }
});

module.exports = router; 