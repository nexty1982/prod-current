import { DSILEvent, DSILTranslation, AgentTask } from '../types/agent-dialogue';
import { OMAIAgent } from '../agents/types';

export class DSILTranslator {
  private eventPatterns: Map<string, (event: DSILEvent) => AgentTask[]> = new Map();
  private agentCapabilities: Map<string, string[]> = new Map();

  constructor() {
    this.initializeEventPatterns();
  }

  // Initialize event-to-task translation patterns
  private initializeEventPatterns(): void {
    // Field update events
    this.eventPatterns.set('fieldUpdate', (event: DSILEvent) => {
      const tasks: AgentTask[] = [];
      
      // Validate field change
      tasks.push({
        id: '', // Will be generated
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['validation', 'schema']),
        requestedBy: 'system',
        type: 'validation',
        description: `Validate field update: ${event.payload.fieldName}`,
        payload: {
          fieldName: event.payload.fieldName,
          oldValue: event.payload.oldValue,
          newValue: event.payload.newValue,
          context: event.payload.context
        },
        priority: 'normal',
        status: 'pending',
        metadata: {
          estimatedDuration: 1000,
          dependencies: [],
          tags: ['validation', 'field-update']
        }
      });

      // Update documentation if needed
      if (event.payload.requiresDocUpdate) {
        tasks.push({
          id: '',
          timestamp: new Date(),
          assignedTo: this.findBestAgent(['documentation', 'markdown']),
          requestedBy: 'system',
          type: 'generation',
          description: `Update documentation for field: ${event.payload.fieldName}`,
          payload: {
            fieldName: event.payload.fieldName,
            change: event.payload,
            docType: 'field-description'
          },
          priority: 'low',
          status: 'pending',
          metadata: {
            estimatedDuration: 2000,
            dependencies: [],
            tags: ['documentation', 'field-update']
          }
        });
      }

      return tasks;
    });

    // Schema change events
    this.eventPatterns.set('schemaChange', (event: DSILEvent) => {
      const tasks: AgentTask[] = [];
      
      // Validate schema change
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['schema', 'validation']),
        requestedBy: 'system',
        type: 'validation',
        description: `Validate schema change: ${event.payload.schemaName}`,
        payload: {
          schemaName: event.payload.schemaName,
          changes: event.payload.changes,
          impact: event.payload.impact
        },
        priority: 'high',
        status: 'pending',
        metadata: {
          estimatedDuration: 3000,
          dependencies: [],
          tags: ['schema', 'validation']
        }
      });

      // Update related components
      if (event.payload.affectsComponents) {
        tasks.push({
          id: '',
          timestamp: new Date(),
          assignedTo: this.findBestAgent(['component', 'refactoring']),
          requestedBy: 'system',
          type: 'analysis',
          description: `Analyze component impact for schema change: ${event.payload.schemaName}`,
          payload: {
            schemaName: event.payload.schemaName,
            affectedComponents: event.payload.affectsComponents,
            changes: event.payload.changes
          },
          priority: 'high',
          status: 'pending',
          metadata: {
            estimatedDuration: 5000,
            dependencies: [],
            tags: ['component', 'schema-impact']
          }
        });
      }

      // Update API documentation
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['api', 'documentation']),
        requestedBy: 'system',
        type: 'generation',
        description: `Update API documentation for schema: ${event.payload.schemaName}`,
        payload: {
          schemaName: event.payload.schemaName,
          changes: event.payload.changes,
          docType: 'api-spec'
        },
        priority: 'normal',
        status: 'pending',
        metadata: {
          estimatedDuration: 4000,
          dependencies: [],
          tags: ['api', 'documentation']
        }
      });

      return tasks;
    });

    // Action request events
    this.eventPatterns.set('actionRequest', (event: DSILEvent) => {
      const tasks: AgentTask[] = [];
      
      // Analyze action request
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['analysis', 'planning']),
        requestedBy: 'system',
        type: 'analysis',
        description: `Analyze action request: ${event.payload.action}`,
        payload: {
          action: event.payload.action,
          parameters: event.payload.parameters,
          context: event.payload.context
        },
        priority: 'normal',
        status: 'pending',
        metadata: {
          estimatedDuration: 2000,
          dependencies: [],
          tags: ['analysis', 'action-request']
        }
      });

      // Execute action if approved
      if (event.payload.autoExecute) {
        tasks.push({
          id: '',
          timestamp: new Date(),
          assignedTo: this.findBestAgent(['execution', event.payload.action]),
          requestedBy: 'system',
          type: 'generation',
          description: `Execute action: ${event.payload.action}`,
          payload: {
            action: event.payload.action,
            parameters: event.payload.parameters,
            context: event.payload.context
          },
          priority: 'high',
          status: 'pending',
          metadata: {
            estimatedDuration: 5000,
            dependencies: [],
            tags: ['execution', event.payload.action]
          }
        });
      }

      return tasks;
    });

    // Validation error events
    this.eventPatterns.set('validationError', (event: DSILEvent) => {
      const tasks: AgentTask[] = [];
      
      // Analyze validation error
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['diagnostics', 'error-analysis']),
        requestedBy: 'system',
        type: 'analysis',
        description: `Analyze validation error: ${event.payload.errorType}`,
        payload: {
          errorType: event.payload.errorType,
          errorMessage: event.payload.errorMessage,
          context: event.payload.context,
          field: event.payload.field
        },
        priority: 'high',
        status: 'pending',
        metadata: {
          estimatedDuration: 3000,
          dependencies: [],
          tags: ['diagnostics', 'validation-error']
        }
      });

      // Suggest fixes
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['suggestions', 'fixes']),
        requestedBy: 'system',
        type: 'generation',
        description: `Suggest fixes for validation error: ${event.payload.errorType}`,
        payload: {
          errorType: event.payload.errorType,
          errorMessage: event.payload.errorMessage,
          context: event.payload.context,
          field: event.payload.field
        },
        priority: 'normal',
        status: 'pending',
        metadata: {
          estimatedDuration: 2000,
          dependencies: [],
          tags: ['suggestions', 'validation-fixes']
        }
      });

      return tasks;
    });

    // Context switch events
    this.eventPatterns.set('contextSwitch', (event: DSILEvent) => {
      const tasks: AgentTask[] = [];
      
      // Update context awareness
      tasks.push({
        id: '',
        timestamp: new Date(),
        assignedTo: this.findBestAgent(['context', 'awareness']),
        requestedBy: 'system',
        type: 'analysis',
        description: `Update context awareness for: ${event.payload.newContext}`,
        payload: {
          oldContext: event.payload.oldContext,
          newContext: event.payload.newContext,
          user: event.payload.user,
          session: event.payload.sessionId
        },
        priority: 'normal',
        status: 'pending',
        metadata: {
          estimatedDuration: 1000,
          dependencies: [],
          tags: ['context', 'awareness']
        }
      });

      return tasks;
    });
  }

  // Register agent capabilities
  registerAgentCapabilities(agentId: string, capabilities: string[]): void {
    this.agentCapabilities.set(agentId, capabilities);
  }

  // Find the best agent for a set of capabilities
  private findBestAgent(requiredCapabilities: string[]): string {
    let bestAgent = 'omai-mediator'; // Default fallback
    let bestScore = 0;

    for (const [agentId, capabilities] of this.agentCapabilities) {
      const score = requiredCapabilities.reduce((total, capability) => {
        return total + (capabilities.includes(capability) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  // Translate DSIL event to agent tasks
  translateEvent(event: DSILEvent): DSILTranslation {
    console.log(`[OMAI] Translating DSIL event: ${event.trigger} from ${event.source}`);

    const pattern = this.eventPatterns.get(event.trigger);
    if (!pattern) {
      console.warn(`[OMAI] No translation pattern found for event trigger: ${event.trigger}`);
      return {
        event,
        agentTasks: [],
        contextUpdates: [],
        priority: 'low'
      };
    }

    const agentTasks = pattern(event);
    
    // Generate task IDs
    agentTasks.forEach(task => {
      task.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    });

    // Determine priority based on event type and content
    const priority = this.determinePriority(event, agentTasks);

    // Generate context updates
    const contextUpdates = this.generateContextUpdates(event, agentTasks);

    const translation: DSILTranslation = {
      event,
      agentTasks,
      contextUpdates,
      priority
    };

    console.log(`[OMAI] Translated event to ${agentTasks.length} tasks with priority ${priority}`);

    return translation;
  }

  // Determine priority based on event and tasks
  private determinePriority(event: DSILEvent, tasks: AgentTask[]): 'low' | 'normal' | 'high' | 'critical' {
    // Critical events
    if (event.trigger === 'validationError' && event.payload.errorType === 'critical') {
      return 'critical';
    }

    // High priority events
    if (event.trigger === 'schemaChange' || 
        event.trigger === 'validationError' ||
        (event.trigger === 'actionRequest' && event.payload.autoExecute)) {
      return 'high';
    }

    // Normal priority events
    if (event.trigger === 'fieldUpdate' || event.trigger === 'actionRequest') {
      return 'normal';
    }

    // Low priority events
    if (event.trigger === 'contextSwitch') {
      return 'low';
    }

    return 'normal';
  }

  // Generate context updates based on event and tasks
  private generateContextUpdates(event: DSILEvent, tasks: AgentTask[]): any[] {
    const updates: any[] = [];

    // Add event context
    updates.push({
      type: 'event_context',
      timestamp: event.timestamp,
      source: event.source,
      trigger: event.trigger,
      payload: event.payload
    });

    // Add task context
    updates.push({
      type: 'task_context',
      timestamp: new Date(),
      taskCount: tasks.length,
      taskTypes: tasks.map(t => t.type),
      priorities: tasks.map(t => t.priority)
    });

    // Add user context if available
    if (event.userId) {
      updates.push({
        type: 'user_context',
        timestamp: new Date(),
        userId: event.userId,
        sessionId: event.sessionId
      });
    }

    return updates;
  }

  // Batch translate multiple events
  translateEvents(events: DSILEvent[]): DSILTranslation[] {
    return events.map(event => this.translateEvent(event));
  }

  // Get translation statistics
  getTranslationStats(): {
    patterns: number;
    registeredAgents: number;
    lastTranslation: Date;
  } {
    return {
      patterns: this.eventPatterns.size,
      registeredAgents: this.agentCapabilities.size,
      lastTranslation: new Date()
    };
  }

  // Add custom translation pattern
  addTranslationPattern(trigger: string, pattern: (event: DSILEvent) => AgentTask[]): void {
    this.eventPatterns.set(trigger, pattern);
    console.log(`[OMAI] Added custom translation pattern for trigger: ${trigger}`);
  }

  // Remove translation pattern
  removeTranslationPattern(trigger: string): boolean {
    return this.eventPatterns.delete(trigger);
  }

  // Get available triggers
  getAvailableTriggers(): string[] {
    return Array.from(this.eventPatterns.keys());
  }
}

// Export singleton instance
export const dsilTranslator = new DSILTranslator(); 