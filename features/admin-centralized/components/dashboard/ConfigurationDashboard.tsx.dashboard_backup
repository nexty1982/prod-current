/**
 * Orthodox Metrics - Configuration Dashboard
 * Centralized dashboard for managing all record system configurations
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Chip,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  TableChart as TableIcon,
  ViewModule as GridIcon,
  Build as BuildIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useRecordTableConfigs,
  useAgGridConfigs,
  useAvailableTables,
  getCurrentTemplate,
} from '../../../core';

// Import components
import { TableConfigManager } from './TableConfigManager';
import { AgGridConfigManager } from '../ag-grid/AgGridConfigManager';

// Import types
import { RecordTableConfig, AgGridConfig } from '../../../core/types/RecordsTypes';

interface ConfigurationDashboardProps {
  churchId: number;
  open: boolean;
  onClose: () => void;
}

export function ConfigurationDashboard({
  churchId,
  open,
  onClose,
}: ConfigurationDashboardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [showTableConfigManager, setShowTableConfigManager] = useState(false);
  const [showAgGridConfigManager, setShowAgGridConfigManager] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Get available tables
  const {
    tables,
    loading: tablesLoading,
    error: tablesError,
    refetch: refetchTables,
  } = useAvailableTables(churchId);

  // Get table configurations
  const {
    configs: tableConfigs,
    loading: tableConfigsLoading,
    error: tableConfigsError,
    refetch: refetchTableConfigs,
  } = useRecordTableConfigs(churchId);

  // Get AG Grid configurations
  const {
    configs: agGridConfigs,
    loading: agGridConfigsLoading,
    error: agGridConfigsError,
    refetch: refetchAgGridConfigs,
  } = useAgGridConfigs(churchId);

  // Configuration statistics
  const configStats = useMemo(() => {
    const totalTables = tables.length;
    const totalTableConfigs = tableConfigs?.length || 0;
    const totalAgGridConfigs = agGridConfigs?.length || 0;
    const tablesWithConfigs = new Set(tableConfigs?.map(c => c.table_name)).size;
    const tablesWithAgGridConfigs = new Set(agGridConfigs?.map(c => c.table_name)).size;

    return {
      totalTables,
      totalTableConfigs,
      totalAgGridConfigs,
      tablesWithConfigs,
      tablesWithAgGridConfigs,
      configCoverage: totalTables > 0 ? (tablesWithConfigs / totalTables) * 100 : 0,
      agGridCoverage: totalTables > 0 ? (tablesWithAgGridConfigs / totalTables) * 100 : 0,
    };
  }, [tables, tableConfigs, agGridConfigs]);

  // Event handlers
  const handleTableConfigManager = useCallback((tableName?: string) => {
    setSelectedTable(tableName || '');
    setShowTableConfigManager(true);
  }, []);

  const handleAgGridConfigManager = useCallback((tableName?: string) => {
    setSelectedTable(tableName || '');
    setShowAgGridConfigManager(true);
  }, []);

  const handleRefresh = useCallback(() => {
    refetchTables();
    refetchTableConfigs();
    refetchAgGridConfigs();
  }, [refetchTables, refetchTableConfigs, refetchAgGridConfigs]);

  const handleImport = useCallback(() => {
    setShowImportDialog(true);
  }, []);

  const handleExport = useCallback(() => {
    setShowExportDialog(true);
  }, []);

  // Render statistics cards
  const renderStatisticsCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Tables
                </Typography>
                <Typography variant="h4">
                  {configStats.totalTables}
                </Typography>
              </Box>
              <TableIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Table Configs
                </Typography>
                <Typography variant="h4">
                  {configStats.totalTableConfigs}
                </Typography>
              </Box>
              <SettingsIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  AG Grid Configs
                </Typography>
                <Typography variant="h4">
                  {configStats.totalAgGridConfigs}
                </Typography>
              </Box>
              <GridIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Config Coverage
                </Typography>
                <Typography variant="h4">
                  {Math.round(configStats.configCoverage)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={configStats.configCoverage}
                  sx={{ mt: 1 }}
                />
              </Box>
              <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render tables overview
  const renderTablesOverview = () => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Tables Overview</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleTableConfigManager()}
            >
              Add Config
            </Button>
          </Box>
        </Box>

        {tablesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : tablesError ? (
          <Alert severity="error">{tablesError}</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Table Name</TableCell>
                  <TableCell>Display Name</TableCell>
                  <TableCell>Field Count</TableCell>
                  <TableCell>Table Configs</TableCell>
                  <TableCell>AG Grid Configs</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tables.map((table) => {
                  const tableConfigCount = tableConfigs?.filter(c => c.table_name === table.tableName).length || 0;
                  const agGridConfigCount = agGridConfigs?.filter(c => c.table_name === table.tableName).length || 0;
                  const hasTableConfig = tableConfigCount > 0;
                  const hasAgGridConfig = agGridConfigCount > 0;

                  return (
                    <TableRow key={table.tableName}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TableIcon fontSize="small" />
                          {table.tableName}
                        </Box>
                      </TableCell>
                      <TableCell>{table.displayName}</TableCell>
                      <TableCell>{table.fieldCount}</TableCell>
                      <TableCell>
                        <Badge badgeContent={tableConfigCount} color="primary">
                          <Chip
                            label={hasTableConfig ? 'Configured' : 'Not Configured'}
                            color={hasTableConfig ? 'success' : 'default'}
                            size="small"
                          />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge badgeContent={agGridConfigCount} color="secondary">
                          <Chip
                            label={hasAgGridConfig ? 'Configured' : 'Not Configured'}
                            color={hasAgGridConfig ? 'success' : 'default'}
                            size="small"
                          />
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={hasTableConfig && hasAgGridConfig ? <CheckCircleIcon /> : <WarningIcon />}
                          label={hasTableConfig && hasAgGridConfig ? 'Complete' : 'Incomplete'}
                          color={hasTableConfig && hasAgGridConfig ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Table Config">
                            <IconButton
                              size="small"
                              onClick={() => handleTableConfigManager(table.tableName)}
                            >
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="AG Grid Config">
                            <IconButton
                              size="small"
                              onClick={() => handleAgGridConfigManager(table.tableName)}
                            >
                              <GridIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );

  // Render recent configurations
  const renderRecentConfigurations = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Configurations
        </Typography>
        <List dense>
          {tableConfigs?.slice(0, 5).map((config) => (
            <ListItem key={`${config.table_name}-${config.config_name}`}>
              <ListItemText
                primary={`${config.table_name} - ${config.config_name}`}
                secondary={`Updated ${new Date(config.updated_at).toLocaleDateString()}`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  size="small"
                  onClick={() => handleTableConfigManager(config.table_name)}
                >
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => handleTableConfigManager()}
            >
              Manage Table Configs
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GridIcon />}
              onClick={() => handleAgGridConfigManager()}
            >
              Manage AG Grid Configs
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export Configurations
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={handleImport}
            >
              Import Configurations
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  // Loading state
  if (tablesLoading || tableConfigsLoading || agGridConfigsLoading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading configuration dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Configuration Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip label={currentTemplate.toUpperCase()} color="primary" />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      {renderStatisticsCards()}

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          {renderTablesOverview()}
        </Grid>
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renderQuickActions()}
            {renderRecentConfigurations()}
          </Box>
        </Grid>
      </Grid>

      {/* Table Configuration Manager */}
      <TableConfigManager
        churchId={churchId}
        open={showTableConfigManager}
        onClose={() => setShowTableConfigManager(false)}
        initialTableName={selectedTable}
      />

      {/* AG Grid Configuration Manager */}
      <AgGridConfigManager
        churchId={churchId}
        open={showAgGridConfigManager}
        onClose={() => setShowAgGridConfigManager(false)}
        tableName={selectedTable}
      />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onClose={() => setShowImportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Import Configurations</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Import configuration files to restore table and AG Grid configurations.
          </Alert>
          <TextField
            fullWidth
            type="file"
            inputProps={{ accept: '.json' }}
            helperText="Select a JSON configuration file to import"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>Cancel</Button>
          <Button variant="contained">Import</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Configurations</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Export Type</InputLabel>
            <Select value="all" label="Export Type">
              <MenuItem value="all">All Configurations</MenuItem>
              <MenuItem value="table">Table Configurations Only</MenuItem>
              <MenuItem value="aggrid">AG Grid Configurations Only</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Format</InputLabel>
            <Select value="json" label="Format">
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>Export</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ConfigurationDashboard;
