import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
  CardContent,
  Divider,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Cancel as CancelIcon,
  Storage as StorageIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';

interface Column {
  column_name: string;
  ordinal_position: number;
  new_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}

interface FieldMapping {
  column_name: string;
  display_name: string;
  is_visible: boolean;
  is_sortable: boolean;
}

interface ApiResponse {
  columns: Array<{
    column_name: string;
    ordinal_position: number;
  }>;
  mappings?: Record<string, string>;
  field_settings?: {
    visibility?: Record<string, boolean>;
    sortable?: Record<string, boolean>;
    default_sort_field?: string;
    default_sort_direction?: 'asc' | 'desc';
  };
}

const FieldMapperPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tableName, setTableName] = useState<string>('baptism_records');
  const [rows, setRows] = useState<Column[]>([]);
  const [defaultSortField, setDefaultSortField] = useState<string>('');
  const [defaultSortDirection, setDefaultSortDirection] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadColumns = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/admin/churches/${id}/records/columns?table=${tableName}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      
      // Map the API response to our column format with existing mappings and settings
      const columns: Column[] = data.columns.map(col => ({
        column_name: col.column_name,
        ordinal_position: col.ordinal_position,
        new_name: data.mappings?.[col.column_name] || '',
        is_visible: data.field_settings?.visibility?.[col.column_name] ?? true, // Default to visible
        is_sortable: data.field_settings?.sortable?.[col.column_name] ?? true, // Default to sortable
      }));

      setRows(columns);
      
      // Set default sort settings
      if (data.field_settings?.default_sort_field) {
        setDefaultSortField(data.field_settings.default_sort_field);
      }
      if (data.field_settings?.default_sort_direction) {
        setDefaultSortDirection(data.field_settings.default_sort_direction);
      }
    } catch (err) {
      console.error('Error loading columns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load columns');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Create mapping object and settings from rows
      const mapping: Record<string, string> = {};
      const visibility: Record<string, boolean> = {};
      const sortable: Record<string, boolean> = {};
      
      rows.forEach(row => {
        if (row.new_name.trim()) {
          mapping[row.column_name] = row.new_name.trim();
        }
        visibility[row.column_name] = row.is_visible;
        sortable[row.column_name] = row.is_sortable;
      });

      const requestBody = {
        table: tableName,
        mapping: mapping,
        field_settings: {
          visibility,
          sortable,
          default_sort_field: defaultSortField,
          default_sort_direction: defaultSortDirection,
        }
      };

      const response = await fetch(`/api/admin/churches/${id}/field-mapper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setSuccess('Field mapping saved successfully!');
      
      // Notify parent window about the mapping update
      if (window.opener) {
        try {
          const message = {
            type: 'FIELD_MAPPING_SAVED',
            table: tableName,
            churchId: id,
            timestamp: new Date().toISOString()
          };
          
          console.log('📤 Sending postMessage to parent:', message);
          window.opener.postMessage(message, '*');
        } catch (error) {
          console.warn('Failed to notify parent window:', error);
        }
      } else {
        console.warn('No parent window (opener) found for postMessage');
      }
      
      // Auto-close window after 1.5 seconds
      setTimeout(() => {
        window.close();
      }, 1500);

    } catch (err) {
      console.error('Error saving mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    window.close();
  };

  const updateNewName = (columnName: string, newName: string) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row.column_name === columnName 
          ? { ...row, new_name: newName }
          : row
      )
    );
  };

  const toggleColumnVisibility = (columnName: string) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row.column_name === columnName 
          ? { ...row, is_visible: !row.is_visible }
          : row
      )
    );
  };

  const toggleColumnSortable = (columnName: string) => {
    setRows(prevRows => 
      prevRows.map(row => 
        row.column_name === columnName 
          ? { ...row, is_sortable: !row.is_sortable }
          : row
      )
    );
  };

  const handleDefaultSortFieldChange = (columnName: string) => {
    setDefaultSortField(columnName);
  };

  // Load columns on component mount and when table changes
  useEffect(() => {
    loadColumns();
  }, [id, tableName]);

  if (!id) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Invalid church ID. Please check the URL.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <Card>
        <CardContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon color="primary" />
              Database → Table Mapping
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Map database column names to display names for church ID {id}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Table Selection and Reload */}
          <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Select Table</InputLabel>
              <Select
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                label="Select Table"
                disabled={loading || saving}
              >
                <MenuItem value="baptism_records">baptism_records</MenuItem>
                <MenuItem value="marriage_records">marriage_records</MenuItem>
                <MenuItem value="funeral_records">funeral_records</MenuItem>
                <MenuItem value="members">members</MenuItem>
                <MenuItem value="families">families</MenuItem>
                <MenuItem value="donations">donations</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={loadColumns}
              disabled={loading || saving}
            >
              Reload Columns
            </Button>
          </Stack>

          {/* Status Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

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
              <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
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
                      {rows.filter(row => row.is_visible && row.is_sortable).map((row) => (
                        <MenuItem key={row.column_name} value={row.column_name}>
                          {row.new_name || row.column_name}
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
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ArrowUpIcon fontSize="small" />
                              Ascending
                            </Box>
                          }
                          disabled={saving}
                        />
                        <FormControlLabel
                          value="desc"
                          control={<Radio size="small" />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ArrowDownIcon fontSize="small" />
                              Descending
                            </Box>
                          }
                          disabled={saving}
                        />
                      </RadioGroup>
                    </FormControl>
                  )}
                </Stack>
              </Card>

              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Column Name
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="subtitle2" fontWeight="bold">
                          Column #
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          New Column Name
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Show/hide this column in data grids">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <VisibilityIcon fontSize="small" />
                            Visible
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Allow sorting by this column">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <SortIcon fontSize="small" />
                            Sortable
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Set as default sort field">
                          <Typography variant="subtitle2" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                            <SortIcon fontSize="small" color="primary" />
                            Default Sort
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.column_name} hover>
                        <TableCell>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              color: 'text.primary'
                            }}
                          >
                            {row.column_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {row.ordinal_position}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            variant="outlined"
                            value={row.new_name}
                            onChange={(e) => updateNewName(row.column_name, e.target.value)}
                            placeholder={`Display name for ${row.column_name}`}
                            disabled={saving}
                            sx={{ minWidth: 200 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={row.is_visible}
                            onChange={() => toggleColumnVisibility(row.column_name)}
                            disabled={saving}
                            color="primary"
                            icon={<VisibilityOffIcon />}
                            checkedIcon={<VisibilityIcon />}
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
                            onChange={() => handleDefaultSortFieldChange(row.column_name)}
                            disabled={saving || !row.is_visible || !row.is_sortable}
                            color="primary"
                            size="small"
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
                  <Chip 
                    icon={<VisibilityIcon />}
                    label={`${rows.filter(r => r.is_visible).length} visible columns`}
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    icon={<SortIcon />}
                    label={`${rows.filter(r => r.is_sortable && r.is_visible).length} sortable columns`}
                    color="secondary"
                    variant="outlined"
                  />
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

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || loading || rows.length === 0}
            >
              {saving ? 'Saving...' : 'Save Mapping'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FieldMapperPage;
