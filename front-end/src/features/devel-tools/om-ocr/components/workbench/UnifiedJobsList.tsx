/**
 * UnifiedJobsList - Clean, modern table layout matching redesigned OCR interface
 * Shows processed files with simple columns: File name, Pages, Added, Status
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  Stack,
  Button,
  Typography,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  IconTrash,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import type { OCRJobRow } from '../../types/ocrJob';

interface UnifiedJobsListProps {
  jobs: OCRJobRow[];
  loading: boolean;
  error: string | null;
  onJobSelect: (jobId: number) => void;
  onRefresh: () => void | Promise<void>;
  onDeleteJobs?: (jobIds: number[]) => void | Promise<void>;
  churchId: number;
}

const UnifiedJobsList: React.FC<UnifiedJobsListProps> = ({
  jobs,
  loading,
  error,
  onJobSelect,
  onRefresh,
  onDeleteJobs,
  churchId,
}) => {
  const theme = useTheme();
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [sortBy, setSortBy] = useState<'added' | 'filename'>('added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Sort and filter jobs
  const sortedJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'added') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === 'filename') {
        const nameA = (a.original_filename || '').toLowerCase();
        const nameB = (b.original_filename || '').toLowerCase();
        comparison = nameA.localeCompare(nameB);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted.slice(0, itemsPerPage);
  }, [jobs, sortBy, sortOrder, itemsPerPage]);
  
  // Calculate retention days (6 days from now, or based on created_at)
  const getRetentionDays = useCallback((createdAt: string | undefined) => {
    if (!createdAt) return 6;
    const created = new Date(createdAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 6 - daysSince);
  }, []);
  
  // Format "X minutes/hours/days ago"
  const formatTimeAgo = useCallback((dateString: string | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }, []);
  
  const toggleSelection = useCallback((jobId: number) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);
  
  const toggleSelectAll = useCallback(() => {
    if (selectedJobs.size === sortedJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(sortedJobs.map(j => j.id)));
    }
  }, [sortedJobs, selectedJobs.size]);
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'complete':
        return 'success';
      case 'processing':
        return 'info';
      case 'failed':
      case 'error':
        return 'error';
      case 'queued':
        return 'default';
      default:
        return 'default';
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };
  
  const handleSort = useCallback((column: 'added' | 'filename') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  return (
    <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Controls */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            sx={{ 
              '& .MuiSelect-select': { 
                py: 1,
                display: 'flex',
                alignItems: 'center',
              }
            }}
          >
            <MenuItem value={10}>10 per page</MenuItem>
            <MenuItem value={20}>20 per page</MenuItem>
            <MenuItem value={50}>50 per page</MenuItem>
            <MenuItem value={100}>100 per page</MenuItem>
          </Select>
        </FormControl>
        
        <Stack direction="row" spacing={1}>
          <Tooltip title="Delete Selected">
            <span>
              <IconButton
                size="small"
                disabled={selectedJobs.size === 0}
                onClick={() => {
                  if (onDeleteJobs && selectedJobs.size > 0) {
                    onDeleteJobs(Array.from(selectedJobs));
                    setSelectedJobs(new Set());
                  }
                }}
                sx={{ 
                  opacity: selectedJobs.size === 0 ? 0.5 : 1,
                  color: selectedJobs.size === 0 ? 'text.disabled' : 'text.secondary'
                }}
              >
                <IconTrash size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Download Selected">
            <span>
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconDownload size={16} />}
                disabled={selectedJobs.size === 0}
                sx={{ 
                  opacity: selectedJobs.size === 0 ? 0.5 : 1,
                }}
              >
                Download
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>
      
      {/* Table */}
      <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ width: 50 }}>
                <Checkbox
                  checked={sortedJobs.length > 0 && selectedJobs.size === sortedJobs.length}
                  indeterminate={selectedJobs.size > 0 && selectedJobs.size < sortedJobs.length}
                  onChange={toggleSelectAll}
                />
              </TableCell>
              <TableCell 
                sx={{ 
                  cursor: 'pointer',
                  userSelect: 'none',
                  textDecoration: sortBy === 'filename' ? 'underline' : 'none',
                  textDecorationStyle: 'dotted',
                }}
                onClick={() => handleSort('filename')}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>File name</span>
                  {sortBy === 'filename' && (
                    sortOrder === 'asc' ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
                  )}
                </Stack>
              </TableCell>
              <TableCell>Pages</TableCell>
              <TableCell 
                sx={{ 
                  cursor: 'pointer',
                  userSelect: 'none',
                  textDecoration: sortBy === 'added' ? 'underline' : 'none',
                  textDecorationStyle: 'dotted',
                }}
                onClick={() => handleSort('added')}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <span>Added</span>
                  {sortBy === 'added' && (
                    sortOrder === 'asc' ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />
                  )}
                </Stack>
              </TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <LinearProgress />
                </TableCell>
              </TableRow>
            ) : sortedJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {jobs.length === 0 ? 'No processed images yet' : 'No jobs to display'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedJobs.map((job) => {
                const retentionDays = getRetentionDays(job.created_at);
                const isProcessed = job.status === 'completed' || job.status === 'complete';
                
                return (
                  <TableRow
                    key={job.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => isProcessed && onJobSelect(job.id)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedJobs.has(job.id)}
                        onChange={() => toggleSelection(job.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                        {job.original_filename || 'Unknown'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {job.pages || 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatTimeAgo(job.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {isProcessed && (
                          <>
                            <Chip
                              size="small"
                              label="Processed"
                              color="success"
                              sx={{ height: 24, fontSize: '0.75rem' }}
                            />
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'text.secondary' }}>
                              <IconTrash size={14} />
                              <Typography variant="caption">
                                {retentionDays} day{retentionDays !== 1 ? 's' : ''}
                              </Typography>
                            </Stack>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                onJobSelect(job.id);
                              }}
                              sx={{ 
                                ml: 1,
                                minWidth: 60,
                                height: 28,
                                fontSize: '0.75rem',
                                textTransform: 'none',
                              }}
                            >
                              Open
                            </Button>
                          </>
                        )}
                        {!isProcessed && (
                          <Chip
                            size="small"
                            label={job.status || 'Processing'}
                            color={getStatusColor(job.status || '')}
                            sx={{ height: 24, fontSize: '0.75rem', textTransform: 'capitalize' }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
    </Paper>
  );
};

export default UnifiedJobsList;

