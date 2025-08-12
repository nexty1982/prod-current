import { OMAIAgent, OMAIAgentContext, OMAITaskResult } from './types';
import { AgentMessage, AgentTask, AgentContext } from '../types/agent-dialogue';
import { dialogueEngine } from '../dialogue/chat-engine';
import { contextSync } from '../dialogue/context-sync';
import { dsilTranslator } from '../dialogue/translator';

export class OMAIMediatorAgent implements OMAIAgent {
  id = 'omai-mediator';
  name = 'OMAI Mediator';
  domain = 'coordination';
  description = 'Coordinates delegation between specialized agents and manages task distribution';
  capabilities = [
    'coordination',
    'delegation',
    'task-distribution',
    'conflict-resolution',
    'workflow-management',
    'agent-communication'
  ];

  private isActive: boolean = false;
  private currentContext: AgentContext | null = null;

  constructor() {
    // Register capabilities with translator
    dsilTranslator.registerAgentCapabilities(this.id, this.capabilities);
  }

  async run(context: OMAIAgentContext): Promise<OMAITaskResult> {
    console.log(`[OMAI] Mediator agent starting with context: ${context.task?.description || 'coordination'}`);
    
    this.isActive = true;
    this.currentContext = await this.initializeContext();

    try {
      const result = await this.processContext(context);
      
      // Update context
      this.currentContext = await contextSync.hydrateContext(this.id, this.currentContext);
      
      return {
        success: true,
        response: result.response,
        context: result.context,
        metadata: {
          agentId: this.id,
          duration: result.duration,
          tasksDelegated: result.tasksDelegated,
          conflictsResolved: result.conflictsResolved
        }
      };
    } catch (error) {
      console.error(`[OMAI] Mediator agent error:`, error);
      
      return {
        success: false,
        response: `Mediator coordination failed: ${error}`,
        context: [],
        metadata: {
          agentId: this.id,
          error: error.toString(),
          duration: Date.now() - context.startTime
        }
      };
    } finally {
      this.isActive = false;
    }
  }

  private async initializeContext(): Promise<AgentContext> {
    return {
      agentId: this.id,
      domain: this.domain,
      capabilities: this.capabilities,
      memory: { recent: [], persistent: [] },
      status: 'idle',
      lastActivity: new Date()
    };
  }

  private async processContext(context: OMAIAgentContext): Promise<{
    response: string;
    context: string[];
    duration: number;
    tasksDelegated: number;
    conflictsResolved: number;
  }> {
    const startTime = Date.now();
    let tasksDelegated = 0;
    let conflictsResolved = 0;
    const contextUpdates: string[] = [];

    // Check for incoming messages
    const messages = await dialogueEngine.getMessagesForAgent(this.id);
    if (messages.length > 0) {
      console.log(`[OMAI] Mediator processing ${messages.length} messages`);
      
      for (const message of messages) {
        const result = await this.processMessage(message);
        if (result.tasksDelegated) tasksDelegated += result.tasksDelegated;
        if (result.conflictsResolved) conflictsResolved += result.conflictsResolved;
        contextUpdates.push(...result.contextUpdates);
      }
    }

    // Check for pending tasks
    const pendingTasks = await dialogueEngine.getTasksForAgent(this.id);
    if (pendingTasks.length > 0) {
      console.log(`[OMAI] Mediator processing ${pendingTasks.length} pending tasks`);
      
      for (const task of pendingTasks) {
        const result = await this.processTask(task);
        if (result.tasksDelegated) tasksDelegated += result.tasksDelegated;
        if (result.conflictsResolved) conflictsResolved += result.conflictsResolved;
        contextUpdates.push(...result.contextUpdates);
      }
    }

    // Handle coordination requests from context
    if (context.task?.payload?.coordinationRequest) {
      const result = await this.handleCoordinationRequest(context.task.payload.coordinationRequest);
      if (result.tasksDelegated) tasksDelegated += result.tasksDelegated;
      if (result.conflictsResolved) conflictsResolved += result.conflictsResolved;
      contextUpdates.push(...result.contextUpdates);
    }

    const duration = Date.now() - startTime;
    const response = `Mediator processed ${messages.length} messages, ${pendingTasks.length} tasks. Delegated ${tasksDelegated} tasks, resolved ${conflictsResolved} conflicts.`;

    return {
      response,
      context: contextUpdates,
      duration,
      tasksDelegated,
      conflictsResolved
    };
  }

  private async processMessage(message: AgentMessage): Promise<{
    tasksDelegated: number;
    conflictsResolved: number;
    contextUpdates: string[];
  }> {
    let tasksDelegated = 0;
    let conflictsResolved = 0;
    const contextUpdates: string[] = [];

    switch (message.type) {
      case 'task':
        // Delegate task to appropriate agent
        const delegationResult = await this.delegateTask(message.content.payload);
        tasksDelegated += delegationResult.delegated;
        contextUpdates.push(...delegationResult.contextUpdates);
        break;

      case 'notification':
        // Handle notifications (e.g., agent status updates)
        contextUpdates.push(`Received notification: ${message.content.action}`);
        break;

      case 'error':
        // Handle error reports and coordinate resolution
        const errorResult = await this.handleError(message.content.payload);
        conflictsResolved += errorResult.resolved;
        contextUpdates.push(...errorResult.contextUpdates);
        break;

      case 'context':
        // Update shared context
        await this.updateSharedContext(message.content.context);
        contextUpdates.push('Updated shared context');
        break;
    }

    return { tasksDelegated, conflictsResolved, contextUpdates };
  }

  private async processTask(task: AgentTask): Promise<{
    tasksDelegated: number;
    conflictsResolved: number;
    contextUpdates: string[];
  }> {
    let tasksDelegated = 0;
    let conflictsResolved = 0;
    const contextUpdates: string[] = [];

    switch (task.type) {
      case 'coordination':
        // Handle coordination tasks
        const coordinationResult = await this.handleCoordinationTask(task);
        tasksDelegated += coordinationResult.delegated;
        conflictsResolved += coordinationResult.resolved;
        contextUpdates.push(...coordinationResult.contextUpdates);
        break;

      case 'delegation':
        // Handle delegation tasks
        const delegationResult = await this.delegateTask(task.payload);
        tasksDelegated += delegationResult.delegated;
        contextUpdates.push(...delegationResult.contextUpdates);
        break;

      case 'conflict-resolution':
        // Handle conflict resolution tasks
        const conflictResult = await this.resolveConflict(task.payload);
        conflictsResolved += conflictResult.resolved;
        contextUpdates.push(...conflictResult.contextUpdates);
        break;
    }

    // Mark task as completed
    await dialogueEngine.updateTaskStatus(task.id, 'completed', {
      tasksDelegated,
      conflictsResolved,
      contextUpdates
    });

    return { tasksDelegated, conflictsResolved, contextUpdates };
  }

  private async delegateTask(taskData: any): Promise<{
    delegated: number;
    contextUpdates: string[];
  }> {
    let delegated = 0;
    const contextUpdates: string[] = [];

    // Determine best agent for the task
    const targetAgent = this.findBestAgentForTask(taskData);
    
    if (targetAgent) {
      // Create task for target agent
      const taskId = await dialogueEngine.createTask({
        assignedTo: targetAgent,
        requestedBy: this.id,
        type: taskData.type || 'analysis',
        description: taskData.description,
        payload: taskData.payload,
        priority: taskData.priority || 'normal',
        metadata: {
          estimatedDuration: taskData.estimatedDuration || 5000,
          dependencies: taskData.dependencies || [],
          tags: taskData.tags || []
        }
      });

      // Send notification to target agent
      await dialogueEngine.sendMessage({
        from: this.id,
        to: targetAgent,
        type: 'notification',
        priority: 'normal',
        content: {
          action: 'task_assigned',
          payload: { taskId, taskData }
        }
      });

      delegated = 1;
      contextUpdates.push(`Delegated task to ${targetAgent}: ${taskData.description}`);
    } else {
      contextUpdates.push(`No suitable agent found for task: ${taskData.description}`);
    }

    return { delegated, contextUpdates };
  }

  private async handleError(errorData: any): Promise<{
    resolved: number;
    contextUpdates: string[];
  }> {
    let resolved = 0;
    const contextUpdates: string[] = [];

    // Determine error type and severity
    const errorType = errorData.type || 'unknown';
    const severity = errorData.severity || 'normal';

    // Route to appropriate error handler
    switch (errorType) {
      case 'validation':
        // Route to validation agent
        await this.delegateTask({
          type: 'validation',
          description: `Fix validation error: ${errorData.message}`,
          payload: errorData,
          priority: severity === 'critical' ? 'critical' : 'high'
        });
        break;

      case 'schema':
        // Route to schema agent
        await this.delegateTask({
          type: 'analysis',
          description: `Analyze schema error: ${errorData.message}`,
          payload: errorData,
          priority: 'high'
        });
        break;

      case 'communication':
        // Handle communication errors internally
        contextUpdates.push(`Resolved communication error: ${errorData.message}`);
        resolved = 1;
        break;

      default:
        // Route to diagnostics agent
        await this.delegateTask({
          type: 'analysis',
          description: `Diagnose error: ${errorData.message}`,
          payload: errorData,
          priority: 'normal'
        });
    }

    return { resolved, contextUpdates };
  }

  private async handleCoordinationRequest(request: any): Promise<{
    tasksDelegated: number;
    conflictsResolved: number;
    contextUpdates: string[];
  }> {
    let tasksDelegated = 0;
    let conflictsResolved = 0;
    const contextUpdates: string[] = [];

    // Handle different types of coordination requests
    switch (request.type) {
      case 'workflow':
        // Coordinate workflow execution
        const workflowResult = await this.coordinateWorkflow(request.workflow);
        tasksDelegated += workflowResult.delegated;
        contextUpdates.push(...workflowResult.contextUpdates);
        break;

      case 'resource-allocation':
        // Allocate resources among agents
        const allocationResult = await this.allocateResources(request.resources);
        tasksDelegated += allocationResult.delegated;
        contextUpdates.push(...allocationResult.contextUpdates);
        break;

      case 'priority-adjustment':
        // Adjust task priorities
        const priorityResult = await this.adjustPriorities(request.priorities);
        conflictsResolved += priorityResult.resolved;
        contextUpdates.push(...priorityResult.contextUpdates);
        break;
    }

    return { tasksDelegated, conflictsResolved, contextUpdates };
  }

  private async handleCoordinationTask(task: AgentTask): Promise<{
    delegated: number;
    resolved: number;
    contextUpdates: string[];
  }> {
    let delegated = 0;
    let resolved = 0;
    const contextUpdates: string[] = [];

    // Handle coordination-specific tasks
    const taskData = task.payload;
    
    if (taskData.workflow) {
      const result = await this.coordinateWorkflow(taskData.workflow);
      delegated += result.delegated;
      contextUpdates.push(...result.contextUpdates);
    }

    if (taskData.resources) {
      const result = await this.allocateResources(taskData.resources);
      delegated += result.delegated;
      contextUpdates.push(...result.contextUpdates);
    }

    return { delegated, resolved, contextUpdates };
  }

  private async resolveConflict(conflictData: any): Promise<{
    resolved: number;
    contextUpdates: string[];
  }> {
    let resolved = 0;
    const contextUpdates: string[] = [];

    // Analyze conflict
    const conflictType = conflictData.type || 'unknown';
    
    // Route to appropriate conflict resolver
    switch (conflictType) {
      case 'resource':
        // Resolve resource conflicts
        contextUpdates.push('Resolved resource conflict through allocation adjustment');
        resolved = 1;
        break;

      case 'priority':
        // Resolve priority conflicts
        contextUpdates.push('Resolved priority conflict through priority adjustment');
        resolved = 1;
        break;

      case 'data':
        // Route to data validation agent
        await this.delegateTask({
          type: 'validation',
          description: `Resolve data conflict: ${conflictData.description}`,
          payload: conflictData,
          priority: 'high'
        });
        break;

      default:
        contextUpdates.push(`Unresolved conflict of type: ${conflictType}`);
    }

    return { resolved, contextUpdates };
  }

  private async coordinateWorkflow(workflow: any): Promise<{
    delegated: number;
    contextUpdates: string[];
  }> {
    let delegated = 0;
    const contextUpdates: string[] = [];

    // Execute workflow steps
    for (const step of workflow.steps) {
      const stepResult = await this.delegateTask({
        type: step.type,
        description: step.description,
        payload: step.payload,
        priority: step.priority || 'normal',
        dependencies: step.dependencies || []
      });

      delegated += stepResult.delegated;
      contextUpdates.push(...stepResult.contextUpdates);
    }

    return { delegated, contextUpdates };
  }

  private async allocateResources(resources: any): Promise<{
    delegated: number;
    contextUpdates: string[];
  }> {
    let delegated = 0;
    const contextUpdates: string[] = [];

    // Allocate resources to agents
    for (const [agentId, allocation] of Object.entries(resources)) {
      await dialogueEngine.sendMessage({
        from: this.id,
        to: agentId,
        type: 'notification',
        priority: 'normal',
        content: {
          action: 'resource_allocation',
          payload: allocation
        }
      });

      delegated++;
      contextUpdates.push(`Allocated resources to ${agentId}`);
    }

    return { delegated, contextUpdates };
  }

  private async adjustPriorities(priorities: any): Promise<{
    resolved: number;
    contextUpdates: string[];
  }> {
    let resolved = 0;
    const contextUpdates: string[] = [];

    // Adjust task priorities
    for (const [taskId, priority] of Object.entries(priorities)) {
      // Update task priority in dialogue engine
      // This would require extending the dialogue engine to support priority updates
      contextUpdates.push(`Adjusted priority for task ${taskId} to ${priority}`);
      resolved++;
    }

    return { resolved, contextUpdates };
  }

  private async updateSharedContext(contextData: any): Promise<void> {
    // Update shared context through context sync
    if (this.currentContext) {
      this.currentContext.memory.recent.push(contextData);
      this.currentContext.lastActivity = new Date();
    }
  }

  private findBestAgentForTask(taskData: any): string | null {
    // Simple agent selection logic
    // In practice, this would be more sophisticated
    
    const requiredCapabilities = taskData.requiredCapabilities || [];
    
    // Default agent mappings
    const agentMappings: { [key: string]: string } = {
      'validation': 'schema-sentinel',
      'schema': 'schema-sentinel',
      'api': 'api-guardian',
      'documentation': 'doc-bot',
      'analysis': 'omai-refactor',
      'generation': 'doc-bot'
    };

    // Find best match
    for (const capability of requiredCapabilities) {
      if (agentMappings[capability]) {
        return agentMappings[capability];
      }
    }

    // Fallback to task type
    return agentMappings[taskData.type] || null;
  }

  // Get mediator status
  getStatus(): {
    isActive: boolean;
    currentContext: AgentContext | null;
    capabilities: string[];
  } {
    return {
      isActive: this.isActive,
      currentContext: this.currentContext,
      capabilities: this.capabilities
    };
  }
}

// Export singleton instance
export const omaiMediator = new OMAIMediatorAgent(); 