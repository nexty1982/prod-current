// OMAI API - Task Assignment and Management
export const omaiAPI = {
  // Validate email format
  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Get task logs (recent activity)
  getTaskLogs: async (limit: number = 50) => {
    try {
      const response = await fetch(`/api/omai/task-logs?limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching task logs:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch task logs',
        data: {
          recent_links: [],
          recent_submissions: [],
          recent_logs: []
        }
      };
    }
  },

  // Get task history with filters
  getTaskHistory: async (filters: {
    page?: number;
    limit?: number;
    email?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.email) params.append('email', filters.email);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`/api/omai/task-history?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task history: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching task history:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch task history',
        data: {
          submissions: [],
          total: 0
        }
      };
    }
  },

  // Generate task assignment link (Admin endpoint - based on PUBLIC_TASK_ASSIGNMENT_API.md)
  // This is an admin version that includes email tracking
  generateTaskLink: async (email: string, options: {
    notes?: string;
    expiresInMinutes?: number;
  }) => {
    try {
      // Admin endpoint: POST /api/omai/task-link with email tracking
      // Public endpoint (from docs): POST /api/omai/task-link without email
      const response = await fetch('/api/omai/task-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          email, // Admin-specific: track which admin generated the link
          expiresInMinutes: options.expiresInMinutes || 1440,
          meta: {
            notes: options.notes || '',
            source: 'admin-panel',
            purpose: 'task-assignment'
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate task link: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error generating task link:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate task link'
      };
    }
  },

  // Validate token (from PUBLIC_TASK_ASSIGNMENT_API.md)
  validateToken: async (token: string) => {
    try {
      const response = await fetch(`/api/omai/validate-token?t=${token}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to validate token: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error validating token:', error);
      return {
        success: false,
        valid: false,
        error: error.message || 'Failed to validate token'
      };
    }
  },

  // Submit tasks (from PUBLIC_TASK_ASSIGNMENT_API.md)
  submitTask: async (token: string, tasks: Array<{
    title: string;
    description?: string;
    priority?: string;
  }>) => {
    try {
      const response = await fetch('/api/omai/submit-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          token,
          tasks
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to submit tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error submitting tasks:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit tasks'
      };
    }
  },

  // Get public token statistics (from PUBLIC_TASK_ASSIGNMENT_API.md - Admin endpoint)
  getPublicTokenStatistics: async () => {
    try {
      const response = await fetch('/api/omai/public-tokens', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch public token statistics: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching public token statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch public token statistics',
        data: {
          statistics: {
            total: 0,
            active: 0,
            expired: 0,
            used: 0,
            rateLimitEntries: 0
          },
          active_tokens: []
        }
      };
    }
  },

  // Delete public token (from PUBLIC_TASK_ASSIGNMENT_API.md - Admin endpoint)
  deletePublicToken: async (token: string) => {
    try {
      const response = await fetch(`/api/omai/public-token/${token}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete public token: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error deleting public token:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete public token'
      };
    }
  },

  // Delete task link
  deleteTaskLink: async (linkId: number) => {
    try {
      const response = await fetch(`/api/omai/task-link/${linkId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete task link: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error deleting task link:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete task link'
      };
    }
  },

  // Delete task submission
  deleteSubmission: async (submissionId: number) => {
    try {
      const response = await fetch(`/api/omai/task-submission/${submissionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete submission: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete submission'
      };
    }
  },

  // Delete multiple submissions (batch)
  deleteSubmissionsBatch: async (submissionIds: number[]) => {
    try {
      const response = await fetch('/api/omai/task-submissions/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ ids: submissionIds })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete submissions: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error deleting submissions batch:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete submissions'
      };
    }
  },

  // Create task (Admin endpoint)
  createTask: async (taskData: {
    title: string;
    category: string;
    importance: string;
    details: string;
    tags: string[];
    attachments?: string[];
    status: number;
    type: 'documentation' | 'configuration' | 'reference' | 'guide';
    visibility: 'admin' | 'public';
    date_created?: string;
    date_completed?: string;
    assignedTo?: string;
    assignedBy?: string;
    notes?: string;
    remindMe?: boolean;
    revisions?: any[];
  }) => {
    try {
      const response = await fetch('/api/omai/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) {
        let errorMessage = `Failed to create task: ${response.statusText}`;
        let errorDetails: any = null;
        
        if (response.status === 404) {
          errorMessage = 'Backend endpoint not found. The task creation API endpoint needs to be implemented on the server.';
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
            errorDetails = errorData.details || null;
            
            // Include SQL error details if available (for debugging)
            if (errorDetails && errorDetails.sqlMessage) {
              errorMessage += ` (${errorDetails.sqlMessage})`;
            }
          } catch {
            // If response is not JSON, use status text
          }
        }
        
        const error = new Error(errorMessage) as any;
        error.details = errorDetails;
        throw error;
      }
      
      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error creating task:', error);
      throw error; // Re-throw to let the caller handle it
    }
  },

  // Get tasks (Admin endpoint - returns all tasks for admins)
  getTasks: async (filters?: {
    visibility?: 'admin' | 'public' | 'all';
    status?: number;
    category?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.visibility) params.append('visibility', filters.visibility);
      if (filters?.status) params.append('status', filters.status.toString());
      if (filters?.category) params.append('category', filters.category);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/omai/tasks?${params.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch tasks',
        data: {
          tasks: [],
          total: 0
        }
      };
    }
  },

  // Get public tasks (Public endpoint - only returns visibility='public' tasks)
  getPublicTasks: async (filters?: {
    category?: string;
    status?: number;
    type?: string;
    page?: number;
    limit?: number;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status.toString());
      if (filters?.type) params.append('type', filters.type);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/public/tasks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch public tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching public tasks:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch public tasks',
        data: {
          tasks: [],
          total: 0
        }
      };
    }
  },

  // Get public task by ID (Public endpoint)
  getPublicTask: async (taskId: string | number) => {
    try {
      const response = await fetch(`/api/public/tasks/${taskId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch task: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Error fetching public task:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch task'
      };
    }
  },

  // Legacy placeholder methods (kept for compatibility)
  assignTask: async (taskData: any) => {
    console.warn('OMAI API assignTask is deprecated, use generateTaskLink instead');
    return { success: false, message: 'OMAI API assignTask is deprecated' };
  },
  
  
  updateTask: async (taskId: string, updates: any) => {
    console.warn('OMAI API updateTask is deprecated');
    return { success: false, message: 'OMAI API updateTask is deprecated' };
  }
};
