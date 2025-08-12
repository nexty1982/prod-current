import fs from 'fs/promises';
import path from 'path';
import { OMAIAgent, OMAIAgentContext, OMAITaskResult, TenantStatusData, TaskData, GapReportData, AgentMetrics } from './agents/types';
import { dialogueEngine } from './dialogue/chat-engine';
import { contextSync } from './dialogue/context-sync';
import { dsilTranslator } from './dialogue/translator';
import { omaiMediator } from './agents/omai-mediator';

export class OMAIOrchestrator {
  private agents: Map<string, OMAIAgent> = new Map();
  private controlDir: string;
  private isRunning: boolean = false;
  private scheduler: NodeJS.Timeout | null = null;

  constructor() {
    this.controlDir = path.join(__dirname, 'control');
  }

  // Initialize dialogue system
  async initializeDialogueSystem(): Promise<void> {
    console.log('[OMAI] Initializing dialogue system...');
    
    // Register mediator agent
    this.registerAgent(omaiMediator);
    
    // Register all agents with the translator
    for (const [agentId, agent] of this.agents) {
      if (agent.capabilities) {
        dsilTranslator.registerAgentCapabilities(agentId, agent.capabilities);
      }
    }
    
    // Start dialogue engine
    await dialogueEngine.startDialogueEngine(this.agents);
    
    console.log('[OMAI] Dialogue system initialized');
  }

  // Register an agent with the orchestrator
  registerAgent(agent: OMAIAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`🔧 Registered agent: ${agent.name} (${agent.domain})`);
    
    // Register agent capabilities with translator if dialogue system is running
    if (agent.capabilities) {
      dsilTranslator.registerAgentCapabilities(agent.id, agent.capabilities);
    }
  }

  // Load control data from JSON files
  private async loadControlData(): Promise<{
    tenantStatus: TenantStatusData;
    tasks: TaskData;
    gaps: GapReportData;
    metrics: AgentMetrics;
  }> {
    try {
      const [tenantStatus, tasks, gaps, metrics] = await Promise.all([
        this.loadJSONFile('tenant-status.json'),
        this.loadJSONFile('tasks.json'),
        this.loadJSONFile('gap-report.json'),
        this.loadJSONFile('metrics.json')
      ]);

      return { tenantStatus, tasks, gaps, metrics };
    } catch (error) {
      console.error('❌ Failed to load control data:', error);
      throw error;
    }
  }

  // Save control data to JSON files
  private async saveControlData(data: {
    tenantStatus?: TenantStatusData;
    tasks?: TaskData;
    gaps?: GapReportData;
    metrics?: AgentMetrics;
  }): Promise<void> {
    const updates = [];
    
    if (data.tenantStatus) {
      updates.push(this.saveJSONFile('tenant-status.json', data.tenantStatus));
    }
    if (data.tasks) {
      updates.push(this.saveJSONFile('tasks.json', data.tasks));
    }
    if (data.gaps) {
      updates.push(this.saveJSONFile('gap-report.json', data.gaps));
    }
    if (data.metrics) {
      updates.push(this.saveJSONFile('metrics.json', data.metrics));
    }

    await Promise.all(updates);
  }

  // Load JSON file helper
  private async loadJSONFile(filename: string): Promise<any> {
    const filePath = path.join(this.controlDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  }

  // Save JSON file helper
  private async saveJSONFile(filename: string, data: any): Promise<void> {
    const filePath = path.join(this.controlDir, filename);
    const content = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  // Run a specific agent
  async runAgent(agentId: string, context: OMAIAgentContext): Promise<OMAITaskResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`🚀 Running agent: ${agent.name}`);
    const startTime = Date.now();

    try {
      const result = await agent.run(context);
      const duration = Date.now() - startTime;
      
      // Log the task
      await this.logTask(agentId, context, result, duration);
      
      // Update metrics
      await this.updateAgentMetrics(agentId, result, duration);
      
      console.log(`✅ Agent ${agent.name} completed in ${duration}ms`);
      return { ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: OMAITaskResult = {
        success: false,
        output: `Agent execution failed: ${error}`,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
      
      await this.logTask(agentId, context, errorResult, duration);
      await this.updateAgentMetrics(agentId, errorResult, duration);
      
      console.error(`❌ Agent ${agent.name} failed:`, error);
      return errorResult;
    }
  }

  // Log a task to the task tracking system
  private async logTask(
    agentId: string,
    context: OMAIAgentContext,
    result: OMAITaskResult,
    duration: number
  ): Promise<void> {
    const tasks = await this.loadJSONFile('tasks.json');
    
    const taskEntry = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agent: agentId,
      tenant: context.tenant,
      action: 'agent_execution',
      target: context.target || 'system',
      status: result.success ? 'completed' : 'failed',
      timestamp: new Date().toISOString(),
      result: {
        success: result.success,
        output: result.output,
        filesCreated: result.filesCreated,
        issuesFound: result.issuesFound,
        error: result.error
      },
      duration
    };

    tasks.tasks.push(taskEntry);
    tasks.metrics.totalTasks++;
    tasks.metrics.completedTasks += result.success ? 1 : 0;
    tasks.metrics.failedTasks += result.success ? 0 : 1;
    tasks.metrics.averageDuration = Math.round(
      (tasks.metrics.averageDuration * (tasks.metrics.totalTasks - 1) + duration) / tasks.metrics.totalTasks
    );
    tasks.metrics.successRate = Math.round((tasks.metrics.completedTasks / tasks.metrics.totalTasks) * 100 * 100) / 100;
    tasks.lastUpdated = new Date().toISOString();

    await this.saveJSONFile('tasks.json', tasks);
  }

  // Update agent metrics
  private async updateAgentMetrics(
    agentId: string,
    result: OMAITaskResult,
    duration: number
  ): Promise<void> {
    const metrics = await this.loadJSONFile('metrics.json');
    
    if (!metrics.agentMetrics[agentId]) {
      metrics.agentMetrics[agentId] = {
        tasksRun: 0,
        successRate: 0,
        averageDuration: 0,
        lastRun: new Date().toISOString(),
        commonFailures: [],
        topIssues: []
      };
    }

    const agentMetric = metrics.agentMetrics[agentId];
    agentMetric.tasksRun++;
    agentMetric.lastRun = new Date().toISOString();
    
    // Update success rate
    const totalSuccessful = Math.round((agentMetric.successRate * (agentMetric.tasksRun - 1)) / 100);
    const newSuccessful = totalSuccessful + (result.success ? 1 : 0);
    agentMetric.successRate = Math.round((newSuccessful / agentMetric.tasksRun) * 100 * 100) / 100;
    
    // Update average duration
    agentMetric.averageDuration = Math.round(
      (agentMetric.averageDuration * (agentMetric.tasksRun - 1) + duration) / agentMetric.tasksRun
    );

    // Update system metrics
    metrics.systemMetrics.totalTasksRun++;
    metrics.systemMetrics.overallSuccessRate = Math.round(
      (metrics.systemMetrics.overallSuccessRate * (metrics.systemMetrics.totalTasksRun - 1) + (result.success ? 100 : 0)) / metrics.systemMetrics.totalTasksRun
    );
    metrics.systemMetrics.averageTaskDuration = Math.round(
      (metrics.systemMetrics.averageTaskDuration * (metrics.systemMetrics.totalTasksRun - 1) + duration) / metrics.systemMetrics.totalTasksRun
    );
    metrics.systemMetrics.lastSystemCheck = new Date().toISOString();
    metrics.lastUpdated = new Date().toISOString();

    await this.saveJSONFile('metrics.json', metrics);
  }

  // Run all agents for a specific tenant
  async runTenantAudit(tenant: string): Promise<void> {
    console.log(`🔍 Running full audit for tenant: ${tenant}`);
    
    const controlData = await this.loadControlData();
    const context: OMAIAgentContext = {
      tenant,
      statusData: controlData.tenantStatus,
      gapData: controlData.gaps,
      taskData: controlData.tasks
    };

    const results = [];
    for (const [agentId, agent] of this.agents) {
      if (agent.domain === 'tenants' || agent.triggers.includes('schedule')) {
        results.push(this.runAgent(agentId, context));
      }
    }

    await Promise.all(results);
    console.log(`✅ Tenant audit completed for ${tenant}`);
  }

  // Run all agents for all tenants
  async runSystemAudit(): Promise<void> {
    console.log('🌐 Running system-wide audit');
    
    const controlData = await this.loadControlData();
    const tenants = Object.keys(controlData.tenantStatus.tenants);
    
    for (const tenant of tenants) {
      await this.runTenantAudit(tenant);
    }
    
    console.log('✅ System audit completed');
  }

  // Start the orchestrator scheduler
  startScheduler(intervalMinutes: number = 30): void {
    if (this.isRunning) {
      console.log('⚠️ Orchestrator scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log(`⏰ Starting orchestrator scheduler (${intervalMinutes}min intervals)`);
    
    this.scheduler = setInterval(async () => {
      try {
        await this.runSystemAudit();
      } catch (error) {
        console.error('❌ Scheduled audit failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  // Stop the orchestrator scheduler
  stopScheduler(): void {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
      this.isRunning = false;
      console.log('⏹️ Orchestrator scheduler stopped');
    }
  }

  // Get orchestrator status
  getStatus(): {
    isRunning: boolean;
    registeredAgents: number;
    agentDomains: string[];
  } {
    const domains = [...new Set(Array.from(this.agents.values()).map(agent => agent.domain))];
    
    return {
      isRunning: this.isRunning,
      registeredAgents: this.agents.size,
      agentDomains: domains
    };
  }

  // Get all registered agents
  getAgents(): OMAIAgent[] {
    return Array.from(this.agents.values());
  }

  // Get agents by domain
  getAgentsByDomain(domain: string): OMAIAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.domain === domain);
  }
}

// Export singleton instance
export const omaiOrchestrator = new OMAIOrchestrator(); 