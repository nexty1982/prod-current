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
    url: string;
    token: string;
    created_at: string;
  };
}

export interface TokenValidationResponse {
  success: boolean;
  data?: {
    email: string;
    created_at: string;
    is_used: boolean;
    expires_at?: string;
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
    email_sent: boolean;
    submitted_at: string;
  };
}

export interface TaskLogsResponse {
  success: boolean;
  data: {
    recent_links: Array<{
      id: number;
      email: string;
      created_at: string;
      is_used: boolean;
      used_at?: string;
    }>;
    recent_submissions: Array<{
      id: number;
      email: string;
      tasks_json: string;
      submitted_at: string;
      sent_to_nick: boolean;
      sent_at?: string;
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
   */
  generateTaskLink = (email: string): Promise<TaskLinkResponse> =>
    apiClient.post('/omai/task-link', { email });

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
   * @param token - Token of the task link to delete
   */
  deleteTaskLink = (token: string): Promise<{ success: boolean; message: string; data: any }> =>
    apiClient.delete(`/omai/task-link/${token}`);

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