/**
 * Router Menu Studio API Client
 * Provides functions for interacting with the router menu API
 */

import {
  RouteRecord,
  MenuRecord,
  MenuItem,
  RouterMenuVersion,
  RouterMenuTemplate,
  ApiResponse,
  RoutesFilter,
  VersionsFilter,
  TemplatesFilter,
  RouteFormData,
  MenuFormData,
  MenuItemsUpdateData,
  TemplateCreateData,
  TemplateApplyData,
  Role
} from '@/types/router-menu';

const API_BASE = '/api/router-menu';

// Helper function for making API requests
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    headers: { ...defaultHeaders, ...options.headers },
    ...options,
  };

  // Include credentials for authentication
  config.credentials = 'include';

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// ===== ROUTES API =====

export async function listRoutes(filters: RoutesFilter = {}): Promise<ApiResponse<RouteRecord[]>> {
  const params = new URLSearchParams();
  if (filters.role) params.append('role', filters.role);
  if (filters.q) params.append('q', filters.q);
  
  const query = params.toString();
  const endpoint = `/routes${query ? `?${query}` : ''}`;
  
  return apiRequest<RouteRecord[]>(endpoint);
}

export async function createRoute(route: RouteFormData): Promise<ApiResponse<{ id: number }>> {
  return apiRequest<{ id: number }>('/routes', {
    method: 'POST',
    body: JSON.stringify(route),
  });
}

export async function updateRoute(
  id: number, 
  route: Partial<RouteFormData>
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/routes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(route),
  });
}

export async function deleteRoute(id: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/routes/${id}`, {
    method: 'DELETE',
  });
}

// ===== MENUS API =====

export async function listMenus(role?: Role): Promise<ApiResponse<MenuRecord[]>> {
  const params = new URLSearchParams();
  if (role) params.append('role', role);
  
  const query = params.toString();
  const endpoint = `/menus${query ? `?${query}` : ''}`;
  
  return apiRequest<MenuRecord[]>(endpoint);
}

export async function createMenu(menu: MenuFormData): Promise<ApiResponse<{ id: number }>> {
  return apiRequest<{ id: number }>('/menus', {
    method: 'POST',
    body: JSON.stringify(menu),
  });
}

export async function updateMenu(
  id: number, 
  menu: Partial<MenuFormData>
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/menus/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(menu),
  });
}

// ===== MENU ITEMS API =====

export async function getMenuItems(menuId: number): Promise<ApiResponse<MenuItem[]>> {
  return apiRequest<MenuItem[]>(`/menus/${menuId}/items`);
}

export async function updateMenuItems(
  menuId: number, 
  data: MenuItemsUpdateData
): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/menus/${menuId}/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function publishMenu(menuId: number): Promise<ApiResponse<void>> {
  return apiRequest<void>(`/menus/${menuId}/publish`, {
    method: 'POST',
  });
}

// ===== VERSIONS API =====

export async function getVersions(filters: VersionsFilter): Promise<ApiResponse<RouterMenuVersion[]>> {
  const params = new URLSearchParams();
  params.append('scope', filters.scope);
  if (filters.scope_id !== undefined) {
    params.append('scope_id', filters.scope_id.toString());
  }
  
  const query = params.toString();
  const endpoint = `/versions?${query}`;
  
  return apiRequest<RouterMenuVersion[]>(endpoint);
}

// ===== TEMPLATES API =====

export async function saveTemplate(data: TemplateCreateData): Promise<ApiResponse<{ id: number }>> {
  return apiRequest<{ id: number }>('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listTemplates(filters: TemplatesFilter = {}): Promise<ApiResponse<RouterMenuTemplate[]>> {
  const params = new URLSearchParams();
  if (filters.template_type) params.append('template_type', filters.template_type);
  
  const query = params.toString();
  const endpoint = `/templates${query ? `?${query}` : ''}`;
  
  return apiRequest<RouterMenuTemplate[]>(endpoint);
}

export async function applyTemplate(
  templateId: number, 
  data: TemplateApplyData
): Promise<ApiResponse<void>> {
  const params = new URLSearchParams();
  params.append('role', data.role);
  
  const query = params.toString();
  const endpoint = `/templates/${templateId}/apply?${query}`;
  
  return apiRequest<void>(endpoint, {
    method: 'POST',
  });
}

// ===== UTILITY FUNCTIONS =====

/**
 * Validate route data before sending to API
 */
export function validateRoute(route: Partial<RouteFormData>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!route.path) {
    errors.push('Path is required');
  } else if (!route.path.startsWith('/')) {
    errors.push('Path must start with /');
  }

  if (!route.component_path) {
    errors.push('Component path is required');
  } else {
    const allowedPrefixes = [
      'views/', 'components/', 'features/', 'pages/', 'tools/',
      '@/features/', '@/views/', '@/components/', '@/pages/', '@/tools/'
    ];
    
    const isAllowed = allowedPrefixes.some(prefix => 
      route.component_path!.startsWith(prefix)
    );
    
    if (!isAllowed) {
      errors.push('Component path must start with an allowed prefix');
    }
  }

  if (route.required_role && !['super_admin', 'default', 'anonymous'].includes(route.required_role)) {
    errors.push('Invalid role specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate menu item data
 */
export function validateMenuItem(item: Partial<MenuItem>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.label || item.label.trim().length === 0) {
    errors.push('Label is required');
  }

  if (item.path && !item.path.startsWith('/')) {
    errors.push('Path must start with / if provided');
  }

  if (item.visible_roles) {
    const validRoles = ['super_admin', 'default', 'anonymous'];
    const invalidRoles = item.visible_roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      errors.push(`Invalid roles: ${invalidRoles.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Build menu tree from flat array
 */
export function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const itemMap = new Map<number, MenuItem>();
  const rootItems: MenuItem[] = [];

  // First pass: create map and initialize children arrays
  items.forEach(item => {
    itemMap.set(item.id!, { ...item, children: [] });
    
    if (!item.parent_id) {
      rootItems.push(itemMap.get(item.id!)!);
    }
  });

  // Second pass: build parent-child relationships
  items.forEach(item => {
    if (item.parent_id && itemMap.has(item.parent_id)) {
      const parent = itemMap.get(item.parent_id)!;
      const child = itemMap.get(item.id!)!;
      parent.children!.push(child);
    }
  });

  return rootItems;
}

/**
 * Flatten menu tree to array
 */
export function flattenMenuTree(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];

  function processItem(item: MenuItem, parentId: number | null = null, sortOrder = 0) {
    const flatItem: MenuItem = {
      ...item,
      parent_id: parentId,
      sort_order: sortOrder,
    };

    // Remove children from flat item
    delete flatItem.children;
    result.push(flatItem);

    // Process children recursively
    if (item.children && item.children.length > 0) {
      item.children.forEach((child, index) => {
        processItem(child, item.id || null, (index + 1) * 10);
      });
    }
  }

  items.forEach((item, index) => {
    processItem(item, null, (index + 1) * 10);
  });

  return result;
}

/**
 * Check if user has permission for router menu studio
 */
export function hasRouterMenuPermission(userRole: string): boolean {
  return userRole === 'super_admin';
}

/**
 * Get default route form data
 */
export function getDefaultRouteData(): RouteFormData {
  return {
    path: '',
    component_path: '',
    title: '',
    required_role: 'default',
    is_protected: true,
    meta: {}
  };
}

/**
 * Get default menu form data
 */
export function getDefaultMenuData(): MenuFormData {
  return {
    name: '',
    role: 'default',
    is_active: true
  };
}

/**
 * Get default menu item data
 */
export function getDefaultMenuItem(): MenuItem {
  return {
    label: '',
    path: '',
    icon: '',
    sort_order: 0,
    is_devel_tool: false,
    visible_roles: ['default']
  };
}
