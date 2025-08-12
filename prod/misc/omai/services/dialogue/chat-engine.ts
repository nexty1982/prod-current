import { AgentMessage, AgentTask, AgentContext, DialogueChannel, DialogueRegistry, DialogueMetrics } from '../types/agent-dialogue';
import { OMAIAgent } from '../agents/types';
import fs from 'fs/promises';
import path from 'path';

export class DialogueEngine {
  private registry: DialogueRegistry;
  private metrics: DialogueMetrics;
  private logPath: string;
  private isRunning: boolean = false;
  private messageProcessor: NodeJS.Timeout | null = null;

  constructor() {
    this.registry = {
      agents: new Map(),
      channels: new Map(),
      messageQueue: [],
      taskQueue: []
    };
    
    this.metrics = {
      messagesProcessed: 0,
      tasksCompleted: 0,
      averageResponseTime: 0,
      errorRate: 0,
      activeChannels: 0,
      lastUpdated: new Date()
    };

    this.logPath = path.join(__dirname, '../memory/chat.log.json');
  }

  // Initialize the dialogue engine with agent registry
  async startDialogueEngine(agentRegistry: Map<string, OMAIAgent>): Promise<void> {
    console.log('[OMAI] Starting dialogue engine...');
    
    // Initialize agent contexts
    for (const [agentId, agent] of agentRegistry) {
      const context: AgentContext = {
        agentId,
        domain: agent.domain,
        capabilities: agent.capabilities || [],
        memory: { recent: [], persistent: [] },
        status: 'idle',
        lastActivity: new Date()
      };
      this.registry.agents.set(agentId, context);
    }

    // Create default channels
    await this.createChannel('general', Array.from(agentRegistry.keys()));
    await this.createChannel('critical', Array.from(agentRegistry.keys()));
    await this.createChannel('diagnostics', Array.from(agentRegistry.keys()));

    this.isRunning = true;
    this.startMessageProcessor();
    
    console.log(`[OMAI] Dialogue engine started with ${this.registry.agents.size} agents`);
  }

  // Send a message between agents
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    // Validate message
    if (!this.registry.agents.has(message.from)) {
      throw new Error(`Sender agent ${message.from} not found`);
    }

    if (message.to !== 'broadcast' && !this.registry.agents.has(message.to)) {
      throw new Error(`Recipient agent ${message.to} not found`);
    }

    // Add to queue
    this.registry.messageQueue.push(fullMessage);
    
    // Log message
    await this.logMessage(fullMessage);
    
    // Update metrics
    this.updateMetrics('message_sent');

    return fullMessage.id;
  }

  // Create a task and assign it to an agent
  async createTask(task: Omit<AgentTask, 'id' | 'timestamp' | 'status'>): Promise<string> {
    const fullTask: AgentTask = {
      ...task,
      id: this.generateTaskId(),
      timestamp: new Date(),
      status: 'pending'
    };

    // Validate task assignment
    if (!this.registry.agents.has(task.assignedTo)) {
      throw new Error(`Assigned agent ${task.assignedTo} not found`);
    }

    // Add to task queue
    this.registry.taskQueue.push(fullTask);
    
    // Update agent context
    const agentContext = this.registry.agents.get(task.assignedTo);
    if (agentContext) {
      agentContext.currentTask = fullTask;
      agentContext.status = 'busy';
      agentContext.lastActivity = new Date();
    }

    // Log task
    await this.logTask(fullTask);
    
    return fullTask.id;
  }

  // Create a dialogue channel
  async createChannel(name: string, participants: string[]): Promise<string> {
    const channelId = `channel_${name}_${Date.now()}`;
    
    const channel: DialogueChannel = {
      id: channelId,
      name,
      participants,
      messageHistory: [],
      isActive: true,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.registry.channels.set(channelId, channel);
    this.metrics.activeChannels = this.registry.channels.size;
    
    return channelId;
  }

  // Get messages for an agent
  async getMessagesForAgent(agentId: string, limit: number = 50): Promise<AgentMessage[]> {
    const messages = this.registry.messageQueue.filter(msg => 
      msg.to === agentId || msg.to === 'broadcast'
    );
    
    return messages.slice(-limit);
  }

  // Get tasks for an agent
  async getTasksForAgent(agentId: string): Promise<AgentTask[]> {
    return this.registry.taskQueue.filter(task => 
      task.assignedTo === agentId && task.status === 'pending'
    );
  }

  // Update task status
  async updateTaskStatus(taskId: string, status: AgentTask['status'], result?: any, error?: string): Promise<void> {
    const task = this.registry.taskQueue.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    if (result) task.result = result;
    if (error) task.error = error;

    // Update agent context
    const agentContext = this.registry.agents.get(task.assignedTo);
    if (agentContext && agentContext.currentTask?.id === taskId) {
      if (status === 'completed' || status === 'failed') {
        agentContext.currentTask = undefined;
        agentContext.status = 'idle';
      }
      agentContext.lastActivity = new Date();
    }

    // Update metrics
    if (status === 'completed') {
      this.updateMetrics('task_completed');
    } else if (status === 'failed') {
      this.updateMetrics('task_failed');
    }

    await this.logTaskUpdate(task);
  }

  // Start the message processor
  private startMessageProcessor(): void {
    this.messageProcessor = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.processMessageQueue();
        await this.processTaskQueue();
      } catch (error) {
        console.error('[OMAI] Error in message processor:', error);
        this.updateMetrics('error');
      }
    }, 1000); // Process every second
  }

  // Process message queue
  private async processMessageQueue(): Promise<void> {
    const messages = [...this.registry.messageQueue];
    this.registry.messageQueue = [];

    for (const message of messages) {
      try {
        // Route message to appropriate channel
        if (message.to === 'broadcast') {
          // Send to all channels
          for (const channel of this.registry.channels.values()) {
            if (channel.isActive) {
              channel.messageHistory.push(message);
              channel.lastActivity = new Date();
            }
          }
        } else {
          // Send to specific agent's channels
          const agentChannels = Array.from(this.registry.channels.values())
            .filter(channel => channel.participants.includes(message.to));
          
          for (const channel of agentChannels) {
            channel.messageHistory.push(message);
            channel.lastActivity = new Date();
          }
        }

        this.updateMetrics('message_processed');
      } catch (error) {
        console.error(`[OMAI] Error processing message ${message.id}:`, error);
        this.updateMetrics('error');
      }
    }
  }

  // Process task queue
  private async processTaskQueue(): Promise<void> {
    // This would typically trigger agent execution
    // For now, we just maintain the queue
    const pendingTasks = this.registry.taskQueue.filter(task => task.status === 'pending');
    
    // Update metrics
    this.metrics.lastUpdated = new Date();
  }

  // Update metrics
  private updateMetrics(event: 'message_sent' | 'message_processed' | 'task_completed' | 'task_failed' | 'error'): void {
    switch (event) {
      case 'message_sent':
        this.metrics.messagesProcessed++;
        break;
      case 'task_completed':
        this.metrics.tasksCompleted++;
        break;
      case 'error':
        this.metrics.errorRate = Math.min(1, this.metrics.errorRate + 0.01);
        break;
    }
    
    this.metrics.lastUpdated = new Date();
  }

  // Log message to file
  private async logMessage(message: AgentMessage): Promise<void> {
    try {
      const logEntry = {
        timestamp: message.timestamp,
        type: 'message',
        data: message
      };

      const logContent = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logPath, logContent, 'utf-8');
    } catch (error) {
      console.error('[OMAI] Error logging message:', error);
    }
  }

  // Log task to file
  private async logTask(task: AgentTask): Promise<void> {
    try {
      const logEntry = {
        timestamp: task.timestamp,
        type: 'task',
        data: task
      };

      const logContent = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logPath, logContent, 'utf-8');
    } catch (error) {
      console.error('[OMAI] Error logging task:', error);
    }
  }

  // Log task update
  private async logTaskUpdate(task: AgentTask): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date(),
        type: 'task_update',
        data: task
      };

      const logContent = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.logPath, logContent, 'utf-8');
    } catch (error) {
      console.error('[OMAI] Error logging task update:', error);
    }
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique task ID
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get dialogue metrics
  getMetrics(): DialogueMetrics {
    return { ...this.metrics };
  }

  // Get registry status
  getRegistryStatus(): {
    agents: number;
    channels: number;
    messageQueue: number;
    taskQueue: number;
  } {
    return {
      agents: this.registry.agents.size,
      channels: this.registry.channels.size,
      messageQueue: this.registry.messageQueue.length,
      taskQueue: this.registry.taskQueue.length
    };
  }

  // Stop the dialogue engine
  stop(): void {
    this.isRunning = false;
    if (this.messageProcessor) {
      clearInterval(this.messageProcessor);
      this.messageProcessor = null;
    }
    console.log('[OMAI] Dialogue engine stopped');
  }
}

// Export singleton instance
export const dialogueEngine = new DialogueEngine(); 