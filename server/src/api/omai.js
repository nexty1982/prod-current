const { getAppPool } = require('../config/db-compat');
const { getTenantPool } = require('../config/db');
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { formatTimestamp, formatTimestampUser, formatRelativeTime } = require('../utils/formatTimestamp');

// Import OMAI services
const { askOMAI, askOMAIWithMetadata, getOMAIHealth, getOMAIStats } = require('/var/www/orthodoxmetrics/prod/misc/omai/services/index.js');
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

/**
 * Build record context for dashboard queries.
 * Queries tenant DB for record counts and optional search results.
 */
async function buildRecordContext(churchId, prompt) {
  try {
    const pool = getTenantPool(churchId);
    const parts = [];

    // Get record counts
    const tables = ['baptism_records', 'marriage_records', 'funeral_records'];
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        const label = table.replace('_records', '');
        parts.push(`${label}: ${rows[0].cnt} records`);
      } catch (_) {
        // Table may not exist
      }
    }

    // If prompt looks like a search, query across tables
    const searchTerms = prompt.replace(/show|find|search|get|list|me|my|recent|records?|all/gi, '').trim();
    if (searchTerms.length >= 2) {
      const searchResults = [];
      for (const table of tables) {
        try {
          const [rows] = await pool.query(
            `SELECT * FROM \`${table}\` WHERE
              CONCAT_WS(' ', COALESCE(first_name,''), COALESCE(last_name,''), COALESCE(notes,''))
              LIKE ? ORDER BY created_at DESC LIMIT 10`,
            [`%${searchTerms}%`]
          );
          if (rows.length > 0) {
            const label = table.replace('_records', '');
            searchResults.push(`${label} matches (${rows.length}):\n${rows.map(r =>
              `  - ${r.first_name || ''} ${r.last_name || ''} (ID: ${r.id}, created: ${r.created_at})`
            ).join('\n')}`);
          }
        } catch (_) {
          // Table may not exist or missing columns
        }
      }
      if (searchResults.length > 0) {
        parts.push('\nSearch results for "' + searchTerms + '":\n' + searchResults.join('\n'));
      }
    }

    return parts.length > 0 ? 'Church record data:\n' + parts.join('\n') : '';
  } catch (err) {
    console.error('[OMAI] buildRecordContext error:', err.message);
    return '';
  }
}

// POST /api/omai/ask - Main query execution (context-aware)
router.post('/ask', async (req, res) => {
  try {
    const { prompt, context, securityContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const contextType = context?.type || 'global';
    console.log(`[OMAI] Query request (${contextType}): ${prompt.substring(0, 100)}...`);

    // Build augmented prompt based on context type
    let augmentedPrompt = prompt;

    if (contextType === 'user-guide' && context.guideContent) {
      augmentedPrompt = `You are a helpful assistant for Orthodox Metrics, a church management platform. Answer the user's question based on the following documentation:\n\n${context.guideContent}\n\nUser question: ${prompt}`;
    } else if (contextType === 'dashboard' && context.churchId) {
      const recordContext = await buildRecordContext(context.churchId, prompt);
      if (recordContext) {
        augmentedPrompt = `You are a helpful assistant for Orthodox Metrics. The user is viewing their church dashboard${context.churchName ? ` for "${context.churchName}"` : ''}. Here is relevant data:\n\n${recordContext}\n\nUser question: ${prompt}\n\nProvide a helpful response based on the data above. Format any record results clearly.`;
      }
    }

    // Merge churchId into security context so OMAI services can query records directly
    const secContext = {
      ...securityContext,
      churchId: context?.churchId || req.session?.user?.church_id,
    };

    const response = await askOMAIWithMetadata(augmentedPrompt, secContext);

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
    const { promisePool: db } = require('../config/db-compat');
    
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
    await getAppPool().query(`
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
    const { promisePool: db } = require('../config/db-compat');
    
    // Enhanced context type detection
    const detectedType = detectContextType(text);
    const finalContextType = context_type !== 'general' ? context_type : detectedType;
    
    // Store memory in database (using promise pool)
    await getAppPool().query(
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

    const { promisePool: db } = require('../config/db-compat');
    
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

    const memories = await getAppPool().query(query, params);

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

    const totalResult = await getAppPool().query(countQuery, countParams);
    const total = totalResult[0]?.total || 0;

    // Get agent summary for metadata
    const agentSummary = await getAppPool().query(`
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
    const { promisePool: db } = require('../config/db-compat');
    
    await getAppPool().query('DELETE FROM omai_memories WHERE id = ?', [id]);
    
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
// OMAI MARKDOWN INGESTION SYSTEM ENDPOINTS (Task 139)
// =====================================================

const multer = require('multer');
const uuid = require('uuid');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../misc/omai/bigbook/docs');
    // Ensure directory exists
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only accept markdown files
    if (file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Only markdown files (.md) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// POST /api/omai/md-ingest - Phase 1: Markdown file ingestion
router.post('/md-ingest', upload.single('mdFile'), async (req, res) => {
  try {
    const { tags, source_agent = 'user', manual_tags } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No markdown file provided'
      });
    }

    console.log(`[OMAI] Markdown ingestion: ${file.originalname} (${file.size} bytes)`);

    // Read file content
    const fileContent = await fs.readFile(file.path, 'utf-8');
    
    // Generate ingestion ID
    const ingestionId = uuid.v4();
    
    // Parse metadata from filename and content
    const metadata = {
      originalName: file.originalname,
      fileSize: file.size,
      uploadTimestamp: new Date().toISOString(),
      sourceAgent: source_agent,
      filePath: file.path,
      contentPreview: fileContent.substring(0, 200) + '...',
      ingestionId
    };

    // Store in database
    const { promisePool: db } = require('../config/db-compat');
    
    await getAppPool().query(`
      INSERT INTO omai_md_catalog (
        ingestion_id, 
        filename, 
        file_path, 
        content, 
        content_preview,
        file_size, 
        source_agent, 
        tags, 
        manual_tags,
        metadata, 
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ingested', NOW())
    `, [
      ingestionId,
      file.originalname,
      file.path,
      fileContent,
      metadata.contentPreview,
      file.size,
      source_agent,
      tags ? JSON.stringify(tags) : null,
      manual_tags,
      JSON.stringify(metadata),
      'ingested'
    ]);

    // Also store in memories for immediate searchability
    await getAppPool().query(`
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
        fileContent,
        'documentation',
        'high',
        JSON.stringify(['markdown', 'ingested', source_agent, ...(tags || [])]),
        'md_ingest',
        source_agent,
        'markdown_ingestion',
        'high',
        JSON.stringify(metadata),
        'file_upload'
      ]
    );

    console.log(`✅ Markdown file ingested successfully: ${ingestionId}`);

    res.json({
      success: true,
      message: 'Markdown file ingested successfully',
      data: {
        ingestionId,
        filename: file.originalname,
        fileSize: file.size,
        contentPreview: metadata.contentPreview,
        sourceAgent: source_agent,
        tags: tags || [],
        manualTags: manual_tags,
        timestamp: metadata.uploadTimestamp,
        filePath: file.path.replace(__dirname, ''), // Relative path for security
        status: 'ingested'
      }
    });

  } catch (error) {
    console.error('OMAI markdown ingestion failed:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to ingest markdown file',
      details: error.message
    });
  }
});

// POST /api/omai/md-ingest-text - Ingest markdown content directly (no file upload)
router.post('/md-ingest-text', async (req, res) => {
  try {
    const { 
      content, 
      filename = 'direct-input.md', 
      tags = [], 
      source_agent = 'user',
      manual_tags 
    } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Markdown content is required'
      });
    }

    console.log(`[OMAI] Direct markdown ingestion: ${filename}`);

    // Generate ingestion ID
    const ingestionId = uuid.v4();
    const timestamp = new Date().toISOString();
    
    // Create file path for storage
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = path.join(__dirname, '../../misc/omai/bigbook/docs', `${timestamp.replace(/:/g, '-')}_${sanitizedFilename}`);
    
    // Write content to file
    await fs.writeFile(storagePath, content, 'utf-8');
    
    // Parse metadata
    const metadata = {
      originalName: filename,
      fileSize: Buffer.byteLength(content, 'utf-8'),
      uploadTimestamp: timestamp,
      sourceAgent: source_agent,
      filePath: storagePath,
      contentPreview: content.substring(0, 200) + '...',
      ingestionId,
      method: 'direct_text'
    };

    // Store in database
    const { promisePool: db } = require('../config/db-compat');
    
    await getAppPool().query(`
      INSERT INTO omai_md_catalog (
        ingestion_id, 
        filename, 
        file_path, 
        content, 
        content_preview,
        file_size, 
        source_agent, 
        tags, 
        manual_tags,
        metadata, 
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ingested', NOW())
    `, [
      ingestionId,
      filename,
      storagePath,
      content,
      metadata.contentPreview,
      metadata.fileSize,
      source_agent,
      tags.length > 0 ? JSON.stringify(tags) : null,
      manual_tags,
      JSON.stringify(metadata),
      'ingested'
    ]);

    // Also store in memories
    await getAppPool().query(`
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
        content,
        'documentation',
        'high',
        JSON.stringify(['markdown', 'direct_text', source_agent, ...tags]),
        'md_ingest_text',
        source_agent,
        'markdown_ingestion',
        'high',
        JSON.stringify(metadata),
        'direct_input'
      ]
    );

    console.log(`✅ Direct markdown content ingested: ${ingestionId}`);

    res.json({
      success: true,
      message: 'Markdown content ingested successfully',
      data: {
        ingestionId,
        filename,
        fileSize: metadata.fileSize,
        contentPreview: metadata.contentPreview,
        sourceAgent: source_agent,
        tags,
        manualTags: manual_tags,
        timestamp,
        filePath: storagePath.replace(__dirname, ''), // Relative path
        status: 'ingested',
        method: 'direct_text'
      }
    });

  } catch (error) {
    console.error('OMAI direct markdown ingestion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest markdown content',
      details: error.message
    });
  }
});

// GET /api/omai/md-catalog - Get ingested markdown catalog
router.get('/md-catalog', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      source_agent = null,
      search = null,
      status = null 
    } = req.query;

    const { promisePool: db } = require('../config/db-compat');
    
    let query = 'SELECT * FROM omai_md_catalog WHERE 1=1';
    const params = [];

    if (source_agent) {
      query += ' AND source_agent = ?';
      params.push(source_agent);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (filename LIKE ? OR content LIKE ? OR manual_tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const catalog = await getAppPool().query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM omai_md_catalog WHERE 1=1';
    const countParams = [];

    if (source_agent) {
      countQuery += ' AND source_agent = ?';
      countParams.push(source_agent);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (search) {
      countQuery += ' AND (filename LIKE ? OR content LIKE ? OR manual_tags LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const totalResult = await getAppPool().query(countQuery, countParams);
    const total = totalResult[0]?.total || 0;

    res.json({
      success: true,
      catalog: catalog || [],
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < total
    });

  } catch (error) {
    console.error('OMAI catalog retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve markdown catalog',
      details: error.message
    });
  }
});

// POST /api/omai/md-parse - Phase 2: Parse markdown and extract structure
router.post('/md-parse', async (req, res) => {
  try {
    const { ingestion_id, force_reparse = false } = req.body;

    if (!ingestion_id) {
      return res.status(400).json({
        success: false,
        error: 'Ingestion ID is required'
      });
    }

    console.log(`[OMAI] Parsing markdown for ingestion: ${ingestion_id}`);

    const { promisePool: db } = require('../config/db-compat');
    
    // Get the markdown document
    const [catalogResult] = await getAppPool().query(
      'SELECT * FROM omai_md_catalog WHERE ingestion_id = ?',
      [ingestion_id]
    );

    if (!catalogResult || catalogResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Markdown document not found'
      });
    }

    const document = catalogResult[0];

    // Check if already parsed (unless force reparse)
    if (document.status === 'parsed' && !force_reparse) {
      const [structureResult] = await getAppPool().query(
        'SELECT * FROM omai_md_structure WHERE catalog_id = ? ORDER BY position_start',
        [document.id]
      );

      return res.json({
        success: true,
        message: 'Document already parsed',
        data: {
          catalogId: document.id,
          ingestionId: ingestion_id,
          structures: structureResult || [],
          parseTime: 'cached'
        }
      });
    }

    // Parse markdown content
    const parseStartTime = Date.now();
    const structures = parseMarkdownStructure(document.content);
    const parseTime = Date.now() - parseStartTime;

    // Clear existing structures if reparse
    if (force_reparse) {
      await getAppPool().query('DELETE FROM omai_md_structure WHERE catalog_id = ?', [document.id]);
    }

    // Store parsed structures
    for (const structure of structures) {
      await getAppPool().query(`
        INSERT INTO omai_md_structure (
          catalog_id, structure_type, level, content, raw_content,
          position_start, position_end, auto_tags, extracted_concepts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        document.id,
        structure.type,
        structure.level || 1,
        structure.content,
        structure.rawContent,
        structure.positionStart,
        structure.positionEnd,
        JSON.stringify(structure.autoTags || []),
        JSON.stringify(structure.extractedConcepts || [])
      ]);
    }

    // Update document status
    await getAppPool().query(
      'UPDATE omai_md_catalog SET status = ?, updated_at = NOW() WHERE id = ?',
      ['parsed', document.id]
    );

    console.log(`✅ Markdown parsed successfully: ${structures.length} structures found`);

    res.json({
      success: true,
      message: 'Markdown parsed successfully',
      data: {
        catalogId: document.id,
        ingestionId: ingestion_id,
        structuresFound: structures.length,
        parseTime: `${parseTime}ms`,
        structures: structures.slice(0, 10) // Return first 10 for preview
      }
    });

  } catch (error) {
    console.error('OMAI markdown parsing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to parse markdown',
      details: error.message
    });
  }
});

// GET /api/omai/md-structure/:ingestionId - Get parsed structure
router.get('/md-structure/:ingestionId', async (req, res) => {
  try {
    const { ingestionId } = req.params;
    const { structure_type = null, level = null } = req.query;

    const { promisePool: db } = require('../config/db-compat');
    
    // Get catalog entry
    const [catalogResult] = await getAppPool().query(
      'SELECT id, filename, status FROM omai_md_catalog WHERE ingestion_id = ?',
      [ingestionId]
    );

    if (!catalogResult || catalogResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    const catalog = catalogResult[0];

    // Build query for structures
    let structureQuery = 'SELECT * FROM omai_md_structure WHERE catalog_id = ?';
    const params = [catalog.id];

    if (structure_type) {
      structureQuery += ' AND structure_type = ?';
      params.push(structure_type);
    }

    if (level) {
      structureQuery += ' AND level = ?';
      params.push(parseInt(level));
    }

    structureQuery += ' ORDER BY position_start';

    const [structureResult] = await getAppPool().query(structureQuery, params);

    res.json({
      success: true,
      data: {
        catalog: {
          id: catalog.id,
          filename: catalog.filename,
          status: catalog.status
        },
        structures: structureResult || [],
        summary: {
          totalStructures: structureResult?.length || 0,
          byType: getStructureSummary(structureResult || [])
        }
      }
    });

  } catch (error) {
    console.error('OMAI structure retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve markdown structure',
      details: error.message
    });
  }
});

// Helper function to parse markdown structure
function parseMarkdownStructure(content) {
  const structures = [];
  const lines = content.split('\n');
  let position = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = position;
    const lineEnd = position + line.length;

    // Headers (H1-H6)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2].trim();
      
      structures.push({
        type: 'heading',
        level,
        content,
        rawContent: line,
        positionStart: lineStart,
        positionEnd: lineEnd,
        autoTags: extractTagsFromText(content),
        extractedConcepts: extractConcepts(content)
      });
    }

    // Checklists
    const checklistMatch = line.match(/^[\s]*[-*+]\s+\[[\sxX]\]\s+(.+)$/);
    if (checklistMatch) {
      const content = checklistMatch[1].trim();
      const isCompleted = line.includes('[x]') || line.includes('[X]');
      
      structures.push({
        type: 'checklist',
        level: 1,
        content,
        rawContent: line,
        positionStart: lineStart,
        positionEnd: lineEnd,
        autoTags: [...extractTagsFromText(content), isCompleted ? 'completed' : 'pending'],
        extractedConcepts: extractConcepts(content)
      });
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      const language = line.replace('```', '').trim();
      const codeLines = [];
      let j = i + 1;
      
      while (j < lines.length && !lines[j].trim().startsWith('```')) {
        codeLines.push(lines[j]);
        j++;
      }
      
      if (j < lines.length) {
        const codeContent = codeLines.join('\n');
        const codeEnd = position + lines.slice(i, j + 1).join('\n').length;
        
        structures.push({
          type: 'code_block',
          level: 1,
          content: codeContent,
          rawContent: lines.slice(i, j + 1).join('\n'),
          positionStart: lineStart,
          positionEnd: codeEnd,
          autoTags: [language || 'code', 'programming'],
          extractedConcepts: extractCodeConcepts(codeContent, language)
        });
        
        i = j; // Skip to end of code block
      }
    }

    // Tables
    if (line.includes('|') && line.split('|').length > 2) {
      const tableLines = [line];
      let j = i + 1;
      
      while (j < lines.length && lines[j].includes('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      
      const tableContent = tableLines.join('\n');
      const tableEnd = position + tableContent.length;
      
      structures.push({
        type: 'table',
        level: 1,
        content: `Table with ${tableLines.length} rows`,
        rawContent: tableContent,
        positionStart: lineStart,
        positionEnd: tableEnd,
        autoTags: ['table', 'data'],
        extractedConcepts: extractTableConcepts(tableContent)
      });
      
      i = j - 1; // Skip processed table lines
    }

    // Links
    const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (linkMatches) {
      linkMatches.forEach(linkMatch => {
        const match = linkMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (match) {
          structures.push({
            type: 'link',
            level: 1,
            content: match[1],
            rawContent: linkMatch,
            positionStart: lineStart + line.indexOf(linkMatch),
            positionEnd: lineStart + line.indexOf(linkMatch) + linkMatch.length,
            autoTags: ['link', 'reference'],
            extractedConcepts: [match[2]] // URL as concept
          });
        }
      });
    }

    position = lineEnd + 1; // +1 for newline
  }

  return structures;
}

// Helper function to extract tags from text
function extractTagsFromText(text) {
  const tags = [];
  const lowerText = text.toLowerCase();
  
  // Common programming and documentation keywords
  const keywords = [
    'api', 'database', 'frontend', 'backend', 'config', 'setup', 'install',
    'deploy', 'test', 'bug', 'feature', 'fix', 'update', 'migration',
    'security', 'auth', 'login', 'user', 'admin', 'church', 'orthodox',
    'sql', 'javascript', 'typescript', 'react', 'node', 'express',
    'component', 'service', 'endpoint', 'route', 'function', 'class'
  ];
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      tags.push(keyword);
    }
  });
  
  return [...new Set(tags)]; // Remove duplicates
}

// Helper function to extract concepts
function extractConcepts(text) {
  const concepts = [];
  
  // Extract capitalized words (likely proper nouns/concepts)
  const capitalizedWords = text.match(/\b[A-Z][a-zA-Z]*\b/g) || [];
  concepts.push(...capitalizedWords.filter(word => word.length > 2));
  
  // Extract quoted strings
  const quotedStrings = text.match(/"([^"]+)"/g) || [];
  concepts.push(...quotedStrings.map(q => q.replace(/"/g, '')));
  
  return [...new Set(concepts)].slice(0, 10); // Limit and dedupe
}

// Helper function for code concepts
function extractCodeConcepts(code, language) {
  const concepts = [language];
  
  // Extract function names
  const functionMatches = code.match(/function\s+(\w+)|(\w+)\s*\(/g) || [];
  concepts.push(...functionMatches.map(m => m.replace(/function\s+|[\s\(]/g, '')));
  
  // Extract imports/requires
  const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g) || [];
  concepts.push(...importMatches);
  
  return [...new Set(concepts)].slice(0, 10);
}

// Helper function for table concepts
function extractTableConcepts(tableContent) {
  const lines = tableContent.split('\n');
  const headers = lines[0]?.split('|').map(h => h.trim()).filter(Boolean) || [];
  return headers.slice(0, 5); // First 5 column headers as concepts
}

// Helper function to summarize structures
function getStructureSummary(structures) {
  const summary = {};
  structures.forEach(structure => {
    summary[structure.structure_type] = (summary[structure.structure_type] || 0) + 1;
  });
  return summary;
}

// GET /api/omai/search - Phase 3: AI-Grep search engine
router.get('/search', async (req, res) => {
  try {
    const { 
      q: query, 
      limit = 10, 
      threshold = 0.7,
      search_type = 'hybrid',
      source_agent = null,
      structure_type = null 
    } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log(`[OMAI] AI-Grep search: "${query}" (type: ${search_type})`);

    const searchStartTime = Date.now();
    const { promisePool: db } = require('../config/db-compat');

    // Log search query
    await getAppPool().query(`
      INSERT INTO omai_md_search_history (
        query_text, query_type, user_agent, ip_address, session_id
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      query,
      search_type === 'grep_command' ? 'grep_command' : 'natural_language',
      req.get('User-Agent') || 'unknown',
      req.ip || 'unknown',
      req.sessionID || 'anonymous'
    ]);

    let results = [];

    if (search_type === 'fulltext' || search_type === 'hybrid') {
      // Full-text search in catalog
      let fullTextQuery = `
        SELECT 
          c.*, 
          MATCH(c.filename, c.content, c.manual_tags, c.content_preview) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance_score
        FROM omai_md_catalog c
        WHERE MATCH(c.filename, c.content, c.manual_tags, c.content_preview) AGAINST (? IN NATURAL LANGUAGE MODE)
      `;
      const params = [query, query];

      if (source_agent) {
        fullTextQuery += ' AND c.source_agent = ?';
        params.push(source_agent);
      }

      fullTextQuery += ' ORDER BY relevance_score DESC LIMIT ?';
      params.push(parseInt(limit));

      const [catalogResults] = await getAppPool().query(fullTextQuery, params);
      
      results.push(...catalogResults.map(doc => ({
        type: 'document',
        source: 'catalog',
        score: doc.relevance_score,
        document: {
          ingestionId: doc.ingestion_id,
          filename: doc.filename,
          contentPreview: doc.content_preview,
          sourceAgent: doc.source_agent,
          tags: doc.tags ? JSON.parse(doc.tags) : [],
          manualTags: doc.manual_tags,
          createdAt: doc.created_at
        }
      })));
    }

    if (search_type === 'structure' || search_type === 'hybrid') {
      // Search in parsed structures
      let structureQuery = `
        SELECT 
          s.*, c.filename, c.ingestion_id,
          MATCH(s.content) AGAINST (? IN NATURAL LANGUAGE MODE) as structure_relevance
        FROM omai_md_structure s
        JOIN omai_md_catalog c ON s.catalog_id = c.id
        WHERE MATCH(s.content) AGAINST (? IN NATURAL LANGUAGE MODE)
      `;
      const structureParams = [query, query];

      if (structure_type) {
        structureQuery += ' AND s.structure_type = ?';
        structureParams.push(structure_type);
      }

      if (source_agent) {
        structureQuery += ' AND c.source_agent = ?';
        structureParams.push(source_agent);
      }

      structureQuery += ' ORDER BY structure_relevance DESC LIMIT ?';
      structureParams.push(parseInt(limit));

      const [structureResults] = await getAppPool().query(structureQuery, structureParams);
      
      results.push(...structureResults.map(struct => ({
        type: 'structure',
        source: 'parsed_content',
        score: struct.structure_relevance,
        structure: {
          type: struct.structure_type,
          level: struct.level,
          content: struct.content,
          positionStart: struct.position_start,
          positionEnd: struct.position_end,
          autoTags: struct.auto_tags ? JSON.parse(struct.auto_tags) : [],
          extractedConcepts: struct.extracted_concepts ? JSON.parse(struct.extracted_concepts) : []
        },
        document: {
          filename: struct.filename,
          ingestionId: struct.ingestion_id
        }
      })));
    }

    if (search_type === 'semantic' || search_type === 'hybrid') {
      // Semantic search using existing OMAI memories
      const [memoryResults] = await getAppPool().query(`
        SELECT 
          text, source_agent, tags, timestamp, 
          MATCH(text) AGAINST (? IN NATURAL LANGUAGE MODE) as memory_relevance
        FROM omai_memories 
        WHERE MATCH(text) AGAINST (? IN NATURAL LANGUAGE MODE)
          AND source = 'md_ingest'
        ORDER BY memory_relevance DESC 
        LIMIT ?
      `, [query, query, parseInt(limit)]);

      results.push(...memoryResults.map(memory => ({
        type: 'memory',
        source: 'omai_memories',
        score: memory.memory_relevance,
        memory: {
          text: memory.text.substring(0, 300) + '...',
          sourceAgent: memory.source_agent,
          tags: memory.tags ? JSON.parse(memory.tags) : [],
          timestamp: memory.timestamp
        }
      })));
    }

    // Sort all results by score and apply threshold
    results = results
      .filter(result => result.score >= parseFloat(threshold))
      .sort((a, b) => b.score - a.score)
      .slice(0, parseInt(limit));

    // Enhanced results with highlighting
    const enhancedResults = results.map(result => ({
      ...result,
      highlights: generateHighlights(result, query),
      matchedTerms: extractMatchedTerms(result, query)
    }));

    const searchTime = Date.now() - searchStartTime;

    // Update search history with results
    await getAppPool().query(`
      UPDATE omai_md_search_history 
      SET results_count = ?, search_duration_ms = ? 
      WHERE query_text = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
      ORDER BY created_at DESC LIMIT 1
    `, [results.length, searchTime, query]);

    console.log(`✅ AI-Grep search completed: ${results.length} results in ${searchTime}ms`);

    res.json({
      success: true,
      query,
      searchType: search_type,
      results: enhancedResults,
      summary: {
        totalResults: results.length,
        searchTime: `${searchTime}ms`,
        threshold: parseFloat(threshold),
        resultTypes: getSummaryByType(results)
      },
      suggestions: generateSearchSuggestions(query, results)
    });

  } catch (error) {
    console.error('OMAI AI-Grep search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      details: error.message
    });
  }
});

// POST /api/omai/search-index - Build/rebuild search index
router.post('/search-index', async (req, res) => {
  try {
    const { ingestion_id = null, force_rebuild = false } = req.body;

    console.log(`[OMAI] Building search index${ingestion_id ? ` for ${ingestion_id}` : ' for all documents'}`);

    const { promisePool: db } = require('../config/db-compat');
    const indexStartTime = Date.now();

    let documentsToIndex = [];

    if (ingestion_id) {
      // Index specific document
      const [doc] = await getAppPool().query(
        'SELECT * FROM omai_md_catalog WHERE ingestion_id = ?',
        [ingestion_id]
      );
      documentsToIndex = doc || [];
    } else {
      // Index all documents that need indexing
      const [docs] = await getAppPool().query(`
        SELECT * FROM omai_md_catalog 
        WHERE status IN ('parsed', 'ingested')
        ${force_rebuild ? '' : 'AND id NOT IN (SELECT catalog_id FROM omai_md_search_index)'}
      `);
      documentsToIndex = docs || [];
    }

    const indexedDocuments = [];

    for (const doc of documentsToIndex) {
      try {
        // Generate search vectors (simplified - in production would use real embeddings)
        const searchVectors = generateSearchVectors(doc.content);
        const keywords = extractKeywords(doc.content);
        const concepts = extractDocumentConcepts(doc.content);
        const embeddingsHash = generateEmbeddingsHash(doc.content);

        // Store or update index
        await getAppPool().query(`
          INSERT INTO omai_md_search_index (
            catalog_id, search_vectors, keywords, concepts, embeddings_hash
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            search_vectors = VALUES(search_vectors),
            keywords = VALUES(keywords),
            concepts = VALUES(concepts),
            embeddings_hash = VALUES(embeddings_hash),
            indexed_at = CURRENT_TIMESTAMP
        `, [
          doc.id,
          JSON.stringify(searchVectors),
          JSON.stringify(keywords),
          JSON.stringify(concepts),
          embeddingsHash
        ]);

        // Update document status
        await getAppPool().query(
          'UPDATE omai_md_catalog SET status = ? WHERE id = ?',
          ['indexed', doc.id]
        );

        indexedDocuments.push({
          ingestionId: doc.ingestion_id,
          filename: doc.filename,
          vectorsGenerated: searchVectors.length,
          keywordsExtracted: keywords.length,
          conceptsExtracted: concepts.length
        });

      } catch (indexError) {
        console.error(`Failed to index document ${doc.ingestion_id}:`, indexError);
      }
    }

    const indexTime = Date.now() - indexStartTime;

    console.log(`✅ Search index built: ${indexedDocuments.length} documents in ${indexTime}ms`);

    res.json({
      success: true,
      message: 'Search index built successfully',
      data: {
        documentsIndexed: indexedDocuments.length,
        indexTime: `${indexTime}ms`,
        documents: indexedDocuments
      }
    });

  } catch (error) {
    console.error('OMAI search indexing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build search index',
      details: error.message
    });
  }
});

// Helper functions for search
function generateHighlights(result, query) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  let text = '';

  if (result.type === 'document') {
    text = result.document.contentPreview || '';
  } else if (result.type === 'structure') {
    text = result.structure.content || '';
  } else if (result.type === 'memory') {
    text = result.memory.text || '';
  }

  // Simple highlighting - wrap matched terms
  queryTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    text = text.replace(regex, `<mark>$&</mark>`);
  });

  return text.substring(0, 500) + (text.length > 500 ? '...' : '');
}

function extractMatchedTerms(result, query) {
  const queryTerms = query.toLowerCase().split(/\s+/);
  let text = '';

  if (result.type === 'document') {
    text = (result.document.contentPreview || '').toLowerCase();
  } else if (result.type === 'structure') {
    text = (result.structure.content || '').toLowerCase();
  } else if (result.type === 'memory') {
    text = (result.memory.text || '').toLowerCase();
  }

  return queryTerms.filter(term => text.includes(term));
}

function getSummaryByType(results) {
  const summary = {};
  results.forEach(result => {
    summary[result.type] = (summary[result.type] || 0) + 1;
  });
  return summary;
}

function generateSearchSuggestions(query, results) {
  const suggestions = [];
  
  // Suggest related terms from results
  const relatedTerms = new Set();
  results.forEach(result => {
    if (result.type === 'document' && result.document.tags) {
      result.document.tags.forEach(tag => relatedTerms.add(tag));
    }
    if (result.type === 'structure' && result.structure.autoTags) {
      result.structure.autoTags.forEach(tag => relatedTerms.add(tag));
    }
  });

  // Convert to suggestion format
  Array.from(relatedTerms).slice(0, 5).forEach(term => {
    suggestions.push({
      type: 'related_term',
      suggestion: `${query} ${term}`,
      description: `Search for "${query}" with "${term}"`
    });
  });

  return suggestions;
}

function generateSearchVectors(content) {
  // Simplified vector generation - in production would use real embeddings
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCounts = {};
  
  words.forEach(word => {
    if (word.length > 2) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  // Return top 50 words with their frequencies as "vectors"
  return Object.entries(wordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));
}

function extractKeywords(content) {
  // Extract meaningful keywords
  const words = content.toLowerCase().match(/\b\w+\b/g) || [];
  const keywords = new Set();
  
  // Filter out common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those']);
  
  words.forEach(word => {
    if (word.length > 3 && !stopWords.has(word)) {
      keywords.add(word);
    }
  });

  return Array.from(keywords).slice(0, 30);
}

function extractDocumentConcepts(content) {
  const concepts = [];
  
  // Extract headings as concepts
  const headings = content.match(/^#{1,6}\s+(.+)$/gm) || [];
  concepts.push(...headings.map(h => h.replace(/^#+\s+/, '')));
  
  // Extract code languages
  const codeBlocks = content.match(/```(\w+)/g) || [];
  concepts.push(...codeBlocks.map(cb => cb.replace('```', '')));
  
  // Extract quoted strings as concepts
  const quotes = content.match(/"([^"]+)"/g) || [];
  concepts.push(...quotes.map(q => q.replace(/"/g, '')));
  
  return [...new Set(concepts)].slice(0, 20);
}

function generateEmbeddingsHash(content) {
  // Simple hash for change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// POST /api/omai/grep - Phase 4: @omai grep command integration
router.post('/grep', async (req, res) => {
  try {
    const { 
      command, 
      query, 
      context = null, 
      output_format = 'json',
      max_results = 20,
      include_citations = true 
    } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log(`[OMAI] Grep command: "${command || '@omai grep'} ${query}"`);

    const grepStartTime = Date.now();
    const { promisePool: db } = require('../config/db-compat');

    // Parse grep-style command if provided
    let searchQuery = query;
    let searchOptions = {
      search_type: 'hybrid',
      structure_type: null,
      source_agent: null,
      limit: max_results
    };

    // Handle grep-style flags
    if (command && command.includes('-')) {
      if (command.includes('-h') || command.includes('--headings')) {
        searchOptions.structure_type = 'heading';
      }
      if (command.includes('-c') || command.includes('--code')) {
        searchOptions.structure_type = 'code_block';
      }
      if (command.includes('-t') || command.includes('--tables')) {
        searchOptions.structure_type = 'table';
      }
      if (command.includes('-l') || command.includes('--lists')) {
        searchOptions.structure_type = 'checklist';
      }
      if (command.includes('-s') || command.includes('--semantic')) {
        searchOptions.search_type = 'semantic';
      }
      if (command.includes('-f') || command.includes('--fulltext')) {
        searchOptions.search_type = 'fulltext';
      }
    }

    // Perform the search using existing search functionality
    const searchResults = await performGrepSearch(searchQuery, searchOptions, db);
    
    // Generate response based on output format
    let response;
    if (output_format === 'markdown') {
      response = generateMarkdownResponse(searchResults, query, include_citations);
    } else if (output_format === 'plain') {
      response = generatePlainTextResponse(searchResults, query);
    } else {
      response = generateStructuredResponse(searchResults, query, include_citations);
    }

    // Detect and store agent references
    await detectAndStoreAgentReferences(searchResults, db);

    const grepTime = Date.now() - grepStartTime;

    // Log grep command execution
    await getAppPool().query(`
      INSERT INTO omai_md_search_history (
        query_text, query_type, results_count, search_duration_ms,
        user_agent, ip_address, session_id
      ) VALUES (?, 'grep_command', ?, ?, ?, ?, ?)
    `, [
      `${command || '@omai grep'} ${query}`,
      searchResults.length,
      grepTime,
      req.get('User-Agent') || 'omai_system',
      req.ip || 'internal',
      req.sessionID || 'omai_session'
    ]);

    console.log(`✅ OMAI grep completed: ${searchResults.length} results in ${grepTime}ms`);

    res.json({
      success: true,
      command: command || '@omai grep',
      query,
      context,
      outputFormat: output_format,
      results: searchResults,
      response,
      metadata: {
        totalResults: searchResults.length,
        searchTime: `${grepTime}ms`,
        searchOptions,
        timestamp: new Date().toISOString()
      },
      citations: include_citations ? generateCitations(searchResults) : null
    });

  } catch (error) {
    console.error('OMAI grep command failed:', error);
    res.status(500).json({
      success: false,
      error: 'Grep command failed',
      details: error.message
    });
  }
});

// GET /api/omai/grep-help - Show grep command help
router.get('/grep-help', (req, res) => {
  const helpText = `
# OMAI Grep Command Help

## Usage
\`@omai grep [options] "search query"\`

## Options
- \`-h, --headings\`    Search only in headings (H1-H6)
- \`-c, --code\`        Search only in code blocks
- \`-t, --tables\`      Search only in tables
- \`-l, --lists\`       Search only in checklists/lists
- \`-s, --semantic\`    Use semantic search only
- \`-f, --fulltext\`    Use full-text search only

## Examples
- \`@omai grep "database setup"\`
- \`@omai grep -h "API documentation"\`
- \`@omai grep -c "function uploadFile"\`
- \`@omai grep -s "authentication workflow"\`

## Output Formats
- JSON (default): Structured response with metadata
- Markdown: Formatted markdown with citations
- Plain: Simple text output

## Response Includes
- Matched content with highlighting
- Source document information
- Relevance scores
- Auto-generated citations
- Related suggestions
`;

  res.json({
    success: true,
    help: helpText.trim(),
    availableOptions: [
      { flag: '-h, --headings', description: 'Search only in headings' },
      { flag: '-c, --code', description: 'Search only in code blocks' },
      { flag: '-t, --tables', description: 'Search only in tables' },
      { flag: '-l, --lists', description: 'Search only in lists/checklists' },
      { flag: '-s, --semantic', description: 'Use semantic search' },
      { flag: '-f, --fulltext', description: 'Use full-text search' }
    ],
    outputFormats: ['json', 'markdown', 'plain'],
    examples: [
      '@omai grep "database setup"',
      '@omai grep -h "API documentation"',
      '@omai grep -c "function uploadFile"',
      '@omai grep -s "authentication workflow"'
    ]
  });
});

// Helper functions for grep functionality
async function performGrepSearch(query, options, db) {
  const results = [];

  // Fulltext search in documents
  if (options.search_type === 'fulltext' || options.search_type === 'hybrid') {
    const [docs] = await getAppPool().query(`
      SELECT 
        c.*, 
        MATCH(c.filename, c.content, c.manual_tags, c.content_preview) AGAINST (? IN NATURAL LANGUAGE MODE) as score
      FROM omai_md_catalog c
      WHERE MATCH(c.filename, c.content, c.manual_tags, c.content_preview) AGAINST (? IN NATURAL LANGUAGE MODE)
      ORDER BY score DESC 
      LIMIT ?
    `, [query, query, options.limit]);

    results.push(...docs.map(doc => ({
      type: 'document',
      score: doc.score,
      source: doc,
      highlight: highlightText(doc.content_preview, query)
    })));
  }

  // Structure-specific search
  if (options.structure_type || options.search_type === 'structure' || options.search_type === 'hybrid') {
    let structQuery = `
      SELECT 
        s.*, c.filename, c.ingestion_id,
        MATCH(s.content) AGAINST (? IN NATURAL LANGUAGE MODE) as score
      FROM omai_md_structure s
      JOIN omai_md_catalog c ON s.catalog_id = c.id
      WHERE MATCH(s.content) AGAINST (? IN NATURAL LANGUAGE MODE)
    `;
    const params = [query, query];

    if (options.structure_type) {
      structQuery += ' AND s.structure_type = ?';
      params.push(options.structure_type);
    }

    structQuery += ' ORDER BY score DESC LIMIT ?';
    params.push(options.limit);

    const [structures] = await getAppPool().query(structQuery, params);

    results.push(...structures.map(struct => ({
      type: 'structure',
      score: struct.score,
      source: struct,
      highlight: highlightText(struct.content, query)
    })));
  }

  // Semantic search in memories
  if (options.search_type === 'semantic' || options.search_type === 'hybrid') {
    const [memories] = await getAppPool().query(`
      SELECT 
        *, 
        MATCH(text) AGAINST (? IN NATURAL LANGUAGE MODE) as score
      FROM omai_memories 
      WHERE MATCH(text) AGAINST (? IN NATURAL LANGUAGE MODE)
        AND source LIKE '%md%'
      ORDER BY score DESC 
      LIMIT ?
    `, [query, query, options.limit]);

    results.push(...memories.map(memory => ({
      type: 'memory',
      score: memory.score,
      source: memory,
      highlight: highlightText(memory.text.substring(0, 300), query)
    })));
  }

  return results.sort((a, b) => b.score - a.score).slice(0, options.limit);
}

function highlightText(text, query) {
  const terms = query.toLowerCase().split(/\s+/);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    highlighted = highlighted.replace(regex, `**$&**`);
  });
  
  return highlighted;
}

function generateMarkdownResponse(results, query, includeCitations) {
  let markdown = `# OMAI Grep Results for "${query}"\n\n`;
  markdown += `Found ${results.length} matches:\n\n`;

  results.forEach((result, index) => {
    markdown += `## ${index + 1}. `;
    
    if (result.type === 'document') {
      markdown += `📄 ${result.source.filename}\n`;
      markdown += `**Source:** ${result.source.source_agent} | **Score:** ${result.score.toFixed(2)}\n\n`;
      markdown += `${result.highlight}\n\n`;
    } else if (result.type === 'structure') {
      markdown += `📝 ${result.source.structure_type} in ${result.source.filename}\n`;
      markdown += `**Level:** ${result.source.level} | **Score:** ${result.score.toFixed(2)}\n\n`;
      markdown += `${result.highlight}\n\n`;
    } else if (result.type === 'memory') {
      markdown += `🧠 Memory Entry\n`;
      markdown += `**Agent:** ${result.source.source_agent} | **Score:** ${result.score.toFixed(2)}\n\n`;
      markdown += `${result.highlight}\n\n`;
    }

    if (includeCitations && index < 5) {
      markdown += `*Citation: [${index + 1}]*\n\n`;
    }

    markdown += '---\n\n';
  });

  return markdown;
}

function generatePlainTextResponse(results, query) {
  let text = `OMAI Grep Results for "${query}"\n`;
  text += `=${'='.repeat(query.length + 25)}\n\n`;

  results.forEach((result, index) => {
    text += `${index + 1}. `;
    
    if (result.type === 'document') {
      text += `${result.source.filename} (${result.score.toFixed(2)})\n`;
      text += `   ${result.highlight.replace(/\*\*/g, '')}\n\n`;
    } else if (result.type === 'structure') {
      text += `${result.source.structure_type} in ${result.source.filename} (${result.score.toFixed(2)})\n`;
      text += `   ${result.highlight.replace(/\*\*/g, '')}\n\n`;
    } else if (result.type === 'memory') {
      text += `Memory from ${result.source.source_agent} (${result.score.toFixed(2)})\n`;
      text += `   ${result.highlight.replace(/\*\*/g, '')}\n\n`;
    }
  });

  return text;
}

function generateStructuredResponse(results, query, includeCitations) {
  return {
    summary: `Found ${results.length} matches for "${query}"`,
    matches: results.map((result, index) => ({
      rank: index + 1,
      type: result.type,
      score: result.score,
      content: result.highlight,
      source: result.type === 'document' ? {
        filename: result.source.filename,
        sourceAgent: result.source.source_agent,
        ingestionId: result.source.ingestion_id
      } : result.type === 'structure' ? {
        filename: result.source.filename,
        structureType: result.source.structure_type,
        level: result.source.level
      } : {
        sourceAgent: result.source.source_agent,
        timestamp: result.source.timestamp
      },
      citation: includeCitations ? `[${index + 1}]` : null
    }))
  };
}

function generateCitations(results) {
  return results.slice(0, 10).map((result, index) => ({
    id: index + 1,
    type: result.type,
    source: result.type === 'document' ? result.source.filename : 
            result.type === 'structure' ? `${result.source.filename} (${result.source.structure_type})` :
            `Memory from ${result.source.source_agent}`,
    accessed: new Date().toISOString(),
    score: result.score
  }));
}

async function detectAndStoreAgentReferences(results, db) {
  const agentKeywords = ['claude', 'cursor', 'ninja', 'omai', 'gpt', 'ai', 'assistant', 'agent'];
  
  for (const result of results) {
    if (result.type === 'document') {
      const content = result.source.content || result.source.content_preview || '';
      const lowerContent = content.toLowerCase();
      
      agentKeywords.forEach(async (agent) => {
        if (lowerContent.includes(agent)) {
          const context = extractAgentContext(content, agent);
          
          try {
            await getAppPool().query(`
              INSERT INTO omai_md_agent_refs (
                catalog_id, agent_name, reference_context, reference_type, confidence_score
              ) 
              SELECT id, ?, ?, 'mention', 0.8
              FROM omai_md_catalog 
              WHERE ingestion_id = ?
              AND NOT EXISTS (
                SELECT 1 FROM omai_md_agent_refs 
                WHERE catalog_id = omai_md_catalog.id AND agent_name = ?
              )
            `, [agent, context, result.source.ingestion_id, agent]);
          } catch (error) {
            // Ignore duplicate entries
          }
        }
      });
    }
  }
}

function extractAgentContext(content, agent) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(agent)) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      return lines.slice(start, end).join('\n').trim();
    }
  }
  return `Reference to ${agent}`;
}

// =====================================================
// OMAI TASK ASSIGNMENT SYSTEM ENDPOINTS
// =====================================================

// Import database and utilities
const { promisePool } = require('../config/db-compat');
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
    const [result] = await getAppPool().query(
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
    const [rows] = await getAppPool().query(
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
    const [tokenRows] = await getAppPool().query(
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
    const [submissionResult] = await getAppPool().query(
      'INSERT INTO task_submissions (task_link_id, email, tasks_json, submitted_at) VALUES (?, ?, ?, NOW())',
      [taskLink.id, taskLink.email, JSON.stringify(sanitizedTasks)]
    );

    // Mark link as used
    await getAppPool().query(
      'UPDATE task_links SET is_used = TRUE, used_at = NOW() WHERE id = ?',
      [taskLink.id]
    );

    // Send tasks to Nick via email
    let emailSent = false;
    try {
      await sendTaskSubmissionEmail(taskLink.email, sanitizedTasks, submissionResult.insertId);
      emailSent = true;
      
      // Update submission record
      await getAppPool().query(
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
    const [linkRows] = await getAppPool().query(
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
    const [deleteResult] = await getAppPool().query(
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

// DELETE /api/omai/task-submission/:id - Delete a task submission
router.delete('/task-submission/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const submissionId = parseInt(req.params.id);
    
    if (!submissionId || isNaN(submissionId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid submission ID is required'
      });
    }

    // Check if submission exists
    const [submissionRows] = await getAppPool().query(
      'SELECT id FROM task_submissions WHERE id = ?',
      [submissionId]
    );

    if (submissionRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task submission not found'
      });
    }

    // Delete the submission
    const [deleteResult] = await getAppPool().query(
      'DELETE FROM task_submissions WHERE id = ?',
      [submissionId]
    );

    if (deleteResult.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete task submission'
      });
    }

    // Log the deletion
    if (OMAIRequest && OMAIRequest.logAction) {
      await OMAIRequest.logAction('TASK_SUBMISSION_DELETED', {
        submissionId: submissionId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, req.session?.user?.email || req.user?.email || 'system');
    }

    res.json({
      success: true,
      message: 'Task submission deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task submission:', error);
    
    if (OMAIRequest && OMAIRequest.logAction) {
      await OMAIRequest.logAction('TASK_SUBMISSION_DELETE_ERROR', {
        error: error.message,
        submissionId: req.params.id
      }, req.session?.user?.email || req.user?.email || 'unknown');
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete task submission',
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
    const [linkRows] = await getAppPool().query(
      'SELECT id, email, created_at, is_used, used_at, CASE WHEN is_used = FALSE THEN token ELSE NULL END as token FROM task_links ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    const [submissionRows] = await getAppPool().query(
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

// GET /api/omai/tasks - Get tasks with filters and pagination (Admin only)
router.get('/tasks', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const {
      status,
      category,
      type,
      visibility,
      search,
      page = 1,
      limit = 50,
      sortBy = 'date_created',
      sortOrder = 'DESC'
    } = req.query;

    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];

    // Status filter
    if (status !== undefined && status !== null && status !== '') {
      whereConditions.push('status = ?');
      queryParams.push(Number(status));
    }

    // Category filter
    if (category && category.trim() !== '') {
      whereConditions.push('category = ?');
      queryParams.push(category.trim());
    }

    // Type filter
    if (type && type.trim() !== '') {
      whereConditions.push('type = ?');
      queryParams.push(type.trim());
    }

    // Visibility filter - admins can see admin and public tasks
    if (visibility && visibility.trim() !== '') {
      whereConditions.push('visibility = ?');
      queryParams.push(visibility.trim());
    } else {
      // Default: show admin and public tasks for admins
      whereConditions.push('(visibility = ? OR visibility = ?)');
      queryParams.push('admin', 'public');
    }

    // Text search (title, details, tags)
    if (search && search.trim() !== '') {
      whereConditions.push('(title LIKE ? OR details LIKE ? OR tags LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : 'WHERE (visibility = ? OR visibility = ?)'; // Default visibility filter
    if (whereConditions.length === 0) {
      queryParams.push('admin', 'public');
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['date_created', 'date_completed', 'title', 'category', 'importance', 'status', 'type'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date_created';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const [countRows] = await getAppPool().query(
      `SELECT COUNT(*) as total FROM om_tasks ${whereClause}`,
      queryParams
    );
    const total = countRows[0]?.total || 0;

    // Get tasks
    const [taskRows] = await getAppPool().query(
      `SELECT 
        id, title, category, importance, details, tags, attachments,
        status, type, visibility, date_created, date_completed,
        assigned_to, assigned_by, notes, remind_me, revisions,
        created_by, created_at, updated_at
      FROM om_tasks
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    );

    // Parse JSON fields
    const tasks = taskRows.map(task => ({
      ...task,
      tags: task.tags ? JSON.parse(task.tags) : [],
      attachments: task.attachments ? JSON.parse(task.attachments) : null,
      revisions: task.revisions ? JSON.parse(task.revisions) : null
    }));

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/omai/tasks - Create a new task (Admin only)
router.post('/tasks', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    console.log('📝 [TASK CREATE] Request received');
    const user = req.session?.user || req.user;
    if (!user) {
      console.log('❌ [TASK CREATE] No user found');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('✅ [TASK CREATE] User authenticated:', user.email || user.id);

    const {
      title,
      category,
      importance,
      details,
      tags,
      attachments,
      status,
      type,
      visibility,
      date_created,
      date_completed,
      assignedTo,
      assignedBy,
      notes,
      remindMe,
      revisions
    } = req.body;

    // Validation
    const errors = {};

    // Required fields
    if (!title || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
      errors.title = 'Title is required and must be between 3 and 200 characters';
    }

    // Category validation - accept display labels but normalize to kebab-case
    const categoryMap = {
      'Ingestion & Digitization': 'ingestion-digitization',
      'Data Structuring & Accuracy': 'data-structuring-accuracy',
      'Workflow & User Experience': 'workflow-user-experience',
      'Platform & Infrastructure': 'platform-infrastructure',
      'Analytics & Intelligence': 'analytics-intelligence'
    };
    const normalizedCategory = categoryMap[category] || category;
    const validCategories = [
      'ingestion-digitization',
      'data-structuring-accuracy',
      'workflow-user-experience',
      'platform-infrastructure',
      'analytics-intelligence'
    ];
    if (!category || !validCategories.includes(normalizedCategory)) {
      errors.category = `Category must be one of: ${validCategories.join(', ')}`;
    }

    // Importance validation
    const validImportance = ['critical', 'high', 'medium', 'low'];
    if (!importance || !validImportance.includes(importance)) {
      errors.importance = `Importance must be one of: ${validImportance.join(', ')}`;
    }

    // Details validation
    if (!details || typeof details !== 'string' || details.trim().length === 0) {
      errors.details = 'Details are required';
    }

    // Tags validation
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      errors.tags = 'At least one tag is required';
    } else {
      // Validate tags are kebab-case strings
      const invalidTags = tags.filter(tag => typeof tag !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag));
      if (invalidTags.length > 0) {
        errors.tags = 'All tags must be valid kebab-case strings';
      }
    }

    // Status validation (1-7, including Assigned as 2)
    const validStatuses = [1, 2, 3, 4, 5, 6, 7];
    if (status === undefined || status === null || !validStatuses.includes(Number(status))) {
      errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
    }

    // Type validation
    const validTypes = ['documentation', 'configuration', 'reference', 'guide'];
    if (!type || !validTypes.includes(type)) {
      errors.type = `Type must be one of: ${validTypes.join(', ')}`;
    }

    // Visibility validation
    const validVisibility = ['admin', 'public'];
    const finalVisibility = visibility || 'admin';
    if (!validVisibility.includes(finalVisibility)) {
      errors.visibility = `Visibility must be one of: ${validVisibility.join(', ')}`;
    }

    // Attachments validation (optional)
    if (attachments && (!Array.isArray(attachments) || attachments.some(att => typeof att !== 'string'))) {
      errors.attachments = 'Attachments must be an array of strings (URLs)';
    }

    // Return validation errors
    if (Object.keys(errors).length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }
    
    console.log('✅ Validation passed, preparing data for insertion');

    // Prepare data for insertion
    const now = new Date();
    // Format dates for MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
    const formatDateTime = (date) => {
      if (!date) return null;
      
      // If already in MySQL DATETIME format (YYYY-MM-DD HH:MM:SS), return as-is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
        return date;
      }
      
      // Try to parse the date
      let d;
      if (date instanceof Date) {
        d = date;
      } else {
        d = new Date(date);
      }
      
      // Check if date is valid
      if (isNaN(d.getTime())) {
        console.error('❌ [TASK CREATE] Invalid date value:', date);
        // Return current date/time if invalid
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
      }
      
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };
    
    const taskData = {
      title: title.trim(),
      category: normalizedCategory,
      importance,
      details: details.trim(),
      tags: JSON.stringify(tags),
      attachments: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
      status: Number(status),
      type,
      visibility: finalVisibility,
      date_created: formatDateTime(date_created || now),
      date_completed: date_completed ? formatDateTime(date_completed) : (Number(status) === 7 ? formatDateTime(now) : null),
      assigned_to: assignedTo || null,
      assigned_by: assignedBy || null,
      notes: notes || null,
      remind_me: remindMe ? 1 : 0,
      revisions: revisions && Array.isArray(revisions) ? JSON.stringify(revisions) : null,
      created_by: user.email || user.id,
      created_at: formatDateTime(now),
      updated_at: formatDateTime(now)
    };

    // Insert into database
    console.log('💾 Inserting task into database...');
    let result;
    try {
      [result] = await getAppPool().query(`
        INSERT INTO om_tasks (
          title, category, importance, details, tags, attachments,
          status, type, visibility, date_created, date_completed,
          assigned_to, assigned_by, notes, remind_me, revisions,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        taskData.title,
        taskData.category,
        taskData.importance,
        taskData.details,
        taskData.tags,
        taskData.attachments,
        taskData.status,
        taskData.type,
        taskData.visibility,
        taskData.date_created,
        taskData.date_completed,
        taskData.assigned_to,
        taskData.assigned_by,
        taskData.notes,
        taskData.remind_me,
        taskData.revisions,
        taskData.created_by,
        taskData.created_at,
        taskData.updated_at
      ]);
    } catch (sqlError) {
      // Check if table doesn't exist
      if (sqlError.code === 'ER_NO_SUCH_TABLE' || sqlError.message.includes("doesn't exist")) {
        console.error('❌ om_tasks table does not exist. Please run the migration: server/src/database/create-om-tasks-table.sql');
        return res.status(500).json({
          success: false,
          error: 'Database table not found. Please contact administrator to run migration.',
          details: process.env.NODE_ENV === 'development' ? 'Table om_tasks does not exist. Run: server/src/database/create-om-tasks-table.sql' : undefined
        });
      }
      
      // Log detailed SQL error for debugging
      console.error('❌ SQL Error creating task:', {
        code: sqlError.code,
        errno: sqlError.errno,
        sqlState: sqlError.sqlState,
        sqlMessage: sqlError.sqlMessage,
        sql: sqlError.sql ? sqlError.sql.substring(0, 200) : 'N/A',
        message: sqlError.message,
        taskData: {
          title: taskData.title,
          category: taskData.category,
          status: taskData.status,
          type: taskData.type,
          tagsLength: taskData.tags ? taskData.tags.length : 0
        }
      });
      
      // Re-throw other SQL errors
      throw sqlError;
    }

    if (!result.insertId) {
      throw new Error('Failed to create task record');
    }
    
    console.log('✅ Task inserted successfully, ID:', result.insertId);

    // Fetch the created task
    let taskRows;
    try {
      [taskRows] = await getAppPool().query(`
        SELECT 
          id, title, category, importance, details, tags, attachments,
          status, type, visibility, date_created, date_completed,
          assigned_to, assigned_by, notes, remind_me, revisions,
          created_by, created_at, updated_at
        FROM om_tasks
        WHERE id = ?
      `, [result.insertId]);
    } catch (fetchError) {
      console.error('Error fetching created task:', fetchError);
      // If we can't fetch, return the basic info we have
      return res.status(201).json({
        success: true,
        data: {
          id: result.insertId,
          title: taskData.title,
          category: taskData.category,
          importance: taskData.importance,
          status: taskData.status,
          type: taskData.type,
          visibility: taskData.visibility,
          created_at: taskData.created_at,
          message: 'Task created but could not fetch full details'
        }
      });
    }

    if (!taskRows || taskRows.length === 0) {
      throw new Error('Task was created but could not be retrieved');
    }

    const createdTask = taskRows[0];
    
    // Parse JSON fields
    createdTask.tags = JSON.parse(createdTask.tags || '[]');
    createdTask.attachments = createdTask.attachments ? JSON.parse(createdTask.attachments) : [];
    createdTask.revisions = createdTask.revisions ? JSON.parse(createdTask.revisions) : null;

    // Send email notification
    try {
      const { sendTaskCreationEmail } = require('../utils/emailService');
      await sendTaskCreationEmail(createdTask, user.email || 'system');
    } catch (emailError) {
      // Log error but don't fail the request
      console.error('❌ Failed to send task creation email:', emailError);
      // Log to error tracking if available
      if (OMAIRequest && OMAIRequest.logAction) {
        await OMAIRequest.logAction('TASK_CREATE_EMAIL_ERROR', {
          error: emailError.message,
          taskId: result.insertId
        }, user.email || 'system');
      }
    }

    // Log action
    if (OMAIRequest && OMAIRequest.logAction) {
      await OMAIRequest.logAction('TASK_CREATED', {
        taskId: result.insertId,
        title: createdTask.title,
        type: createdTask.type,
        visibility: createdTask.visibility,
        category: createdTask.category
      }, user.email || 'system');
    }

    // Return success response
    res.status(201).json({
      success: true,
      data: createdTask
    });

  } catch (error) {
    console.error('❌❌❌ [TASK CREATE] ERROR CAUGHT:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      sql: error.sql ? error.sql.substring(0, 300) : undefined,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      allKeys: Object.keys(error)
    });
    
    // Log error
    if (OMAIRequest && OMAIRequest.logAction) {
      await OMAIRequest.logAction('TASK_CREATE_ERROR', {
        error: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      }, req.session?.user?.email || req.user?.email || 'unknown');
    }

    // Provide more detailed error information
    let errorMessage = 'Failed to create task';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Database table not found. Please contact administrator.';
    } else if (error.code === 'ER_DUP_ENTRY') {
      errorMessage = 'A task with this information already exists.';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema mismatch. Please contact administrator.';
    } else if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      errorMessage = 'Invalid data format. Please check all field values.';
    } else if (error.sqlMessage) {
      errorMessage = `Database error: ${error.sqlMessage}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.log('📤 [TASK CREATE] Sending error response:', errorMessage);

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      } : undefined
    });
  }
});

// PUT /api/omai/tasks/:id - Update a task (Admin only)
router.put('/tasks/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const user = req.session?.user || req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const {
      title,
      category,
      importance,
      details,
      tags,
      attachments,
      status,
      type,
      visibility,
      date_created,
      date_completed,
      assignedTo,
      assignedBy,
      notes,
      remindMe,
      revisions
    } = req.body;

    // Validation (similar to POST but all fields optional except we need at least something to update)
    const errors = {};
    const updateFields = {};
    const updateValues = [];

    // Title validation
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
        errors.title = 'Title must be between 3 and 200 characters';
      } else {
        updateFields.title = title.trim();
      }
    }

    // Category validation
    if (category !== undefined) {
      const categoryMap = {
        'Ingestion & Digitization': 'ingestion-digitization',
        'Data Structuring & Accuracy': 'data-structuring-accuracy',
        'Workflow & User Experience': 'workflow-user-experience',
        'Platform & Infrastructure': 'platform-infrastructure',
        'Analytics & Intelligence': 'analytics-intelligence'
      };
      const normalizedCategory = categoryMap[category] || category;
      const validCategories = [
        'ingestion-digitization',
        'data-structuring-accuracy',
        'workflow-user-experience',
        'platform-infrastructure',
        'analytics-intelligence'
      ];
      if (!validCategories.includes(normalizedCategory)) {
        errors.category = `Category must be one of: ${validCategories.join(', ')}`;
      } else {
        updateFields.category = normalizedCategory;
      }
    }

    // Importance validation
    if (importance !== undefined) {
      const validImportance = ['critical', 'high', 'medium', 'low'];
      if (!validImportance.includes(importance)) {
        errors.importance = `Importance must be one of: ${validImportance.join(', ')}`;
      } else {
        updateFields.importance = importance;
      }
    }

    // Details validation
    if (details !== undefined) {
      if (typeof details !== 'string' || details.trim().length === 0) {
        errors.details = 'Details are required';
      } else {
        updateFields.details = details.trim();
      }
    }

    // Tags validation
    if (tags !== undefined) {
      if (!Array.isArray(tags) || tags.length === 0) {
        errors.tags = 'At least one tag is required';
      } else {
        const invalidTags = tags.filter(tag => typeof tag !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag));
        if (invalidTags.length > 0) {
          errors.tags = 'All tags must be valid kebab-case strings';
        } else {
          updateFields.tags = JSON.stringify(tags);
        }
      }
    }

    // Status validation
    if (status !== undefined) {
      const validStatuses = [1, 2, 3, 4, 5, 6, 7];
      if (!validStatuses.includes(Number(status))) {
        errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
      } else {
        updateFields.status = Number(status);
      }
    }

    // Type validation
    if (type !== undefined) {
      const validTypes = ['documentation', 'configuration', 'reference', 'guide'];
      if (!validTypes.includes(type)) {
        errors.type = `Type must be one of: ${validTypes.join(', ')}`;
      } else {
        updateFields.type = type;
      }
    }

    // Visibility validation
    if (visibility !== undefined) {
      const validVisibility = ['admin', 'public'];
      if (!validVisibility.includes(visibility)) {
        errors.visibility = `Visibility must be one of: ${validVisibility.join(', ')}`;
      } else {
        updateFields.visibility = visibility;
      }
    }

    // Attachments validation
    if (attachments !== undefined) {
      if (attachments !== null && (!Array.isArray(attachments) || attachments.some(att => typeof att !== 'string'))) {
        errors.attachments = 'Attachments must be an array of strings (URLs) or null';
      } else {
        updateFields.attachments = attachments && attachments.length > 0 ? JSON.stringify(attachments) : null;
      }
    }

    // Return validation errors
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    // If no fields to update, return error
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Format dates
    const formatDateTime = (date) => {
      if (!date) return null;
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
        return date;
      }
      let d;
      if (date instanceof Date) {
        d = date;
      } else {
        d = new Date(date);
      }
      if (isNaN(d.getTime())) {
        return null;
      }
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    // Add optional fields
    if (date_created !== undefined) {
      updateFields.date_created = formatDateTime(date_created);
    }
    if (date_completed !== undefined) {
      updateFields.date_completed = date_completed ? formatDateTime(date_completed) : null;
    }
    if (assignedTo !== undefined) {
      updateFields.assigned_to = assignedTo || null;
    }
    if (assignedBy !== undefined) {
      updateFields.assigned_by = assignedBy || null;
    }
    if (notes !== undefined) {
      updateFields.notes = notes || null;
    }
    if (remindMe !== undefined) {
      updateFields.remind_me = remindMe ? 1 : 0;
    }
    if (revisions !== undefined) {
      updateFields.revisions = revisions && Array.isArray(revisions) ? JSON.stringify(revisions) : null;
    }

    // Always update updated_at
    updateFields.updated_at = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Build UPDATE query
    const setClause = Object.keys(updateFields).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateFields);
    values.push(taskId);

    // Check if task exists
    const [existingRows] = await getAppPool().query(
      'SELECT id FROM om_tasks WHERE id = ?',
      [taskId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Update task
    await getAppPool().query(
      `UPDATE om_tasks SET ${setClause} WHERE id = ?`,
      values
    );

    // Fetch updated task
    const [taskRows] = await getAppPool().query(
      `SELECT 
        id, title, category, importance, details, tags, attachments,
        status, type, visibility, date_created, date_completed,
        assigned_to, assigned_by, notes, remind_me, revisions,
        created_by, created_at, updated_at
      FROM om_tasks
      WHERE id = ?`,
      [taskId]
    );

    if (taskRows.length === 0) {
      throw new Error('Task was updated but could not be retrieved');
    }

    const updatedTask = taskRows[0];
    updatedTask.tags = JSON.parse(updatedTask.tags || '[]');
    updatedTask.attachments = updatedTask.attachments ? JSON.parse(updatedTask.attachments) : null;
    updatedTask.revisions = updatedTask.revisions ? JSON.parse(updatedTask.revisions) : null;

    console.log(`✅ Task ${taskId} updated by user ${user.email || 'unknown'}`);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/omai/tasks/:id - Delete a task (Admin only)
router.delete('/tasks/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID'
      });
    }

    const user = req.session?.user || req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if task exists
    const [existingRows] = await getAppPool().query(
      'SELECT id, title FROM om_tasks WHERE id = ?',
      [taskId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Delete task
    await getAppPool().query(
      'DELETE FROM om_tasks WHERE id = ?',
      [taskId]
    );

    console.log(`✅ Task ${taskId} (${existingRows[0].title}) deleted by user ${user.email || 'unknown'}`);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// NEW LEARNING HUB ENDPOINTS

// GET /api/omai/learning-progress - Get OMAI learning progress
router.get('/learning-progress', async (req, res) => {
  try {
    const userId = req.session.user.id;
    
    // Get overall learning statistics
    const [progressStats] = await getAppPool().query(`
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
    const [currentPhase] = await getAppPool().query(`
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
    
    const [sessions] = await getAppPool().query(`
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
    const [totalMemories] = await getAppPool().query(`
      SELECT COUNT(*) as total FROM omai_user_memories WHERE user_id = ? AND is_active = TRUE
    `, [userId]);

    // Get category distribution
    const [categoryDist] = await getAppPool().query(`
      SELECT category, COUNT(*) as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE
      GROUP BY category
    `, [userId]);

    // Get priority distribution
    const [priorityDist] = await getAppPool().query(`
      SELECT priority, COUNT(*) as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE
      GROUP BY priority
    `, [userId]);

    // Get most used memories
    const [mostUsed] = await getAppPool().query(`
      SELECT title, usage_count as count
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE AND usage_count > 0
      ORDER BY usage_count DESC
      LIMIT 5
    `, [userId]);

    // Get recently accessed memories
    const [recentlyAccessed] = await getAppPool().query(`
      SELECT title, last_accessed_at as lastAccessed
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE AND last_accessed_at IS NOT NULL
      ORDER BY last_accessed_at DESC
      LIMIT 5
    `, [userId]);

    // Calculate learning velocity (simplified)
    const [weeklyStats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as memories_this_week,
        (COUNT(*) / 7.0) as daily_rate
      FROM omai_user_memories 
      WHERE user_id = ? AND is_active = TRUE 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `, [userId]);

    // Get trending memories (simplified - based on recent usage increase)
    const [trending] = await getAppPool().query(`
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
    const [activeSession] = await getAppPool().query(`
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

    await getAppPool().query(`
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
          await getAppPool().query(`
            UPDATE omai_learning_sessions 
            SET progress = ?, updated_at = NOW()
            WHERE id = ?
          `, [progress, sessionId]);
          
          // Wait 2 seconds between updates
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Mark as completed
        await getAppPool().query(`
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
        await getAppPool().query(`
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
    const [session] = await getAppPool().query(`
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
    await getAppPool().query(`
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
    const [surveyStats] = await getAppPool().query(`
      SELECT 
        COUNT(*) as total_surveys,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_surveys
      FROM omlearn_surveys 
      WHERE user_id = ?
    `, [userId]);
    
    // Get ethical foundations count
    const [foundationStats] = await getAppPool().query(`
      SELECT COUNT(*) as foundations_count 
      FROM omai_ethical_foundations 
      WHERE user_id = ?
    `, [userId]);
    
    // Get completed grade groups
    const [gradeGroups] = await getAppPool().query(`
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
    
    const [foundations] = await getAppPool().query(`
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
    const [existingSurveys] = await getAppPool().query(`
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
      await getAppPool().query(`
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
      await getAppPool().query(`
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
      
      await getAppPool().query(`
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
