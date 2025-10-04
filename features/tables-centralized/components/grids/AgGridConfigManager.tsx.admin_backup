/**
 * Orthodox Metrics - AG Grid Configuration Manager
 * Component for managing AG Grid configurations
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useAgGridConfig,
  useAgGridConfigMutations,
  useAvailableTables,
  getCurrentTemplate,
} from '../../../core';

// Import types
import { AgGridConfig, ColumnDefinition, GridOptions } from '../../../core/types/RecordsTypes';

interface AgGridConfigManagerProps {
  churchId: number;
  open: boolean;
  onClose: () => void;
  tableName?: string;
  configName?: string;
}

export function AgGridConfigManager({
  churchId,
  open,
  onClose,
  tableName: initialTableName,
  configName: initialConfigName = 'default',
}: AgGridConfigManagerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTable, setSelectedTable] = useState(initialTableName || '');
  const [selectedConfig, setSelectedConfig] = useState(initialConfigName);
  const [isEditing, setIsEditing] = useState(false);

  // Get available tables
  const {
    tables,
    loading: tablesLoading,
  } = useAvailableTables(churchId);

  // Get AG Grid configuration
  const {
    config,
    loading: configLoading,
    error: configError,
  } = useAgGridConfig(churchId, selectedTable, selectedConfig);

  // Configuration mutations
  const {
    createConfig,
    updateConfig,
    deleteConfig,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAgGridConfigMutations({
    churchId,
    onSuccess: () => {
      setIsEditing(false);
    },
  });

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Configuration form state
  const [formData, setFormData] = useState<Partial<AgGridConfig>>({
    table_name: selectedTable,
    config_name: selectedConfig,
    grid_options: {
      pagination: true,
      paginationPageSize: 50,
      rowSelection: 'multiple',
      suppressRowClickSelection: true,
      enableRangeSelection: true,
      enableCharts: true,
      enableCellTextSelection: true,
      animateRows: true,
      domLayout: 'normal',
    },
    column_definitions: [],
    default_column_state: {},
    grid_settings: {
      rowHeight: 30,
      headerHeight: 35,
      enableFilterQuickSearch: true,
    },
    theme_settings: {
      theme: 'ag-theme-alpine',
      darkMode: false,
      customCss: '',
    },
    export_settings: {
      csvExport: { fileName: `${selectedTable}-export.csv` },
      excelExport: { fileName: `${selectedTable}-export.xlsx` },
      pdfExport: { enabled: false },
    },
    user_preferences: {},
    metadata: {
      version: 1,
      description: `AG Grid configuration for ${selectedTable}`,
    },
  });

  // Update form data when config changes
  React.useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Event handlers
  const handleTableChange = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setFormData(prev => ({
      ...prev,
      table_name: tableName,
    }));
  }, []);

  const handleConfigChange = useCallback((configName: string) => {
    setSelectedConfig(configName);
  }, []);

  const handleFormChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleNestedFormChange = useCallback((parentField: string, childField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField as keyof AgGridConfig],
        [childField]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedTable) return;

    try {
      if (isEditing) {
        await updateConfig(selectedTable, selectedConfig, formData as AgGridConfig);
      } else {
        await createConfig(formData as AgGridConfig);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  }, [selectedTable, selectedConfig, formData, isEditing, updateConfig, createConfig]);

  const handleDelete = useCallback(async () => {
    if (!selectedTable || !selectedConfig) return;

    if (window.confirm('Are you sure you want to delete this configuration?')) {
      try {
        await deleteConfig(selectedTable, selectedConfig);
        onClose();
      } catch (error) {
        console.error('Error deleting configuration:', error);
      }
    }
  }, [selectedTable, selectedConfig, deleteConfig, onClose]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Tab content components
  const renderGeneralTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Table Name"
          value={selectedTable}
          onChange={(e) => handleTableChange(e.target.value)}
          disabled={!isEditing}
          select
        >
          {tables.map((table) => (
            <MenuItem key={table.tableName} value={table.tableName}>
              {table.displayName}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Config Name"
          value={formData.config_name || ''}
          onChange={(e) => handleFormChange('config_name', e.target.value)}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          value={formData.metadata?.description || ''}
          onChange={(e) => handleNestedFormChange('metadata', 'description', e.target.value)}
          disabled={!isEditing}
          multiline
          rows={2}
        />
      </Grid>
    </Grid>
  );

  const renderGridOptionsTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.grid_options?.pagination || false}
              onChange={(e) => handleNestedFormChange('grid_options', 'pagination', e.target.checked)}
              disabled={!isEditing}
            />
          }
          label="Enable Pagination"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Page Size"
          type="number"
          value={formData.grid_options?.paginationPageSize || 50}
          onChange={(e) => handleNestedFormChange('grid_options', 'paginationPageSize', parseInt(e.target.value))}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Row Selection</InputLabel>
          <Select
            value={formData.grid_options?.rowSelection || 'none'}
            onChange={(e) => handleNestedFormChange('grid_options', 'rowSelection', e.target.value)}
            disabled={!isEditing}
            label="Row Selection"
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="single">Single</MenuItem>
            <MenuItem value="multiple">Multiple</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>DOM Layout</InputLabel>
          <Select
            value={formData.grid_options?.domLayout || 'normal'}
            onChange={(e) => handleNestedFormChange('grid_options', 'domLayout', e.target.value)}
            disabled={!isEditing}
            label="DOM Layout"
          >
            <MenuItem value="normal">Normal</MenuItem>
            <MenuItem value="autoHeight">Auto Height</MenuItem>
            <MenuItem value="print">Print</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );

  const renderThemeTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <InputLabel>Theme</InputLabel>
          <Select
            value={formData.theme_settings?.theme || 'ag-theme-alpine'}
            onChange={(e) => handleNestedFormChange('theme_settings', 'theme', e.target.value)}
            disabled={!isEditing}
            label="Theme"
          >
            <MenuItem value="ag-theme-alpine">Alpine</MenuItem>
            <MenuItem value="ag-theme-balham">Balham</MenuItem>
            <MenuItem value="ag-theme-material">Material</MenuItem>
            <MenuItem value="ag-theme-fresh">Fresh</MenuItem>
            <MenuItem value="ag-theme-dark">Dark</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.theme_settings?.darkMode || false}
              onChange={(e) => handleNestedFormChange('theme_settings', 'darkMode', e.target.checked)}
              disabled={!isEditing}
            />
          }
          label="Dark Mode"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Custom CSS"
          value={formData.theme_settings?.customCss || ''}
          onChange={(e) => handleNestedFormChange('theme_settings', 'customCss', e.target.value)}
          disabled={!isEditing}
          multiline
          rows={4}
          placeholder="/* Custom CSS rules */"
        />
      </Grid>
    </Grid>
  );

  const renderExportTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="CSV Export Filename"
          value={formData.export_settings?.csvExport?.fileName || ''}
          onChange={(e) => handleNestedFormChange('export_settings', 'csvExport', {
            ...formData.export_settings?.csvExport,
            fileName: e.target.value,
          })}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Excel Export Filename"
          value={formData.export_settings?.excelExport?.fileName || ''}
          onChange={(e) => handleNestedFormChange('export_settings', 'excelExport', {
            ...formData.export_settings?.excelExport,
            fileName: e.target.value,
          })}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.export_settings?.pdfExport?.enabled || false}
              onChange={(e) => handleNestedFormChange('export_settings', 'pdfExport', {
                ...formData.export_settings?.pdfExport,
                enabled: e.target.checked,
              })}
              disabled={!isEditing}
            />
          }
          label="Enable PDF Export"
        />
      </Grid>
    </Grid>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            AG Grid Configuration Manager
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={currentTemplate.toUpperCase()} color="primary" size="small" />
            {isEditing && (
              <Chip label="EDITING" color="warning" size="small" />
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {configLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : configError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {configError}
          </Alert>
        ) : (
          <>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
              <Tab label="General" />
              <Tab label="Grid Options" />
              <Tab label="Theme" />
              <Tab label="Export" />
            </Tabs>

            {activeTab === 0 && renderGeneralTab()}
            {activeTab === 1 && renderGridOptionsTab()}
            {activeTab === 2 && renderThemeTab()}
            {activeTab === 3 && renderExportTab()}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        
        {config && !isEditing && (
          <>
            <Button
              onClick={handleEdit}
              startIcon={<EditIcon />}
              color="primary"
            >
              Edit
            </Button>
            <Button
              onClick={handleDelete}
              startIcon={<DeleteIcon />}
              color="error"
              disabled={isDeleting}
            >
              Delete
            </Button>
          </>
        )}

        {isEditing && (
          <>
            <Button
              onClick={handleCancel}
              startIcon={<CancelIcon />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              startIcon={<SaveIcon />}
              color="primary"
              variant="contained"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AgGridConfigManager;
