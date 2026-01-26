/**
 * Calendar Types for OrthodMetrics AI Task Coordination
 */

// ===== CORE TASK TYPES =====

export interface AITask {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string;
  startDate?: string;
  tags: string[];
  linkedKanbanId?: string;
  agent: 'Ninja' | 'Claude' | 'Cursor' | 'OM-AI' | 'Junie' | 'GitHub Copilot';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  actualHours?: number;
  logs?: string[];
  metadata?: TaskMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface TaskMetadata {
  markdownFile?: string;
  jsonFile?: string;
  chatSessionId?: string;
  consoleUrl?: string;
  githubIssue?: string;
  jiraTicket?: string;
  slackChannel?: string;
  notes?: string;
  attachments?: string[];
}

export interface CalendarEvent extends AITask {
  start: Date;
  end: Date;
  allDay?: boolean;
}

// ===== KANBAN INTEGRATION TYPES =====

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  columnId: string;
  position: number;
  assignee?: string;
  priority?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
  taskCount: number;
}

export interface KanbanBoard {
  id: string;
  name: string;
  columns: KanbanColumn[];
  tasks: KanbanTask[];
}

export interface SyncStatus {
  synced: number;
  unsynced: number;
  conflicts: number;
  lastSync: string;
}

// ===== AI AGENT TYPES =====

export interface AIAgent {
  name: string;
  status: 'online' | 'offline' | 'busy' | 'error';
  currentTask?: string;
  queueLength: number;
  performance: AgentPerformance;
  lastActivity: string;
  capabilities: string[];
  settings: AgentSettings;
}

export interface AgentPerformance {
  tasksCompleted: number;
  averageTime: number;
  successRate: number;
  totalHours: number;
  errorRate: number;
  lastWeek: {
    tasksCompleted: number;
    averageTime: number;
    successRate: number;
  };
}

export interface AgentSettings {
  maxConcurrentTasks: number;
  autoAssign: boolean;
  preferredTaskTypes: string[];
  workingHours: {
    start: string;
    end: string;
    timezone: string;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
  };
}

// ===== REAL-TIME UPDATE TYPES =====

export interface TaskUpdate {
  type: 'create' | 'update' | 'delete';
  task: AITask;
  timestamp: string;
  user: string;
  changes?: Partial<AITask>;
}

export interface RealtimeSubscription {
  id: string;
  type: 'tasks' | 'agents' | 'kanban';
  filters?: any;
  callback: (update: TaskUpdate) => void;
}

// ===== CHATGPT INTEGRATION TYPES =====

export interface ChatGPTSession {
  sessionId: string;
  taskId: string;
  status: 'active' | 'inactive' | 'expired';
  lastActivity: string;
  messageCount: number;
  context: string;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface ChatGPTMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    tokens: number;
    model: string;
    finishReason: string;
  };
}

export interface ChatGPTConversation {
  sessionId: string;
  messages: ChatGPTMessage[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== NOTIFICATION TYPES =====

export interface TaskNotification {
  id: string;
  taskId: string;
  type: 'status_change' | 'due_date' | 'assignment' | 'comment' | 'kanban_sync';
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: {
    oldValue?: any;
    newValue?: any;
    user?: string;
  };
}

export interface NotificationSubscription {
  id: string;
  userId: string;
  taskId?: string;
  type: string;
  channels: ('email' | 'slack' | 'webhook')[];
  filters?: any;
  createdAt: string;
}

// ===== FILE MANAGEMENT TYPES =====

export interface TaskFile {
  id: string;
  taskId: string;
  filename: string;
  originalName: string;
  type: 'markdown' | 'json' | 'attachment' | 'report';
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata?: {
    contentType: string;
    checksum: string;
    version?: string;
  };
}

export interface TaskReport {
  id: string;
  taskId: string;
  format: 'pdf' | 'markdown' | 'json' | 'csv';
  filename: string;
  url: string;
  generatedAt: string;
  generatedBy: string;
  content: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    includesAttachments: boolean;
  };
}

// ===== EXPORT/IMPORT TYPES =====

export interface ExportOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  agents?: string[];
  status?: string[];
  priority?: string[];
  includeMetadata?: boolean;
  includeFiles?: boolean;
  format: 'json' | 'csv' | 'pdf' | 'markdown';
}

export interface ImportResult {
  imported: number;
  errors: number;
  skipped: number;
  results: Array<{
    success: boolean;
    task: AITask;
    error?: string;
    warnings?: string[];
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
}

// ===== FILTER AND SEARCH TYPES =====

export interface TaskFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  agents?: string[];
  status?: string[];
  priority?: string[];
  assignedTo?: string[];
  tags?: string[];
  hasKanbanLink?: boolean;
  search?: string;
}

export interface TaskSort {
  field: keyof AITask;
  direction: 'asc' | 'desc';
}

export interface TaskSearch {
  query: string;
  fields: (keyof AITask)[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
}

// ===== STATISTICS TYPES =====

export interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  blocked: number;
  byAgent: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byDate: Record<string, number>;
  averageCompletionTime: number;
  successRate: number;
}

export interface AgentStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  averageTime: number;
  successRate: number;
  currentLoad: number;
  performance: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
}

// ===== CALENDAR VIEW TYPES =====

export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
  events: CalendarEvent[];
  filters?: TaskFilters;
}

export interface CalendarSettings {
  defaultView: 'month' | 'week' | 'day';
  workingHours: {
    start: number;
    end: number;
  };
  weekends: boolean;
  holidays: Date[];
  colorScheme: 'agent' | 'priority' | 'status';
  showTaskDetails: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

// ===== API RESPONSE TYPES =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ===== EVENT TYPES =====

export interface CalendarEventHandlers {
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectSlot: (slotInfo: { start: Date; end: Date; slots: Date[] }) => void;
  onEventDrop: (dropInfo: { event: CalendarEvent; start: Date; end: Date }) => void;
  onEventResize: (resizeInfo: { event: CalendarEvent; start: Date; end: Date }) => void;
  onNavigate: (newDate: Date, view: string) => void;
  onView: (view: string) => void;
}

// ===== UTILITY TYPES =====

export type TaskStatus = AITask['status'];
export type TaskPriority = AITask['priority'];
export type AIAgentName = AITask['agent'];

export interface TaskFormData extends Omit<AITask, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface TaskUpdateData extends Partial<AITask> {
  id: string;
}

// ===== CONSTANTS =====

export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'blocked'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'critical'];
export const AI_AGENTS: AIAgentName[] = ['Ninja', 'Claude', 'Cursor', 'OM-AI', 'Junie', 'GitHub Copilot'];

export const AGENT_COLORS: Record<AIAgentName, string> = {
  'Ninja': '#FF6B6B',
  'Claude': '#4ECDC4',
  'Cursor': '#45B7D1',
  'OM-AI': '#96CEB4',
  'Junie': '#FFEAA7',
  'GitHub Copilot': '#DDA0DD'
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  'low': '#4CAF50',
  'medium': '#FF9800',
  'high': '#F44336',
  'critical': '#9C27B0'
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'pending': '#FF9800',
  'in_progress': '#2196F3',
  'completed': '#4CAF50',
  'blocked': '#F44336'
}; 