// Roles API Service for Role and Permission Management
// Handles role and permission operations

import { ApiResponse } from '@/types/orthodox-metrics.types';

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  category: string;
  created_at: string;
}

export interface RolePermissions {
  roleId: number;
  roleName: string;
  permissions: Permission[];
  permissionIds: number[];
}

export interface RolesResponse extends ApiResponse {
  data?: Role[];
}

export interface PermissionsResponse extends ApiResponse {
  data?: {
    permissions: Permission[];
    grouped: Record<string, Permission[]>;
  };
}

export interface RolePermissionsResponse extends ApiResponse {
  data?: RolePermissions;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

export interface SetPermissionsRequest {
  permissionIds: number[];
  mode: 'replace' | 'add' | 'remove';
}

class RolesApiService {
  private baseUrl = '/api/roles';

  /**
   * List all roles
   */
  async listRoles(): Promise<RolesResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch roles');
    }

    return result;
  }

  /**
   * Create new role
   */
  async createRole(data: CreateRoleRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create role');
    }

    return result;
  }

  /**
   * Update role
   */
  async updateRole(id: number, data: UpdateRoleRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update role');
    }

    return result;
  }

  /**
   * Delete role
   */
  async deleteRole(id: number): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete role');
    }

    return result;
  }

  /**
   * List all permissions
   */
  async listPermissions(): Promise<PermissionsResponse> {
    const response = await fetch(`${this.baseUrl}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch permissions');
    }

    return result;
  }

  /**
   * Get role permissions
   */
  async getRolePermissions(id: number): Promise<RolePermissionsResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch role permissions');
    }

    return result;
  }

  /**
   * Set role permissions
   */
  async setRolePermissions(id: number, data: SetPermissionsRequest): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}/${id}/permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to set role permissions');
    }

    return result;
  }
}

export const rolesApi = new RolesApiService();
