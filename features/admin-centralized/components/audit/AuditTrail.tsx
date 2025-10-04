/**
 * Orthodox Metrics - Audit Trail Component
 * Complete audit logging for all record operations
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Menu,
  MenuList,
  ListItemIcon,
  Autocomplete,
  DatePicker,
  TimePicker,
  DateTimePicker,
  LocalizationProvider,
  AdapterDateFns,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/material';
import {
  History as HistoryIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  TableChart as TableIcon,
  AccountTree as AccountTreeIcon,
} from '@mui/icons-material';

// Import unified hooks
import {
  useUnifiedRecords,
  getCurrentTemplate,
} from '../../../core';

// Import types
import { RecordData, AuditLog, AuditLogEntry, AuditLogFilter } from '../../../core/types/RecordsTypes';

interface AuditTrailProps {
  churchId: number;
  tableName: string;
  recordId?: string;
  onAuditLogChange?: (auditLog: AuditLog) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function AuditTrail({
  churchId,
  tableName,
  recordId,
  onAuditLogChange,
  className,
  style,
}: AuditTrailProps) {
  const [auditLog, setAuditLog] = useState<AuditLog>({
    entries: [],
    total: 0,
    pagination: { page: 1, limit: 50, totalPages: 1 },
  });
  const [filters, setFilters] = useState<AuditLogFilter>({
    action: '',
    userId: '',
    dateFrom: null,
    dateTo: null,
    recordId: recordId || '',
  });
  const [activeTab, setActiveTab] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  // Get current template
  const currentTemplate = getCurrentTemplate();

  // Mock audit log data (in real implementation, this would come from API)
  const mockAuditLog: AuditLog = {
    entries: [
      {
        id: '1',
        action: 'create',
        tableName: tableName,
        recordId: '123',
        userId: 'user1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        changes: {
          before: {},
          after: {
            name: 'New Record',
            status: 'active',
          },
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata: {
          source: 'web',
          sessionId: 'sess_123',
        },
      },
      {
        id: '2',
        action: 'update',
        tableName: tableName,
        recordId: '123',
        userId: 'user2',
        userName: 'Jane Smith',
        userEmail: 'jane@example.com',
        timestamp: new Date('2024-01-15T11:45:00Z'),
        changes: {
          before: {
            name: 'New Record',
            status: 'active',
          },
          after: {
            name: 'Updated Record',
            status: 'inactive',
          },
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        metadata: {
          source: 'api',
          sessionId: 'sess_456',
        },
      },
      {
        id: '3',
        action: 'delete',
        tableName: tableName,
        recordId: '123',
        userId: 'user1',
        userName: 'John Doe',
        userEmail: 'john@example.com',
        timestamp: new Date('2024-01-15T14:20:00Z'),
        changes: {
          before: {
            name: 'Updated Record',
            status: 'inactive',
          },
          after: {},
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        metadata: {
          source: 'web',
          sessionId: 'sess_123',
        },
      },
    ],
    total: 3,
    pagination: { page: 1, limit: 50, totalPages: 1 },
  };

  // Load audit log data
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAuditLog(mockAuditLog);
      setIsLoading(false);
    }, 1000);
  }, [tableName, recordId, filters]);

  // Update audit log when data changes
  useEffect(() => {
    onAuditLogChange?.(auditLog);
  }, [auditLog, onAuditLogChange]);

  // Event handlers
  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      action: '',
      userId: '',
      dateFrom: null,
      dateTo: null,
      recordId: recordId || '',
    });
  }, [recordId]);

  const handleSelectEntry = useCallback((entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedEntries(prev => 
      prev.length === auditLog.entries.length 
        ? []
        : auditLog.entries.map(entry => entry.id)
    );
  }, [auditLog.entries]);

  const handleExport = useCallback(() => {
    // Export selected entries or all entries
    const entriesToExport = selectedEntries.length > 0 
      ? auditLog.entries.filter(entry => selectedEntries.includes(entry.id))
      : auditLog.entries;
    
    console.log('Exporting audit log entries:', entriesToExport);
  }, [selectedEntries, auditLog.entries]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <AddIcon color="success" />;
      case 'update':
        return <EditIcon color="primary" />;
      case 'delete':
        return <DeleteIcon color="error" />;
      case 'view':
        return <ViewIcon color="info" />;
      default:
        return <HistoryIcon color="default" />;
    }
  };

  // Get action color
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'success';
      case 'update':
        return 'primary';
      case 'delete':
        return 'error';
      case 'view':
        return 'info';
      default:
        return 'default';
    }
  };

  // Render filters
  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Filters</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
          >
            Clear
          </Button>
          <Button
            size="small"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Box>
      </Box>

      {showFilters && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label="Action"
              >
                <MenuItem value="">All Actions</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="view">View</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="User ID"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              placeholder="Filter by user ID"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="From Date"
              value={filters.dateFrom}
              onChange={(date) => handleFilterChange('dateFrom', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  label: 'From Date',
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DatePicker
              label="To Date"
              value={filters.dateTo}
              onChange={(date) => handleFilterChange('dateTo', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  label: 'To Date',
                },
              }}
            />
          </Grid>
        </Grid>
      )}
    </Paper>
  );

  // Render audit log table
  const renderAuditLogTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedEntries.length > 0 && selectedEntries.length < auditLog.entries.length}
                checked={auditLog.entries.length > 0 && selectedEntries.length === auditLog.entries.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell>Action</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Record ID</TableCell>
            <TableCell>Changes</TableCell>
            <TableCell>IP Address</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {auditLog.entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedEntries.includes(entry.id)}
                  onChange={() => handleSelectEntry(entry.id)}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getActionIcon(entry.action)}
                  <Chip
                    label={entry.action.toUpperCase()}
                    color={getActionColor(entry.action) as any}
                    size="small"
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {entry.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entry.userEmail}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {entry.timestamp.toLocaleString()}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {entry.recordId}
                </Typography>
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  onClick={() => {/* Show changes dialog */}}
                >
                  View Changes
                </Button>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace">
                  {entry.ipAddress}
                </Typography>
              </TableCell>
              <TableCell>
                <IconButton size="small">
                  <ViewIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render timeline view
  const renderTimelineView = () => (
    <Timeline>
      {auditLog.entries.map((entry, index) => (
        <TimelineItem key={entry.id}>
          <TimelineOppositeContent>
            <Typography variant="caption" color="text.secondary">
              {entry.timestamp.toLocaleString()}
            </Typography>
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={getActionColor(entry.action) as any}>
              {getActionIcon(entry.action)}
            </TimelineDot>
            {index < auditLog.entries.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6">
                    {entry.action.toUpperCase()} - {entry.userName}
                  </Typography>
                  <Chip
                    label={entry.action}
                    color={getActionColor(entry.action) as any}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {entry.userEmail} • {entry.ipAddress}
                </Typography>
                <Typography variant="body2">
                  Record ID: {entry.recordId}
                </Typography>
              </CardContent>
            </Card>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );

  // Render summary statistics
  const renderSummaryStatistics = () => {
    const actionCounts = auditLog.entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Entries
                  </Typography>
                  <Typography variant="h4">
                    {auditLog.total}
                  </Typography>
                </Box>
                <HistoryIcon color="primary" sx={{ fontSize: 40 }} />
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
                    Creates
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {actionCounts.create || 0}
                  </Typography>
                </Box>
                <AddIcon color="success" sx={{ fontSize: 40 }} />
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
                    Updates
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {actionCounts.update || 0}
                  </Typography>
                </Box>
                <EditIcon color="primary" sx={{ fontSize: 40 }} />
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
                    Deletes
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {actionCounts.delete || 0}
                  </Typography>
                </Box>
                <DeleteIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box className={className} style={style}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Audit Trail
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={currentTemplate.toUpperCase()} color="primary" />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {/* Refresh audit log */}}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Summary Statistics */}
        {renderSummaryStatistics()}

        {/* Filters */}
        {renderFilters()}

        {/* Main Content */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
            <Tab label="Table View" />
            <Tab label="Timeline View" />
          </Tabs>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {activeTab === 0 ? 'Audit Log Entries' : 'Audit Timeline'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedEntries.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExport}
              >
                Export Selected ({selectedEntries.length})
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export All
            </Button>
          </Box>
        </Box>

        {/* Content */}
        {activeTab === 0 ? renderAuditLogTable() : renderTimelineView()}
      </Box>
    </LocalizationProvider>
  );
}

export default AuditTrail;
