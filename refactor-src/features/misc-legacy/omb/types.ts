export interface BoundComponent {
  id: string;
  name: string;
  icon: string;
  type: "icon" | "card" | "button" | "grid-item";
  route: string;
  dbTable: string;
  roles: string[];
  description?: string;
  size?: "small" | "medium" | "large";
  placement?: {
    x: number;
    y: number;
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
  };
}

export interface ComponentPaletteItem {
  id: string;
  name: string;
  icon: string | React.ComponentType<any>;
  type: "icon" | "card" | "button" | "grid-item" | "component";
  description: string;
  category: "navigation" | "data" | "action" | "display";
  tags?: string[];
  props?: Array<{
    name: string;
    optional: boolean;
    type: string;
    description: string;
  }>;
  configurable?: boolean;
  path?: string;
  usage?: {
    inMenu: boolean;
    inRoutes: boolean;
    menuContext: string | null;
    routeContext: string | null;
  };
}

export interface MetadataFormData {
  name: string;
  description: string;
  route: string;
  dbTable: string;
  roles: string[];
  size: "small" | "medium" | "large";
}

export interface OMBEditorState {
  selectedComponent: ComponentPaletteItem | null;
  boundComponents: BoundComponent[];
  currentFormData: MetadataFormData;
  isPreviewMode: boolean;
  isSaving: boolean;
  error: string | null;
  pluginResults?: any[];
  generatedDocPath?: string | null;
}

export interface DatabaseTable {
  name: string;
  description: string;
  schema: string;
}

export interface APIRoute {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  description: string;
}

export interface AccessRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
} 