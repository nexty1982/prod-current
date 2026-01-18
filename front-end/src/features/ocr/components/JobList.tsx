import React, { useEffect, useState, useCallback } from 'react';
import { fetchJobs, retryJob, deleteJob } from '../lib/ocrApi';
import { Loader2, Play, Trash2, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import { Box, Typography, Paper, Chip, IconButton, Button, useTheme, Alert as MuiAlert } from '@mui/material';
import type { OCRJob } from '../lib/ocrApi';

interface JobListProps {
  className?: string;
  onSelect?: (id: string) => void;
  selectedJobId?: string;
  churchId?: number;
  refreshTrigger?: number;
}

const StatusIcon = ({ status }: { status: OCRJob['status'] }) => {
  const getColor = () => {
    switch (status) {
      case 'completed': return 'success.main';
      case 'failed': return 'error.main';
      case 'processing': return 'info.main';
      case 'pending': return 'warning.main';
      default: return 'text.disabled';
    }
  };
  
  const IconWrapper = ({ children }: { children: React.ReactNode }) => (
    <Box component="span" sx={{ color: getColor(), display: 'inline-flex' }}>
      {children}
    </Box>
  );
  
  switch (status) {
    case 'completed':
      return <IconWrapper><CheckCircle size={16} /></IconWrapper>;
    case 'failed':
      return <IconWrapper><AlertCircle size={16} /></IconWrapper>;
    case 'processing':
      return <IconWrapper><Loader2 size={16} className="animate-spin" /></IconWrapper>;
    case 'pending':
      return <IconWrapper><Clock size={16} /></IconWrapper>;
    default:
      return <IconWrapper><FileText size={16} /></IconWrapper>;
  }
};

const StatusBadge = ({ status }: { status: OCRJob['status'] }) => {
  const theme = useTheme();
  
  const statusColors = {
    completed: { bg: theme.palette.success.light, text: theme.palette.success.dark },
    failed: { bg: theme.palette.error.light, text: theme.palette.error.dark },
    processing: { bg: theme.palette.info.light, text: theme.palette.info.dark },
    pending: { bg: theme.palette.warning.light, text: theme.palette.warning.dark },
    cancelled: { bg: theme.palette.grey[200], text: theme.palette.text.secondary }
  };
  
  const colors = statusColors[status] || statusColors.cancelled;
  
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      size="small"
      sx={{
        bgcolor: colors.bg,
        color: colors.text,
        height: 20,
        fontSize: '0.7rem'
      }}
    />
  );
};

const JobList: React.FC<JobListProps> = ({ 
  className = '', 
  onSelect, 
  selectedJobId, 
  churchId,
  refreshTrigger = 0 
}) => {
  const theme = useTheme();
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    // Skip fetching if churchId is not provided (e.g., for superadmins who haven't selected a church)
    if (!churchId) {
      console.log('[JobList] No churchId provided, skipping fetch');
      setJobs([]);
      setLoading(false);
      return;
    }

    console.log('[JobList] Fetching jobs for churchId:', churchId);
    setLoading(true);
    try {
      const fetchedJobs = await fetchJobs(churchId);
      console.log('[JobList] Fetched jobs:', fetchedJobs.length, fetchedJobs);
      setJobs(fetchedJobs);
    } catch (error) {
      console.error('[JobList] Failed to load OCR jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs, refreshTrigger]);

  // Auto-refresh every 5 seconds for processing jobs
  useEffect(() => {
    const hasProcessingJobs = jobs.some(job => job.status === 'processing' || job.status === 'pending');
    
    if (hasProcessingJobs) {
      const interval = setInterval(loadJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [jobs, loadJobs]);

  const handleRetry = useCallback(async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(jobId);
    
    try {
      await retryJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setActionLoading(null);
    }
  }, [loadJobs]);

  const handleDelete = useCallback(async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this OCR job?')) {
      return;
    }
    
    setActionLoading(jobId);
    
    try {
      await deleteJob(jobId);
      await loadJobs();
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setActionLoading(null);
    }
  }, [loadJobs]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }} className={className}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" fontWeight="medium" color="text.primary">
          Recent OCR Jobs
        </Typography>
        {loading && (
          <Box component="span" sx={{ color: 'text.secondary', display: 'inline-flex' }}>
            <Loader2 size={16} className="animate-spin" />
          </Box>
        )}
      </Box>
      
      <Box sx={{ '& > *:not(:last-child)': { borderBottom: 1, borderColor: 'divider' } }}>
        {!churchId ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'text.disabled' }}>
              <FileText size={32} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Select a church to view OCR jobs
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Choose a church from the dropdown above
            </Typography>
          </Box>
        ) : jobs.length === 0 && !loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1, color: 'text.disabled' }}>
              <FileText size={32} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              No OCR jobs yet
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              Upload some documents to get started
            </Typography>
          </Box>
        ) : (
          jobs.map((job) => (
            <Box
              key={job.id}
              sx={{
                p: 2,
                cursor: 'pointer',
                bgcolor: selectedJobId === job.id ? 'primary.light' : 'transparent',
                borderRight: selectedJobId === job.id ? 4 : 0,
                borderColor: 'primary.main',
                '&:hover': { bgcolor: 'action.hover' },
                transition: 'background-color 0.2s'
              }}
              onClick={() => onSelect?.(job.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <StatusIcon status={job.status} />
                    <Typography variant="body2" fontWeight="medium" color="text.primary" noWrap>
                      {job.originalFilename || job.filename}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 0.5 }}>
                    <StatusBadge status={job.status} />
                    {job.pages && (
                      <Typography variant="caption" color="text.secondary">
                        Pages: {job.pages}
                      </Typography>
                    )}
                    {job.fileSize && (
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(job.fileSize)}
                      </Typography>
                    )}
                    {job.engine && (
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {job.engine}
                      </Typography>
                    )}
                  </Box>
                  
                  <Typography variant="caption" color="text.disabled">
                    Created: {formatDate(job.createdAt)}
                  </Typography>
                  
                  {job.error && (
                    <MuiAlert severity="error" sx={{ mt: 1 }} icon={<AlertCircle size={16} />}>
                      <Typography variant="caption">{job.error}</Typography>
                    </MuiAlert>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  {job.status === 'failed' && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleRetry(job.id, e)}
                      disabled={actionLoading === job.id}
                      title="Retry OCR processing"
                    >
                      {actionLoading === job.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                    </IconButton>
                  )}
                  
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(job.id, e)}
                    disabled={actionLoading === job.id}
                    color="error"
                    title="Delete job"
                  >
                    {actionLoading === job.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default JobList;

