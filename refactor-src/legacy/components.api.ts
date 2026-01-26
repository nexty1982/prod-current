/**
 * Components API Service Layer
 * Handles system component management endpoints
 */

import type { ApiResponse } from '../types/orthodox-metrics.types';
import { apiClient } from '@shared/lib/axiosInstance';

// Component types
interface Component {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  health: 'healthy' | 'degraded' | 'failed';
  category: string;
  type: string;
  path: string;
  version: string;
  lastUpdated: string;
  lastHealthCheck: string;
  // Usage tracking fields
  usageStatus: 'active' | 'inactive' | 'unused';
  lastUsed: string | null;
  totalAccesses: number;
  daysSinceLastUse: number | null;
  uniqueUsers: number;
  lastUsedFormatted: string;
  // Role-based visibility
  visibleToRoles: string[];
  // Optional fields
  dependencies?: string[];
  ports?: number[];
  healthIssues?: string[];
  configPath?: string;
}

interface ComponentsResponse {
  components: Component[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    usageStats: {
      active: number;
      inactive: number;
      unused: number;
      totalAccesses: number;
    };
    categoryBreakdown: Record<string, {
      total: number;
      healthy: number;
      degraded: number;
      failed: number;
      enabled: number;
      disabled: number;
      active: number;
      inactive: number;
      unused: number;
    }>;
    filters: {
      category: string;
      status: string;
      usageStatus: string;
      search: string;
      role: string;
    };
    globalStats: {
      totalComponents: number;
      totalCategories: number;
      topComponents: Array<{
        id: string;
        totalAccesses: number;
        status: string;
        lastUsed: string;
      }>;
      recentActivity: Array<{
        id: string;
        lastUsed: string;
        totalAccesses: number;
      }>;
    };
  };
}

interface ComponentFilters {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  usageStatus?: string;
  search?: string;
  enabled?: string;
}

interface ComponentToggleRequest {
  enabled: boolean;
}

interface ComponentLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ComponentLogsResponse {
  logs: ComponentLog[];
  total: number;
  component: string;
}

class ComponentsAPI {
  // ===== COMPONENT MANAGEMENT APIs =====
  
  /**
   * Fetch all system components with filtering and pagination
   * GET /api/admin/components
   */
  getAll = (filters?: ComponentFilters): Promise<ComponentsResponse> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = queryString ? `/admin/components?${queryString}` : '/admin/components';
    
    return apiClient.get(url);
  };

  /**
   * Get a specific component by ID
   * GET /api/admin/shared/ui/legacy/:id
   */
  getById = (id: string): Promise<Component> =>
    apiClient.get(`/admin/shared/ui/legacy/${id}`);

  /**
   * Toggle component enabled/disabled status
   * PATCH /api/admin/shared/ui/legacy/:id
   */
  toggle = (id: string, enabled: boolean): Promise<ApiResponse> =>
    apiClient.patch(`/admin/shared/ui/legacy/${id}`, { enabled });

  /**
   * Get component logs
   * GET /api/admin/shared/ui/legacy/:id/logs
   */
  getLogs = (id: string, limit?: number): Promise<ComponentLogsResponse> =>
    apiClient.get(`/admin/shared/ui/legacy/${id}/logs${limit ? `?limit=${limit}` : ''}`);

  /**
   * Get component health status
   * GET /api/admin/shared/ui/legacy/:id/health
   */
  getHealth = (id: string): Promise<{ health: Component['health']; details?: any }> =>
    apiClient.get(`/admin/shared/ui/legacy/${id}/health`);

  /**
   * Restart a component
   * POST /api/admin/shared/ui/legacy/:id/restart
   */
  restart = (id: string): Promise<ApiResponse> =>
    apiClient.post(`/admin/shared/ui/legacy/${id}/restart`);

  /**
   * Run component tests/diagnostics
   * POST /api/admin/shared/ui/legacy/:id/test
   */
  runTest = (id: string): Promise<ApiResponse> =>
    apiClient.post(`/admin/shared/ui/legacy/${id}/test`);

  /**
   * Get component statistics
   * GET /api/admin/shared/ui/legacy/stats
   */
  getStats = (): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
    enabled: number;
    disabled: number;
  }> =>
    apiClient.get('/admin/shared/ui/legacy/stats');

  /**
   * Get component configuration
   * GET /api/admin/shared/ui/legacy/:id/config
   */
  getConfig = (id: string): Promise<Record<string, any>> =>
    apiClient.get(`/admin/shared/ui/legacy/${id}/config`);

  /**
   * Update component configuration
   * PUT /api/admin/shared/ui/legacy/:id/config
   */
  updateConfig = (id: string, config: Record<string, any>): Promise<ApiResponse> =>
    apiClient.put(`/admin/shared/ui/legacy/${id}/config`, config);
}

// Export additional utility function as requested
export const runComponentTest = (id: string): Promise<any> =>
  componentsAPI.runTest(id);

// Create and export the Components API instance
export const componentsAPI = new ComponentsAPI();

export default componentsAPI;

// Export types for use in components
export type { 
  Component, 
  ComponentLog, 
  ComponentLogsResponse, 
  ComponentToggleRequest,
  ComponentsResponse,
  ComponentFilters
};