/**
 * MarriageRecordsPage Component
 * 
 * Centralized marriage records management page with full UI features.
 * 
 * Route: /apps/records/marriage
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Stack
} from '@mui/material';
import { IconSearch, IconEdit, IconEye, IconTrash, IconRefresh } from '@tabler/icons-react';
import { useAuth } from '../../../../context/AuthContext';
import { formatRecordDate } from '../../../../utils/formatDate';

// Helper to safely parse JSON fields (witnesses)
const parseJsonField = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
};

// Helper to display JSON array fields as comma-separated string
const displayJsonField = (value: any): string => {
  const arr = parseJsonField(value);
  return arr.length > 0 ? arr.join(', ') : '';
};

// Interface updated to match production schema (05_sacrament_tables.sql)
interface MarriageRecord {
  id: number;
  // Production schema fields (groom_*, bride_*)
  groom_first?: string;
  groom_middle?: string;
  groom_last?: string;
  groom_full?: string;
  bride_first?: string;
  bride_middle?: string;
  bride_last?: string;
  bride_full?: string;
  // Legacy field names for backwards compatibility
  groom_first_name?: string;
  groom_last_name?: string;
  bride_first_name?: string;
  bride_last_name?: string;
  // Date field
  marriage_date?: string;
  // Officiant
  officiant_name?: string;
  clergy?: string;
  // Church
  church_id?: number;
  // Witnesses - JSON in production, string in legacy
  witnesses?: string | string[];
  // Location
  place_name?: string;
  marriage_place?: string;
  // Registry fields
  certificate_no?: string;
  book_no?: string;
  page_no?: string;
  entry_no?: string;
  // Metadata fields (production schema)
  source_system?: string;
  source_row_id?: string;
  source_hash?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

const MarriageRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get church_id from URL query params first, fallback to user context
  const urlChurchId = searchParams.get('church_id');
  const [churchId, setChurchId] = useState<number | null>(
    urlChurchId ? parseInt(urlChurchId) : (user?.church_id || null)
  );
  
  const [records, setRecords] = useState<MarriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('marriage_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Update churchId when URL param changes
  useEffect(() => {
    const urlChurchId = searchParams.get('church_id');
    if (urlChurchId) {
      const parsedId = parseInt(urlChurchId);
      if (!isNaN(parsedId)) {
        setChurchId(parsedId);
      }
    } else if (user?.church_id) {
      setChurchId(user.church_id);
    }
  }, [searchParams, user?.church_id]);

  useEffect(() => {
    const fetchRecords = async () => {
      let effectiveChurchId = churchId;
      
      if (!effectiveChurchId && (user?.role === 'super_admin' || user?.role === 'admin')) {
        try {
          const churchesResponse = await fetch('/api/my/churches', {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (churchesResponse.ok) {
            const churchesData = await churchesResponse.json();
            const churches = churchesData.data?.churches || churchesData.churches || [];
            if (churches.length > 0) {
              effectiveChurchId = churches[0].id;
              // Update state and URL if we're auto-selecting a church
              if (!urlChurchId) {
                setChurchId(effectiveChurchId);
                setSearchParams({ church_id: effectiveChurchId.toString() }, { replace: true });
                // Return early - useEffect will re-run with new churchId
                return;
              }
            } else {
              // No churches available - show appropriate error
              if (user?.role === 'super_admin') {
                setError('No churches found in the system. Please create a church first.');
              } else {
                setError('No church available. Please ensure you have access to at least one church.');
              }
              setLoading(false);
              return;
            }
          } else {
            // API error - show appropriate message
            if (user?.role === 'super_admin') {
              setError('Unable to load churches. Please try again or select a church manually.');
            } else {
              setError('No church available. Please ensure you have access to at least one church.');
            }
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error fetching churches:', err);
          if (user?.role === 'super_admin') {
            setError('Unable to load churches. Please try again or select a church manually.');
          } else {
            setError('No church available. Please ensure you have access to at least one church.');
          }
          setLoading(false);
          return;
        }
      }
      
      if (!effectiveChurchId) {
        // Only show hard error for non-superadmin users
        if (user?.role !== 'super_admin') {
          setError('No church available. Please ensure you have access to at least one church.');
        } else {
          setError('Select a church to view records. Use the church_id query parameter or ensure churches are available.');
        }
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams({
          page: (page + 1).toString(),
          limit: rowsPerPage.toString()
        });

        if (searchQuery.trim()) {
          params.append('search', searchQuery.trim());
        }

        const response = await fetch(`/api/marriage-records?${params.toString()}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to load records: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setRecords(data.records || []);
        setTotalRecords(data.pagination?.total || data.totalRecords || 0);
      } catch (err: any) {
        console.error('Error fetching marriage records:', err);
        setError(err.message || 'Failed to load marriage records');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchRecords();
    }
  }, [user, churchId, page, rowsPerPage, searchQuery]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleRecordTypeChange = (_: React.SyntheticEvent, newValue: number) => {
    const types = ['baptism', 'marriage', 'funeral'];
    const newType = types[newValue];
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set('church_id', churchId?.toString() || '');
    navigate(`/apps/records/${newType}?${currentParams.toString()}`);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewRecord = (recordId: number) => {
    navigate(`/apps/records/marriage/${recordId}?church_id=${churchId}`);
  };

  const handleEditRecord = (recordId: number) => {
    navigate(`/apps/records/marriage/edit/${recordId}?church_id=${churchId}`);
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    console.log('Delete record:', recordId);
  };

  const handleRefresh = () => {
    setPage(0);
    setSearchQuery('');
    window.location.reload();
  };

  const sortedRecords = [...records].sort((a, b) => {
    const aVal = (a as any)[sortField] || '';
    const bVal = (b as any)[sortField] || '';
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  if (loading && records.length === 0) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Record Type Switcher */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={1}
          onChange={handleRecordTypeChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Baptism Records" />
          <Tab label="Marriage Records" />
          <Tab label="Funeral Records" />
        </Tabs>
      </Paper>

      {/* Quick Facts */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={`Total: ${totalRecords}`} color="primary" variant="outlined" />
        <Chip label={`Showing: ${records.length}`} color="default" variant="outlined" />
        {churchId && <Chip label={`Church ID: ${churchId}`} color="secondary" variant="outlined" />}
      </Stack>

      {/* Search and Actions Bar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search records..."
            value={searchQuery}
            onChange={handleSearchChange}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <IconRefresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => navigate(`/apps/records/marriage/new?church_id=${churchId}`)}
          >
            New Record
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Records Table */}
      <Paper sx={{ p: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('id')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('groom_first_name')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Groom {sortField === 'groom_first_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('bride_first_name')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Bride {sortField === 'bride_first_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('marriage_date')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Marriage Date {sortField === 'marriage_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('marriage_place')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Location {sortField === 'marriage_place' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('clergy')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Clergy {sortField === 'clergy' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('witnesses')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Witnesses {sortField === 'witnesses' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary">
                      {searchQuery ? 'No records found matching your search' : 'No records found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedRecords.map((record) => {
                  // Support both production (groom_first) and legacy (groom_first_name) schemas
                  const groomFirst = record.groom_first || record.groom_first_name || '';
                  const groomMiddle = record.groom_middle || '';
                  const groomLast = record.groom_last || record.groom_last_name || '';
                  const groomName = record.groom_full || [groomFirst, groomMiddle, groomLast].filter(Boolean).join(' ').trim() || '-';
                  
                  const brideFirst = record.bride_first || record.bride_first_name || '';
                  const brideMiddle = record.bride_middle || '';
                  const brideLast = record.bride_last || record.bride_last_name || '';
                  const brideName = record.bride_full || [brideFirst, brideMiddle, brideLast].filter(Boolean).join(' ').trim() || '-';
                  
                  // Use formatRecordDate for proper date display (YYYY-MM-DD)
                  const marriageDate = formatRecordDate(record.marriage_date) || '-';
                  const location = record.place_name || record.marriage_place || '-';
                  const clergy = record.officiant_name || record.clergy || '-';
                  // Handle JSON witnesses array from production or string from legacy
                  const witnesses = displayJsonField(record.witnesses) || '-';
                  
                  return (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{groomName}</TableCell>
                      <TableCell>{brideName}</TableCell>
                      <TableCell>{marriageDate}</TableCell>
                      <TableCell>{location}</TableCell>
                      <TableCell>{clergy}</TableCell>
                      <TableCell>{witnesses}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => handleViewRecord(record.id)}>
                              <IconEye size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => handleEditRecord(record.id)}>
                              <IconEdit size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteRecord(record.id)}>
                              <IconTrash size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          component="div"
          count={totalRecords}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

export default MarriageRecordsPage;
