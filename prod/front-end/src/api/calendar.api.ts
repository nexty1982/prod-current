/**
 * Calendar API Service Layer
 * Handles AI task management, Kanban synchronization, and real-time updates
 */

import type { AITask, CalendarEvent } from '../types/calendar.types';
import { apiClient } from './utils/axiosInstance';

class CalendarAPI {
  // ===== AI TASK MANAGEMENT APIs =====
  tasks = {
    // Get all AI tasks
    getAll: (): Promise<AITask[]> =>
      apiClient.get('/calendar/tasks'),

    // Get task by ID
    getById: (id: string): Promise<AITask> =>
      apiClient.get(`/calendar/tasks/${id}`),

    // Create new AI task
    create: (task: Omit<AITask, 'id' | 'createdAt' | 'updatedAt'>): Promise<AITask> =>
      apiClient.post('/calendar/tasks', task),

    // Update existing task
    update: (id: string, task: Partial<AITask>): Promise<AITask> =>
      apiClient.put(`/calendar/tasks/${id}`, task),

    // Delete task
    delete: (id: string): Promise<void> =>
      apiClient.delete(`/calendar/tasks/${id}`),

    // Get tasks by date range
    getByDateRange: (startDate: string, endDate: string): Promise<AITask[]> =>
      apiClient.get(`/calendar/tasks/range?start=${startDate}&end=${endDate}`),

    // Get tasks by agent
    getByAgent: (agent: string): Promise<AITask[]> =>
      apiClient.get(`/calendar/tasks/agent/${agent}`),

    // Get tasks by status
    getByStatus: (status: string): Promise<AITask[]> =>
      apiClient.get(`/calendar/tasks/status/${status}`),

    // Get tasks by priority
    getByPriority: (priority: string): Promise<AITask[]> =>
      apiClient.get(`/calendar/tasks/priority/${priority}`),

    // Bulk update tasks
    bulkUpdate: (updates: Array<{ id: string; updates: Partial<AITask> }>): Promise<AITask[]> =>
      apiClient.put('/calendar/tasks/bulk', { updates }),

    // Get task statistics
    getStats: (): Promise<{
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      blocked: number;
      byAgent: Record<string, number>;
      byPriority: Record<string, number>;
    }> =>
      apiClient.get('/calendar/tasks/stats'),
  };

  // ===== KANBAN INTEGRATION APIs =====
  kanban = {
    // Get Kanban tasks
    getTasks: (): Promise<any[]> =>
      apiClient.get('/calendar/kanban/tasks'),

    // Sync task with Kanban
    syncTask: (taskId: string, kanbanId: string): Promise<AITask> =>
      apiClient.post(`/calendar/tasks/${taskId}/sync-kanban`, { kanbanId }),

    // Unsync task from Kanban
    unsyncTask: (taskId: string): Promise<AITask> =>
      apiClient.delete(`/calendar/tasks/${taskId}/sync-kanban`),

    // Get sync status
    getSyncStatus: (): Promise<{
      synced: number;
      unsynced: number;
      conflicts: number;
    }> =>
      apiClient.get('/calendar/kanban/sync-status'),

    // Force sync all tasks
    forceSync: (): Promise<{ synced: number; errors: number }> =>
      apiClient.post('/calendar/kanban/force-sync'),

    // Get Kanban columns
    getColumns: (): Promise<any[]> =>
      apiClient.get('/calendar/kanban/columns'),

    // Update task status in Kanban
    updateKanbanStatus: (taskId: string, status: string): Promise<AITask> =>
      apiClient.put(`/calendar/tasks/${taskId}/kanban-status`, { status }),
  };

  // ===== AI AGENT MANAGEMENT APIs =====
  agents = {
    // Get all agents
    getAll: (): Promise<{
      name: string;
      status: 'online' | 'offline' | 'busy';
      currentTask?: string;
      queueLength: number;
      performance: {
        tasksCompleted: number;
        averageTime: number;
        successRate: number;
      };
    }[]> =>
      apiClient.get('/calendar/agents'),

    // Get agent status
    getStatus: (agentName: string): Promise<{
      status: 'online' | 'offline' | 'busy';
      currentTask?: string;
      queueLength: number;
      lastActivity: string;
    }> =>
      apiClient.get(`/calendar/agents/${agentName}/status`),

    // Assign task to agent
    assignTask: (taskId: string, agentName: string): Promise<AITask> =>
      apiClient.post(`/calendar/tasks/${taskId}/assign`, { agent: agentName }),

    // Get agent performance
    getPerformance: (agentName: string, period: 'day' | 'week' | 'month' = 'week'): Promise<{
      tasksCompleted: number;
      averageTime: number;
      successRate: number;
      totalHours: number;
    }> =>
      apiClient.get(`/calendar/agents/${agentName}/performance?period=${period}`),

    // Get agent queue
    getQueue: (agentName: string): Promise<AITask[]> =>
      apiClient.get(`/calendar/agents/${agentName}/queue`),
  };

  // ===== REAL-TIME UPDATES APIs =====
  realtime = {
    // Subscribe to task updates
    subscribe: (callback: (update: { type: 'create' | 'update' | 'delete'; task: AITask }) => void): () => void => {
      // Implementation for WebSocket or Server-Sent Events
      const eventSource = new EventSource('/api/calendar/realtime/tasks');
      
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);
        callback(update);
      };

      return () => eventSource.close();
    },

    // Get recent updates
    getRecentUpdates: (limit: number = 10): Promise<{
      timestamp: string;
      type: 'create' | 'update' | 'delete';
      task: AITask;
      user: string;
    }[]> =>
      apiClient.get(`/calendar/realtime/recent?limit=${limit}`),
  };

  // ===== FILE MANAGEMENT APIs =====
  files = {
    // Get task files
    getFiles: (taskId: string): Promise<{
      markdownFile?: string;
      jsonFile?: string;
      attachments: string[];
    }> =>
      apiClient.get(`/calendar/tasks/${taskId}/files`),

    // Upload task file
    uploadFile: (taskId: string, file: File, type: 'markdown' | 'json' | 'attachment'): Promise<{
      filename: string;
      url: string;
    }> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      
      return apiClient.uploadFile(`/calendar/tasks/${taskId}/files`, formData);
    },

    // Delete task file
    deleteFile: (taskId: string, filename: string): Promise<void> =>
      apiClient.delete(`/calendar/tasks/${taskId}/files/${filename}`),

    // Generate task report
    generateReport: (taskId: string, format: 'pdf' | 'markdown' | 'json'): Promise<{
      url: string;
      filename: string;
    }> =>
      apiClient.post(`/calendar/tasks/${taskId}/report`, { format }),
  };

  // ===== CHATGPT INTEGRATION APIs =====
  chatgpt = {
    // Create ChatGPT session for task
    createSession: (taskId: string): Promise<{
      sessionId: string;
      url: string;
    }> =>
      apiClient.post(`/calendar/tasks/${taskId}/chatgpt-session`),

    // Get ChatGPT session status
    getSessionStatus: (taskId: string): Promise<{
      sessionId: string;
      status: 'active' | 'inactive' | 'expired';
      lastActivity: string;
      messageCount: number;
    }> =>
      apiClient.get(`/calendar/tasks/${taskId}/chatgpt-session`),

    // Send message to ChatGPT session
    sendMessage: (taskId: string, message: string): Promise<{
      response: string;
      timestamp: string;
    }> =>
      apiClient.post(`/calendar/tasks/${taskId}/chatgpt-message`, { message }),

    // Get ChatGPT conversation history
    getConversation: (taskId: string): Promise<{
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        timestamp: string;
      }>;
    }> =>
      apiClient.get(`/calendar/tasks/${taskId}/chatgpt-conversation`),
  };

  // ===== NOTIFICATIONS APIs =====
  notifications = {
    // Get task notifications
    getTaskNotifications: (taskId: string): Promise<{
      id: string;
      type: 'status_change' | 'due_date' | 'assignment' | 'comment';
      message: string;
      timestamp: string;
      read: boolean;
    }[]> =>
      apiClient.get(`/calendar/tasks/${taskId}/notifications`),

    // Mark notification as read
    markAsRead: (notificationId: string): Promise<void> =>
      apiClient.put(`/calendar/notifications/${notificationId}/read`),

    // Subscribe to task notifications
    subscribe: (taskId: string): Promise<{
      subscriptionId: string;
    }> =>
      apiClient.post(`/calendar/tasks/${taskId}/notifications/subscribe`),

    // Unsubscribe from task notifications
    unsubscribe: (subscriptionId: string): Promise<void> =>
      apiClient.delete(`/calendar/notifications/subscriptions/${subscriptionId}`),
  };

  // ===== EXPORT/IMPORT APIs =====
  export = {
    // Export tasks to JSON
    toJSON: (filters?: {
      dateRange?: { start: string; end: string };
      agents?: string[];
      status?: string[];
      priority?: string[];
    }): Promise<{
      data: AITask[];
      exportedAt: string;
      filters: any;
    }> =>
      apiClient.post('/calendar/export/json', filters || {}),

    // Export tasks to CSV
    toCSV: (filters?: {
      dateRange?: { start: string; end: string };
      agents?: string[];
      status?: string[];
      priority?: string[];
    }): Promise<{
      url: string;
      filename: string;
    }> =>
      apiClient.post('/calendar/export/csv', filters || {}),

    // Import tasks from JSON
    fromJSON: (data: AITask[]): Promise<{
      imported: number;
      errors: number;
      results: Array<{ success: boolean; task: AITask; error?: string }>;
    }> =>
      apiClient.post('/calendar/import/json', { data }),

    // Import tasks from CSV
    fromCSV: (file: File): Promise<{
      imported: number;
      errors: number;
      results: Array<{ success: boolean; task: AITask; error?: string }>;
    }> => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiClient.uploadFile('/calendar/import/csv', formData);
    },
  };

  // ===== UTILITY METHODS =====
  
  // Generate unique task ID
  generateTaskId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `OM-AI-TASK-${timestamp}-${random}`;
  };

  // Format task for calendar
  formatForCalendar = (task: AITask): CalendarEvent => ({
    ...task,
    start: new Date(task.dueDate),
    end: new Date(task.dueDate),
    allDay: true,
  });

  // Validate task data
  validateTask = (task: Partial<AITask>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!task.title?.trim()) {
      errors.push('Task title is required');
    }

    if (!task.dueDate) {
      errors.push('Due date is required');
    }

    if (!task.agent) {
      errors.push('AI agent is required');
    }

    if (!task.status) {
      errors.push('Status is required');
    }

    if (!task.priority) {
      errors.push('Priority is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Get task color by agent
  getTaskColor = (agent: string): string => {
    const colors: Record<string, string> = {
      'Ninja': '#FF6B6B',
      'Claude': '#4ECDC4',
      'Cursor': '#45B7D1',
      'OM-AI': '#96CEB4',
      'Junie': '#FFEAA7',
      'GitHub Copilot': '#DDA0DD',
    };
    return colors[agent] || '#ccc';
  };

  // Get task priority color
  getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#F44336',
      'critical': '#9C27B0',
    };
    return colors[priority] || '#ccc';
  };
}

export const calendarAPI = new CalendarAPI(); 