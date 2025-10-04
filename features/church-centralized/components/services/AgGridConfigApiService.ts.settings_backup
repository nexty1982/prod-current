/**
 * Orthodox Metrics - AG Grid Configuration API Service
 * Handles all API calls related to AG Grid configurations
 */

import { apiJson } from '../../../../sandbox/field-mapper/api/client';

export interface AgGridConfig {
  id: number;
  table_name: string;
  config_name: string;
  is_active: boolean;
  grid_options: GridOptions;
  column_definitions: ColumnDefinition[];
  default_column_state: Record<string, ColumnState>;
  filter_model: Record<string, any>;
  sort_model: SortModel[];
  grid_settings: GridSettings;
  theme_settings: ThemeSettings;
  export_settings: ExportSettings;
  user_preferences: UserPreferences;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface GridOptions {
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];
  suppressRowClickSelection?: boolean;
  rowSelection?: 'single' | 'multiple';
  enableRangeSelection?: boolean;
  enableCharts?: boolean;
  enableClipboard?: boolean;
  suppressMenuHide?: boolean;
  allowContextMenuWithControlKey?: boolean;
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  floatingFiltersHeight?: number;
  pivotHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
  sideBar?: SideBarConfig;
  [key: string]: any;
}

export interface SideBarConfig {
  toolPanels: ToolPanel[];
  defaultToolPanel?: string;
}

export interface ToolPanel {
  id: string;
  labelDefault: string;
  labelKey: string;
  iconKey: string;
  toolPanel: string;
}

export interface ColumnDefinition {
  field: string;
  headerName: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  pinned?: 'left' | 'right';
  suppressMenu?: boolean;
  sortable?: boolean;
  filter?: string;
  editable?: boolean;
  cellEditor?: string;
  cellRenderer?: string;
  cellEditorParams?: Record<string, any>;
  hide?: boolean;
  [key: string]: any;
}

export interface ColumnState {
  width?: number;
  pinned?: 'left' | 'right';
  hide?: boolean;
  [key: string]: any;
}

export interface SortModel {
  colId: string;
  sort: 'asc' | 'desc';
}

export interface GridSettings {
  enableSorting?: boolean;
  enableFilter?: boolean;
  enableColResize?: boolean;
  enableRangeSelection?: boolean;
  enableCharts?: boolean;
  enableClipboard?: boolean;
  suppressRowClickSelection?: boolean;
  rowSelection?: 'single' | 'multiple';
  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];
  sideBar?: SideBarConfig;
  [key: string]: any;
}

export interface ThemeSettings {
  theme: string;
  customTheme?: boolean;
  darkMode?: boolean;
  compactMode?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  rowHeight?: number;
  headerHeight?: number;
  groupHeaderHeight?: number;
  floatingFiltersHeight?: number;
  pivotHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
}

export interface ExportSettings {
  enableExport?: boolean;
  exportFormats?: string[];
  exportFileName?: string;
  exportPath?: string;
  csvExport?: CsvExportSettings;
  excelExport?: ExcelExportSettings;
  pdfExport?: PdfExportSettings;
}

export interface CsvExportSettings {
  fileName: string;
  separator: string;
  suppressQuotes: boolean;
}

export interface ExcelExportSettings {
  fileName: string;
  sheetName: string;
  suppressTextAsCDATA: boolean;
}

export interface PdfExportSettings {
  fileName: string;
  title: string;
  author: string;
  subject: string;
  keywords: string;
}

export interface UserPreferences {
  rememberColumnState?: boolean;
  rememberGroupState?: boolean;
  rememberFilterState?: boolean;
  rememberSortState?: boolean;
  rememberPivotState?: boolean;
  rememberColumnWidth?: boolean;
  rememberColumnOrder?: boolean;
  rememberColumnVisibility?: boolean;
  rememberRowSelection?: boolean;
  rememberScrollPosition?: boolean;
  column_state?: Record<string, ColumnState>;
  filter_state?: Record<string, any>;
  sort_state?: SortModel[];
  group_state?: any;
  pivot_state?: any;
  scroll_position?: { top: number; left: number };
  row_selection?: any;
  last_saved?: string;
  saved_by?: number;
}

export interface AgGridConfigResponse {
  success: boolean;
  data: AgGridConfig | AgGridConfig[];
  church?: {
    id: number;
    db: string;
  };
  error?: string;
  details?: string;
}

export interface CreateAgGridConfigRequest {
  table_name: string;
  config_name?: string;
  grid_options?: Partial<GridOptions>;
  column_definitions?: ColumnDefinition[];
  default_column_state?: Record<string, ColumnState>;
  filter_model?: Record<string, any>;
  sort_model?: SortModel[];
  grid_settings?: Partial<GridSettings>;
  theme_settings?: Partial<ThemeSettings>;
  export_settings?: Partial<ExportSettings>;
  user_preferences?: Partial<UserPreferences>;
}

export interface UpdateAgGridConfigRequest extends Partial<CreateAgGridConfigRequest> {}

export interface GridStateData {
  column_state?: Record<string, ColumnState>;
  filter_state?: Record<string, any>;
  sort_state?: SortModel[];
  group_state?: any;
  pivot_state?: any;
  scroll_position?: { top: number; left: number };
  row_selection?: any;
}

export interface SavedGridState {
  column_state: Record<string, ColumnState> | null;
  filter_state: Record<string, any> | null;
  sort_state: SortModel[] | null;
  group_state: any | null;
  pivot_state: any | null;
  scroll_position: { top: number; left: number } | null;
  row_selection: any | null;
  last_saved: string | null;
  saved_by: number | null;
}

class AgGridConfigApiService {
  private baseUrl = '/api/ag-grid-config';

  /**
   * Get all AG Grid configurations for a church
   */
  async getGridConfigs(churchId: number): Promise<AgGridConfig[]> {
    try {
      const response = await apiJson.get<AgGridConfigResponse>(
        `${this.baseUrl}?church_id=${churchId}`
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch AG Grid configurations');
      }
      
      return Array.isArray(response.data) ? response.data : [response.data];
    } catch (error) {
      console.error('Error fetching AG Grid configurations:', error);
      throw error;
    }
  }

  /**
   * Get specific AG Grid configuration
   */
  async getGridConfig(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<AgGridConfig | null> {
    try {
      const response = await apiJson.get<AgGridConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}&config_name=${configName}`
      );
      
      if (!response.success) {
        if (response.error?.includes('not found')) {
          return null;
        }
        throw new Error(response.error || 'Failed to fetch AG Grid configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error fetching AG Grid configuration:', error);
      throw error;
    }
  }

  /**
   * Create new AG Grid configuration
   */
  async createGridConfig(
    churchId: number,
    config: CreateAgGridConfigRequest
  ): Promise<AgGridConfig> {
    try {
      const response = await apiJson.post<AgGridConfigResponse>(
        `${this.baseUrl}?church_id=${churchId}`,
        config
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create AG Grid configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error creating AG Grid configuration:', error);
      throw error;
    }
  }

  /**
   * Update AG Grid configuration
   */
  async updateGridConfig(
    churchId: number,
    tableName: string,
    config: UpdateAgGridConfigRequest,
    configName: string = 'default'
  ): Promise<AgGridConfig> {
    try {
      const response = await apiJson.put<AgGridConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}&config_name=${configName}`,
        config
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update AG Grid configuration');
      }
      
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error) {
      console.error('Error updating AG Grid configuration:', error);
      throw error;
    }
  }

  /**
   * Delete AG Grid configuration
   */
  async deleteGridConfig(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<void> {
    try {
      const response = await apiJson.delete<AgGridConfigResponse>(
        `${this.baseUrl}/${tableName}?church_id=${churchId}&config_name=${configName}`
      );
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete AG Grid configuration');
      }
    } catch (error) {
      console.error('Error deleting AG Grid configuration:', error);
      throw error;
    }
  }

  /**
   * Get column definitions for a table
   */
  async getColumnDefinitions(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<ColumnDefinition[]> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: ColumnDefinition[];
        error?: string;
      }>(`${this.baseUrl}/${tableName}/columns?church_id=${churchId}&config_name=${configName}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch column definitions');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching column definitions:', error);
      throw error;
    }
  }

  /**
   * Get grid options for a table
   */
  async getGridOptions(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<GridOptions> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: GridOptions;
        error?: string;
      }>(`${this.baseUrl}/${tableName}/grid-options?church_id=${churchId}&config_name=${configName}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch grid options');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching grid options:', error);
      throw error;
    }
  }

  /**
   * Save user's grid state
   */
  async saveGridState(
    churchId: number,
    tableName: string,
    stateData: GridStateData,
    configName: string = 'default'
  ): Promise<void> {
    try {
      const response = await apiJson.post<{
        success: boolean;
        data: { message: string };
        error?: string;
      }>(`${this.baseUrl}/${tableName}/save-state?church_id=${churchId}&config_name=${configName}`, stateData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save grid state');
      }
    } catch (error) {
      console.error('Error saving grid state:', error);
      throw error;
    }
  }

  /**
   * Load user's saved grid state
   */
  async loadGridState(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<SavedGridState> {
    try {
      const response = await apiJson.get<{
        success: boolean;
        data: SavedGridState;
        error?: string;
      }>(`${this.baseUrl}/${tableName}/load-state?church_id=${churchId}&config_name=${configName}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to load grid state');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error loading grid state:', error);
      throw error;
    }
  }

  /**
   * Get complete AG Grid configuration for frontend
   */
  async getCompleteGridConfig(
    churchId: number,
    tableName: string,
    configName: string = 'default'
  ): Promise<{
    gridOptions: GridOptions;
    columnDefs: ColumnDefinition[];
    defaultColDef: Record<string, ColumnState>;
    filterModel: Record<string, any>;
    sortModel: SortModel[];
    gridSettings: GridSettings;
    themeSettings: ThemeSettings;
    exportSettings: ExportSettings;
    userPreferences: UserPreferences;
    tableName: string;
    configName: string;
    lastUpdated: string;
  } | null> {
    try {
      const config = await this.getGridConfig(churchId, tableName, configName);
      if (!config) return null;

      return {
        gridOptions: config.grid_options,
        columnDefs: config.column_definitions,
        defaultColDef: config.default_column_state,
        filterModel: config.filter_model,
        sortModel: config.sort_model,
        gridSettings: config.grid_settings,
        themeSettings: config.theme_settings,
        exportSettings: config.export_settings,
        userPreferences: config.user_preferences,
        tableName: config.table_name,
        configName: config.config_name,
        lastUpdated: config.updated_at
      };
    } catch (error) {
      console.error('Error fetching complete grid configuration:', error);
      throw error;
    }
  }

  /**
   * Clone existing configuration
   */
  async cloneConfiguration(
    churchId: number,
    tableName: string,
    sourceConfigName: string,
    newConfigName: string
  ): Promise<AgGridConfig> {
    try {
      const sourceConfig = await this.getGridConfig(churchId, tableName, sourceConfigName);
      if (!sourceConfig) {
        throw new Error('Source configuration not found');
      }

      const newConfig: CreateAgGridConfigRequest = {
        table_name: tableName,
        config_name: newConfigName,
        grid_options: sourceConfig.grid_options,
        column_definitions: sourceConfig.column_definitions,
        default_column_state: sourceConfig.default_column_state,
        filter_model: sourceConfig.filter_model,
        sort_model: sourceConfig.sort_model,
        grid_settings: sourceConfig.grid_settings,
        theme_settings: sourceConfig.theme_settings,
        export_settings: sourceConfig.export_settings,
        user_preferences: {} // Empty user preferences for new config
      };

      return await this.createGridConfig(churchId, newConfig);
    } catch (error) {
      console.error('Error cloning configuration:', error);
      throw error;
    }
  }

  /**
   * Get available configurations for a table
   */
  async getTableConfigurations(
    churchId: number,
    tableName: string
  ): Promise<Array<{
    configName: string;
    displayName: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>> {
    try {
      const configs = await this.getGridConfigs(churchId);
      return configs
        .filter(config => config.table_name === tableName)
        .map(config => ({
          configName: config.config_name,
          displayName: config.config_name,
          description: undefined,
          isActive: config.is_active,
          createdAt: config.created_at,
          updatedAt: config.updated_at
        }));
    } catch (error) {
      console.error('Error fetching table configurations:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const agGridConfigApiService = new AgGridConfigApiService();

// Export class for testing
export { AgGridConfigApiService };
