const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const ComponentDiscovery = require('../utils/componentDiscovery');
const logger = require('../utils/logger');

// Initialize component discovery
const discovery = new ComponentDiscovery();

/**
 * POST /api/components/discover
 * Trigger component discovery and return results
 */
router.post('/discover', async (req, res) => {
  try {
    logger.info('Starting component discovery...');
    
    const startTime = Date.now();
    const result = await discovery.discoverAllComponents();
    const endTime = Date.now();
    
    // Save results to file
    await saveDiscoveryResults(result);
    
    logger.info(`Component discovery completed in ${endTime - startTime}ms. Found ${result.components.length} components.`);
    
    res.json({
      success: true,
      data: result,
      discoveryTime: endTime - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Component discovery failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/components/list
 * Get previously discovered components from database
 */
router.get('/list', async (req, res) => {
  try {
    const ComponentRegistryService = require('../services/componentRegistryService');
    const componentService = new ComponentRegistryService();
    
    const results = await componentService.getAllComponents();
    
    res.json({
      success: true,
      data: results,
      cached: true,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get component list from database:', error);
    
    // Fallback to JSON file if database fails
    try {
      const resultsPath = path.join(process.cwd(), 'auto-discovered-components.json');
      const data = await fs.readFile(resultsPath, 'utf8');
      const results = JSON.parse(data);
      
      res.json({
        success: true,
        data: results,
        cached: true,
        source: 'json_fallback',
        timestamp: new Date().toISOString()
      });
    } catch (fallbackError) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

/**
 * GET /api/components/summary
 * Get component discovery summary
 */
router.get('/summary', async (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'auto-discovered-components.json');
    const data = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(data);
    
    res.json({
      success: true,
      summary: results.summary,
      totalComponents: results.components.length,
      lastDiscovery: results.timestamp,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: 'No discovery results found. Run discovery first.',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/components/category/:category
 * Get components by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const resultsPath = path.join(process.cwd(), 'auto-discovered-components.json');
    const data = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(data);
    
    const categoryComponents = results.components.filter(c => c.category === category);
    
    res.json({
      success: true,
      category: category,
      components: categoryComponents,
      count: categoryComponents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get components by category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/components/search
 * Search components by name, path, or tag
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, tag, directory } = req.query;
    
    if (!q && !category && !tag && !directory) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q), category, tag, or directory parameter required',
        timestamp: new Date().toISOString()
      });
    }
    
    const resultsPath = path.join(process.cwd(), 'auto-discovered-components.json');
    const data = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(data);
    
    let filteredComponents = results.components;
    
    // Apply filters
    if (q) {
      const query = q.toLowerCase();
      filteredComponents = filteredComponents.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.displayName.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.relativePath.toLowerCase().includes(query)
      );
    }
    
    if (category) {
      filteredComponents = filteredComponents.filter(c => c.category === category);
    }
    
    if (tag) {
      filteredComponents = filteredComponents.filter(c => c.tags.includes(tag));
    }
    
    if (directory) {
      filteredComponents = filteredComponents.filter(c => 
        c.directory.toLowerCase().includes(directory.toLowerCase())
      );
    }
    
    res.json({
      success: true,
      query: { q, category, tag, directory },
      components: filteredComponents,
      count: filteredComponents.length,
      totalCount: results.components.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Component search failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/components/component/:name
 * Get detailed information about a specific component from database
 */
router.get('/component/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const ComponentRegistryService = require('../services/componentRegistryService');
    const componentService = new ComponentRegistryService();
    
    const component = await componentService.getComponentByName(name);
    
    if (!component) {
      return res.status(404).json({
        success: false,
        error: `Component '${name}' not found`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Try to read the actual component file for additional details
    try {
      const componentContent = await fs.readFile(component.filePath, 'utf8');
      component.sourceCode = componentContent;
    } catch (fileError) {
      logger.warn(`Could not read source for component ${name}:`, fileError.message);
    }
    
    res.json({
      success: true,
      component: component,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get component details from database:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/components/refresh
 * Refresh component discovery and update OMB palette
 */
router.post('/refresh', async (req, res) => {
  try {
    logger.info('Refreshing component discovery...');
    
    const startTime = Date.now();
    const result = await discovery.discoverAllComponents();
    const endTime = Date.now();
    
    // Save updated results
    await saveDiscoveryResults(result);
    
    // Update OMB palette (if OMB is available)
    try {
      await updateOMBPalette(result.components);
    } catch (ombError) {
      logger.warn('Could not update OMB palette:', ombError.message);
    }
    
    logger.info(`Component discovery refreshed in ${endTime - startTime}ms.`);
    
    res.json({
      success: true,
      message: 'Component discovery refreshed successfully',
      data: result,
      discoveryTime: endTime - startTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Component discovery refresh failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/components/stats
 * Get component discovery statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const resultsPath = path.join(process.cwd(), 'auto-discovered-components.json');
    const data = await fs.readFile(resultsPath, 'utf8');
    const results = JSON.parse(data);
    
    const stats = {
      totalComponents: results.components.length,
      categories: results.summary.categories,
      directories: results.summary.directories,
      extensions: results.summary.extensions,
      usage: {
        inMenu: results.summary.inMenu,
        inRoutes: results.summary.inRoutes,
        withProps: results.summary.withProps,
        withHooks: results.summary.withHooks
      },
      lastDiscovery: results.timestamp,
      coverage: {
        menuCoverage: Math.round((results.summary.inMenu / results.summary.totalComponents) * 100),
        routeCoverage: Math.round((results.summary.inRoutes / results.summary.totalComponents) * 100),
        propsCoverage: Math.round((results.summary.withProps / results.summary.totalComponents) * 100),
        hooksCoverage: Math.round((results.summary.withHooks / results.summary.totalComponents) * 100)
      }
    };
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get component stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Save discovery results to auto-discovered-components.json
 */
async function saveDiscoveryResults(result) {
  try {
    const outputPath = path.join(process.cwd(), 'auto-discovered-components.json');
    const formattedData = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'OrthodoxMetrics Component Discovery System',
      description: 'Auto-discovered React components from the OrthodoxMetrics frontend codebase',
      ...result
    };
    
    await fs.writeFile(outputPath, JSON.stringify(formattedData, null, 2));
    logger.info(`Discovery results saved to ${outputPath}`);
  } catch (error) {
    logger.error('Failed to save discovery results:', error);
    throw error;
  }
}

/**
 * Update OMB palette with discovered components
 */
async function updateOMBPalette(components) {
  try {
    // Generate OMB palette configuration
    const ombComponents = components.map(component => ({
      id: component.name,
      name: component.displayName,
      icon: component.icon,
      category: component.category,
      description: component.description,
      tags: component.tags,
      props: component.props,
      configurable: component.props.length > 0,
      path: component.relativePath,
      usage: component.usage,
      metadata: {
        hasHooks: component.hasHooks,
        hasJSX: component.hasJSX,
        isDefault: component.isDefault,
        dependencies: component.dependencies,
        size: component.size,
        lines: component.lines
      }
    }));
    
    // Save OMB palette configuration
    const ombPalettePath = path.join(process.cwd(), 'front-end', 'src', 'config', 'omb-discovered-components.json');
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(ombPalettePath), { recursive: true });
    
    await fs.writeFile(ombPalettePath, JSON.stringify({
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      totalComponents: ombComponents.length,
      categories: ['navigation', 'data', 'display', 'action'],
      components: ombComponents
    }, null, 2));
    
    logger.info(`OMB palette updated with ${ombComponents.length} components`);
  } catch (error) {
    logger.error('Failed to update OMB palette:', error);
    throw error;
  }
}

module.exports = router; 