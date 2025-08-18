const fs = require('fs').promises;
const path = require('path');

// Import the correct OMAI orchestrator (temporarily disabled)
// const { OMAIOrchestrator } = require('/var/www/orthodoxmetrics_db/dev/misc/omai/services/orchestrator');

class OMAIBackgroundService {
  constructor() {
    // this.orchestrator = new OMAIOrchestrator();
    // Mock orchestrator for now
    const mockAgents = [];
    this.orchestrator = {
      runAgent: async (agentId, params) => {
        console.log(`[MOCK] Running agent ${agentId} with params:`, params);
        return { success: true, message: 'Mock agent execution' };
      },
      getStatus: () => ({ isRunning: false, status: 'disabled' }),
      initialize: async () => {
        console.log('[MOCK] Orchestrator initialized');
        return true;
      },
      getAgents: () => {
        return mockAgents;
      },
      registerAgent: (agent) => {
        console.log(`[MOCK] Registering agent: ${agent.name}`);
        mockAgents.push(agent);
        return true;
      }
    };
    this.isRunning = false;
    this.scheduler = null;
    this.logDir = '/var/log/orthodoxmetrics';
    this.logFile = path.join(this.logDir, 'omai.log');
  }

  /**
   * Initialize the background service
   */
  async initialize() {
    try {
      // Ensure log directory exists
      await this.ensureLogDirectory();
      
      // Initialize orchestrator
      await this.orchestrator.initialize();
      
      // Register all agents
      await this.registerAgents();
      
      this.log('OMAI Background Service initialized successfully');
      return true;
    } catch (error) {
      this.log(`Failed to initialize OMAI Background Service: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Start the background scheduler
   */
  async startScheduler(intervalMinutes = 30) {
    if (this.isRunning) {
      this.log('Scheduler is already running');
      return;
    }

    try {
      this.isRunning = true;
      const intervalMs = intervalMinutes * 60 * 1000;
      
      this.log(`Starting OMAI scheduler with ${intervalMinutes} minute intervals`);
      
      // Run initial check
      await this.runScheduledTasks();
      
      // Set up recurring schedule
      this.scheduler = setInterval(async () => {
        await this.runScheduledTasks();
      }, intervalMs);
      
      this.log('OMAI scheduler started successfully');
    } catch (error) {
      this.isRunning = false;
      this.log(`Failed to start scheduler: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Stop the background scheduler
   */
  async stopScheduler() {
    if (!this.isRunning) {
      this.log('Scheduler is not running');
      return;
    }

    try {
      if (this.scheduler) {
        clearInterval(this.scheduler);
        this.scheduler = null;
      }
      
      this.isRunning = false;
      this.log('OMAI scheduler stopped');
    } catch (error) {
      this.log(`Failed to stop scheduler: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  /**
   * Run scheduled tasks
   */
  async runScheduledTasks() {
    try {
      this.log('Running scheduled OMAI tasks');
      
      // Run learning tasks
      await this.runLearningTasks();
      
      this.log('Scheduled OMAI tasks completed');
    } catch (error) {
      this.log(`Scheduled tasks failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Run learning tasks
   */
  async runLearningTasks() {
    try {
      // Run knowledge indexing
      await this.runKnowledgeIndexing();
      
      // Run pattern analysis
      await this.runPatternAnalysis();
      
      // Update agent metrics
      await this.updateAgentMetrics();
      
    } catch (error) {
      this.log(`Learning tasks failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Run knowledge indexing
   */
  async runKnowledgeIndexing() {
    try {
      this.log('Running knowledge indexing');
      
      // Index new files in the codebase
      const codebasePath = path.join(__dirname, '..', '..');
      await this.indexCodebase(codebasePath);
      
      // Index documentation
      const docsPath = path.join(__dirname, '..', '..', 'docs');
      await this.indexDocumentation(docsPath);
      
      this.log('Knowledge indexing completed');
    } catch (error) {
      this.log(`Knowledge indexing failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Index codebase files
   */
  async indexCodebase(basePath) {
    try {
      const extensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.md'];
      const files = await this.scanDirectory(basePath, extensions);
      
      for (const file of files) {
        await this.indexFile(file);
      }
    } catch (error) {
      this.log(`Codebase indexing failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Index documentation
   */
  async indexDocumentation(docsPath) {
    try {
      const files = await this.scanDirectory(docsPath, ['.md', '.txt']);
      
      for (const file of files) {
        await this.indexFile(file);
      }
    } catch (error) {
      this.log(`Documentation indexing failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Scan directory for files with specific extensions
   */
  async scanDirectory(dirPath, extensions) {
    const files = [];
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Skip node_modules and other large directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(item.name)) {
            const subFiles = await this.scanDirectory(fullPath, extensions);
            files.push(...subFiles);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors or missing directories
      this.log(`Could not scan directory ${dirPath}: ${error.message}`, 'WARN');
    }
    
    return files;
  }

  /**
   * Index a single file
   */
  async indexFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      // TODO: Implement actual file indexing with embeddings
      this.log(`Indexed file: ${relativePath}`);
    } catch (error) {
      this.log(`Failed to index file ${filePath}: ${error.message}`, 'WARN');
    }
  }

  /**
   * Run pattern analysis
   */
  async runPatternAnalysis() {
    try {
      this.log('Running pattern analysis');
      
      // Analyze recent logs for patterns
      await this.analyzeLogPatterns();
      
      // Analyze code patterns
      await this.analyzeCodePatterns();
      
      this.log('Pattern analysis completed');
    } catch (error) {
      this.log(`Pattern analysis failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Analyze log patterns
   */
  async analyzeLogPatterns() {
    try {
      // TODO: Implement log pattern analysis
      this.log('Log pattern analysis completed');
    } catch (error) {
      this.log(`Log pattern analysis failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Analyze code patterns
   */
  async analyzeCodePatterns() {
    try {
      // TODO: Implement code pattern analysis
      this.log('Code pattern analysis completed');
    } catch (error) {
      this.log(`Code pattern analysis failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Update agent metrics
   */
  async updateAgentMetrics() {
    try {
      this.log('Updating agent metrics');
      
      // Get current metrics
      const agents = this.orchestrator.getAgents();
      
      for (const agent of agents) {
        // Update agent performance metrics
        await this.updateAgentPerformance(agent);
      }
      
      this.log('Agent metrics updated');
    } catch (error) {
      this.log(`Agent metrics update failed: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Update agent performance metrics
   */
  async updateAgentPerformance(agent) {
    try {
      // TODO: Implement agent performance tracking
      this.log(`Updated metrics for agent: ${agent.name}`);
    } catch (error) {
      this.log(`Failed to update metrics for agent ${agent.name}: ${error.message}`, 'WARN');
    }
  }

  /**
   * Get active tenants
   */
  async getActiveTenants() {
    try {
      // TODO: Implement tenant discovery
      // For now, return a default list
      return ['default'];
    } catch (error) {
      this.log(`Failed to get active tenants: ${error.message}`, 'ERROR');
      return [];
    }
  }

  /**
   * Register all agents with the orchestrator
   */
  async registerAgents() {
    try {
      // Register stub agents for background service
      const stubAgents = [
        {
          id: 'omai-doc-bot',
          name: 'OMAI Documentation Bot',
          domain: 'documentation',
          capabilities: ['generate-docs', 'update-docs'],
          execute: async (context) => ({ success: true, result: 'Documentation generated' })
        },
        {
          id: 'omai-api-guardian',
          name: 'OMAI API Guardian',
          domain: 'api',
          capabilities: ['validate-api', 'monitor-endpoints'],
          execute: async (context) => ({ success: true, result: 'API validation completed' })
        },
        {
          id: 'schema-sentinel',
          name: 'Schema Sentinel',
          domain: 'database',
          capabilities: ['validate-schema', 'optimize-queries'],
          execute: async (context) => ({ success: true, result: 'Schema validation completed' })
        },
        {
          id: 'omai-mediator',
          name: 'OMAI Mediator',
          domain: 'coordination',
          capabilities: ['mediate-conflicts', 'coordinate-agents'],
          execute: async (context) => ({ success: true, result: 'Mediation completed' })
        },
        {
          id: 'omai-refactor',
          name: 'OMAI Refactor',
          domain: 'code',
          capabilities: ['refactor-code', 'optimize-performance'],
          execute: async (context) => ({ success: true, result: 'Refactoring completed' })
        }
      ];
      
      for (const agent of stubAgents) {
        this.orchestrator.registerAgent(agent);
      }
      
      this.log(`Registered ${stubAgents.length} stub agents`);
    } catch (error) {
      this.log(`Failed to register agents: ${error.message}`, 'ERROR');
    }
  }

  /**
   * Ensure log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      // If we can't create the system log directory, use a local one
      this.logDir = path.join(__dirname, '..', '..', 'logs');
      this.logFile = path.join(this.logDir, 'omai.log');
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Log message to file
   */
  async log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      // Fallback to console if file logging fails
      console.log(`[OMAI Background] ${logEntry.trim()}`);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      orchestratorStatus: this.orchestrator.getStatus(),
      logFile: this.logFile,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const omaiBackgroundService = new OMAIBackgroundService();

// Startup section for standalone execution
if (require.main === module) {
  console.log('🚀 Starting OMAI Background Service...');
  
  async function startService() {
    try {
      // Initialize the service
      const initialized = await omaiBackgroundService.initialize();
      if (!initialized) {
        console.error('❌ Failed to initialize OMAI Background Service');
        process.exit(1);
      }
      
      // Start the scheduler
      await omaiBackgroundService.startScheduler(30); // 30 minute intervals
      
      console.log('✅ OMAI Background Service started successfully');
      console.log('📊 Service will run scheduled tasks every 30 minutes');
      
      // Keep the process alive
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down OMAI Background Service...');
        await omaiBackgroundService.stopScheduler();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down OMAI Background Service...');
        await omaiBackgroundService.stopScheduler();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Failed to start OMAI Background Service:', error);
      process.exit(1);
    }
  }
  
  startService();
}

module.exports = omaiBackgroundService; 