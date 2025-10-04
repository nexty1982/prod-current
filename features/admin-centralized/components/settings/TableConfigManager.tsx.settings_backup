/**
 * Orthodox Metrics - Table Configuration Manager
 * Comprehensive interface for managing record table configurations
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
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Menu,
  MenuList,
  ListItemIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreIcon,
  TableChart as TableIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useRecordTableConfig,
  useRecordTableConfigs,
  useTableConfigMutations,
  useAvailableTables,
  getCurrentTemplate,
} from '../../../core';

// Import types
import { RecordTableConfig, FieldDefinition, DisplaySettings, SearchConfig, ValidationRules } from '../../../core/types/RecordsTypes';

interface TableConfigManagerProps {
  churchId: number;
  open: boolean;
  onClose: () => void;
  initialTableName?: string;
  initialConfigName?: string;
}

export function TableConfigManager({
  churchId,
  open,
  onClose,
  initialTableName,
  initialConfigName = 'default',
}: TableConfigManagerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTable, setSelectedTable] = useState(initialTableName || '');
  const [selectedConfig, setSelectedConfig] = useState(initialConfigName);
  const [isEditing, setIsEditing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get available tables
  const {
    tables,
    loading: tablesLoading,
  } = useAvailableTables(churchId);

  // Get table configurations
  const {
    configs,
    loading: configsLoading,
    error: configsError,
    refetch: refetchConfigs,
  } = useRecordTableConfigs(churchId, selectedTable);

  // Get specific configuration
  const {
    config,
    loading: configLoading,
    error: configError,
  } = useRecordTableConfig(churchId, selectedTable, selectedConfig);

  // Configuration mutations
  const {
    createConfig,
    updateConfig,
    deleteConfig,
    duplicateConfig,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTableConfigMutations({
    churchId,
    onSuccess: () => {
      setIsEditing(false);
      refetchConfigs();
    },
  });

  // Configuration form state
  const [formData, setFormData] = useState<Partial<RecordTableConfig>>({
    table_name: selectedTable,
    config_name: selectedConfig,
    field_definitions: {},
    display_settings: {
      pagination: { enabled: true, defaultLimit: 50, limits: [10, 25, 50, 100] },
      actions: { view: true, edit: true, delete: true, export: true },
      defaultSort: { field: 'id', direction: 'desc' },
    },
    search_config: {
      searchableFields: [],
      filterableFields: [],
    },
    validation_rules: {},
    import_export_settings: {
      supportedFormats: ['csv', 'json'],
      defaultMapping: {},
    },
    certificate_settings: {
      templatePath: '',
      fieldPositions: {},
    },
    metadata: {
      version: 1,
      description: '',
    },
  });

  // Update form data when config changes
  React.useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Filtered configurations
  const filteredConfigs = useMemo(() => {
    if (!configs) return [];
    return configs.filter(config => 
      config.config_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.table_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [configs, searchTerm]);

  // Event handlers
  const handleTableChange = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setSelectedConfig('default');
    setFormData(prev => ({
      ...prev,
      table_name: tableName,
      config_name: 'default',
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
        ...prev[parentField as keyof RecordTableConfig],
        [childField]: value,
      },
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedTable) return;

    try {
      if (isEditing) {
        await updateConfig(selectedTable, selectedConfig, formData as RecordTableConfig);
      } else {
        await createConfig(formData as RecordTableConfig);
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
        setSelectedConfig('default');
      } catch (error) {
        console.error('Error deleting configuration:', error);
      }
    }
  }, [selectedTable, selectedConfig, deleteConfig]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedTable || !selectedConfig) return;

    try {
      const newConfigName = `${selectedConfig}_copy`;
      await duplicateConfig(selectedTable, selectedConfig, newConfigName);
      setSelectedConfig(newConfigName);
    } catch (error) {
      console.error('Error duplicating configuration:', error);
    }
  }, [selectedTable, selectedConfig, duplicateConfig]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Render field definitions tab
  const renderFieldDefinitionsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Field Definitions</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {/* Add field logic */}}
          disabled={!isEditing}
        >
          Add Field
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Field Name</TableCell>
              <TableCell>Display Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Editable</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(formData.field_definitions || {}).map(([fieldName, fieldDef]) => (
              <TableRow key={fieldName}>
                <TableCell>{fieldName}</TableCell>
                <TableCell>{fieldDef.label}</TableCell>
                <TableCell>
                  <Chip label={fieldDef.type} size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={fieldDef.required ? 'Yes' : 'No'} 
                    color={fieldDef.required ? 'error' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={fieldDef.editable ? 'Yes' : 'No'} 
                    color={fieldDef.editable ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => {/* Edit field */}}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => {/* Delete field */}}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Render display settings tab
  const renderDisplaySettingsTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={formData.display_settings?.pagination?.enabled || false}
              onChange={(e) => handleNestedFormChange('display_settings', 'pagination', {
                ...formData.display_settings?.pagination,
                enabled: e.target.checked,
              })}
              disabled={!isEditing}
            />
          }
          label="Enable Pagination"
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Default Page Size"
          type="number"
          value={formData.display_settings?.pagination?.defaultLimit || 50}
          onChange={(e) => handleNestedFormChange('display_settings', 'pagination', {
            ...formData.display_settings?.pagination,
            defaultLimit: parseInt(e.target.value),
          })}
          disabled={!isEditing}
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Available Page Sizes
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {[10, 25, 50, 100].map(size => (
            <Chip
              key={size}
              label={size}
              color={formData.display_settings?.pagination?.limits?.includes(size) ? 'primary' : 'default'}
              onClick={() => {
                if (!isEditing) return;
                const currentLimits = formData.display_settings?.pagination?.limits || [];
                const newLimits = currentLimits.includes(size)
                  ? currentLimits.filter(l => l !== size)
                  : [...currentLimits, size];
                handleNestedFormChange('display_settings', 'pagination', {
                  ...formData.display_settings?.pagination,
                  limits: newLimits,
                });
              }}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  );

  // Render search config tab
  const renderSearchConfigTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Searchable Fields
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Object.keys(formData.field_definitions || {}).map(fieldName => (
            <Chip
              key={fieldName}
              label={fieldName}
              color={formData.search_config?.searchableFields?.includes(fieldName) ? 'primary' : 'default'}
              onClick={() => {
                if (!isEditing) return;
                const currentFields = formData.search_config?.searchableFields || [];
                const newFields = currentFields.includes(fieldName)
                  ? currentFields.filter(f => f !== fieldName)
                  : [...currentFields, fieldName];
                handleNestedFormChange('search_config', 'searchableFields', newFields);
              }}
            />
          ))}
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Filterable Fields
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {Object.keys(formData.field_definitions || {}).map(fieldName => (
            <Chip
              key={fieldName}
              label={fieldName}
              color={formData.search_config?.filterableFields?.includes(fieldName) ? 'primary' : 'default'}
              onClick={() => {
                if (!isEditing) return;
                const currentFields = formData.search_config?.filterableFields || [];
                const newFields = currentFields.includes(fieldName)
                  ? currentFields.filter(f => f !== fieldName)
                  : [...currentFields, fieldName];
                handleNestedFormChange('search_config', 'filterableFields', newFields);
              }}
            />
          ))}
        </Box>
      </Grid>
    </Grid>
  );

  // Render validation rules tab
  const renderValidationRulesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Validation Rules
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Validation rules are automatically generated based on field definitions. 
        You can customize them here for specific validation requirements.
      </Alert>
      {/* Validation rules configuration would go here */}
    </Box>
  );

  // Render import/export settings tab
  const renderImportExportTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <Typography variant="subtitle1" gutterBottom>
          Supported Formats
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['csv', 'json', 'xlsx', 'pdf'].map(format => (
            <Chip
              key={format}
              label={format.toUpperCase()}
              color={formData.import_export_settings?.supportedFormats?.includes(format) ? 'primary' : 'default'}
              onClick={() => {
                if (!isEditing) return;
                const currentFormats = formData.import_export_settings?.supportedFormats || [];
                const newFormats = currentFormats.includes(format)
                  ? currentFormats.filter(f => f !== format)
                  : [...currentFormats, format];
                handleNestedFormChange('import_export_settings', 'supportedFormats', newFormats);
              }}
            />
          ))}
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Default Field Mapping
        </Typography>
        <Alert severity="info">
          Field mapping for import/export will be automatically generated based on field definitions.
        </Alert>
      </Grid>
    </Grid>
  );

  // Render certificate settings tab
  const renderCertificateTab = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Certificate Template Path"
          value={formData.certificate_settings?.templatePath || ''}
          onChange={(e) => handleNestedFormChange('certificate_settings', 'templatePath', e.target.value)}
          disabled={!isEditing}
          helperText="Path to the certificate template file"
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle1" gutterBottom>
          Field Positions
        </Typography>
        <Alert severity="info">
          Field positions for certificate generation will be configured in the certificate template editor.
        </Alert>
      </Grid>
    </Grid>
  );

  // Loading state
  if (configsLoading || configLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading configurations...</Typography>
      </Box>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Table Configuration Manager
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
        <Grid container spacing={2}>
          {/* Configuration List */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Search configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon fontSize="small" />,
                  }}
                />
                <IconButton onClick={() => refetchConfigs()}>
                  <RefreshIcon />
                </IconButton>
              </Box>

              <List dense>
                {filteredConfigs.map((config) => (
                  <ListItem
                    key={config.config_name}
                    selected={config.config_name === selectedConfig}
                    onClick={() => handleConfigChange(config.config_name)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText
                      primary={config.config_name}
                      secondary={config.table_name}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnchorEl(e.currentTarget);
                        }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Configuration Details */}
          <Grid item xs={12} md={9}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
                <Tab label="Field Definitions" />
                <Tab label="Display Settings" />
                <Tab label="Search Config" />
                <Tab label="Validation Rules" />
                <Tab label="Import/Export" />
                <Tab label="Certificates" />
              </Tabs>
            </Box>

            {activeTab === 0 && renderFieldDefinitionsTab()}
            {activeTab === 1 && renderDisplaySettingsTab()}
            {activeTab === 2 && renderSearchConfigTab()}
            {activeTab === 3 && renderValidationRulesTab()}
            {activeTab === 4 && renderImportExportTab()}
            {activeTab === 5 && renderCertificateTab()}
          </Grid>
        </Grid>
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
              onClick={handleDuplicate}
              startIcon={<CopyIcon />}
            >
              Duplicate
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

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuList>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <ViewIcon />
            </ListItemIcon>
            <ListItemText>View</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <EditIcon />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <CopyIcon />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon>
              <DeleteIcon />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>
    </Dialog>
  );
}

export default TableConfigManager;
