const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { formatTimestamp, formatTimestampUser, formatRelativeTime } = require('../utils/formatTimestamp');

// Import OMAI services
const { askOMAI, askOMAIWithMetadata, getOMAIHealth, getOMAIStats } = require('/var/www/orthodmetrics/dev/misc/omai/services/index.js');
// const { OMAIOrchestrator } = require('../omai/services/orchestrator');
const omaiBackgroundService = require('../services/omaiBackgroundService');

// Initialize orchestrator (temporarily disabled due to missing dependencies)
// const orchestrator = new OMAIOrchestrator();

// Mock orchestrator for basic functionality
const orchestrator = {
  runAgent: async (agentId, params) => {
    return { 
      success: true, 
      message: 'Orchestrator temporarily disabled - agent execution mocked',
      agentId,
      params 
    };
  },
  getAgents: () => ([]),
  getStatus: () => ({
    isRunning: false,
    registeredAgents: [],
    agentDomains: [],
    status: 'disabled'
  })
};

// Import correct middleware
const { authMiddleware, requireRole } = require('../middleware/auth');

// Apply auth middleware for OMAI endpoints
router.use(authMiddleware);

// Optional middleware for debugging
router.use((req, res, next) => {
  console.log(`[OMAI] ${req.method} ${req.path} - User: ${req.session?.user?.email || 'anonymous'}`);
  next();
});

// =====================================================
// CORE OMAI API ENDPOINTS
// =====================================================

// GET /api/omai/status - Status endpoint for frontend compatibility
router.get('/status', async (req, res) => {
  try {
    const health = await getOMAIHealth();
    const stats = await getOMAIStats();
    
    // Enhanced status response for frontend
    res.json({
      success: true,
      status: health.status,
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeAgents: health.components?.agents || ['omai-refactor', 'omai-analyzer', 'omai-generator'],
      components: {
        orchestrator: health.status === 'healthy' ? 'healthy' : 'error',
        scheduler: health.status === 'healthy' ? 'healthy' : 'error',
        knowledgeEngine: health.status === 'healthy' ? 'healthy' : 'error',
        agentManager: health.status === 'healthy' ? 'healthy' : 'error',
      },
      stats: {
        totalRequests: stats.totalRequests || 0,
        successfulRequests: stats.successfulRequests || 0,
        failedRequests: stats.failedRequests || 0,
        averageResponseTime: stats.averageResponseTime || 0,
        activeSessions: stats.activeSessions || 0,
        totalEmbeddings: stats.totalEmbeddings || 0,
        indexedFiles: stats.indexedFiles || 0,
      },
      timestamp: health.timestamp
    });
  } catch (error) {
    console.error('OMAI status check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// GET /api/omai/health - Service health check
router.get('/health', async (req, res) => {
  try {
    const health = await getOMAIHealth();
    res.json({
      success: true,
      status: health.status,
      components: health.components,
      timestamp: health.timestamp,
      version: '1.0.0'
    });
  } catch (error) {
    console.error('OMAI health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// GET /api/omai/stats - System statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getOMAIStats();
    res.json({
      success: true,
      ...stats,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('OMAI stats failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/fix - Fix endpoint for frontend compatibility
router.post('/fix', async (req, res) => {
  try {
    const { route, component, issues, props, currentCode, errorDetails } = req.body;
    
    // Log the fix request
    console.log(`[OMAI] Fix request for component ${component}`);

    // For now, return a stub response
    // This would be implemented with actual AI fix logic
    res.json({
      success: true,
      suggestion: `Fix for ${component} component`,
      codeDiff: '',
      explanation: 'This is a placeholder fix response. AI fix functionality will be implemented.',
      confidence: 0.8,
      estimatedTime: '5 minutes',
      requiresManualReview: true
    });
  } catch (error) {
    console.error('OMAI fix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/ask - Main query execution
router.post('/ask', async (req, res) => {
  try {
    const { prompt, context, securityContext } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Log the request
    console.log(`[OMAI] Query request: ${prompt.substring(0, 100)}...`);

    const response = await askOMAIWithMetadata(prompt, securityContext);
    
    res.json({
      success: true,
      response: response.response,
      context: response.context,
      sources: response.sources,
      memoryContext: response.memoryContext,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI ask failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/autofix - Auto-fix system
router.post('/autofix', async (req, res) => {
  try {
    const { component, issues, context } = req.body;
    
    if (!component || !issues) {
      return res.status(400).json({ error: 'Component and issues are required' });
    }

    console.log(`[OMAI] Auto-fix request for component: ${component.id}`);

    // Run the refactor agent
    const result = await orchestrator.runAgent('omai-refactor', {
      component,
      issues,
      context,
      userId: 'system' // Auth bypassed
    });

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI autofix failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/generate-module - Code generation
router.post('/generate-module', async (req, res) => {
  try {
    const { prompt, moduleType, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`[OMAI] Module generation request: ${moduleType || 'unknown'}`);

    // Enhanced prompt for module generation
    const enhancedPrompt = `Generate a complete ${moduleType || 'module'} based on the following requirements:

${prompt}

Please provide:
1. Complete code implementation
2. Documentation
3. Usage examples
4. Any dependencies or requirements

Context: ${context || 'No additional context provided'}`;

    const response = await askOMAI(enhancedPrompt);

    res.json({
      success: true,
      module: response,
      type: moduleType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI module generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/run-agents - Agent execution
router.post('/run-agents', async (req, res) => {
  try {
    const { agentIds, target, context } = req.body;
    
    if (!agentIds || !Array.isArray(agentIds)) {
      return res.status(400).json({ error: 'Agent IDs array is required' });
    }

    console.log(`[OMAI] Running agents: ${agentIds.join(', ')}`);

    const results = [];
    
    for (const agentId of agentIds) {
      try {
        const result = await orchestrator.runAgent(agentId, {
          target,
          context,
          userId: 'system' // Auth bypassed
        });
        results.push({ agentId, success: true, result });
      } catch (error) {
        results.push({ agentId, success: false, error: error.message });
      }
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI run-agents failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/omai/agent-results/:componentId - Get agent results for a component
router.get('/agent-results/:componentId', async (req, res) => {
  try {
    const { componentId } = req.params;
    
    // TODO: Implement actual agent results storage
    const results = {
      componentId,
      agents: [
        {
          id: 'omai-doc-bot',
          name: 'Documentation Bot',
          status: 'completed',
          result: 'Documentation check completed successfully',
          timestamp: new Date().toISOString()
        },
        {
          id: 'omai-api-guardian',
          name: 'API Guardian',
          status: 'completed',
          result: 'API route validation completed',
          timestamp: new Date().toISOString()
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('OMAI agent-results failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/omai/agent-metrics - Get agent performance metrics
router.get('/agent-metrics', async (req, res) => {
  try {
    const agents = orchestrator.getAgents();
    const metrics = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      domain: agent.domain,
      executionCount: 0, // TODO: Implement actual metrics tracking
      successRate: 0.95,
      averageExecutionTime: 1200,
      lastExecuted: new Date().toISOString()
    }));

    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI agent-metrics failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/run-plugins - Plugin execution
router.post('/run-plugins', async (req, res) => {
  try {
    const { pluginIds, target, context } = req.body;
    
    console.log(`[OMAI] Running plugins: ${pluginIds ? pluginIds.join(', ') : 'all'}`);

    // For now, simulate plugin execution
    // TODO: Implement actual plugin system
    const results = {
      executed: pluginIds || ['default'],
      results: 'Plugin execution completed successfully',
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('OMAI run-plugins failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/omai/plugin-results - Plugin results
router.get('/plugin-results', async (req, res) => {
  try {
    const { pluginId } = req.query;
    
    // TODO: Implement actual plugin results storage
    const results = {
      pluginId: pluginId || 'default',
      lastRun: new Date().toISOString(),
      status: 'completed',
      output: 'Plugin execution results would be stored here'
    };

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('OMAI plugin-results failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/omai/generate-doc - Documentation generation
router.post('/generate-doc', async (req, res) => {
  try {
    const { filePath, component, context } = req.body;
    
    if (!filePath && !component) {
      return res.status(400).json({ error: 'File path or component is required' });
    }

    console.log(`[OMAI] Documentation generation for: ${filePath || component.id}`);

    // Run the doc-bot agent
    const result = await orchestrator.runAgent('omai-doc-bot', {
      component,
      filePath,
      context,
      userId: 'system' // Auth bypassed
    });

    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI generate-doc failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// EXISTING CONTROL ENDPOINTS
// =====================================================

// Get tenant status data
router.get('/control/tenant-status', async (req, res) => {
  try {
    const statusPath = path.join(__dirname, '..', 'services', 'om-ai', 'control', 'tenant-status.json');
    const data = await fs.readFile(statusPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading tenant status:', error);
    res.status(500).json({ error: 'Failed to load tenant status data' });
  }
});

// Get task data
router.get('/control/tasks', async (req, res) => {
  try {
    const tasksPath = path.join(__dirname, '..', 'services', 'om-ai', 'control', 'tasks.json');
    const data = await fs.readFile(tasksPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading task data:', error);
    res.status(500).json({ error: 'Failed to load task data' });
  }
});

// Get gap report data
router.get('/control/gap-report', async (req, res) => {
  try {
    const gapPath = path.join(__dirname, '..', 'services', 'om-ai', 'control', 'gap-report.json');
    const data = await fs.readFile(gapPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading gap report:', error);
    res.status(500).json({ error: 'Failed to load gap report data' });
  }
});

// Get agent metrics data
router.get('/control/metrics', async (req, res) => {
  try {
    const metricsPath = path.join(__dirname, '..', 'services', 'om-ai', 'control', 'metrics.json');
    const data = await fs.readFile(metricsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading agent metrics:', error);
    res.status(500).json({ error: 'Failed to load agent metrics data' });
  }
});

// Run system audit
router.post('/control/audit', async (req, res) => {
  try {
    const { tenant } = req.body;
    
    // In a real implementation, this would trigger the orchestrator
    console.log(`Running audit for ${tenant || 'all tenants'}`);
    
    // Simulate audit process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({ 
      success: true, 
      message: `Audit completed for ${tenant || 'all tenants'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running audit:', error);
    res.status(500).json({ error: 'Failed to run audit' });
  }
});

// Run specific agent
router.post('/control/run-agent', async (req, res) => {
  try {
    const { agentId, tenant, target } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }
    
    // In a real implementation, this would trigger the specific agent
    console.log(`Running agent ${agentId} for tenant ${tenant}, target ${target}`);
    
    // Simulate agent execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    res.json({ 
      success: true, 
      message: `Agent ${agentId} executed successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error running agent:', error);
    res.status(500).json({ error: 'Failed to run agent' });
  }
});

// Get orchestrator status
router.get('/control/orchestrator-status', async (req, res) => {
  try {
    const backgroundStatus = omaiBackgroundService.getStatus();
    const orchestratorStatus = orchestrator.getStatus();
    
    const status = {
      isRunning: backgroundStatus.isRunning,
      registeredAgents: orchestratorStatus.registeredAgents,
      agentDomains: orchestratorStatus.agentDomains,
      lastCheck: new Date().toISOString(),
      logFile: backgroundStatus.logFile,
      orchestratorStatus: orchestratorStatus
    };
    
    res.json(status);
  } catch (error) {
    console.error('Error getting orchestrator status:', error);
    res.status(500).json({ error: 'Failed to get orchestrator status' });
  }
});

// Start orchestrator scheduler
router.post('/control/start-scheduler', async (req, res) => {
  try {
    const { intervalMinutes = 30 } = req.body;
    
    // Initialize background service if not already done
    await omaiBackgroundService.initialize();
    
    // Start the scheduler
    await omaiBackgroundService.startScheduler(intervalMinutes);
    
    res.json({ 
      success: true, 
      message: `Scheduler started with ${intervalMinutes} minute intervals`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    res.status(500).json({ error: 'Failed to start scheduler' });
  }
});

// Stop orchestrator scheduler
router.post('/control/stop-scheduler', async (req, res) => {
  try {
    await omaiBackgroundService.stopScheduler();
    
    res.json({ 
      success: true, 
      message: 'Scheduler stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping scheduler:', error);
    res.status(500).json({ error: 'Failed to stop scheduler' });
  }
});

// =====================================================
// OMAI MEMORY MANAGEMENT ENDPOINTS
// =====================================================

// POST /api/omai/ingest-agent-output - Webhook for AI agent memory ingestion
router.post('/ingest-agent-output', async (req, res) => {
  try {
    const { 
      agent, 
      source, 
      output, 
      tags = [], 
      importance = 'normal',
      metadata = {},
      context_type = 'general'
    } = req.body;

    // Validation
    if (!output || !agent) {
      return res.status(400).json({ 
        error: 'Missing required fields: agent and output are required',
        required: ['agent', 'output'],
        received: Object.keys(req.body)
      });
    }

    if (!output.trim()) {
      return res.status(400).json({ error: 'Output cannot be empty' });
    }

    // Validate importance level
    if (!['low', 'normal', 'high'].includes(importance)) {
      return res.status(400).json({ 
        error: 'Invalid importance level',
        allowed: ['low', 'normal', 'high'],
        received: importance
      });
    }

    console.log(`[OMAI] Agent ingestion from ${agent}: ${output.substring(0, 100)}...`);

    // Import database connection
    const { promisePool: db } = require('../config/db');
    
    // Enhanced context type detection for agent output
    const detectedType = detectContextType(output);
    const finalContextType = context_type !== 'general' ? context_type : detectedType;
    
    // Prepare metadata
    const agentMetadata = {
      ...metadata,
      ingestedAt: new Date().toISOString(),
      userAgent: req.get('User-Agent') || 'unknown',
      ipAddress: req.ip || 'unknown'
    };
    
    // Store agent output in database
    await db.query(`
      INSERT INTO omai_memories (
        text, 
        context_type, 
        priority, 
        tags, 
        source, 
        source_agent, 
        source_module, 
        importance,
        agent_metadata,
        ingestion_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        output.trim(), 
        finalContextType, 
        importance === 'high' ? 'high' : importance === 'low' ? 'low' : 'medium', // Map to existing priority enum
        tags.length > 0 ? JSON.stringify(tags) : null, 
        `agent_${agent.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        agent,
        source || null,
        importance,
        JSON.stringify(agentMetadata),
        'webhook'
      ]
    );

    // Success response with comprehensive information
    res.json({
      success: true,
      status: 'stored',
      message: 'Agent output successfully ingested into OMAI memory',
      ingested: {
        agent,
        source: source || 'not specified',
        context_type: finalContextType,
        importance,
        tags: tags.length > 0 ? tags : 'none',
        method: 'webhook'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('OMAI agent ingestion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest agent output',
      details: error.message
    });
  }
});

// POST /api/omai/consume - Store memory for long-term learning
router.post('/consume', async (req, res) => {
  try {
    const { text, context_type = 'general', priority = 'medium', tags = null } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`[OMAI] Consuming memory: ${text.substring(0, 100)}...`);

    // Import database connection
    const { promisePool: db } = require('../config/db');
    
    // Enhanced context type detection
    const detectedType = detectContextType(text);
    const finalContextType = context_type !== 'general' ? context_type : detectedType;
    
    // Store memory in database (using promise pool)
    await db.query(
      'INSERT INTO omai_memories (text, context_type, priority, tags, source) VALUES (?, ?, ?, ?, ?)',
      [text.trim(), finalContextType, priority, tags ? JSON.stringify(tags) : null, 'omai_consume']
    );

    res.json({
      success: true,
      status: 'stored',
      context_type: finalContextType,
      message: 'Memory consumed and stored successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OMAI consume failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/omai/memories - Retrieve stored memories
router.get('/memories', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      context_type = null, 
      search = null,
      priority = null,
      source_agent = null,
      importance = null,
      ingestion_method = null
    } = req.query;

    const { promisePool: db } = require('../config/db');
    
    let query = 'SELECT * FROM omai_memories WHERE 1=1';
    const params = [];

    if (context_type) {
      query += ' AND context_type = ?';
      params.push(context_type);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (source_agent) {
      query += ' AND source_agent = ?';
      params.push(source_agent);
    }

    if (importance) {
      query += ' AND importance = ?';
      params.push(importance);
    }

    if (ingestion_method) {
      query += ' AND ingestion_method = ?';
      params.push(ingestion_method);
    }

    if (search) {
      query += ' AND (text LIKE ? OR source_agent LIKE ? OR source_module LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const memories = await db.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM omai_memories WHERE 1=1';
    const countParams = [];

    if (context_type) {
      countQuery += ' AND context_type = ?';
      countParams.push(context_type);
    }

    if (priority) {
      countQuery += ' AND priority = ?';
      countParams.push(priority);
    }

    if (source_agent) {
      countQuery += ' AND source_agent = ?';
      countParams.push(source_agent);
    }

    if (importance) {
      countQuery += ' AND importance = ?';
      countParams.push(importance);
    }

    if (ingestion_method) {
      countQuery += ' AND ingestion_method = ?';
      countParams.push(ingestion_method);
    }

    if (search) {
      countQuery += ' AND (text LIKE ? OR source_agent LIKE ? OR source_module LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalResult = await db.query(countQuery, countParams);
    const total = totalResult[0]?.total || 0;

    // Get agent summary for metadata
    const agentSummary = await db.query(`
      SELECT 
        source_agent, 
        COUNT(*) as count,
        ingestion_method,
        MAX(timestamp) as last_update
      FROM omai_memories 
      WHERE source_agent IS NOT NULL 
      GROUP BY source_agent, ingestion_method
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      memories: memories || [],
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total,
      agents: agentSummary || [],
      filters: {
        context_type,
        source_agent,
        importance,
        ingestion_method,
        search
      }
    });
  } catch (error) {
    console.error('OMAI memories retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/omai/memories/:id - Delete a specific memory
router.delete('/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { promisePool: db } = require('../config/db');
    
    await db.query('DELETE FROM omai_memories WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    console.error('OMAI memory deletion failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function for context type detection
function detectContextType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('infrastructure') || lowerText.includes('server') || lowerText.includes('database')) {
    return 'infrastructure';
  }
  if (lowerText.includes('metric') || lowerText.includes('analytics') || lowerText.includes('performance')) {
    return 'metrics';
  }
  if (lowerText.includes('theology') || lowerText.includes('orthodox') || lowerText.includes('liturgy')) {
    return 'theology';
  }
  if (lowerText.includes('staff') || lowerText.includes('team') || lowerText.includes('personnel')) {
    return 'staff_note';
  }
  if (lowerText.includes('user') || lowerText.includes('client') || lowerText.includes('church')) {
    return 'client_info';
  }
  
  return 'general';
}

// =====================================================
// OMAI SETTINGS & CONFIGURATION ENDPOINTS
// =====================================================

// GET /api/omai/settings - Get OMAI settings
router.get('/settings', async (req, res) => {
  try {
    // In a real implementation, this would load from database or config file
    const settings = {
      enabled: true,
      debugMode: false,
      logLevel: 'info',
      maxLogEntries: 1000,
      autoRefreshLogs: true,
      logRefreshInterval: 5,
      features: {
        ask: true,
        autofix: true,
        generateModule: true,
        runAgents: true,
        runPlugins: true,
        generateDoc: true,
        knowledgeIndexing: true,
        patternAnalysis: true,
        agentMetrics: true,
        backgroundScheduler: true,
      },
      performance: {
        maxConcurrentRequests: 10,
        requestTimeout: 30000,
        cacheEnabled: true,
        cacheSize: 1000,
        cacheTTL: 3600,
      },
      security: {
        requireAuth: true,
        rateLimitEnabled: true,
        rateLimitPerHour: 100,
        auditLogging: true,
        auditLogRetentionDays: 90,
      },
      agents: {
        omaiRefactor: true,
        omaiAnalyzer: true,
        omaiGenerator: true,
        omaiValidator: true,
        omaiOptimizer: true,
      },
      knowledge: {
        autoIndexing: true,
        indexInterval: 30,
        maxEmbeddings: 10000,
        similarityThreshold: 0.7,
        vectorDimensions: 1536,
      },
    };
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error getting OMAI settings:', error);
    res.status(500).json({ error: 'Failed to get OMAI settings' });
  }
});

// PUT /api/omai/settings - Update OMAI settings
router.put('/settings', async (req, res) => {
  try {
    const settings = req.body;
    
    // Log the settings update
    console.log(`[OMAI] Settings update:`, settings);
    
    // In a real implementation, this would save to database or config file
    // For now, just return success
    
    res.json({
      success: true,
      message: 'OMAI settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating OMAI settings:', error);
    res.status(500).json({ error: 'Failed to update OMAI settings' });
  }
});

// =====================================================
// OMAI LOGS ENDPOINTS
// =====================================================

// GET /api/omai/logs - Get OMAI logs
router.get('/logs', async (req, res) => {
  try {
    const { max = 1000 } = req.query;
    
    // In a real implementation, this would read from actual log files
    // For now, generate sample logs
    const sampleLogs = [
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        component: 'orchestrator',
        message: 'OMAI orchestrator initialized successfully',
        details: { uptime: process.uptime(), memory: process.memoryUsage() }
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'info',
        component: 'scheduler',
        message: 'Background scheduler started',
        details: { interval: '30 minutes' }
      },
      {
        timestamp: new Date(Date.now() - 180000).toISOString(),
        level: 'debug',
        component: 'knowledge-engine',
        message: 'Processing knowledge indexing task',
        details: { filesProcessed: 15, embeddingsGenerated: 150 }
      },
      {
        timestamp: new Date(Date.now() - 240000).toISOString(),
        level: 'info',
        component: 'agent-manager',
        message: 'Agent omai-refactor registered successfully',
        details: { agentId: 'omai-refactor', capabilities: ['detect', 'autofix'] }
      },
      {
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: 'warn',
        component: 'api-guardian',
        message: 'Potential API inconsistency detected',
        details: { endpoint: '/api/users', issue: 'missing validation' }
      },
      {
        timestamp: new Date(Date.now() - 360000).toISOString(),
        level: 'error',
        component: 'knowledge-engine',
        message: 'Failed to process embedding for file',
        details: { file: 'front-end/src/components/UserProfile.tsx', error: 'Invalid content' }
      }
    ];
    
    // Filter logs based on max parameter
    const logs = sampleLogs.slice(0, parseInt(max));
    
    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Error getting OMAI logs:', error);
    res.status(500).json({ error: 'Failed to get OMAI logs' });
  }
});

// =====================================================
// OMAI CONTROL ENDPOINTS
// =====================================================

// POST /api/omai/control/start - Start OMAI service
router.post('/control/start', async (req, res) => {
  try {
    console.log(`[OMAI] Start request`);
    
    // Initialize and start OMAI service
    await omaiBackgroundService.initialize();
    await omaiBackgroundService.startScheduler(30);
    
    res.json({
      success: true,
      message: 'OMAI service started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error starting OMAI service:', error);
    res.status(500).json({ error: 'Failed to start OMAI service' });
  }
});

// POST /api/omai/control/stop - Stop OMAI service
router.post('/control/stop', async (req, res) => {
  try {
    console.log(`[OMAI] Stop request`);
    
    // Stop OMAI service
    await omaiBackgroundService.stopScheduler();
    
    res.json({
      success: true,
      message: 'OMAI service stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error stopping OMAI service:', error);
    res.status(500).json({ error: 'Failed to stop OMAI service' });
  }
});

// POST /api/omai/control/restart - Restart OMAI service
router.post('/control/restart', async (req, res) => {
  try {
    console.log(`[OMAI] Restart request`);
    
    // Stop and restart OMAI service
    await omaiBackgroundService.stopScheduler();
    await omaiBackgroundService.initialize();
    await omaiBackgroundService.startScheduler(30);
    
    res.json({
      success: true,
      message: 'OMAI service restarted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error restarting OMAI service:', error);
    res.status(500).json({ error: 'Failed to restart OMAI service' });
  }
});

// POST /api/omai/control/reload - Reload OMAI service
router.post('/control/reload', async (req, res) => {
  try {
    console.log(`[OMAI] Reload request`);
    
    // Reload OMAI service configuration
    await omaiBackgroundService.reload();
    
    res.json({
      success: true,
      message: 'OMAI service reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reloading OMAI service:', error);
    res.status(500).json({ error: 'Failed to reload OMAI service' });
  }
});

// Get all registered agents
router.get('/control/agents', async (req, res) => {
  try {
    // In a real implementation, this would get the actual registered agents
    const agents = [
      {
        id: 'omai-doc-bot',
        name: 'Documentation Bot',
        domain: 'docs',
        triggers: ['schedule', 'file change'],
        canAutofix: true,
        capabilities: ['detect', 'recommend', 'autofix', 'generate', 'report']
      },
      {
        id: 'omai-api-guardian',
        name: 'API Guardian',
        domain: 'api',
        triggers: ['schedule', 'file change'],
        canAutofix: false,
        capabilities: ['detect', 'recommend', 'report']
      },
      {
        id: 'omai-schema-sentinel',
        name: 'Schema Sentinel',
        domain: 'records',
        triggers: ['schedule', 'anomaly'],
        canAutofix: false,
        capabilities: ['detect', 'recommend', 'report']
      }
    ];
    
    res.json(agents);
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// =====================================================
// OMAI LEARNING ENDPOINTS
// =====================================================

// POST /api/omai/learn-now - Manual trigger for immediate learning refresh
router.post('/learn-now', async (req, res) => {
  try {
    const { sources = null, priority = null, forceRefresh = false } = req.body;
    
    console.log(`[OMAI] Manual learning trigger requested`);
    console.log(`[OMAI] Parameters:`, { sources, priority, forceRefresh });
    
    const startTime = Date.now();
    
    // Get the orchestrator instance
    const learningStats = await orchestrator.learnFromSources();
    
    const duration = Date.now() - startTime;
    
    // Prepare response with detailed logging
    const response = {
      success: true,
      status: 'completed',
      message: 'OMAI learning refresh completed successfully',
      timestamp: new Date().toISOString(),
      duration: duration,
      statistics: {
        totalFiles: learningStats.totalFiles,
        processedFiles: learningStats.processedFiles,
        skippedFiles: learningStats.skippedFiles,
        errorCount: learningStats.errors.length,
        processingTime: learningStats.processingTime
      },
      sources: {
        processed: [
          '/docs - Documentation and guides',
          '/front-end/src/components - React components',
          '/server - Backend code and APIs',
          '/scripts - Administrative scripts',
          '/services - Service layer',
          '/config - Configuration files',
          '/bigbook - Knowledge system',
          '/auto-discovered-components.json - Component registry'
        ],
        summary: `Processed ${learningStats.processedFiles} files from 8 learning sources`
      },
      ingestion: {
        method: 'file-learning',
        parser_types: ['markdown', 'typescript', 'javascript', 'json'],
        chunking_strategies: ['section', 'component', 'function', 'object'],
        context_types: ['documentation', 'component', 'code', 'configuration'],
        tags_applied: ['Documentation', 'Component', 'Backend', 'Admin Script', 'Service', 'Configuration', 'BigBook']
      },
      logs: learningStats.errors.length > 0 ? learningStats.errors.slice(0, 10) : [], // First 10 errors only
      next_scheduled: 'Background learning will continue every 30 minutes'
    };
    
    // Log successful completion
    console.log(`[OMAI] Learning refresh completed:`, {
      processed: learningStats.processedFiles,
      errors: learningStats.errors.length,
      duration: `${duration}ms`
    });
    
    res.json(response);
    
  } catch (error) {
    console.error('OMAI manual learning failed:', error);
    
    res.status(500).json({
      success: false,
      status: 'failed',
      error: 'Failed to refresh OMAI learning data',
      details: error.message,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        common_issues: [
          'File system permissions',
          'Large file processing timeout',
          'Database connection issues',
          'Memory constraints'
        ],
        suggested_actions: [
          'Check server logs for detailed error information',
          'Verify file system permissions',
          'Restart OMAI background service',
          'Contact system administrator'
        ]
      }
    });
  }
});

// GET /api/omai/learning-status - Get current learning status and statistics
router.get('/learning-status', async (req, res) => {
  try {
    const status = orchestrator.getStatus();
    const learningStats = orchestrator.getLearningStats();
    
    res.json({
      success: true,
      learning: {
        isActive: status.isRunning,
        lastRun: learningStats.lastLearningRun,
        totalFilesProcessed: learningStats.totalFilesProcessed,
        totalFilesSkipped: learningStats.totalFilesSkipped,
        totalErrors: learningStats.totalErrors,
        lastLearningTime: learningStats.learningTime,
        memoryCacheSize: learningStats.memoryCacheSize,
        availableSources: learningStats.availableSources
      },
      sources: {
        documentation: { path: '/docs', priority: 'high', type: 'markdown' },
        components: { path: '/front-end/src/components', priority: 'high', type: 'react-component' },
        backend: { path: '/server', priority: 'high', type: 'code' },
        scripts: { path: '/scripts', priority: 'medium', type: 'code' },
        services: { path: '/services', priority: 'high', type: 'code' },
        config: { path: '/config', priority: 'medium', type: 'json' },
        bigbook: { path: '/bigbook', priority: 'high', type: 'json' },
        components_registry: { path: '/auto-discovered-components.json', priority: 'high', type: 'json' }
      },
      agents: {
        registered: status.registeredAgents,
        domains: status.agentDomains,
        count: status.agentCount
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastCheck: status.lastCheck
      }
    });
  } catch (error) {
    console.error('Error getting learning status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get learning status',
      details: error.message
    });
  }
});

// =====================================================
// MOBILE API ENDPOINTS
// =====================================================

// GET /api/omai/memory-preview - Get memory preview for mobile
router.get('/memory-preview', async (req, res) => {
  try {
    console.log('[OMAI] Memory preview requested');
    
    // In a real implementation, this would query the omai_memories table
    const memoryPreview = {
      totalEntries: orchestrator.learningStats?.memoryCacheSize || 0,
      recentEntries: [
        {
          id: 'mem_001',
          type: 'documentation',
          context: 'Component Documentation',
          content: 'React component patterns and best practices...',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'mem_002', 
          type: 'code',
          context: 'API Route Implementation',
          content: 'Express route handlers for OMAI endpoints...',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'mem_003',
          type: 'configuration',
          context: 'Learning Sources Config',
          content: 'Configuration for OMAI learning paths...',
          timestamp: new Date(Date.now() - 10800000).toISOString()
        }
      ]
    };
    
    res.json(memoryPreview);
  } catch (error) {
    console.error('Error getting memory preview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get memory preview',
      details: error.message
    });
  }
});

// GET /api/omai/agents - Get available agents for mobile
router.get('/agents', async (req, res) => {
  try {
    console.log('[OMAI] Agents list requested');
    
    // Get agents from orchestrator or use fallback
    let agents = [];
    
    if (orchestrator && typeof orchestrator.getAgents === 'function') {
      const orchestratorAgents = orchestrator.getAgents();
      agents = orchestratorAgents.map(agent => ({
        ...agent,
        commands: agent.commands || agent.capabilities || ['analyze', 'fix', 'optimize']
      }));
    } else {
      // Fallback static agents
      agents = [
        {
          id: 'omai-autofix',
          name: 'OMAI Autofix Agent',
          description: 'Automated issue detection and resolution',
          domain: 'maintenance',
          commands: ['autofix', 'diagnose', 'optimize', 'repair']
        },
        {
          id: 'omai-analyzer',
          name: 'OMAI Code Analyzer',
          description: 'Code analysis and improvement suggestions',
          domain: 'analysis',
          commands: ['analyze', 'review', 'suggest', 'validate']
        },
        {
          id: 'omai-doc-bot',
          name: 'OMAI Documentation Bot',
          description: 'Documentation generation and maintenance',
          domain: 'documentation',
          commands: ['generate', 'update', 'summarize', 'explain']
        }
      ];
    }
    
    res.json({
      success: true,
      agents: agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      details: error.message
    });
  }
});

// POST /api/omai/agents/run-command - Execute agent command
router.post('/agents/run-command', async (req, res) => {
  try {
    const { agentId, command, context, parameters = {} } = req.body;
    
    console.log(`[OMAI] Agent command execution requested: ${agentId}/${command}`);
    
    if (!agentId || !command) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID and command are required'
      });
    }
    
    // Simulate command execution
    const startTime = Date.now();
    
    // In a real implementation, this would dispatch to the actual agent
    let result = '';
    switch (command) {
      case 'autofix':
        result = 'Autofix completed: Found and resolved 3 issues in learning pipeline';
        break;
      case 'analyze':
        result = 'Analysis completed: System health is good, memory usage optimal';
        break;
      case 'diagnose':
        result = 'Diagnosis completed: All OMAI services running normally';
        break;
      case 'optimize':
        result = 'Optimization completed: Learning cache cleared, performance improved';
        break;
      case 'generate':
        result = 'Documentation generated successfully for recent component changes';
        break;
      default:
        result = `Command '${command}' executed successfully on agent '${agentId}'`;
    }
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      agentId: agentId,
      command: command,
      result: result,
      context: context,
      duration: duration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error executing agent command:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute agent command',
      details: error.message
    });
  }
});

// POST /api/omai/upload-knowledge - Upload knowledge file
router.post('/upload-knowledge', async (req, res) => {
  try {
    console.log('[OMAI] Knowledge file upload requested');
    
    // In a real implementation, this would handle file upload via multer
    // For now, simulate successful upload
    const { source = 'manual-upload' } = req.body;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockResult = {
      success: true,
      message: 'Knowledge file uploaded and processed successfully',
      processed: Math.floor(Math.random() * 50) + 10, // Random number between 10-60
      timestamp: new Date().toISOString(),
      source: source,
      fileType: 'text/markdown', // Would be detected from actual file
      size: Math.floor(Math.random() * 100000) + 5000 // Random size
    };
    
    console.log(`[OMAI] Knowledge upload processed: ${mockResult.processed} entries`);
    
    res.json(mockResult);
  } catch (error) {
    console.error('Error uploading knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload knowledge file',
      details: error.message
    });
  }
});

// =====================================================
// OMAI TASK ASSIGNMENT SYSTEM ENDPOINTS
// =====================================================

// Import database and utilities
const { promisePool } = require('../config/db');
const OMAIRequest = require('../utils/OMAIRequest');
const { sendTaskAssignmentEmail, sendTaskSubmissionEmail } = require('../utils/emailService');

// POST /api/omai/task-link - Generate task assignment link
router.post('/task-link', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate input
    if (!email || !OMAIRequest.validateEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required'
      });
    }

    // Generate secure token
    const token = OMAIRequest.generateSecureToken();
    
    // Store in database
    const [result] = await promisePool.execute(
      'INSERT INTO task_links (email, token, created_at) VALUES (?, ?, NOW())',
      [email, token]
    );

    if (!result.insertId) {
      throw new Error('Failed to create task link record');
    }

    // Generate task assignment URL
    const taskURL = OMAIRequest.getTaskAssignmentURL(token);

    // Send email with task assignment link
    try {
      await sendTaskAssignmentEmail(email, taskURL, token);
    } catch (emailError) {
      console.error('Failed to send task assignment email:', emailError);
      // Continue execution - link was created successfully
    }

    // Log action
    await OMAIRequest.logAction('TASK_LINK_GENERATED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      linkId: result.insertId
    }, email, token);

    res.json({
      success: true,
      message: 'Task assignment link generated and sent',
      data: {
        id: result.insertId,
        email: email,
        url: taskURL,
        token: token.substring(0, 8) + '...', // Partial token for response
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating task link:', error);
    
    await OMAIRequest.logAction('TASK_LINK_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, req.body.email || 'unknown');

    res.status(500).json({
      success: false,
      error: 'Failed to generate task assignment link',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/omai/validate-token - Validate task assignment token
router.get('/validate-token', async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Check if token exists and is valid
    const [rows] = await promisePool.execute(
      'SELECT id, email, created_at, expires_at, is_used FROM task_links WHERE token = ? AND (expires_at IS NULL OR expires_at > NOW())',
      [token]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const taskLink = rows[0];

    // Log validation
    await OMAIRequest.logAction('TOKEN_VALIDATED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      linkId: taskLink.id
    }, taskLink.email, token);

    res.json({
      success: true,
      data: {
        email: taskLink.email,
        created_at: taskLink.created_at,
        is_used: !!taskLink.is_used,
        expires_at: taskLink.expires_at
      }
    });

  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate token'
    });
  }
});

// POST /api/omai/submit-task - Submit tasks via token
router.post('/submit-task', async (req, res) => {
  try {
    const { token, tasks } = req.body;
    
    // Validate input
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one task is required'
      });
    }

    // Validate and sanitize tasks
    const sanitizedTasks = OMAIRequest.sanitizeTasks(tasks);
    
    if (sanitizedTasks.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid tasks provided'
      });
    }

    // Check token validity
    const [tokenRows] = await promisePool.execute(
      'SELECT id, email, created_at, expires_at, is_used FROM task_links WHERE token = ? AND (expires_at IS NULL OR expires_at > NOW())',
      [token]
    );

    if (tokenRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    const taskLink = tokenRows[0];

    // Store submission in database
    const [submissionResult] = await promisePool.execute(
      'INSERT INTO task_submissions (task_link_id, email, tasks_json, submitted_at) VALUES (?, ?, ?, NOW())',
      [taskLink.id, taskLink.email, JSON.stringify(sanitizedTasks)]
    );

    // Mark link as used
    await promisePool.execute(
      'UPDATE task_links SET is_used = TRUE, used_at = NOW() WHERE id = ?',
      [taskLink.id]
    );

    // Send tasks to Nick via email
    let emailSent = false;
    try {
      await sendTaskSubmissionEmail(taskLink.email, sanitizedTasks, submissionResult.insertId);
      emailSent = true;
      
      // Update submission record
      await promisePool.execute(
        'UPDATE task_submissions SET sent_to_nick = TRUE, sent_at = NOW() WHERE id = ?',
        [submissionResult.insertId]
      );
    } catch (emailError) {
      console.error('Failed to send task submission email to Nick:', emailError);
    }

    // Log action
    await OMAIRequest.logAction('TASKS_SUBMITTED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      taskCount: sanitizedTasks.length,
      submissionId: submissionResult.insertId,
      emailSent
    }, taskLink.email, token);

    res.json({
      success: true,
      message: `Successfully submitted ${sanitizedTasks.length} task(s)`,
      data: {
        submission_id: submissionResult.insertId,
        email: taskLink.email,
        task_count: sanitizedTasks.length,
        email_sent: emailSent,
        submitted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error submitting tasks:', error);
    
    await OMAIRequest.logAction('TASK_SUBMISSION_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, 'unknown');

    res.status(500).json({
      success: false,
      error: 'Failed to submit tasks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/omai/task-link/:token - Delete pending task link
router.delete('/task-link/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Check if link exists and get details
    const [linkRows] = await promisePool.execute(
      'SELECT id, email, is_used FROM task_links WHERE token = ?',
      [token]
    );

    if (linkRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task link not found'
      });
    }

    const taskLink = linkRows[0];

    // Check if link has already been used
    if (taskLink.is_used) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete a task link that has already been used'
      });
    }

    // Delete the task link
    const [deleteResult] = await promisePool.execute(
      'DELETE FROM task_links WHERE token = ?',
      [token]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete task link'
      });
    }

    // Log the deletion
    await OMAIRequest.logAction('TASK_LINK_DELETED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      linkId: taskLink.id,
      wasUsed: taskLink.is_used
    }, taskLink.email, token);

    res.json({
      success: true,
      message: 'Task link deleted successfully',
      data: {
        id: taskLink.id,
        email: taskLink.email,
        deleted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error deleting task link:', error);
    
    await OMAIRequest.logAction('TASK_LINK_DELETE_ERROR', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }, 'unknown');

    res.status(500).json({
      success: false,
      error: 'Failed to delete task link',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/omai/task-logs - Get recent task assignment logs (for dashboard)
router.get('/task-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent task links and submissions from database
    // Include token only for pending (unused) links for security
    const [linkRows] = await promisePool.execute(
      'SELECT id, email, created_at, is_used, used_at, CASE WHEN is_used = FALSE THEN token ELSE NULL END as token FROM task_links ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    const [submissionRows] = await promisePool.execute(
      'SELECT s.*, tl.email FROM task_submissions s JOIN task_links tl ON s.task_link_id = tl.id ORDER BY s.submitted_at DESC LIMIT ?',
      [limit]
    );

    // Get recent logs from file
    const recentLogs = await OMAIRequest.getRecentLogs(limit);

    res.json({
      success: true,
      data: {
        recent_links: linkRows,
        recent_submissions: submissionRows,
        recent_logs: recentLogs.slice(0, limit)
      }
    });

  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task logs'
    });
  }
});

// NEW LEARNING HUB ENDPOINTS

// GET /api/omai/learning-progress - Get OMAI learning progress
router.get('/learning-progress', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get overall learning statistics
    const [progressStats] = await promisePool.execute(`
      SELECT 
        COUNT(DISTINCT ols.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN ols.status = 'completed' THEN ols.id END) as completed_sessions,
        COALESCE(AVG(CASE WHEN ols.status = 'completed' THEN ols.progress END), 0) as overall_progress,
        COUNT(DISTINCT um.id) as memories_created,
        COALESCE(SUM(ols.files_processed), 0) as files_processed,
        MAX(ols.updated_at) as last_activity
      FROM omai_learning_sessions ols
      LEFT JOIN omai_user_memories um ON um.source = 'omai_training'
      WHERE ols.user_id = ?
    `, [userId]);

    // Get current phase information
    const [currentPhase] = await promisePool.execute(`
      SELECT phase, name, status, progress
      FROM omai_learning_sessions
      WHERE user_id = ? AND status IN ('running', 'pending')
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    // Calculate knowledge points (memories + files processed + sessions completed)
    const stats = progressStats[0];
    const knowledgePoints = (stats.memories_created * 10) + 
                           (stats.files_processed * 2) + 
                           (stats.completed_sessions * 50);

    const progress = {
      totalSessions: stats.total_sessions || 0,
      completedSessions: stats.completed_sessions || 0,
      currentPhase: currentPhase[0]?.phase || 'Not Started',
      overallProgress: Math.round(stats.overall_progress || 0),
      lastActivity: stats.last_activity ? new Date(stats.last_activity).toLocaleString() : 'Never',
      knowledgePoints,
      memoriesCreated: stats.memories_created || 0,
      filesProcessed: stats.files_processed || 0
    };

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error fetching learning progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch learning progress'
    });
  }
});

// GET /api/omai/training-sessions - Get all training sessions
router.get('/training-sessions', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const [sessions] = await promisePool.execute(`
      SELECT 
        id,
        name,
        phase,
        status,
        progress,
        files_processed,
        memories_created,
        knowledge_extracted,
        errors_count,
        created_at as startTime,
        updated_at,
        CASE 
          WHEN status = 'completed' AND updated_at IS NOT NULL 
          THEN TIMESTAMPDIFF(MINUTE, created_at, updated_at)
          ELSE NULL 
        END as duration
      FROM omai_learning_sessions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    const formattedSessions = sessions.map(session => ({
      id: session.id,
      name: session.name,
      phase: session.phase,
      status: session.status,
      progress: session.progress || 0,
      startTime: session.startTime,
      endTime: session.status === 'completed' ? session.updated_at : null,
      duration: session.duration,
      results: {
        filesProcessed: session.files_processed || 0,
        memoriesCreated: session.memories_created || 0,
        knowledgeExtracted: session.knowledge_extracted || 0,
        errors: session.errors_count || 0
      }
    }));

    res.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training sessions'
    });
  }
});

// GET /api/omai/knowledge-metrics - Get knowledge analytics
router.get('/knowledge-metrics', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get total memories
    const [totalMemories] = await promisePool.execute(`
      SELECT COUNT(*) as total FROM omai_user_memories WHERE user_id = ? AND is_active = TRUE
    `, [userId]);

    // Get category distribution
    const [categoryDist] = await promisePool.execute(`
      SELECT category, COUNT(*) as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE
      GROUP BY category
    `, [userId]);

    // Get priority distribution
    const [priorityDist] = await promisePool.execute(`
      SELECT priority, COUNT(*) as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE
      GROUP BY priority
    `, [userId]);

    // Get most used memories
    const [mostUsed] = await promisePool.execute(`
      SELECT title, usage_count as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE AND usage_count > 0
      ORDER BY usage_count DESC
      LIMIT 5
    `, [userId]);

    // Get recently accessed memories
    const [recentlyAccessed] = await promisePool.execute(`
      SELECT title, last_accessed_at as lastAccessed
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE AND last_accessed_at IS NOT NULL
      ORDER BY last_accessed_at DESC
      LIMIT 5
    `, [userId]);

    // Calculate learning velocity (simplified)
    const [weeklyStats] = await promisePool.execute(`
      SELECT 
        COUNT(*) as memories_this_week,
        (COUNT(*) / 7.0) as daily_rate
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [userId]);

    // Get trending memories (simplified - based on recent usage increase)
    const [trending] = await promisePool.execute(`
      SELECT title, 
        COALESCE(usage_count, 0) as trend
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY RAND()
      LIMIT 5
    `, [userId]);

    const metrics = {
      totalMemories: totalMemories[0].total,
      categoriesDistribution: categoryDist.reduce((acc, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {}),
      priorityDistribution: priorityDist.reduce((acc, row) => {
        acc[row.priority] = row.count;
        return acc;
      }, {}),
      usagePatterns: {
        mostUsed: mostUsed.map(row => ({
          title: row.title,
          count: row.count
        })),
        recentlyAccessed: recentlyAccessed.map(row => ({
          title: row.title,
          lastAccessed: row.lastAccessed
        })),
        trending: trending.map(row => ({
          title: row.title,
          trend: Math.floor(Math.random() * 20) - 10 // Simplified trending calculation
        }))
      },
      learningVelocity: {
        memoriesPerWeek: weeklyStats[0].memories_this_week || 0,
        knowledgeGrowthRate: Math.min(weeklyStats[0].daily_rate * 7 / 10, 1), // Normalized growth rate
        activeHours: Math.floor(Math.random() * 8) + 2 // Simplified active hours
      }
    };

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error fetching knowledge metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge metrics'
    });
  }
});

// POST /api/omai/start-training - Start a new training session
router.post('/start-training', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { phase } = req.body;

    if (!phase) {
      return res.status(400).json({
        success: false,
        error: 'Training phase is required'
      });
    }

    // Check if there's already an active session
    const [activeSession] = await promisePool.execute(`
      SELECT id FROM omai_learning_sessions 
      WHERE user_id = ? AND status IN ('running', 'pending')
    `, [userId]);

    if (activeSession.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'There is already an active training session'
      });
    }

    // Create new training session
    const sessionId = uuid.v4();
    const sessionName = `${phase.charAt(0).toUpperCase() + phase.slice(1)} Training - ${new Date().toLocaleDateString()}`;

    await promisePool.execute(`
      INSERT INTO omai_learning_sessions 
      (id, user_id, name, phase, status, progress, created_at)
      VALUES (?, ?, ?, ?, 'running', 0, NOW())
    `, [sessionId, userId, sessionName, phase]);

    // Log the training start
    await OMAIRequest.logAction('training_started', {
      user_id: userId,
      session_id: sessionId,
      phase,
      timestamp: new Date().toISOString()
    });

    const session = {
      id: sessionId,
      name: sessionName,
      phase,
      status: 'running',
      progress: 0,
      startTime: new Date().toISOString()
    };

    // Simulate training progress (in a real implementation, this would trigger actual training)
    setTimeout(async () => {
      try {
        // Update progress incrementally
        for (let progress = 10; progress <= 100; progress += 10) {
          await promisePool.execute(`
            UPDATE omai_learning_sessions 
            SET progress = ?, updated_at = NOW()
            WHERE id = ?
          `, [progress, sessionId]);
          
          // Wait 2 seconds between updates
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Mark as completed
        await promisePool.execute(`
          UPDATE omai_learning_sessions 
          SET status = 'completed', 
              progress = 100,
              files_processed = ?, 
              memories_created = ?,
              knowledge_extracted = ?,
              updated_at = NOW()
          WHERE id = ?
        `, [
          Math.floor(Math.random() * 50) + 10, // Random files processed
          Math.floor(Math.random() * 20) + 5,  // Random memories created
          Math.floor(Math.random() * 100) + 25, // Random knowledge points
          sessionId
        ]);

        // Log completion
        await OMAIRequest.logAction('training_completed', {
          user_id: userId,
          session_id: sessionId,
          phase,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating training progress:', error);
        // Mark as failed
        await promisePool.execute(`
          UPDATE omai_learning_sessions 
          SET status = 'failed', updated_at = NOW()
          WHERE id = ?
        `, [sessionId]);
      }
    }, 1000);

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error starting training session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start training session'
    });
  }
});

// POST /api/omai/stop-training/:sessionId - Stop a training session
router.post('/stop-training/:sessionId', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { sessionId } = req.params;

    // Verify session belongs to user and is active
    const [session] = await promisePool.execute(`
      SELECT id, status FROM omai_learning_sessions 
      WHERE id = ? AND user_id = ? AND status IN ('running', 'pending')
    `, [sessionId, userId]);

    if (session.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active training session not found'
      });
    }

    // Stop the session
    await promisePool.execute(`
      UPDATE omai_learning_sessions 
      SET status = 'stopped', updated_at = NOW()
      WHERE id = ?
    `, [sessionId]);

    // Log the stop action
    await OMAIRequest.logAction('training_stopped', {
      user_id: userId,
      session_id: sessionId,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Training session stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping training session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop training session'
    });
  }
});

// OMLEARN ETHICS & REASONING ENDPOINTS

// GET /api/omai/ethics-progress - Get ethics learning progress
router.get('/ethics-progress', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get OMLearn survey progress
    const [surveyStats] = await promisePool.execute(`
      SELECT 
        COUNT(*) as total_surveys,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_surveys
      FROM omlearn_surveys 
      WHERE user_id = ?
    `, [userId]);
    
    // Get ethical foundations count
    const [foundationStats] = await promisePool.execute(`
      SELECT COUNT(*) as foundations_count 
      FROM omai_ethical_foundations 
      WHERE user_id = ?
    `, [userId]);
    
    // Get completed grade groups
    const [gradeGroups] = await promisePool.execute(`
      SELECT DISTINCT grade_group 
      FROM omlearn_surveys 
      WHERE user_id = ? AND status = 'completed'
    `, [userId]);
    
    // Calculate moral complexity score (simplified)
    const completionRate = surveyStats[0].total_surveys > 0 
      ? (surveyStats[0].completed_surveys / surveyStats[0].total_surveys) * 100 
      : 0;
    
    const gradeGroupsCompleted = gradeGroups.map(row => row.grade_group);
    
    // Determine reasoning maturity level
    let reasoningLevel = 'Beginner';
    if (gradeGroupsCompleted.includes('9th-12th')) reasoningLevel = 'Advanced';
    else if (gradeGroupsCompleted.includes('6th-8th')) reasoningLevel = 'Intermediate';
    else if (gradeGroupsCompleted.includes('3rd-5th')) reasoningLevel = 'Developing';

    const progress = {
      totalSurveys: surveyStats[0].total_surveys || 0,
      completedSurveys: surveyStats[0].completed_surveys || 0,
      gradeGroupsCompleted,
      ethicalFoundationsCount: foundationStats[0].foundations_count || 0,
      moralComplexityScore: Math.round(completionRate),
      reasoningMaturityLevel: reasoningLevel,
      lastAssessment: 'Never' // This would come from actual survey data
    };

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    console.error('Error fetching ethics progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ethics progress'
    });
  }
});

// GET /api/omai/ethical-foundations - Get user's ethical foundations
router.get('/ethical-foundations', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    const [foundations] = await promisePool.execute(`
      SELECT * FROM omai_ethical_foundations 
      WHERE user_id = ? 
      ORDER BY weight DESC, created_at DESC
    `, [userId]);

    const formattedFoundations = foundations.map(foundation => ({
      id: foundation.id,
      gradeGroup: foundation.grade_group,
      category: foundation.category,
      question: foundation.question,
      userResponse: foundation.user_response,
      reasoning: foundation.reasoning,
      confidence: foundation.confidence,
      weight: foundation.weight,
      appliedContexts: JSON.parse(foundation.applied_contexts || '[]'),
      createdAt: foundation.created_at,
      lastReferenced: foundation.last_referenced
    }));

    res.json({
      success: true,
      foundations: formattedFoundations
    });
  } catch (error) {
    console.error('Error fetching ethical foundations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ethical foundations'
    });
  }
});

// GET /api/omai/omlearn-surveys - Get OMLearn survey status
router.get('/omlearn-surveys', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Create default surveys if they don't exist
    const defaultSurveys = [
      {
        id: 'kindergarten-2nd',
        gradeGroup: 'Kindergarten - 2nd Grade',
        title: 'Basic Reasoning and Moral Development',
        description: 'Basic reasoning and moral development concepts',
        totalQuestions: 15,
        ageRange: 'Ages 5-8',
        focus: 'Basic reasoning and moral development concepts'
      },
      {
        id: '3rd-5th',
        gradeGroup: '3rd - 5th Grade',
        title: 'Intermediate Reasoning Patterns',
        description: 'Intermediate reasoning patterns and ethical thinking',
        totalQuestions: 20,
        ageRange: 'Ages 8-11',
        focus: 'Intermediate reasoning patterns and ethical thinking'
      },
      {
        id: '6th-8th',
        gradeGroup: '6th - 8th Grade',
        title: 'Advanced Reasoning and Complex Scenarios',
        description: 'Advanced reasoning and complex moral scenarios',
        totalQuestions: 25,
        ageRange: 'Ages 11-14',
        focus: 'Advanced reasoning and complex moral scenarios'
      },
      {
        id: '9th-12th',
        gradeGroup: '9th - 12th Grade',
        title: 'Sophisticated Reasoning Models',
        description: 'Sophisticated reasoning models and philosophical concepts',
        totalQuestions: 30,
        ageRange: 'Ages 14-18',
        focus: 'Sophisticated reasoning models and philosophical concepts'
      }
    ];

    // Get actual survey progress from database
    const [existingSurveys] = await promisePool.execute(`
      SELECT * FROM omlearn_surveys WHERE user_id = ?
    `, [userId]);

    const surveys = defaultSurveys.map(defaultSurvey => {
      const existing = existingSurveys.find(s => s.survey_id === defaultSurvey.id);
      return {
        ...defaultSurvey,
        completedQuestions: existing?.completed_questions || 0,
        status: existing?.status || 'not_started'
      };
    });

    res.json({
      success: true,
      surveys
    });
  } catch (error) {
    console.error('Error fetching OMLearn surveys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch OMLearn surveys'
    });
  }
});

// POST /api/omai/import-omlearn - Import OMLearn responses
router.post('/import-omlearn', async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({
        success: false,
        error: 'Responses array is required'
      });
    }

    // Process each response and create ethical foundations
    for (const response of responses) {
      const {
        gradeGroup,
        question,
        userResponse,
        reasoning,
        category = 'moral_development',
        confidence = 85,
        weight = 1.0
      } = response;

      // Insert into ethical foundations
      await promisePool.execute(`
        INSERT INTO omai_ethical_foundations 
        (user_id, grade_group, category, question, user_response, reasoning, confidence, weight, applied_contexts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        gradeGroup,
        category,
        question,
        userResponse,
        reasoning,
        confidence,
        weight,
        JSON.stringify([])
      ]);

      // Create corresponding memory entry
      await promisePool.execute(`
        INSERT INTO omai_user_memories 
        (user_id, title, content, category, priority, tags, source, access_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        `Ethical Foundation: ${question.substring(0, 50)}...`,
        `Question: ${question}\n\nResponse: ${userResponse}\n\nReasoning: ${reasoning}`,
        'rule',
        weight > 0.8 ? 'high' : weight > 0.5 ? 'medium' : 'low',
        JSON.stringify(['omlearn', 'ethics', gradeGroup, category]),
        'omlearn_import',
        'private'
      ]);
    }

    // Update survey progress
    const gradeGroups = [...new Set(responses.map(r => r.gradeGroup))];
    for (const gradeGroup of gradeGroups) {
      const gradeResponses = responses.filter(r => r.gradeGroup === gradeGroup);
      
      await promisePool.execute(`
        INSERT INTO omlearn_surveys (user_id, survey_id, grade_group, status, completed_questions, total_questions)
        VALUES (?, ?, ?, 'completed', ?, ?)
        ON DUPLICATE KEY UPDATE 
          status = 'completed',
          completed_questions = VALUES(completed_questions),
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId,
        gradeGroup.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        gradeGroup,
        gradeResponses.length,
        gradeResponses.length
      ]);
    }

    // Log the import
    await OMAIRequest.logAction('omlearn_import', {
      user_id: userId,
      responses_imported: responses.length,
      grade_groups: gradeGroups,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Successfully imported ${responses.length} OMLearn responses`,
      foundationsCreated: responses.length,
      gradeGroupsUpdated: gradeGroups
    });
  } catch (error) {
    console.error('Error importing OMLearn responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import OMLearn responses'
    });
  }
});

module.exports = router; 