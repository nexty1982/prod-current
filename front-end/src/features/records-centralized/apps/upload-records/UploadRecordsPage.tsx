/**
 * UploadRecordsPage — Simplified record upload for church staff.
 * Route: /apps/upload-records
 *
 * Two-phase flow:
 *   Phase 1: Guidelines + acknowledgment
 *   Phase 2: Upload images (church auto-detected for non-admins)
 */

import { useAuth } from '@/context/AuthContext';
import OcrPipelineJob from '@/features/ocr/components/OcrPipelineJob';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Alert,
    alpha,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconCheck,
    IconCloudUpload,
    IconPhoto,
    IconUpload,
    IconX
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  error?: string;
  jobId?: string;
}

interface Church {
  id: number;
  name: string;
}

let _uid = 0;
const uid = () => `urf_${++_uid}_${Date.now()}`;

const ACCEPTED_RE = /\.(jpe?g|png|tiff?)$/i;
const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.tif,.tiff';

// ---------------------------------------------------------------------------
// Status chip helper
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'primary' | 'info' | 'success' | 'error' | 'warning' }> = {
  pending: { label: 'Pending', color: 'default' },
  uploading: { label: 'Uploading', color: 'info' },
  queued: { label: 'Queued', color: 'primary' },
  processing: { label: 'Processing', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  error: { label: 'Error', color: 'error' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const UploadRecordsPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  // Phase 1 state
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);

  // Church selection (admin only)
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(null);

  const effectiveChurchId = useMemo(
    () => (isAdmin ? selectedChurchId : user?.church_id ? Number(user.church_id) : null),
    [isAdmin, selectedChurchId, user?.church_id],
  );

  // Upload state
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived
  const hasActiveJobs = queue.some((f) => f.status === 'queued' || f.status === 'processing' || f.status === 'uploading');
  const allDone = queue.length > 0 && queue.every((f) => f.status === 'completed' || f.status === 'failed' || f.status === 'error');
  const completedCount = queue.filter((f) => f.status === 'completed').length;
  const failedCount = queue.filter((f) => f.status === 'failed' || f.status === 'error').length;
  const pendingCount = queue.filter((f) => f.status === 'pending').length;

  // ── Load churches for admin ──
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const res: any = await apiClient.get('/api/my/churches');
        const data = res?.data ?? res;
        let list = data?.churches || data || [];
        if (!Array.isArray(list)) list = [];
        if (list.length === 0) {
          const fallback: any = await apiClient.get('/api/churches');
          const fData = fallback?.data ?? fallback;
          list = fData?.churches || fData || [];
        }
        setChurches(Array.isArray(list) ? list : []);
      } catch {
        setChurches([]);
      }
    })();
  }, [isAdmin]);

  // ── Poll for job status updates ──
  useEffect(() => {
    if (!effectiveChurchId || !hasActiveJobs) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const poll = async () => {
      try {
        const res: any = await apiClient.get(`/api/church/${effectiveChurchId}/ocr/jobs`);
        const jobs: any[] = res?.data?.jobs || res?.data || res?.jobs || [];
        if (jobs.length === 0) return;

        const statusMap = new Map<string, { status: string; error?: string }>();
        for (const j of jobs) {
          statusMap.set(String(j.id), {
            status: j.status,
            error: j.error_regions || j.error_message || j.error || undefined,
          });
        }

        setQueue((prev) =>
          prev.map((f) => {
            if (!f.jobId) return f;
            const remote = statusMap.get(f.jobId);
            if (!remote) return f;

            let uiStatus = f.status;
            if (remote.status === 'pending' || remote.status === 'queued') uiStatus = 'queued';
            else if (remote.status === 'processing') uiStatus = 'processing';
            else if (remote.status === 'completed' || remote.status === 'complete') uiStatus = 'completed';
            else if (remote.status === 'failed' || remote.status === 'error') uiStatus = 'failed';

            if (uiStatus === f.status) return f;
            return { ...f, status: uiStatus, error: remote.error, progress: uiStatus === 'completed' ? 100 : f.progress };
          }),
        );
      } catch {
        // polling failure is non-fatal
      }
    };

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [effectiveChurchId, hasActiveJobs]);

  // ── File handlers ──
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: QueuedFile[] = Array.from(fileList)
      .filter((f) => ACCEPTED_RE.test(f.name))
      .map((f) => ({ id: uid(), file: f, name: f.name, size: f.size, status: 'pending' as const, progress: 0 }));
    if (newFiles.length > 0) setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeFile = (id: string) => setQueue((q) => q.filter((f) => f.id !== id));

  // ── Upload ──
  const startUpload = useCallback(async () => {
    if (!effectiveChurchId || queue.length === 0) return;
    setIsUploading(true);

    for (const item of queue) {
      if (item.status !== 'pending') continue;
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));

      try {
        const formData = new FormData();
        formData.append('files', item.file);
        formData.append('churchId', effectiveChurchId.toString());
        formData.append('recordType', 'custom');
        formData.append('language', 'en');

        const response: any = await apiClient.post('/api/ocr/jobs/upload', formData);
        const jobs = response.data?.jobs || response.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;

        if (jobId) {
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const, progress: 80, jobId } : f)));
          try {
            await apiClient.post(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/retry`);
          } catch {
            // Job exists in DB — worker will pick it up
          }
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)));
        } else {
          setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 100, error: 'Upload OK but no job created' } : f)));
        }
      } catch (err: any) {
        const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Upload failed';
        setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'error', error: serverMsg } : f)));
      }
    }

    setIsUploading(false);
  }, [effectiveChurchId, queue]);

  const retryJob = useCallback(
    async (queueId: string, jobId: string) => {
      if (!effectiveChurchId) return;
      setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'queued' as const, error: undefined } : f)));
      try {
        await apiClient.post(`/api/church/${effectiveChurchId}/ocr/jobs/${jobId}/retry`);
      } catch {
        setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'failed' as const, error: 'Retry failed' } : f)));
      }
    },
    [effectiveChurchId],
  );

  const resetForMore = () => {
    setQueue([]);
  };

  // ── Format file size ──
  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // =====================================================================
  // RENDER
  // =====================================================================

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: 4, px: 2 }}>
      {/* Page header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
        Upload Records
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload scanned images of church records for automated OCR processing.
      </Typography>

      {/* Pipeline overview diagram */}
      <OcrPipelineOverview />

      {/* ── Phase 1: Guidelines ── */}
      {!guidelinesAccepted && (
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
            Before You Upload
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ensure your scanned images meet quality standards for accurate OCR processing.
            Following these guidelines will improve text recognition and reduce manual corrections.
          </Typography>

          <Stack spacing={1.2} sx={{ mb: 2.5 }}>
            {[
              'Scan pages at 300 DPI or higher for optimal OCR accuracy',
              'Ensure images are well-lit with minimal shadows or glare',
              'Capture full page edges and avoid cropping any text',
              'Use JPEG or PNG format (TIFF supported for archival)',
              'Organize files by book or volume before uploading',
            ].map((text, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                <Box
                  sx={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconCheck size={14} color={theme.palette.success.main} />
                </Box>
                <Typography variant="body2" color="text.secondary">{text}</Typography>
              </Stack>
            ))}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            What to Expect
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Automated Processing:</strong> Once uploaded, images are automatically processed
            using optical character recognition to extract names, dates, and record details.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            <strong>Admin Review:</strong> All processed records are reviewed by your church
            administrator before being made available. This typically takes 24-72 hours.
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={guidelinesAccepted}
                onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                sx={{ color: theme.palette.primary.main, '&.Mui-checked': { color: theme.palette.primary.main } }}
              />
            }
            label={<Typography variant="body2" fontWeight={500}>I understand these guidelines and I'm ready to upload.</Typography>}
          />
        </Paper>
      )}

      {/* ── Phase 2: Upload ── */}
      {guidelinesAccepted && (
        <>
          {/* Admin church selector */}
          {isAdmin && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Target Church</InputLabel>
                <Select
                  value={selectedChurchId ?? ''}
                  label="Target Church"
                  onChange={(e) => setSelectedChurchId(Number(e.target.value) || null)}
                >
                  {churches.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          )}

          {/* Upload blocked if no church */}
          {!effectiveChurchId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {isAdmin ? 'Please select a target church above.' : 'No church is associated with your account. Contact your administrator.'}
            </Alert>
          )}

          {/* Drop zone */}
          {effectiveChurchId && (
            <Paper
              variant="outlined"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              sx={{
                p: 4, mb: 2, textAlign: 'center', cursor: 'pointer',
                borderStyle: 'dashed', borderWidth: 2,
                borderColor: dragActive ? 'primary.main' : 'divider',
                bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { borderColor: 'primary.light', bgcolor: alpha(theme.palette.primary.main, 0.02) },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                multiple
                hidden
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
              />
              <IconCloudUpload size={48} color={theme.palette.text.secondary} style={{ opacity: 0.5 }} />
              <Typography variant="body1" fontWeight={600} sx={{ mt: 1.5 }}>
                Drag and drop images here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                or click to browse. Accepts JPG, PNG, TIFF.
              </Typography>
            </Paper>
          )}

          {/* File queue */}
          {queue.length > 0 && (
            <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Files ({queue.length})
                </Typography>
                <Stack direction="row" spacing={0.5}>
                  {completedCount > 0 && <Chip label={`${completedCount} completed`} color="success" size="small" />}
                  {failedCount > 0 && <Chip label={`${failedCount} failed`} color="error" size="small" />}
                </Stack>
              </Box>

              <Stack divider={<Divider />}>
                {queue.map((f) => {
                  const sc = STATUS_CONFIG[f.status] || STATUS_CONFIG.pending;
                  const showPipeline = f.jobId && effectiveChurchId && (f.status === 'queued' || f.status === 'processing' || f.status === 'completed' || f.status === 'failed');
                  return (
                    <Box key={f.id} sx={{ px: 2, py: 1.5 }}>
                      {/* File header */}
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: showPipeline ? 1.5 : 0 }}>
                        <IconPhoto size={20} color={theme.palette.text.secondary} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>{f.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtSize(f.size)}</Typography>
                        </Box>
                        {!showPipeline && (
                          <Chip label={sc.label} color={sc.color} size="small" variant="outlined" />
                        )}
                        {f.status === 'pending' && (
                          <Tooltip title="Remove">
                            <IconButton size="small" onClick={() => removeFile(f.id)}><IconX size={16} /></IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                      {/* Pipeline visualization for submitted jobs */}
                      {showPipeline && (
                        <OcrPipelineJob
                          jobId={Number(f.jobId)}
                          churchId={effectiveChurchId!}
                          compact
                          onStatusChange={(status) => {
                            setQueue((q) => q.map((qf) => {
                              if (qf.id !== f.id) return qf;
                              let uiStatus = qf.status;
                              if (status === 'pending' || status === 'queued') uiStatus = 'queued';
                              else if (status === 'processing') uiStatus = 'processing';
                              else if (status === 'completed' || status === 'complete') uiStatus = 'completed';
                              else if (status === 'failed' || status === 'error') uiStatus = 'failed';
                              return { ...qf, status: uiStatus };
                            }));
                          }}
                        />
                      )}
                      {/* Legacy error display for non-pipeline jobs */}
                      {!showPipeline && f.error && (
                        <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                          {f.error}
                        </Typography>
                      )}
                      {/* Upload progress */}
                      {f.status === 'uploading' && (
                        <LinearProgress
                          variant="determinate"
                          value={f.progress}
                          sx={{ mt: 1, borderRadius: 1 }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          )}

          {/* Actions */}
          {effectiveChurchId && !allDone && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                startIcon={<IconUpload size={18} />}
                onClick={startUpload}
                disabled={isUploading || pendingCount === 0}
              >
                {isUploading ? 'Uploading...' : `Upload ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
              </Button>
              {queue.length > 0 && !isUploading && (
                <Button variant="text" color="inherit" onClick={() => setQueue([])}>
                  Clear All
                </Button>
              )}
            </Stack>
          )}

          {/* Completion message */}
          {allDone && (
            <Box sx={{ mt: 1 }}>
              <Alert
                severity={failedCount === 0 ? 'success' : failedCount === queue.length ? 'error' : 'warning'}
                sx={{ mb: 2 }}
              >
                {failedCount === 0
                  ? 'Your records have been submitted for processing. Your church administrator will review them, typically within 24-72 hours.'
                  : failedCount === queue.length
                    ? 'All uploads failed. Please check your files and try again.'
                    : `${completedCount} of ${queue.length} files uploaded successfully. ${failedCount} failed.`}
              </Alert>
              <Button variant="outlined" startIcon={<IconUpload size={18} />} onClick={resetForMore}>
                Upload More
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default UploadRecordsPage;
