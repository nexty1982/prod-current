/**
 * OMAI API Service Layer
 * Handles OMAI task assignment system endpoints
 */

import { apiClient } from './utils/axiosInstance';

// Types for OMAI Task Assignment
export interface Task {
  title: string;
  description: string;
  priority: '🔥' | '⚠️' | '🧊' | 'high' | 'medium' | 'low';
}

export interface TaskLinkResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    email: string;
    token: string;
    link: string;
    expiresAt: string;
    notes: string;
  };
}

export interface TokenValidationResponse {
  success: boolean;
  valid: boolean;
  data?: {
    email: string;
    created_at: string;
    expires_at?: string;
    notes?: string;
  };
  error?: string;
}

export interface TaskSubmissionResponse {
  success: boolean;
  message: string;
  data: {
    submission_id: number;
    email: string;
    task_count: number;
    submitted_at: string;
  };
}

export interface TaskLogsResponse {
  success: boolean;
  data: {
    recent_links: Array<{
      id: number;
      email: string;
      token: string;
      created_at: string;
      expires_at?: string;
      is_used: boolean;
      used_at?: string;
      notes?: string;
    }>;
    recent_submissions: Array<{
      id: number;
      email: string;
      tasks_json: string;
      submitted_at: string;
      status: string;
      notes?: string;
    }>;
    recent_logs: Array<{
      timestamp: string;
      action: string;
      email: string;
      token?: string;
      data: any;
    }>;
  };
}

class OMAIAPI {
  // ===== TASK ASSIGNMENT APIs =====

  /**
   * Generate a task assignment link
   * @param email - Email address to send the link to
   * @param options - Optional configuration for the link
   */
  generateTaskLink = (email: string, options?: {
    notes?: string;
    expiresInMinutes?: number;
  }): Promise<TaskLinkResponse> =>
    apiClient.post('/omai/task-link', { email, ...options });

  /**
   * Validate a task assignment token
   * @param token - Token to validate
   */
  validateToken = (token: string): Promise<TokenValidationResponse> =>
    apiClient.get(`/omai/validate-token?token=${encodeURIComponent(token)}`);

  /**
   * Submit tasks using a token
   * @param token - Valid task assignment token
   * @param tasks - Array of tasks to submit
   */
  submitTasks = (token: string, tasks: Task[]): Promise<TaskSubmissionResponse> =>
    apiClient.post('/omai/submit-task', { token, tasks });

  /**
   * Get recent task assignment logs (for dashboard)
   * @param limit - Number of recent logs to fetch
   */
  getTaskLogs = (limit: number = 10): Promise<TaskLogsResponse> =>
    apiClient.get(`/omai/task-logs?limit=${limit}`);

  /**
   * Delete a task assignment link
   * @param linkId - ID of the task link to delete
   */
  deleteTaskLink = (linkId: number): Promise<{ success: boolean; message: string; data: any }> =>
    apiClient.delete(`/omai/task-link/${linkId}`);

  /**
   * Delete a single task submission
   * @param submissionId - ID of the submission to delete
   */
  deleteSubmission = (submissionId: number): Promise<{ success: boolean; message: string; data: any }> =>
    apiClient.delete(`/omai/submission/${submissionId}`);

  /**
   * Delete multiple task submissions in batch
   * @param submissionIds - Array of submission IDs to delete
   */
  deleteSubmissionsBatch = (submissionIds: number[]): Promise<{ success: boolean; message: string; data: any }> =>
    apiClient.delete('/omai/submissions/batch', { data: { submissionIds } });

  /**
   * Get task assignment history with pagination and filters
   * @param filters - Filter options for the history
   */
  getTaskHistory = (filters?: {
    page?: number;
    limit?: number;
    email?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{
    success: boolean;
    data: {
      submissions: Array<{
        id: number;
        email: string;
        tasks_json: string;
        submitted_at: string;
        status: string;
        submission_type: string;
        ip_address: string;
        user_agent?: string;
        sent_to_nick: boolean;
        sent_at?: string;
      }>;
      totalRecords?: number;
      currentPage?: number;
      totalPages?: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.email) params.append('email', filters.email);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    return apiClient.get(`/omai/task-history?${params.toString()}`);
  };

  // ===== UTILITY METHODS =====

  /**
   * Validate email format on frontend
   * @param email - Email to validate
   */
  validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Get priority label with emoji
   * @param priority - Priority value
   */
  getPriorityLabel = (priority: Task['priority']): string => {
    const priorityMap = {
      '🔥': '🔥 High Priority',
      'high': '🔥 High Priority',
      '⚠️': '⚠️ Medium Priority',
      'medium': '⚠️ Medium Priority',
      '🧊': '🧊 Low Priority',
      'low': '🧊 Low Priority'
    };
    return priorityMap[priority] || '⚠️ Medium Priority';
  };

  /**
   * Get priority color for UI
   * @param priority - Priority value
   */
  getPriorityColor = (priority: Task['priority']): string => {
    const colorMap = {
      '🔥': '#ff4444',
      'high': '#ff4444',
      '⚠️': '#ff9944',
      'medium': '#ff9944',
      '🧊': '#44ff44',
      'low': '#44ff44'
    };
    return colorMap[priority] || '#ff9944';
  };

  /**
   * Validate task data
   * @param task - Task to validate
   */
  validateTask = (task: Task): boolean => {
    return !!(
      task.title &&
      task.title.trim().length > 0 &&
      task.title.trim().length <= 200 &&
      task.description.trim().length <= 1000 &&
      ['🔥', '⚠️', '🧊', 'high', 'medium', 'low'].includes(task.priority)
    );
  };
}

// Export singleton instance
export const omaiAPI = new OMAIAPI();
export default omaiAPI; 