/**
 * FuneralRecordsPage Component
 * 
 * Centralized funeral/death records management page with full UI features.
 * 
 * Route: /apps/records/funeral
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

// Interface updated to match production schema (05_sacrament_tables.sql)
interface FuneralRecord {
  id: number;
  // Production schema fields (deceased_*)
  deceased_first?: string;
  deceased_middle?: string;
  deceased_last?: string;
  deceased_full?: string;
  // Legacy field names for backwards compatibility
  firstName?: string;
  lastName?: string;
  name?: string;
  lastname?: string;
  first_name?: string;
  last_name?: string;
  // Date fields
  birth_date?: string;
  death_date?: string;
  funeral_date?: string;
  deathDate?: string;
  burialDate?: string;
  burial_date?: string;
  // Officiant
  officiant_name?: string;
  priest?: string;
  clergy?: string;
  // Location fields
  burial_place?: string;
  burialLocation?: string;
  burial_location?: string;
  place_name?: string;
  // Cause of death (production schema)
  cause_of_death?: string;
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
  // Church fields
  churchId?: string;
  church_id?: number;
  created_at?: string;
  updated_at?: string;
}

const FuneralRecordsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const urlChurchId = searchParams.get('church_id');
  const [churchId, setChurchId] = useState<number | null>(
    urlChurchId ? parseInt(urlChurchId) : (user?.church_id || null)
  );
  
  const [records, setRecords] = useState<FuneralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('death_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

        const response = await fetch(`/api/funeral-records?${params.toString()}`, {
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
        console.error('Error fetching funeral records:', err);
        setError(err.message || 'Failed to load funeral records');
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
    navigate(`/apps/records/funeral/${recordId}?church_id=${churchId}`);
  };

  const handleEditRecord = (recordId: number) => {
    navigate(`/apps/records/funeral/edit/${recordId}?church_id=${churchId}`);
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
          value={2}
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
            onClick={() => navigate(`/apps/records/funeral/new?church_id=${churchId}`)}
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
                  <Button size="small" onClick={() => handleSort('name')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('death_date')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Death Date {sortField === 'death_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('burial_date')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Burial Date {sortField === 'burial_date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('clergy')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Clergy {sortField === 'clergy' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleSort('burial_location')} sx={{ textTransform: 'none', fontWeight: 'bold' }}>
                    Burial Location {sortField === 'burial_location' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </Button>
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : sortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">
                      {searchQuery ? 'No records found matching your search' : 'No records found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sortedRecords.map((record) => {
                  // Support both production (deceased_*) and legacy schemas
                  const deceasedFirst = record.deceased_first || record.firstName || record.name || record.first_name || '';
                  const deceasedMiddle = record.deceased_middle || '';
                  const deceasedLast = record.deceased_last || record.lastName || record.lastname || record.last_name || '';
                  const fullName = record.deceased_full || [deceasedFirst, deceasedMiddle, deceasedLast].filter(Boolean).join(' ').trim() || '-';
                  
                  // Use formatRecordDate for proper date display (YYYY-MM-DD)
                  const deathDate = formatRecordDate(record.death_date || record.deathDate) || '-';
                  const burialDate = formatRecordDate(record.funeral_date || record.burial_date || record.burialDate) || '-';
                  const clergy = record.officiant_name || record.priest || record.clergy || '-';
                  const burialLocation = record.burial_place || record.burialLocation || record.burial_location || '-';
                  
                  return (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.id}</TableCell>
                      <TableCell>{fullName}</TableCell>
                      <TableCell>{deathDate}</TableCell>
                      <TableCell>{burialDate}</TableCell>
                      <TableCell>{clergy}</TableCell>
                      <TableCell>{burialLocation}</TableCell>
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

export default FuneralRecordsPage;
