import {
    ArrowDownward as ArrowDownIcon,
    ArrowUpward as ArrowUpIcon,
    CalendarToday as CalendarIcon,
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Refresh as RefreshIcon,
    Save as SaveIcon,
    Sort as SortIcon,
    Storage as StorageIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    CircularProgress,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import React from 'react';
import { BAPTISM_RECORDS_PREVIEW, MARRIAGE_RECORDS_PREVIEW, FUNERAL_RECORDS_PREVIEW } from './constants';
import type { Column } from './types';

interface DatabaseMappingTabProps {
  rows: Column[];
  tableName: string;
  setTableName: (name: string) => void;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  defaultSortField: string;
  setDefaultSortField: (field: string) => void;
  defaultSortDirection: 'asc' | 'desc';
  setDefaultSortDirection: (dir: 'asc' | 'desc') => void;
  saving: boolean;
  loading: boolean;
  error: string | null;
  success: string | null;
  columnsError: string | null;
  rowCount: number | null;
  lastSync: Date | null;
  exportLanguage: string;
  configuringColumn: string | null;
  setConfiguringColumn: (col: string | null) => void;
  loadColumns: () => void;
  setExportDialogOpen: (open: boolean) => void;
  updateNewName: (columnName: string, newName: string) => void;
  toggleColumnVisibility: (columnName: string) => void;
  toggleColumnSortable: (columnName: string) => void;
  handleSave: () => void;
  handleCancel: () => void;
}

const DatabaseMappingTab: React.FC<DatabaseMappingTabProps> = ({
  rows,
  tableName,
  setTableName,
  searchParams,
  setSearchParams,
  defaultSortField,
  setDefaultSortField,
  defaultSortDirection,
  setDefaultSortDirection,
  saving,
  loading,
  error,
  success,
  columnsError,
  rowCount,
  lastSync,
  exportLanguage,
  configuringColumn,
  setConfiguringColumn,
  loadColumns,
  setExportDialogOpen,
  updateNewName,
  toggleColumnVisibility,
  toggleColumnSortable,
  handleSave,
  handleCancel,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Left: Database Schema Card */}
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ bgcolor: theme.palette.background.paper }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <StorageIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>Database Schema</Typography>
                    <Typography variant="caption" color="text.secondary">Select and map your table schema</Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
                    onClick={loadColumns}
                    disabled={loading || saving}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Reload Columns
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => setExportDialogOpen(true)}
                    disabled={loading || saving || rows.length === 0}
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                  >
                    Export Template
                  </Button>
                </Stack>
              </Stack>

              <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                SELECT TABLE
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <Select
                  value={tableName}
                  onChange={(e) => {
                    const newTableName = e.target.value;
                    setTableName(newTableName);
                    const newSearchParams = new URLSearchParams(searchParams);
                    newSearchParams.set('table', newTableName);
                    setSearchParams(newSearchParams);
                  }}
                  size="small"
                >
                  <MenuItem value="baptism_records">baptism.records</MenuItem>
                  <MenuItem value="marriage_records">marriage.records</MenuItem>
                  <MenuItem value="funeral_records">funeral.records</MenuItem>
                  <MenuItem value="members">members</MenuItem>
                  <MenuItem value="families">families</MenuItem>
                  <MenuItem value="donations">donations</MenuItem>
                </Select>
              </FormControl>

              {/* Stats Row */}
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: theme.palette.action.hover, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <StorageIcon sx={{ fontSize: 14 }} /> Row Count
                    </Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
                      {rowCount !== null ? rowCount.toLocaleString() : '—'}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: theme.palette.action.hover, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <CalendarIcon sx={{ fontSize: 14 }} /> Last Sync
                    </Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                      {lastSync ? lastSync.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase() : '—'}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ p: 2, bgcolor: theme.palette.action.hover, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <StorageIcon sx={{ fontSize: 14 }} /> Language
                    </Typography>
                    <Typography variant="h6" fontWeight={600} sx={{ mt: 0.5 }}>
                      {exportLanguage === 'en' ? 'English' : exportLanguage === 'gr' ? 'Greek' : exportLanguage === 'ru' ? 'Russian' : exportLanguage === 'ro' ? 'Romanian' : exportLanguage === 'ka' ? 'Georgian' : exportLanguage} ({exportLanguage})
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: System Notifications */}
        <Grid item xs={12} md={4}>
          <Typography variant="overline" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            SYSTEM NOTIFICATIONS
          </Typography>
          <Stack spacing={1.5}>
            <Alert
              severity="warning"
              sx={{ borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
            >
              <Typography variant="subtitle2" fontWeight={600}>Schema Synchronization</Typography>
              <Typography variant="caption" color="text.secondary">
                Exporting the current table schema will make it available as a global template. Church-specific customizations will not be preserved.
              </Typography>
            </Alert>
            {columnsError && (
              <Alert
                severity="error"
                sx={{ borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
                action={
                  <Button size="small" onClick={loadColumns} sx={{ textTransform: 'none' }}>
                    Retry
                  </Button>
                }
              >
                <Typography variant="caption">
                  {columnsError}. Column mapping cannot be loaded.
                </Typography>
              </Alert>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Status Messages */}
      {error && <Alert severity="error" sx={{ mb: 2, mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2, mt: 2 }}>{success}</Alert>}

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading columns...</Typography>
        </Box>
      )}

      {/* Mapping Table */}
      {!loading && rows.length > 0 && (
        <>
          {/* Sort Settings Section */}
          <Card variant="outlined" sx={{ mb: 3, p: 2, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SortIcon color="primary" />
              Default Sort Settings
            </Typography>
            <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Default Sort Field</InputLabel>
                <Select
                  value={defaultSortField}
                  onChange={(e) => setDefaultSortField(e.target.value)}
                  label="Default Sort Field"
                  disabled={saving}
                >
                  <MenuItem value="">
                    <em>No default sort</em>
                  </MenuItem>
                  {rows.filter(r => r.is_visible && r.is_sortable).map((r) => (
                    <MenuItem key={r.column_name} value={r.column_name}>
                      {r.new_name || r.column_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {defaultSortField && (
                <FormControl component="fieldset">
                  <RadioGroup
                    row
                    value={defaultSortDirection}
                    onChange={(e) => setDefaultSortDirection(e.target.value as 'asc' | 'desc')}
                  >
                    <FormControlLabel
                      value="asc"
                      control={<Radio size="small" />}
                      label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowUpIcon fontSize="small" /> Ascending</Box>}
                      disabled={saving}
                    />
                    <FormControlLabel
                      value="desc"
                      control={<Radio size="small" />}
                      label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowDownIcon fontSize="small" /> Descending</Box>}
                      disabled={saving}
                    />
                  </RadioGroup>
                </FormControl>
              )}
            </Stack>
          </Card>

          {/* Live Preview */}
          <Card variant="outlined" sx={{ mb: 3, p: 3, bgcolor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Live Preview - {tableName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Double-click any column header to configure Visible, Sortable, and Default Sort settings.
            </Typography>
            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 2,
                bgcolor: theme.palette.background.paper,
                overflow: 'auto',
                maxHeight: 400,
              }}
            >
              <TableContainer>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: theme.palette.action.hover }}>
                      {rows.filter(r => r.is_visible).map((row) => {
                        const fullRow = rows.find(r => r.column_name === row.column_name);
                        return (
                          <TableCell
                            key={row.column_name}
                            onDoubleClick={() => {
                              setConfiguringColumn(row.column_name);
                            }}
                            sx={{
                              cursor: 'pointer',
                              userSelect: 'none',
                              '&:hover': {
                                bgcolor: 'action.hover',
                              },
                            }}
                          >
                            <Tooltip title="Double-click to configure">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {fullRow?.new_name || row.column_name}
                                </Typography>
                                {fullRow?.is_sortable && <SortIcon fontSize="small" color="action" />}
                                {defaultSortField === row.column_name && (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    {defaultSortDirection === 'asc' ? <ArrowUpIcon fontSize="small" color="primary" /> : <ArrowDownIcon fontSize="small" color="primary" />}
                                  </Box>
                                )}
                              </Box>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      let previewData: any[] = [];
                      let columnMap: Record<string, string> = {};

                      if (tableName === 'baptism_records') {
                        previewData = BAPTISM_RECORDS_PREVIEW;
                        columnMap = {
                          'id': 'id', 'first_name': 'first_name', 'last_name': 'last_name',
                          'birth_date': 'birth_date', 'reception_date': 'reception_date',
                          'birthplace': 'birthplace', 'entry_type': 'entry_type',
                          'sponsors': 'sponsors', 'parents': 'parents', 'clergy': 'clergy',
                        };
                      } else if (tableName === 'marriage_records') {
                        previewData = MARRIAGE_RECORDS_PREVIEW;
                        columnMap = {
                          'id': 'id', 'married_date_name': 'married_date_name', 'last_name': 'last_name',
                          'parents_groom': 'parents_groom', 'parents': 'parents',
                          'witnesses': 'witnesses', 'marriage_license': 'marriage_license', 'clergy': 'clergy',
                        };
                      } else if (tableName === 'funeral_records') {
                        previewData = FUNERAL_RECORDS_PREVIEW;
                        columnMap = {
                          'id': 'id', 'date_of_deceased': 'date_of_deceased', 'date_of_burial': 'date_of_burial',
                          'first_name': 'first_name', 'last_name': 'last_name', 'age': 'age',
                          'clergy': 'clergy', 'burial_location': 'burial_location',
                        };
                      }

                      if (previewData.length === 0) {
                        return [1, 2, 3].map((idx) => (
                          <TableRow key={idx}>
                            {rows.filter(r => r.is_visible).map((row) => (
                              <TableCell key={row.column_name}>
                                <Typography variant="body2" color="text.secondary">
                                  Sample {row.new_name || row.column_name}
                                </Typography>
                              </TableCell>
                            ))}
                          </TableRow>
                        ));
                      }

                      return previewData.map((rowData) => (
                        <TableRow key={rowData.id}>
                          {rows.filter(r => r.is_visible).map((row) => {
                            const dataKey = columnMap[row.column_name];
                            const cellValue = dataKey ? rowData[dataKey] : '';
                            return (
                              <TableCell key={row.column_name}>
                                <Typography variant="body2" color="text.secondary">
                                  {cellValue || '-'}
                                </Typography>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Card>

          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: theme.palette.background.paper }}>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">Column Name</Typography></TableCell>
                  <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Column #</Typography></TableCell>
                  <TableCell><Typography variant="subtitle2" fontWeight="bold">New Column Name</Typography></TableCell>
                  <TableCell align="center">
                    <Tooltip title="Show/hide this column in data grids">
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                        <VisibilityIcon fontSize="small" /> Visible
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Allow sorting by this column">
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                        <SortIcon fontSize="small" /> Sortable
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Set as default sort field">
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                        <SortIcon fontSize="small" color="primary" /> Default Sort
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.column_name} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'text.primary' }}>
                        {row.column_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">{row.ordinal_position}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        fullWidth size="small" variant="outlined" value={row.new_name}
                        onChange={(e) => updateNewName(row.column_name, e.target.value)}
                        placeholder={`Display name for ${row.column_name}`}
                        disabled={saving} sx={{ minWidth: 200 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={row.is_visible}
                        onChange={() => toggleColumnVisibility(row.column_name)}
                        disabled={saving}
                        color="primary" icon={<VisibilityOffIcon />} checkedIcon={<VisibilityIcon />}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Checkbox
                        checked={row.is_sortable}
                        onChange={() => toggleColumnSortable(row.column_name)}
                        disabled={saving || !row.is_visible}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Radio
                        checked={defaultSortField === row.column_name}
                        onChange={() => setDefaultSortField(row.column_name)}
                        disabled={saving || !row.is_visible || !row.is_sortable}
                        color="primary" size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Stats Summary */}
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip icon={<VisibilityIcon />} label={`${rows.filter(r => r.is_visible).length} visible columns`} color="primary" variant="outlined" />
              <Chip icon={<SortIcon />} label={`${rows.filter(r => r.is_sortable && r.is_visible).length} sortable columns`} color="secondary" variant="outlined" />
              {defaultSortField && (
                <Chip
                  icon={defaultSortDirection === 'asc' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                  label={`Default: ${rows.find(r => r.column_name === defaultSortField)?.new_name || defaultSortField} (${defaultSortDirection.toUpperCase()})`}
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        </>
      )}

      {/* No Columns Message */}
      {!loading && rows.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No columns found for table "{tableName}". The table may not exist or be empty.
        </Alert>
      )}

      {/* Column Configuration Dialog */}
      {configuringColumn && (() => {
        const column = rows.find(r => r.column_name === configuringColumn);
        if (!column) return null;
        return (
          <Dialog open={!!configuringColumn} onClose={() => setConfiguringColumn(null)} maxWidth="sm" fullWidth>
            <DialogTitle>
              Configure Column: {column.column_name}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Display Name"
                  value={column.new_name}
                  onChange={(e) => updateNewName(column.column_name, e.target.value)}
                  placeholder={`Display name for ${column.column_name}`}
                  disabled={saving}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={column.is_visible}
                      onChange={() => toggleColumnVisibility(column.column_name)}
                      disabled={saving}
                    />
                  }
                  label="Visible"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={column.is_sortable}
                      onChange={() => toggleColumnSortable(column.column_name)}
                      disabled={saving || !column.is_visible}
                    />
                  }
                  label="Sortable"
                />
                <FormControl>
                  <InputLabel>Default Sort</InputLabel>
                  <Select
                    value={defaultSortField === column.column_name ? 'yes' : 'no'}
                    onChange={(e) => {
                      if (e.target.value === 'yes') {
                        setDefaultSortField(column.column_name);
                      } else {
                        setDefaultSortField('');
                      }
                    }}
                    label="Default Sort"
                    disabled={saving || !column.is_visible || !column.is_sortable}
                  >
                    <MenuItem value="no">No</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                  </Select>
                </FormControl>
                {defaultSortField === column.column_name && (
                  <FormControl component="fieldset">
                    <RadioGroup
                      row
                      value={defaultSortDirection}
                      onChange={(e) => setDefaultSortDirection(e.target.value as 'asc' | 'desc')}
                    >
                      <FormControlLabel
                        value="asc"
                        control={<Radio size="small" />}
                        label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowUpIcon fontSize="small" /> Ascending</Box>}
                        disabled={saving}
                      />
                      <FormControlLabel
                        value="desc"
                        control={<Radio size="small" />}
                        label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><ArrowDownIcon fontSize="small" /> Descending</Box>}
                        disabled={saving}
                      />
                    </RadioGroup>
                  </FormControl>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfiguringColumn(null)}>Close</Button>
            </DialogActions>
          </Dialog>
        );
      })()}

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={handleCancel} disabled={saving} sx={{ textTransform: 'none' }}>Cancel Changes</Button>
        <Button variant="contained" color="error" startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={handleSave} disabled={saving || loading || rows.length === 0} sx={{ textTransform: 'none' }}>
          {saving ? 'Saving...' : 'Save Database Mapping'}
        </Button>
      </Stack>
    </Box>
  );
};

export default DatabaseMappingTab;
