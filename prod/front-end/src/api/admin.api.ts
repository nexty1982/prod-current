/**
 * Admin API Service Layer
 * Handles admin/superadmin-level endpoints for system management
 */

import type {
  User,
  Church,
  ChurchFilters,
  CreateChurchData,
  ActivityLog,
  ProvisionRequest,
  ProvisionLog,
  ProvisionFilters,
  PaginatedResponse,
  ApiResponse,
} from '../types/orthodox-metrics.types';
import { apiClient } from './utils/axiosInstance';

class AdminAPI {
  // ===== CHURCH MANAGEMENT APIs =====
  churches = {
    getAll: (filters?: ChurchFilters): Promise<{ churches: Church[] }> =>
      apiClient.get(`/admin/churches${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<Church> =>
      apiClient.get<{ success: boolean; church: Church }>(`/admin/churches/${id}`)
        .then(response => response.church),

    create: (church: CreateChurchData): Promise<Church> =>
      apiClient.post('/admin/churches', church),

    update: (id: number, church: Partial<Church>): Promise<Church> =>
      apiClient.put(`/admin/churches/${id}`, church),

    delete: (id: number, deleteDatabase?: boolean): Promise<ApiResponse> =>
      apiClient.delete(`/admin/churches/${id}`, { 
        data: { delete_database: deleteDatabase || false }
      }),

    approve: (id: number, notes?: string): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${id}/approve`, { notes }),

    suspend: (id: number, reason?: string): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${id}/suspend`, { reason }),

    activate: (id: number): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${id}/activate`),

    updateStatus: (id: number, active: boolean): Promise<ApiResponse> =>
      apiClient.patch(`/admin/churches/${id}/status`, { active }),

    removeAllUsers: (id: number): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${id}/remove-all-users`),

    // Additional church endpoints found in direct fetch calls
    getActiveChurches: (): Promise<{ churches: Church[] }> =>
      apiClient.get('/admin/churches?is_active=1'),

    getChurchesByLanguage: (language: string): Promise<{ churches: Church[] }> =>
      apiClient.get(`/admin/churches?preferred_language=${language}`),

    getChurchUsers: (churchId: number): Promise<User[]> =>
      apiClient.get(`/admin/churches/${churchId}/users`),

    getChurchRecordCounts: (churchId: number): Promise<any> =>
      apiClient.get(`/admin/churches/${churchId}/record-counts`),

    getChurchDatabaseInfo: (churchId: number): Promise<any> =>
      apiClient.get(`/admin/churches/${churchId}/database-info`),

    testChurchConnection: (churchId: number): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${churchId}/test-connection`),

    manageChurchUser: (churchId: number, userId: number, action: string): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${churchId}/users/${userId}/${action}`),

    resetChurchUserPassword: (churchId: number, userId: number): Promise<ApiResponse> =>
      apiClient.post(`/admin/churches/${churchId}/users/${userId}/reset-password`),

    getChurchTables: (churchId: number): Promise<any> =>
      apiClient.get(`/admin/churches/${churchId}/tables`),

    createChurchWizard: (data: any): Promise<ApiResponse> =>
      apiClient.post('/admin/churches/wizard', data),

    getChurchOverview: (churchId: number): Promise<any> =>
      apiClient.get(`/admin/church/${churchId}/overview`),

    getChurchDatabaseRecordCounts: (churchDbId: number): Promise<any> =>
      apiClient.get(`/admin/church-database/${churchDbId}/record-counts`),
  };

  // ===== USER MANAGEMENT APIs =====
  users = {
    getAll: (filters?: any): Promise<PaginatedResponse<User>> =>
      apiClient.get(`/admin/users${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<User> =>
      apiClient.get(`/admin/users/${id}`),

    create: (user: Partial<User>): Promise<User> =>
      apiClient.post('/admin/users', user),

    update: (id: number, user: Partial<User>): Promise<User> =>
      apiClient.put(`/admin/users/${id}`, user),

    delete: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/admin/users/${id}`),

    toggleStatus: (id: number): Promise<ApiResponse> =>
      apiClient.put(`/admin/users/${id}/toggle-status`),

    // Additional user endpoints
    adminResetPassword: (userId: number): Promise<ApiResponse> =>
      apiClient.post(`/auth/admin-reset-password`, { userId }),
  };

  // ===== ACTIVITY LOGS APIs =====
  activityLogs = {
    getAll: (filters?: any): Promise<PaginatedResponse<ActivityLog>> =>
      apiClient.get(`/admin/activity-logs${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<ActivityLog> =>
      apiClient.get(`/admin/activity-logs/${id}`),

    getStats: (): Promise<any> =>
      apiClient.get('/admin/activity-logs/stats'),
  };

  // ===== PROVISIONING APIs =====
  provisioning = {
    getAll: (filters?: ProvisionFilters): Promise<PaginatedResponse<ProvisionLog>> =>
      apiClient.get(`/provisioning${apiClient.buildQueryString(filters)}`),

    getById: (id: number): Promise<ProvisionLog> =>
      apiClient.get(`/provisioning/${id}`),

    create: (request: ProvisionRequest): Promise<ProvisionLog> =>
      apiClient.post('/provisioning', request),

    update: (id: number, request: Partial<ProvisionRequest>): Promise<ProvisionLog> =>
      apiClient.put(`/provisioning/${id}`, request),

    delete: (id: number): Promise<ApiResponse> =>
      apiClient.delete(`/provisioning/${id}`),

    approve: (id: number, notes?: string): Promise<ApiResponse> =>
      apiClient.post(`/provisioning/${id}/approve`, { notes }),

    reject: (id: number, reason?: string): Promise<ApiResponse> =>
      apiClient.post(`/provisioning/${id}/reject`, { reason }),

    getStats: (): Promise<any> =>
      apiClient.get('/provisioning/stats'),
  };

  // ===== EMAIL APIs =====
  email = {
    sendTestEmail: (emailData: { to: string; subject: string; message: string }): Promise<ApiResponse> =>
      apiClient.post('/email/test', emailData),

    sendBulkEmail: (emailData: { recipients: string[]; subject: string; message: string }): Promise<ApiResponse> =>
      apiClient.post('/email/bulk', emailData),

    sendOcrResults: (emailData: any): Promise<ApiResponse> =>
      apiClient.post('/email/send-ocr-results', emailData),
  };

  // ===== SYSTEM MANAGEMENT APIs =====
  system = {
    getSystemStats: (): Promise<any> =>
      apiClient.get('/admin/system/system-stats'),

    getDatabaseHealth: (): Promise<any> =>
      apiClient.get('/admin/system/database-health'),

    getServerMetrics: (): Promise<any> =>
      apiClient.get('/admin/system/server-metrics'),

    getSystemInfo: (): Promise<any> =>
      apiClient.get('/admin/system/system-info'),

    getBackups: (): Promise<any> =>
      apiClient.get('/admin/system/backups'),

    performSystemAction: (url: string): Promise<ApiResponse> =>
      apiClient.post(url),
  };

  // ===== SERVICE MANAGEMENT APIs =====
  services = {
    getStatus: (): Promise<any> =>
      apiClient.get('/admin/services/status'),

    getHealth: (): Promise<any> =>
      apiClient.get('/admin/services/health'),

    getRecentActions: (): Promise<any> =>
      apiClient.get('/admin/services/actions/recent'),

    performAction: (serviceName: string, action: string): Promise<ApiResponse> =>
      apiClient.post(`/admin/services/${serviceName}/${action}`),

    getBackendLogs: (lines: number = 50): Promise<any> =>
      apiClient.get(`/admin/services/backend/logs?lines=${lines}`),

    rebuildFrontend: (): Promise<ApiResponse> =>
      apiClient.post('/admin/services/frontend/rebuild'),

    getServiceLogs: (serviceName: string, lines: number = 100): Promise<any> =>
      apiClient.get(`/admin/services/${serviceName}/logs?lines=${lines}`),

    // OMAI-specific service methods
    getOmaiStatus: (): Promise<any> =>
      apiClient.get('/api/omai/status'),

    getOmaiHealth: (): Promise<any> =>
      apiClient.get('/api/omai/health'),

    getOmaiLogs: (maxEntries: number = 1000): Promise<any> =>
      apiClient.get(`/api/omai/logs?max=${maxEntries}`),

    getOmaiSettings: (): Promise<any> =>
      apiClient.get('/api/omai/settings'),

    updateOmaiSettings: (settings: any): Promise<ApiResponse> =>
      apiClient.put('/api/omai/settings', settings),

    performOmaiAction: (action: string): Promise<ApiResponse> =>
      apiClient.post(`/api/omai/control/${action}`),

    getOmaiStats: (): Promise<any> =>
      apiClient.get('/api/omai/stats'),

    getOmaiAgentResults: (componentId: string): Promise<any> =>
      apiClient.get(`/api/omai/agent-results/${componentId}`),

    getOmaiAgentMetrics: (): Promise<any> =>
      apiClient.get('/api/omai/agent-metrics'),
  };

  // ===== METRICS APIs =====
  metrics = {
    getOrthodMetrics: (): Promise<any> =>
      apiClient.get('/metrics/orthod'),
  };

  // ===== MENU MANAGEMENT APIs =====
  menu = {
    getPermissions: (): Promise<any> =>
      apiClient.get('/menu-management/permissions'),

    updatePermissions: (permissions: any): Promise<ApiResponse> =>
      apiClient.put('/menu-management/permissions', permissions),
  };

  // ===== MENU PERMISSIONS APIs =====
  menuPermissions = {
    getAll: (): Promise<any[]> =>
      apiClient.get('/menu-permissions'),

    getById: (menuId: number): Promise<any> =>
      apiClient.get(`/menu-permissions/${menuId}`),

    createMenuItem: (data: any): Promise<ApiResponse> =>
      apiClient.post('/menu-permissions/menu-item', data),
  };

  // ===== GLOBAL IMAGES APIs =====
  globalImages = {
    getAll: (): Promise<any[]> =>
      apiClient.get('/admin/global-images'),

    upload: (formData: FormData): Promise<ApiResponse> =>
      apiClient.uploadFile('/admin/global-images/upload', formData as any),

    update: (imageId: number, params: any): Promise<ApiResponse> =>
      apiClient.put(`/admin/global-images/${imageId}`, params),

    saveExtracted: (data: any): Promise<ApiResponse> =>
      apiClient.post('/admin/global-images/save-extracted', data),
  };

  // ===== BACKUP APIs =====
  backup = {
    getSettings: (): Promise<any> =>
      apiClient.get('/backup/settings'),

    updateSettings: (settings: any): Promise<ApiResponse> =>
      apiClient.put('/backup/settings', settings),

    getFiles: (): Promise<any[]> =>
      apiClient.get('/backup/files'),

    getStorage: (): Promise<any> =>
      apiClient.get('/backup/storage'),

    run: (): Promise<ApiResponse> =>
      apiClient.post('/backup/run'),

    download: (backupId: string): Promise<{ url: string }> =>
      apiClient.get(`/backup/download/${backupId}`),

    delete: (backupId: string): Promise<ApiResponse> =>
      apiClient.delete(`/backup/delete/${backupId}`),
  };

  // ===== NFS BACKUP APIs =====
  nfsBackup = {
    getConfig: (): Promise<any> =>
      apiClient.get('/admin/nfs-backup/config'),

    updateConfig: (config: any): Promise<ApiResponse> =>
      apiClient.post('/admin/nfs-backup/config', config),

    testConnection: (nfsServerIP: string, remotePath: string): Promise<ApiResponse> =>
      apiClient.post('/admin/nfs-backup/test', { nfsServerIP, remotePath }),

    mount: (): Promise<ApiResponse> =>
      apiClient.post('/admin/nfs-backup/mount'),

    unmount: (): Promise<ApiResponse> =>
      apiClient.post('/admin/nfs-backup/unmount'),

    getStatus: (): Promise<any> =>
      apiClient.get('/admin/nfs-backup/status'),
  };

  // ===== LOGS APIs =====
  logs = {
    getComponents: (): Promise<any[]> =>
      apiClient.get('/logs/components'),

    getAll: (params?: any): Promise<any> =>
      apiClient.get(`/logs${apiClient.buildQueryString(params)}`),

    getComponentLevel: (component: string): Promise<any> =>
      apiClient.get(`/logs/components/${component}/level`),

    toggleComponent: (component: string): Promise<ApiResponse> =>
      apiClient.post(`/logs/components/${component}/toggle`),

    test: (): Promise<ApiResponse> =>
      apiClient.post('/logs/test'),

    getFrontendLogs: (): Promise<ApiResponse> =>
      apiClient.post('/logs/frontend'),
  };



  // ===== TEST APIs =====
  test = {
    retryFailedJobs: (): Promise<ApiResponse> =>
      apiClient.post('/admin/test/retry-failed-jobs'),
  };
}

// Create and export the Admin API instance
export const adminAPI = new AdminAPI();

export default adminAPI; 