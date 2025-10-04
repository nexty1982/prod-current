/**
 * Router Menu Studio Types
 * Shared types for dynamic router and menu management
 */

export type Role = 'super_admin' | 'default' | 'anonymous';

export interface RouteRecord {
  id?: number;
  path: string;
  component_path: string;
  title?: string;
  required_role?: Role;
  is_protected?: boolean;
  meta?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface MenuRecord {
  id?: number;
  name: string;
  role: Role;            // 'super_admin' | 'default'
  is_active?: boolean;
  version?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id?: number;
  menu_id?: number;
  label: string;
  path?: string;
  icon?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_devel_tool?: boolean;
  visible_roles?: Role[];     // optional per-item filtering
  children?: MenuItem[];      // client-side only
}

export interface RouterMenuVersion {
  id: number;
  scope: 'routes' | 'menu';
  scope_id?: number;
  change_type: 'create' | 'update' | 'delete' | 'publish' | 'reorder' | 'template';
  before_json?: any;
  after_json?: any;
  changed_by?: string;
  created_at: string;
}

export interface RouterMenuTemplate {
  id?: number;
  name: string;
  description?: string;
  template_type: 'menu' | 'routes' | 'combined';
  payload: any;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
  count?: number;
}

// Filter/Query types
export interface RoutesFilter {
  role?: Role;
  q?: string;  // search query
}

export interface VersionsFilter {
  scope: 'routes' | 'menu';
  scope_id?: number;
}

export interface TemplatesFilter {
  template_type?: 'menu' | 'routes' | 'combined';
}

// Form/Edit types
export interface RouteFormData {
  path: string;
  component_path: string;
  title?: string;
  required_role: Role;
  is_protected: boolean;
  meta?: Record<string, any>;
}

export interface MenuFormData {
  name: string;
  role: Role;
  is_active: boolean;
}

export interface MenuItemsUpdateData {
  items: MenuItem[];
}

export interface TemplateCreateData {
  name: string;
  description?: string;
  template_type: 'menu' | 'routes' | 'combined';
  payload: any;
}

export interface TemplateApplyData {
  role: Role;
}

// Drag and drop types for menu reordering
export interface DragResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
}

// Studio state management types
export interface RouterMenuStudioState {
  routes: RouteRecord[];
  menus: MenuRecord[];
  currentMenuItems: MenuItem[];
  selectedMenuId?: number;
  selectedRole: Role;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  versions: RouterMenuVersion[];
  templates: RouterMenuTemplate[];
}

// Component props types
export interface RouteGridProps {
  routes: RouteRecord[];
  onRouteAdd: (route: RouteFormData) => void;
  onRouteEdit: (id: number, route: Partial<RouteFormData>) => void;
  onRouteDelete: (id: number) => void;
  onSaveTemplate: (name: string, routes: RouteRecord[]) => void;
  onLoadTemplate: (templateId: number) => void;
  isLoading?: boolean;
}

export interface MenuTreeProps {
  menuId?: number;
  role: Role;
  items: MenuItem[];
  onItemsChange: (items: MenuItem[]) => void;
  onPublish: () => void;
  onRevert: (versionId: number) => void;
  onSaveTemplate: (name: string, items: MenuItem[]) => void;
  onLoadTemplate: (templateId: number) => void;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export interface DiffPanelProps {
  beforeData?: any;
  afterData?: any;
  scope: 'routes' | 'menu';
  changedBy?: string;
  timestamp?: string;
  changeType?: string;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RouteValidation extends ValidationResult {
  duplicatePaths?: string[];
  missingComponents?: string[];
  securityIssues?: string[];
}

export interface MenuValidation extends ValidationResult {
  orphanedItems?: MenuItem[];
  circularReferences?: MenuItem[];
  missingPaths?: MenuItem[];
}
