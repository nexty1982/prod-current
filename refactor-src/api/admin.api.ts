/**
 * Admin API Service for OrthodMetrics
 * Handles admin-related API calls including user management, system settings, and administrative operations
 */

import { apiJson } from '@/shared/lib/apiClient';

// Admin types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalChurches: number;
  activeChurches: number;
  totalRecords: number;
  systemUptime: number;
  lastBackup: string;
  diskUsage: number;
  memoryUsage: number;
}

export interface ActivityLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  resourceId?: number;
  details: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ActivityLogFilters {
  userId?: number;
  action?: string;
  resource?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityLogResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SystemSettings {
  id: number;
  key: string;
  value: string;
  description: string;
  category: string;
  isPublic: boolean;
  updatedAt: string;
  updatedBy: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'up' | 'down' | 'slow';
    redis: 'up' | 'down' | 'slow';
    storage: 'up' | 'down' | 'slow';
    email: 'up' | 'down' | 'slow';
  };
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
  };
  lastChecked: string;
}

export interface UserRole {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: string;
}

// Admin API class
export class AdminAPI {
  private baseUrl = '/api/admin';

  /**
   * Get admin dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    return apiJson<AdminStats>(`${this.baseUrl}/stats`);
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return apiJson<SystemHealth>(`${this.baseUrl}/health`);
  }

  /**
   * Get activity logs with filters
   */
  async getActivityLogs(filters: ActivityLogFilters = {}): Promise<ActivityLogResponse> {
    const params = new URLSearchParams();
    
    if (filters.userId) params.append('userId', filters.userId.toString());
    if (filters.action) params.append('action', filters.action);
    if (filters.resource) params.append('resource', filters.resource);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/activity-logs?${queryString}` : `${this.baseUrl}/activity-logs`;
    
    return apiJson<ActivityLogResponse>(url);
  }

  /**
   * Get activity log by ID
   */
  async getActivityLog(id: number): Promise<ActivityLog> {
    return apiJson<ActivityLog>(`${this.baseUrl}/activity-logs/${id}`);
  }

  /**
   * Delete activity log
   */
  async deleteActivityLog(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/activity-logs/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Clear old activity logs
   */
  async clearOldLogs(daysToKeep: number = 30): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/activity-logs/clear`, {
      method: 'POST',
      body: JSON.stringify({ daysToKeep })
    });
  }

  /**
   * Get system settings
   */
  async getSystemSettings(category?: string): Promise<SystemSettings[]> {
    const url = category ? `${this.baseUrl}/settings?category=${category}` : `${this.baseUrl}/settings`;
    return apiJson<SystemSettings[]>(url);
  }

  /**
   * Update system setting
   */
  async updateSystemSetting(key: string, value: string): Promise<SystemSettings> {
    return apiJson<SystemSettings>(`${this.baseUrl}/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value })
    });
  }

  /**
   * Get all user roles
   */
  async getRoles(): Promise<UserRole[]> {
    return apiJson<UserRole[]>(`${this.baseUrl}/roles`);
  }

  /**
   * Create new user role
   */
  async createRole(role: Omit<UserRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRole> {
    return apiJson<UserRole>(`${this.baseUrl}/roles`, {
      method: 'POST',
      body: JSON.stringify(role)
    });
  }

  /**
   * Update user role
   */
  async updateRole(id: number, role: Partial<UserRole>): Promise<UserRole> {
    return apiJson<UserRole>(`${this.baseUrl}/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(role)
    });
  }

  /**
   * Delete user role
   */
  async deleteRole(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/roles/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return apiJson<Permission[]>(`${this.baseUrl}/permissions`);
  }

  /**
   * Create new permission
   */
  async createPermission(permission: Omit<Permission, 'id' | 'createdAt'>): Promise<Permission> {
    return apiJson<Permission>(`${this.baseUrl}/permissions`, {
      method: 'POST',
      body: JSON.stringify(permission)
    });
  }

  /**
   * Update permission
   */
  async updatePermission(id: number, permission: Partial<Permission>): Promise<Permission> {
    return apiJson<Permission>(`${this.baseUrl}/permissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(permission)
    });
  }

  /**
   * Delete permission
   */
  async deletePermission(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/permissions/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get system backup status
   */
  async getBackupStatus(): Promise<{
    lastBackup: string;
    nextBackup: string;
    backupSize: number;
    isRunning: boolean;
  }> {
    return apiJson(`${this.baseUrl}/backup/status`);
  }

  /**
   * Trigger manual backup
   */
  async triggerBackup(): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/backup/trigger`, {
      method: 'POST'
    });
  }

  /**
   * Get backup list
   */
  async getBackups(): Promise<{
    backups: Array<{
      id: string;
      filename: string;
      size: number;
      createdAt: string;
      type: 'full' | 'incremental';
    }>;
  }> {
    return apiJson(`${this.baseUrl}/backup/list`);
  }

  /**
   * Download backup
   */
  async downloadBackup(backupId: string): Promise<Blob> {
    return apiJson<Blob>(`${this.baseUrl}/backup/${backupId}/download`);
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/backup/${backupId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get system logs
   */
  async getSystemLogs(type: 'error' | 'access' | 'application' = 'error'): Promise<{
    logs: string[];
    totalLines: number;
  }> {
    return apiJson(`${this.baseUrl}/logs/${type}`);
  }

  /**
   * Clear system logs
   */
  async clearSystemLogs(type: 'error' | 'access' | 'application' = 'error'): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/logs/${type}/clear`, {
      method: 'POST'
    });
  }

  /**
   * Restart system service
   */
  async restartService(service: string): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/services/${service}/restart`, {
      method: 'POST'
    });
  }

  /**
   * Get service status
   */
  async getServiceStatus(service: string): Promise<{
    status: 'running' | 'stopped' | 'error';
    uptime: number;
    lastError?: string;
  }> {
    return apiJson(`${this.baseUrl}/services/${service}/status`);
  }
}

// Export singleton instance
export const adminAPI = new AdminAPI();
