// Agent Dialogue System Types
export interface AgentMessage {
  id: string;
  timestamp: Date;
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  type: 'task' | 'response' | 'notification' | 'error' | 'context';
  priority: 'low' | 'normal' | 'high' | 'critical';
  content: {
    action?: string;
    payload?: any;
    context?: any;
    metadata?: any;
  };
  correlationId?: string; // For linking related messages
  expiresAt?: Date;
}

export interface AgentTask {
  id: string;
  timestamp: Date;
  assignedTo: string; // Agent ID
  requestedBy: string; // Agent ID
  type: 'validation' | 'translation' | 'analysis' | 'generation' | 'synthesis';
  description: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  metadata?: {
    estimatedDuration?: number;
    dependencies?: string[];
    tags?: string[];
  };
}

export interface AgentContext {
  agentId: string;
  domain: string;
  capabilities: string[];
  currentTask?: AgentTask;
  memory: {
    recent: any[];
    persistent: any[];
  };
  status: 'idle' | 'busy' | 'error' | 'offline';
  lastActivity: Date;
}

export interface DialogueChannel {
  id: string;
  name: string;
  participants: string[]; // Agent IDs
  messageHistory: AgentMessage[];
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface DialogueRegistry {
  agents: Map<string, AgentContext>;
  channels: Map<string, DialogueChannel>;
  messageQueue: AgentMessage[];
  taskQueue: AgentTask[];
}

export interface DialogueMetrics {
  messagesProcessed: number;
  tasksCompleted: number;
  averageResponseTime: number;
  errorRate: number;
  activeChannels: number;
  lastUpdated: Date;
}

// DSIL (Domain Specific Interaction Language) Types
export interface DSILEvent {
  source: 'component' | 'api' | 'user' | 'system';
  trigger: 'fieldUpdate' | 'schemaChange' | 'actionRequest' | 'validationError' | 'contextSwitch';
  payload: any;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

export interface DSILTranslation {
  event: DSILEvent;
  agentTasks: AgentTask[];
  contextUpdates: any[];
  priority: 'low' | 'normal' | 'high' | 'critical';
} 