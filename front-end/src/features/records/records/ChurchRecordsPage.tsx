import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Breadcrumbs,
  Link,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Home as HomeIcon,
  Business as ChurchIcon,
  TableChart as RecordsIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SSPPOCRecordsPage from './SSPPOCRecordsPage';

interface Church {
  id: number;
  name: string;
  database_name: string;
  church_id: number;
}

interface RecordTable {
  table_name: string;
  record_count: number;
  last_updated: string;
}

const ChurchRecordsPage: React.FC = () => {
  const { churchId } = useParams<{ churchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasRole } = useAuth();

  // State management
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [availableChurches, setAvailableChurches] = useState<Church[]>([]);
  const [recordTables, setRecordTables] = useState<RecordTable[]>([]);
  const [selectedRecordType, setSelectedRecordType] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record type configurations with sorting
  const recordTypeConfigs = {
    'baptism_records': {
      label: 'Baptism Records',
      sortField: 'reception_date',
      sortDirection: 'desc',
      icon: '👶',
      description: 'Baptism ceremonies and certificates'
    },
    'marriage_records': {
      label: 'Marriage Records',
      sortField: 'mdate',
      sortDirection: 'desc',
      icon: '💒',
      description: 'Wedding ceremonies and certificates'
    },
    'funeral_records': {
      label: 'Funeral Records',
      sortField: 'burial_date',
      sortDirection: 'desc',
      icon: '⚱️',
      description: 'Funeral services and memorials'
    },
    'clergy': {
      label: 'Clergy Records',
      sortField: 'created_at',
      sortDirection: 'desc',
      icon: '⛪',
      description: 'Clergy and staff information'
    },
    'members': {
      label: 'Church Members',
      sortField: 'created_at',
      sortDirection: 'desc',
      icon: '👥',
      description: 'Church membership database'
    },
    'donations': {
      label: 'Donations',
      sortField: 'donation_date',
      sortDirection: 'desc',
      icon: '💰',
      description: 'Financial contributions and offerings'
    },
    'calendar_events': {
      label: 'Calendar Events',
      sortField: 'event_date',
      sortDirection: 'desc',
      icon: '📅',
      description: 'Liturgical and parish events'
    }
  };

  // Load user's church assignment and available churches
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (hasRole(['super_admin'])) {
          // Super admin: load all churches
          await loadAllChurches();
        } else {
          // Regular users: load assigned church
          await loadUserChurch();
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load church data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // If super admin is on legacy URL, redirect to numbered format
    if (hasRole(['super_admin']) && location.pathname === '/saints-peter-and-paul-Records') {
      console.log('🔄 Super admin on legacy URL, will redirect after church load');
    }
  }, [user, hasRole]);

  // Load church record tables when church is selected
  useEffect(() => {
    if (selectedChurch) {
      loadChurchRecordTables(selectedChurch.id);
    }
  }, [selectedChurch]);

  // Set initial record type when tables are loaded
  useEffect(() => {
    if (recordTables.length > 0 && !selectedRecordType) {
      // Prioritize baptism_records as default, otherwise use first table
      const baptismTable = recordTables.find(table => table.table_name === 'baptism_records');
      const defaultTable = baptismTable || recordTables[0];
      setSelectedRecordType(defaultTable.table_name);
    }
  }, [recordTables, selectedRecordType]);

  // Handle church ID from URL
  useEffect(() => {
    if (churchId && availableChurches.length > 0) {
      // Try to find by church_id first, then fall back to database id
      const church = availableChurches.find(c =>
        c.church_id.toString() === churchId || c.id.toString() === churchId
      );
      if (church) {
        setSelectedChurch(church);
      }
    }
  }, [churchId, availableChurches]);

  const loadAllChurches = async () => {
    try {
      const response = await fetch('/api/admin/churches?is_active=1', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableChurches(data.churches || []);

        // If URL has church ID, select it, otherwise select first church
        if (churchId) {
          const targetChurch = data.churches.find((c: Church) =>
            c.church_id.toString() === churchId || c.id.toString() === churchId
          );
          if (targetChurch) {
            setSelectedChurch(targetChurch);
          }
        } else if (data.churches.length > 0) {
          setSelectedChurch(data.churches[0]);
          // Update URL to reflect selected church - redirect super admin to numbered format
          if (location.pathname === '/saints-peter-and-paul-Records') {
            const churchId = data.churches[0].church_id || data.churches[0].id;
            console.log('🔄 Redirecting super admin from legacy URL to:', `/${churchId}-records`);
            navigate(`/${churchId}-records`, { replace: true });
          } else {
            navigate(`/${data.churches[0].church_id}-records`, { replace: true });
          }
        }
      } else {
        throw new Error('Failed to fetch churches');
      }
    } catch (error) {
      throw new Error(`Error loading churches: ${error.message}`);
    }
  };

  const loadUserChurch = async () => {
    try {
      // Get churches filtered by user's assignment using existing endpoint
      const response = await fetch('/api/churches', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.churches && data.data.churches.length > 0) {
          // For non-super admin users, this should return only their assigned church
          const userChurch = data.data.churches[0]; // Should be only one church for regular users
          setSelectedChurch(userChurch);
          setAvailableChurches(data.data.churches);

          // Update URL to match user's church
          const currentPath = location.pathname;
          const expectedPath = `/${userChurch.id}-records`;
          if (currentPath !== expectedPath) {
            navigate(expectedPath, { replace: true });
          }
        } else {
          throw new Error('No church assigned to user');
        }
      } else {
        throw new Error('Failed to fetch user church');
      }
    } catch (error) {
      throw new Error(`Error loading user church: ${error.message}`);
    }
  };

  const loadChurchRecordTables = async (churchDbId: number) => {
    try {
      const response = await fetch(`/api/admin/church-database/${churchDbId}/record-counts`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const responseData = data.success ? data.data : data;
        const tables = Object.entries(responseData.record_counts || {}).map(([tableName, count]) => ({
          table_name: tableName,
          record_count: count as number,
          last_updated: new Date().toISOString()
        }));

        // Sort tables by priority (baptism, marriage, funeral first)
        const priorityOrder = ['baptism_records', 'marriage_records', 'funeral_records'];
        tables.sort((a, b) => {
          const aIndex = priorityOrder.indexOf(a.table_name);
          const bIndex = priorityOrder.indexOf(b.table_name);

          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.table_name.localeCompare(b.table_name);
        });

        setRecordTables(tables);
      } else {
        console.error('Failed to fetch record tables');
        setRecordTables([]);
      }
    } catch (error) {
      console.error('Error loading record tables:', error);
      setRecordTables([]);
    }
  };

  const handleChurchChange = (churchId: number) => {
    const church = availableChurches.find(c => c.id === churchId);
    if (church) {
      setSelectedChurch(church);
      setSelectedRecordType(''); // Reset record type

      // Update URL
      navigate(`/${church.church_id}-records`, { replace: true });
    }
  };

  const handleRecordTypeChange = (recordType: string) => {
    setSelectedRecordType(recordType);
  };

  const handleRefresh = () => {
    if (selectedChurch) {
      loadChurchRecordTables(selectedChurch.id);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading church records...
        </Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1">
          Please contact your administrator if this problem persists.
        </Typography>
      </Box>
    );
  }

  // Show no church assigned state
  if (!selectedChurch) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          {hasRole(['super_admin'])
            ? 'No churches available in the system.'
            : 'You are not assigned to any church. Please contact your administrator.'
          }
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 'none' }}>
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            color="inherit"
            href="/dashboards/modern"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <RecordsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Records Management
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Church and Record Type Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" component="h1">
              Church Records Management
            </Typography>
            <Tooltip title="Refresh record counts">
              <IconButton onClick={handleRefresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={3} alignItems="center">
            {/* Church Selection (Super Admin Only) */}
            {hasRole(['super_admin']) && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Select Church</InputLabel>
                  <Select
                    value={selectedChurch?.id || ''}
                    onChange={(e) => handleChurchChange(e.target.value as number)}
                    label="Select Church"
                  >
                    {availableChurches.map((church) => (
                      <MenuItem key={church.id} value={church.id}>
                        <Box display="flex" alignItems="center">
                          <ChurchIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {church.name}
                          <Chip
                            label={`ID: ${church.church_id}`}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Current Church Info (Non-Super Admin) */}
            {!hasRole(['super_admin']) && (
              <Grid item xs={12} md={6}>
                <Box display="flex" alignItems="center">
                  <ChurchIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
                  <Box>
                    <Typography variant="h6">{selectedChurch.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Church ID: {selectedChurch.church_id}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )}

            {/* Record Type Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Record Type</InputLabel>
                <Select
                  value={selectedRecordType}
                  onChange={(e) => handleRecordTypeChange(e.target.value)}
                  label="Select Record Type"
                  disabled={recordTables.length === 0}
                >
                  {recordTables.map((table) => {
                    const config = recordTypeConfigs[table.table_name];
                    return (
                      <MenuItem key={table.table_name} value={table.table_name}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                          <Box display="flex" alignItems="center">
                            <Typography sx={{ mr: 1 }}>
                              {config?.icon || '📋'}
                            </Typography>
                            <Box>
                              <Typography variant="body1">
                                {config?.label || table.table_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {config?.description}
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={`${table.record_count} records`}
                            size="small"
                            color="primary"
                          />
                        </Box>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Record Summary */}
          {recordTables.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle2" gutterBottom>
                Available Record Types:
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {recordTables.map((table) => {
                  const config = recordTypeConfigs[table.table_name];
                  return (
                    <Chip
                      key={table.table_name}
                      label={`${config?.icon || '📋'} ${config?.label || table.table_name}: ${table.record_count}`}
                      variant={selectedRecordType === table.table_name ? 'filled' : 'outlined'}
                      color={selectedRecordType === table.table_name ? 'primary' : 'default'}
                      onClick={() => handleRecordTypeChange(table.table_name)}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Records Display */}
      {selectedRecordType && (
        <Box>
          <Divider sx={{ mb: 3 }} />

          {/* Current Configuration Info */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Displaying:</strong> {recordTypeConfigs[selectedRecordType]?.label || selectedRecordType}
              from {selectedChurch.name}
              {recordTypeConfigs[selectedRecordType] && (
                <>
                  {' - '}Sorted by {recordTypeConfigs[selectedRecordType].sortField}
                  ({recordTypeConfigs[selectedRecordType].sortDirection})
                </>
              )}
            </Typography>
          </Alert>

          {/* Records Component */}
          <SSPPOCRecordsPage
            churchId={selectedChurch.church_id}
            churchDbId={selectedChurch.id}
            recordType={selectedRecordType}
            sortConfig={{
              field: recordTypeConfigs[selectedRecordType]?.sortField || 'created_at',
              direction: recordTypeConfigs[selectedRecordType]?.sortDirection || 'desc'
            }}
          />
        </Box>
      )}

      {/* No Records Available */}
      {recordTables.length === 0 && (
        <Alert severity="warning">
          No record tables found for this church. Please contact your administrator to set up record tables.
        </Alert>
      )}
    </Box>
  );
};

export default ChurchRecordsPage; 