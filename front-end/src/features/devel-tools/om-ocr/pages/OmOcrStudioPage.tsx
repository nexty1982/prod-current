/**
 * OM OCR Studio v1 — Step-based workflow page
 * Matches Figma design: Prepare → Select Church → Add Images → (future: Review)
 * Light/dark ready — uses only MUI theme tokens, zero hardcoded hex.
 */

import { useAuth } from '@/context/AuthContext';
import { CustomizerContext } from '@/context/CustomizerContext';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    Drawer,
    FormControl,
    FormControlLabel,
    IconButton,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Typography,
    alpha,
    useTheme
} from '@mui/material';
import {
    IconAlertCircle,
    IconCheck,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconChevronUp,
    IconFile,
    IconFileCheck,
    IconFolder,
    IconLoader2,
    IconPhoto,
    IconRefresh,
    IconSortAscending,
    IconUpload,
    IconX
} from '@tabler/icons-react';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import OcrStudioNav from '../components/OcrStudioNav';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Church {
  id: number;
  name: string;
  database_name?: string;
}

type StepStatus = 'not_started' | 'in_progress' | 'completed';

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

interface ContractCell {
  row_index: number;
  column_index: number;
  content: string;
  confidence?: number | null;
  token_count?: number;
  needs_review?: boolean;
  reasons?: string[];
}

interface ContractRow {
  row_index: number;
  type: 'header' | 'row';
  cells: ContractCell[];
}

interface ContractTable {
  table_number: number;
  row_count: number;
  column_count: number;
  has_header_row: boolean;
  header_content: string;
  rows: ContractRow[];
}

interface TableExtraction {
  layout_id: string;
  page_number: number;
  tables: ContractTable[];
  total_tokens: number;
  data_tokens: number;
  data_rows: number;
  extracted_at: string;
}

interface OcrJob {
  id: number;
  church_id: number;
  filename: string;
  status: string;
  record_type: string;
  language: string;
  confidence_score: number | null;
  error_regions: string | null;
  ocr_text: string | null;
  ocr_result: any;
  created_at: string;
  has_table_extraction?: boolean;
  table_extraction?: TableExtraction | null;
  artifacts?: string[];
}

interface ExtractorField {
  id: number;
  extractor_id: number;
  parent_field_id: number | null;
  name: string;
  key: string;
  field_type: string;
  multiple: boolean;
  instructions: string | null;
  sort_order: number;
}

interface Extractor {
  id: number;
  name: string;
  description: string | null;
  record_type: string;
  page_mode: string;
  fields: ExtractorField[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const uid = () => Math.random().toString(36).slice(2, 11);

// ─── Status Pill ─────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ status: StepStatus }> = ({ status }) => {
  const theme = useTheme();
  const map: Record<StepStatus, { label: string; color: string; bg: string }> = {
    not_started: {
      label: 'Not Started',
      color: theme.palette.text.secondary,
      bg: alpha(theme.palette.text.secondary, 0.08),
    },
    in_progress: {
      label: 'In Progress',
      color: theme.palette.info.main,
      bg: alpha(theme.palette.info.main, 0.1),
    },
    completed: {
      label: 'Completed',
      color: theme.palette.success.main,
      bg: alpha(theme.palette.success.main, 0.1),
    },
  };
  const { label, color, bg } = map[status];
  return (
    <Chip
      size="small"
      icon={
        status === 'completed' ? (
          <IconCheck size={14} style={{ color }} />
        ) : status === 'in_progress' ? (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: color,
              ml: 0.5,
            }}
          />
        ) : undefined
      }
      label={label}
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 600,
        fontSize: '0.7rem',
        border: 'none',
        '& .MuiChip-icon': { color },
      }}
    />
  );
};

// ─── Step Icon Circle ────────────────────────────────────────────────────────

const StepCircle: React.FC<{ step: number; status: StepStatus }> = ({ step, status }) => {
  const theme = useTheme();
  const isComplete = status === 'completed';
  const isActive = status === 'in_progress';

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        bgcolor: isComplete
          ? theme.palette.success.main
          : isActive
          ? theme.palette.primary.main
          : alpha(theme.palette.text.primary, 0.08),
        color: isComplete || isActive
          ? theme.palette.common.white
          : theme.palette.text.secondary,
        fontWeight: 700,
        fontSize: '0.95rem',
        transition: 'all 0.3s ease',
      }}
    >
      {isComplete ? <IconCheck size={20} /> : step}
    </Box>
  );
};

// ─── Stepper Header ──────────────────────────────────────────────────────────

interface StepDef {
  label: string;
  status: StepStatus;
}

const StepperHeader: React.FC<{ steps: StepDef[] }> = ({ steps }) => {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0} sx={{ py: 3 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 120 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor:
                  s.status === 'completed'
                    ? theme.palette.success.main
                    : s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : alpha(theme.palette.text.primary, 0.08),
                color:
                  s.status === 'completed' || s.status === 'in_progress'
                    ? theme.palette.common.white
                    : theme.palette.text.disabled,
                fontWeight: 700,
                fontSize: '0.85rem',
                border: s.status === 'in_progress' ? `2px solid ${theme.palette.primary.main}` : 'none',
                boxShadow:
                  s.status === 'in_progress'
                    ? `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`
                    : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {s.status === 'completed' ? <IconCheck size={18} /> : i + 1}
            </Box>
            <Typography
              variant="caption"
              fontWeight={s.status === 'in_progress' ? 700 : 500}
              sx={{
                color:
                  s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : s.status === 'completed'
                    ? theme.palette.success.main
                    : theme.palette.text.secondary,
                textAlign: 'center',
              }}
            >
              {s.label}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color:
                  s.status === 'in_progress'
                    ? theme.palette.primary.main
                    : s.status === 'completed'
                    ? theme.palette.success.main
                    : theme.palette.text.disabled,
                fontSize: '0.65rem',
              }}
            >
              {s.status === 'completed'
                ? 'Completed'
                : s.status === 'in_progress'
                ? 'In Progress'
                : 'Not Started'}
            </Typography>
          </Stack>
          {i < steps.length - 1 && (
            <Box
              sx={{
                flex: 1,
                height: 2,
                mx: 1,
                maxWidth: 120,
                bgcolor:
                  s.status === 'completed'
                    ? theme.palette.success.main
                    : alpha(theme.palette.text.primary, 0.12),
                borderRadius: 1,
                transition: 'background-color 0.3s ease',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </Stack>
  );
};

// ─── Step Card wrapper ───────────────────────────────────────────────────────

interface StepCardProps {
  step: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}

const StepCard: React.FC<StepCardProps> = ({ step, title, status, children }) => {
  const theme = useTheme();
  const isActive = status === 'in_progress';
  const isCompleted = status === 'completed';
  const isNotStarted = status === 'not_started';

  // Allow completed steps to be re-expanded by clicking the header
  const [manualExpand, setManualExpand] = React.useState(false);
  const expanded = isActive || (isCompleted && manualExpand);

  // Reset manual expand when status changes
  React.useEffect(() => {
    setManualExpand(false);
  }, [status]);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: isCompleted && !manualExpand ? 1.5 : 3,
        borderRadius: isCompleted && !manualExpand ? 2 : 3,
        border: '1px solid',
        borderColor: isActive
          ? alpha(theme.palette.primary.main, 0.3)
          : isCompleted
          ? alpha(theme.palette.success.main, 0.25)
          : theme.palette.divider,
        bgcolor: isActive
          ? alpha(theme.palette.primary.main, 0.02)
          : isCompleted
          ? alpha(theme.palette.success.main, 0.03)
          : theme.palette.background.paper,
        overflow: 'hidden',
        opacity: isNotStarted ? 0.5 : 1,
        transform: isActive ? 'scale(1)' : 'scale(0.995)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header — clickable on completed steps to toggle expand */}
      <Box
        onClick={isCompleted ? () => setManualExpand((v) => !v) : undefined}
        sx={{
          px: 3,
          pt: isCompleted && !manualExpand ? 2 : 3,
          pb: isCompleted && !manualExpand ? 2 : 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: isCompleted ? 'pointer' : 'default',
          userSelect: isCompleted ? 'none' : 'auto',
          '&:hover': isCompleted
            ? { bgcolor: alpha(theme.palette.success.main, 0.06) }
            : {},
          transition: 'background-color 0.2s ease, padding 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <StepCircle step={step} status={status} />
        <Typography
          variant={isCompleted && !manualExpand ? 'subtitle1' : 'h6'}
          fontWeight={700}
          sx={{
            flex: 1,
            transition: 'font-size 0.3s ease',
            color: isCompleted
              ? theme.palette.success.main
              : isNotStarted
              ? theme.palette.text.disabled
              : theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        <StatusPill status={status} />
        {isCompleted && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: theme.palette.text.secondary,
              transition: 'transform 0.3s ease',
              transform: manualExpand ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <IconChevronDown size={18} />
          </Box>
        )}
      </Box>
      {/* Body — collapses when completed, expands when active */}
      <Collapse in={expanded} timeout={400} easing="cubic-bezier(0.4, 0, 0.2, 1)">
        <Box
          sx={{
            px: 3,
            pb: 3,
            opacity: expanded ? 1 : 0,
            transition: 'opacity 0.35s ease 0.05s',
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

// ─── Upload Drawer ───────────────────────────────────────────────────────────

interface UploadDrawerProps {
  open: boolean;
  onClose: () => void;
  churchId: number | null;
  onUploadComplete?: () => void;
}

const OcrUploadDrawer: React.FC<UploadDrawerProps> = ({ open, onClose, churchId, onUploadComplete }) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadDir = churchId
    ? `/uploads/om_church_${churchId}/uploaded/`
    : '/uploads/';

  // Poll for job status updates when there are queued/processing/pending jobs with jobIds
  const hasActiveJobs = queue.some(
    (f) => f.jobId && (f.status === 'queued' || f.status === 'processing' || f.status === 'pending'),
  );
  const hasAnyProcessing = queue.some((f) => f.status === 'processing');
  const completedCount = queue.filter((f) => f.status === 'completed').length;
  const failedCount = queue.filter((f) => f.status === 'failed' || f.status === 'error').length;
  const totalWithJobs = queue.filter((f) => !!f.jobId).length;
  const allDone = totalWithJobs > 0 && completedCount + failedCount === totalWithJobs;

  useEffect(() => {
    if (!open || !churchId || !hasActiveJobs) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const poll = async () => {
      try {
        // Use platform-only endpoint — fast, no tenant DB, safe to poll
        const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs`);
        const jobs: any[] = res?.data?.jobs || res?.data || res?.jobs || [];
        if (jobs.length === 0) return;

        // Build lookup by job id → status
        const statusMap = new Map<string, { status: string; error?: string; confidence?: number }>();
        for (const j of jobs) {
          statusMap.set(String(j.id), {
            status: j.status,
            error: j.error_regions || j.error_message || j.error || undefined,
            confidence: j.confidence_score,
          });
        }

        setQueue((prev) =>
          prev.map((f) => {
            if (!f.jobId) return f;
            const remote = statusMap.get(f.jobId);
            if (!remote) return f;

            // Map backend statuses to our UI statuses
            let uiStatus = f.status;
            if (remote.status === 'pending' || remote.status === 'queued') uiStatus = 'queued';
            else if (remote.status === 'processing') uiStatus = 'processing';
            else if (remote.status === 'completed' || remote.status === 'complete') uiStatus = 'completed';
            else if (remote.status === 'failed' || remote.status === 'error') uiStatus = 'failed';

            if (uiStatus === f.status) return f; // no change
            return { ...f, status: uiStatus, error: remote.error, progress: uiStatus === 'completed' ? 100 : f.progress };
          }),
        );
      } catch {
        // polling failure is non-fatal
      }
    };

    // Poll immediately, then every 3s
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [open, churchId, hasActiveJobs]);

  // Retry a failed job
  const retryJob = useCallback(async (queueId: string, jobId: string) => {
    if (!churchId) return;
    setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'queued' as const, error: undefined } : f)));
    try {
      await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
    } catch (err: any) {
      setQueue((q) => q.map((f) => (f.id === queueId ? { ...f, status: 'failed' as const, error: 'Retry failed' } : f)));
    }
  }, [churchId]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: QueuedFile[] = Array.from(fileList)
      .filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f.name))
      .map((f) => ({
        id: uid(),
        file: f,
        name: f.name,
        size: f.size,
        status: 'pending' as const,
        progress: 0,
      }));
    setQueue((prev) => [...prev, ...newFiles]);
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

  const startUpload = useCallback(async () => {
    if (!churchId || queue.length === 0) return;
    setIsUploading(true);

    // Platform upload endpoint — inserts into platform DB where feeder worker polls
    const endpoint = `/api/ocr/jobs/upload`;

    for (const item of queue) {
      if (item.status !== 'pending') continue;
      setQueue((q) => q.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 0 } : f)));

      try {
        // Match exact FormData shape from EnhancedOCRUploader.startUpload
        const formData = new FormData();
        formData.append('files', item.file);                // key = 'files' (plural)
        formData.append('churchId', churchId.toString());   // churchId in body
        formData.append('recordType', 'custom');               // camelCase — classified later in workbench
        formData.append('language', 'en');

        // DO NOT set Content-Type — let browser set multipart boundary
        const response: any = await apiClient.post(endpoint, formData);

        // Extract jobId from response — backend creates the job row and returns its id
        const jobs = response.data?.jobs || response.jobs || [];
        const jobId = jobs.length > 0 ? String(jobs[0].id) : undefined;

        if (jobId) {
          // Job created — trigger OCR processing via retry endpoint
          setQueue((q) =>
            q.map((f) => (f.id === item.id ? { ...f, status: 'uploading' as const, progress: 80, jobId } : f)),
          );
          try {
            await apiClient.post(`/api/church/${churchId}/ocr/jobs/${jobId}/retry`);
            // Set to 'queued' so polling picks up the lifecycle
            setQueue((q) =>
              q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)),
            );
          } catch (retryErr: any) {
            console.error(`[OCR Studio] Failed to trigger processing for job ${jobId}:`, retryErr?.response?.data || retryErr?.message);
            // Still set to queued — the job exists in DB as pending, worker will pick it up
            setQueue((q) =>
              q.map((f) => (f.id === item.id ? { ...f, status: 'queued' as const, progress: 100 } : f)),
            );
          }
        } else {
          // Upload succeeded but no job returned — treat as error
          setQueue((q) =>
            q.map((f) => (f.id === item.id ? { ...f, status: 'error', progress: 100, error: 'Upload OK but no job created' } : f)),
          );
        }
      } catch (err: any) {
        const serverMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Upload failed';
        setQueue((q) =>
          q.map((f) =>
            f.id === item.id
              ? { ...f, status: 'error', error: serverMsg }
              : f,
          ),
        );
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  }, [churchId, queue, onUploadComplete]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 420 },
          bgcolor: theme.palette.background.default,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Drawer header */}
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: '1px solid',
            borderColor: theme.palette.divider,
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Add Images
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Upload scanned record pages for OCR processing
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <IconX size={20} />
            </IconButton>
          </Stack>
        </Box>

        {/* Scrollable content */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2.5 }}>
          {/* Drop zone */}
          <Paper
            elevation={0}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              mb: 2.5,
              borderRadius: 3,
              border: '2px dashed',
              borderColor: dragActive
                ? theme.palette.primary.main
                : alpha(theme.palette.text.primary, 0.15),
              bgcolor: dragActive
                ? alpha(theme.palette.primary.main, 0.06)
                : theme.palette.background.paper,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tiff,.tif"
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: 'none' }}
            />
            <Box
              sx={{
                width: 56,
                height: 56,
                mx: 'auto',
                mb: 1.5,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconUpload size={28} color={theme.palette.primary.main} />
            </Box>
            <Typography variant="body1" fontWeight={600}>
              Drag and drop images here
            </Typography>
            <Typography variant="caption" color="text.secondary">
              or click the button below to browse
            </Typography>
          </Paper>

          {/* Choose Files button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<IconFile size={18} />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ mb: 2.5, fontWeight: 600 }}
          >
            Choose Files
          </Button>

          {/* Upload Directory */}
          <Paper
            variant="outlined"
            sx={{
              px: 2,
              py: 1.5,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <IconFolder size={16} color={theme.palette.text.secondary} />
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Upload Directory:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', color: theme.palette.text.primary }}
            >
              {uploadDir}
            </Typography>
          </Paper>

          {/* Advanced Options */}
          <Box
            onClick={() => setShowAdvanced(!showAdvanced)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              mb: 1,
              py: 1,
            }}
          >
            {showAdvanced ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            <Typography variant="body2" fontWeight={600} sx={{ ml: 0.5 }}>
              Advanced Options
            </Typography>
          </Box>
          <Collapse in={showAdvanced}>
            <Paper
              variant="outlined"
              sx={{ p: 2, mb: 2, bgcolor: theme.palette.background.paper }}
            >
              <Typography variant="caption" color="text.secondary">
                OCR Engine: Google Vision · DPI: 300 · Language: Auto-detect
              </Typography>
            </Paper>
          </Collapse>

          {/* Queue */}
          {queue.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Upload Queue ({queue.length})
                </Typography>
                {queue.some((f) => f.jobId) && (
                  <Stack direction="row" spacing={0.5}>
                    {(() => {
                      const counts = {
                        queued: queue.filter((f) => f.status === 'queued').length,
                        processing: queue.filter((f) => f.status === 'processing').length,
                        completed: queue.filter((f) => f.status === 'completed').length,
                        failed: queue.filter((f) => f.status === 'failed' || f.status === 'error').length,
                      };
                      return (
                        <>
                          {counts.queued > 0 && (
                            <Chip size="small" label={`${counts.queued} queued`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main }} />
                          )}
                          {counts.processing > 0 && (
                            <Chip size="small" label={`${counts.processing} processing`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main }} />
                          )}
                          {counts.completed > 0 && (
                            <Chip size="small" label={`${counts.completed} done`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main }} />
                          )}
                          {counts.failed > 0 && (
                            <Chip size="small" label={`${counts.failed} failed`} sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main }} />
                          )}
                        </>
                      );
                    })()}
                  </Stack>
                )}
              </Stack>
              <Stack spacing={1}>
                {queue.map((f) => (
                  <Paper
                    key={f.id}
                    variant="outlined"
                    sx={{
                      px: 2,
                      py: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      bgcolor: theme.palette.background.paper,
                    }}
                  >
                    <IconPhoto size={18} color={theme.palette.text.secondary} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap fontWeight={500}>
                        {f.name}
                      </Typography>
                      {f.status === 'uploading' && (
                        <LinearProgress
                          variant="determinate"
                          value={f.progress}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      )}
                      {f.status === 'processing' && (
                        <LinearProgress
                          variant="indeterminate"
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          f.status === 'completed'
                            ? theme.palette.success.main
                            : f.status === 'error' || f.status === 'failed'
                            ? theme.palette.error.main
                            : f.status === 'processing'
                            ? theme.palette.warning.main
                            : f.status === 'queued'
                            ? theme.palette.info.main
                            : theme.palette.text.secondary,
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      {f.status === 'completed'
                        ? 'Completed'
                        : f.status === 'failed'
                        ? 'Failed'
                        : f.status === 'error'
                        ? f.error || 'Error'
                        : f.status === 'processing'
                        ? 'Processing…'
                        : f.status === 'queued'
                        ? 'Queued'
                        : f.status === 'uploading'
                        ? `${f.progress}%`
                        : 'Pending'}
                    </Typography>
                    {f.status === 'pending' && (
                      <IconButton size="small" onClick={() => removeFile(f.id)}>
                        <IconX size={16} />
                      </IconButton>
                    )}
                    {(f.status === 'failed' || f.status === 'error') && f.jobId && (
                      <IconButton size="small" onClick={() => retryJob(f.id, f.jobId!)} title="Retry">
                        <IconRefresh size={16} />
                      </IconButton>
                    )}
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Box>

        {/* Drawer footer */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: theme.palette.divider,
            display: 'flex',
            gap: 1.5,
          }}
        >
          {/* Processing banner */}
          {hasAnyProcessing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: alpha(theme.palette.warning.main, 0.08), flex: '0 0 100%', mb: 1 }}>
              <IconLoader2 size={16} color={theme.palette.warning.main} style={{ animation: 'spin 1s linear infinite' }} />
              <Typography variant="caption" color="warning.main" fontWeight={600}>Processing…</Typography>
            </Box>
          )}
          {/* Summary toast */}
          {allDone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.5, borderRadius: 1, bgcolor: alpha(failedCount > 0 ? theme.palette.error.main : theme.palette.success.main, 0.08), flex: '0 0 100%', mb: 1 }}>
              {failedCount > 0 ? <IconAlertCircle size={16} color={theme.palette.error.main} /> : <IconCheck size={16} color={theme.palette.success.main} />}
              <Typography variant="caption" fontWeight={600} color={failedCount > 0 ? 'error.main' : 'success.main'}>
                {completedCount > 0 && `${completedCount} page${completedCount !== 1 ? 's' : ''} processed`}
                {completedCount > 0 && failedCount > 0 && ' • '}
                {failedCount > 0 && `${failedCount} failed — retry available`}
              </Typography>
            </Box>
          )}
          <Button
            variant="contained"
            fullWidth
            disabled={queue.filter((f) => f.status === 'pending').length === 0 || isUploading || hasAnyProcessing || !churchId}
            onClick={startUpload}
            sx={{
              fontWeight: 700,
              py: 1.2,
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            {isUploading ? 'Uploading…' : 'Start Upload'}
          </Button>
          <Button variant="text" onClick={onClose} disabled={hasAnyProcessing} sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {hasAnyProcessing ? 'Processing…' : 'Close'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

// ─── Image History Panel ─────────────────────────────────────────────────────

interface ImageHistoryPanelProps {
  churchId: number;
  refreshKey: number;
}

type SortField = 'date' | 'record_type' | 'status' | 'confidence';
type SortDir = 'asc' | 'desc';
const JOBS_PER_PAGE = 12;
const VISITED_KEY = 'ocr_visited_jobs';

/** Strip server paths and extensions to show a human-friendly label */
function friendlyFilename(raw: string): string {
  if (!raw) return 'Untitled';
  // Take only the last path segment
  let name = raw.includes('/') ? raw.split('/').pop()! : raw;
  name = name.includes('\\') ? name.split('\\').pop()! : name;
  // Strip extension
  name = name.replace(/\.(jpe?g|png|tiff?|bmp|webp|pdf|gif)$/i, '');
  // Replace underscores/dashes with spaces, collapse whitespace
  name = name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  // Truncate if still very long
  if (name.length > 40) name = name.substring(0, 37) + '...';
  return name || 'Untitled';
}

/** Read visited job IDs from localStorage */
function getVisitedJobs(): Set<string> {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

/** Mark a job as visited in localStorage */
function markJobVisited(jobId: string | number): void {
  try {
    const visited = getVisitedJobs();
    visited.add(String(jobId));
    // Keep at most 500 entries
    const arr = [...visited];
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    localStorage.setItem(VISITED_KEY, JSON.stringify(arr));
  } catch { /* ignore */ }
}

const ImageHistoryPanel: React.FC<ImageHistoryPanelProps> = ({ churchId, refreshKey }) => {
  const theme = useTheme();
  const [jobs, setJobs] = useState<OcrJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [visitedIds, setVisitedIds] = useState<Set<string>>(getVisitedJobs);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs`);
      const all: OcrJob[] = res?.data?.jobs || res?.data || res?.jobs || [];
      setJobs(all);
    } catch { setJobs([]); }
    setLoading(false);
  }, [churchId]);

  useEffect(() => { loadJobs(); }, [loadJobs, refreshKey]);

  // Poll while any job is processing
  const hasProcessing = jobs.some((j) => j.status === 'pending' || j.status === 'queued' || j.status === 'processing');
  useEffect(() => {
    if (!hasProcessing) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(loadJobs, 5000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [hasProcessing, loadJobs]);

  // Reset to page 0 when sort changes
  useEffect(() => { setPage(0); }, [sortField, sortDir]);

  const getStatusColor = (status: string) => {
    if (status === 'complete' || status === 'completed') return theme.palette.success.main;
    if (status === 'error' || status === 'failed') return theme.palette.error.main;
    return theme.palette.warning.main;
  };

  const getStatusLabel = (status: string) => {
    if (status === 'complete' || status === 'completed') return 'Complete';
    if (status === 'error' || status === 'failed') return 'Error';
    if (status === 'processing') return 'Processing';
    return 'Pending';
  };

  const isClickable = (status: string) => status === 'complete' || status === 'completed';

  const handleJobClick = (jobId: string | number) => {
    markJobVisited(jobId);
    setVisitedIds(getVisitedJobs());
    window.location.href = `/devel/ocr-studio/review/${churchId}/${jobId}`;
  };

  // Sort jobs
  const sortedJobs = React.useMemo(() => {
    const sorted = [...jobs];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'date': {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return (da - db) * dir;
        }
        case 'record_type':
          return (a.record_type || '').localeCompare(b.record_type || '') * dir;
        case 'status':
          return (a.status || '').localeCompare(b.status || '') * dir;
        case 'confidence': {
          const ca = a.confidence_score ?? -1;
          const cb = b.confidence_score ?? -1;
          return (ca - cb) * dir;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [jobs, sortField, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / JOBS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageJobs = sortedJobs.slice(safePage * JOBS_PER_PAGE, (safePage + 1) * JOBS_PER_PAGE);

  if (loading && jobs.length === 0) {
    return <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>;
  }

  if (jobs.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No OCR jobs found. Upload images to get started.
      </Typography>
    );
  }

  const sortOptions: { value: SortField; label: string }[] = [
    { value: 'date', label: 'Date' },
    { value: 'record_type', label: 'Record Type' },
    { value: 'status', label: 'Status' },
    { value: 'confidence', label: 'Confidence' },
  ];

  return (
    <Box>
      {/* Header toolbar: count, sort, view toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}{hasProcessing ? ' (processing...)' : ''}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Sort controls */}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconSortAscending size={16} color={theme.palette.text.secondary} />
            <Select
              size="small"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              sx={{ fontSize: '0.75rem', height: 28, minWidth: 100,
                '& .MuiSelect-select': { py: 0.25, px: 1 } }}
            >
              {sortOptions.map((o) => (
                <MenuItem key={o.value} value={o.value} sx={{ fontSize: '0.75rem' }}>{o.label}</MenuItem>
              ))}
            </Select>
            <IconButton
              size="small"
              onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}
              sx={{ color: theme.palette.text.secondary, width: 28, height: 28 }}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDir === 'asc' ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </IconButton>
          </Stack>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* View mode toggle */}
          <IconButton
            size="small"
            onClick={() => setViewMode('grid')}
            sx={{ color: viewMode === 'grid' ? theme.palette.primary.main : theme.palette.text.disabled, width: 28, height: 28 }}
          >
            <IconPhoto size={18} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setViewMode('list')}
            sx={{ color: viewMode === 'list' ? theme.palette.primary.main : theme.palette.text.disabled, width: 28, height: 28 }}
          >
            <IconFile size={18} />
          </IconButton>
          <IconButton size="small" onClick={loadJobs} sx={{ color: theme.palette.text.secondary, width: 28, height: 28 }}>
            <IconRefresh size={18} />
          </IconButton>
        </Stack>
      </Stack>

      {viewMode === 'grid' ? (
        /* ── Grid View ── */
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 2,
        }}>
          {pageJobs.map((job) => {
            const clickable = isClickable(job.status);
            const visited = visitedIds.has(String(job.id));
            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: clickable ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                  borderWidth: visited ? 2 : 1,
                  borderColor: visited ? alpha(theme.palette.primary.main, 0.5) : undefined,
                  '&:hover': clickable ? {
                    borderColor: theme.palette.primary.main,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.15)}`,
                  } : {},
                }}
                onClick={() => { if (clickable) handleJobClick(job.id); }}
              >
                {/* Thumbnail */}
                <Box sx={{
                  height: 120,
                  bgcolor: alpha(theme.palette.text.primary, 0.04),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  <Box
                    component="img"
                    src={`/api/church/${churchId}/ocr/jobs/${job.id}/image`}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e: any) => { e.target.style.display = 'none'; }}
                  />
                  <IconPhoto size={32} color={theme.palette.text.disabled} style={{ position: 'absolute' }} />
                  {!isClickable(job.status) && job.status !== 'error' && job.status !== 'failed' && (
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(theme.palette.background.default, 0.6),
                    }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  {/* Visited badge */}
                  {visited && (
                    <Box sx={{
                      position: 'absolute', top: 4, right: 4,
                      width: 18, height: 18, borderRadius: '50%',
                      bgcolor: theme.palette.primary.main,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconCheck size={12} color="#fff" />
                    </Box>
                  )}
                </Box>
                {/* Info */}
                <Box sx={{ p: 1.5 }}>
                  <Typography variant="caption" fontWeight={600} noWrap sx={{ display: 'block', mb: 0.5 }}
                    title={job.filename}
                  >
                    {friendlyFilename(job.filename)}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                    <Chip
                      size="small"
                      label={getStatusLabel(job.status)}
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 600,
                        bgcolor: alpha(getStatusColor(job.status), 0.1),
                        color: getStatusColor(job.status),
                      }}
                    />
                    {job.record_type && job.record_type !== 'unknown' && (
                      <Chip size="small" label={job.record_type} sx={{ height: 18, fontSize: '0.6rem' }} />
                    )}
                    {job.confidence_score != null && job.confidence_score > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        {Math.round(job.confidence_score * 100)}%
                      </Typography>
                    )}
                  </Stack>
                  {job.created_at && (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem', mt: 0.5, display: 'block' }}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>
      ) : (
        /* ── List View ── */
        <Stack spacing={0.5}>
          {pageJobs.map((job) => {
            const clickable = isClickable(job.status);
            const visited = visitedIds.has(String(job.id));
            return (
              <Paper
                key={job.id}
                variant="outlined"
                sx={{
                  px: 2, py: 1, cursor: clickable ? 'pointer' : 'default',
                  borderRadius: 1.5,
                  borderWidth: visited ? 2 : 1,
                  borderColor: visited ? alpha(theme.palette.primary.main, 0.5) : undefined,
                  '&:hover': clickable ? { bgcolor: alpha(theme.palette.primary.main, 0.04) } : {},
                }}
                onClick={() => { if (clickable) handleJobClick(job.id); }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  {isClickable(job.status) ? (
                    <IconFileCheck size={18} color={theme.palette.success.main} />
                  ) : job.status === 'error' || job.status === 'failed' ? (
                    <IconAlertCircle size={18} color={theme.palette.error.main} />
                  ) : (
                    <IconLoader2 size={18} color={theme.palette.warning.main} className="spin" />
                  )}
                  {visited && (
                    <Box sx={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <IconCheck size={10} color={theme.palette.primary.main} />
                    </Box>
                  )}
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}
                    title={job.filename}
                  >
                    {friendlyFilename(job.filename)}
                  </Typography>
                  <Chip
                    size="small"
                    label={getStatusLabel(job.status)}
                    sx={{
                      height: 18, fontSize: '0.6rem', fontWeight: 600,
                      bgcolor: alpha(getStatusColor(job.status), 0.1),
                      color: getStatusColor(job.status),
                    }}
                  />
                  {job.record_type && job.record_type !== 'unknown' && (
                    <Chip size="small" label={job.record_type} sx={{ height: 18, fontSize: '0.6rem' }} />
                  )}
                  {job.confidence_score != null && job.confidence_score > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(job.confidence_score * 100)}%
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                    {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
                  </Typography>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 2.5 }}>
          <IconButton
            size="small"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            sx={{ width: 28, height: 28 }}
          >
            <IconChevronLeft size={18} />
          </IconButton>
          <Typography variant="caption" color="text.secondary">
            {safePage + 1} / {totalPages}
          </Typography>
          <IconButton
            size="small"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            sx={{ width: 28, height: 28 }}
          >
            <IconChevronRight size={18} />
          </IconButton>
        </Stack>
      )}
    </Box>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const OmOcrStudioPage: React.FC = () => {
  const theme = useTheme();
  const { user, isSuperAdmin, hasRole } = useAuth();
  const { isLayout } = useContext(CustomizerContext);

  const isAdmin = isSuperAdmin() || hasRole('admin');

  // State
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('om_ocr_studio.guidelinesAccepted') === '1';
  });
  const [churches, setChurches] = useState<Church[]>([]);
  const [selectedChurchId, setSelectedChurchId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('om_ocr_studio.selectedChurchId');
    return stored ? Number(stored) : null;
  });
  // Session-only flag: user must explicitly confirm church each session
  const [churchConfirmed, setChurchConfirmed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('om_ocr_studio.churchConfirmed') === '1';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Effective church: admin picks, regular user uses own church_id
  const effectiveChurchId = isAdmin ? selectedChurchId : (user?.church_id ?? null);

  // Step statuses — step 2 requires explicit confirmation each session
  const step1Status: StepStatus = guidelinesAccepted ? 'completed' : 'in_progress';
  const step2Status: StepStatus = !guidelinesAccepted
    ? 'not_started'
    : churchConfirmed && selectedChurchId
    ? 'completed'
    : 'in_progress';
  const step3Status: StepStatus =
    !guidelinesAccepted
      ? 'not_started'
      : isAdmin && !churchConfirmed
      ? 'not_started'
      : !effectiveChurchId
      ? 'not_started'
      : 'in_progress';
  const step4Status: StepStatus =
    !guidelinesAccepted || !effectiveChurchId || (isAdmin && !churchConfirmed)
      ? 'not_started'
      : 'in_progress';

  // For non-admin users, step 2 is auto-completed since church is derived from auth
  const effectiveStep2Status: StepStatus = isAdmin
    ? step2Status
    : effectiveChurchId
    ? 'completed'
    : 'not_started';

  // Helper: find selected church name for sidebar display
  const selectedChurchName = churches.find((c) => c.id === selectedChurchId)?.name || null;

  // Build stepper labels
  const stepperSteps: StepDef[] = isAdmin
    ? [
        { label: 'Prepare Images', status: step1Status },
        { label: 'Select Church', status: step2Status },
        { label: 'Add Images', status: step3Status },
        { label: 'Review & Finalize', status: step4Status },
      ]
    : [
        { label: 'Prepare Images', status: step1Status },
        { label: 'Add Images', status: step3Status },
        { label: 'Review & Finalize', status: step4Status },
      ];

  // Load churches for admin
  useEffect(() => {
    if (!isAdmin) return;
    const loadChurches = async () => {
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
    };
    loadChurches();
  }, [isAdmin]);

  // Persist selected church for admins
  useEffect(() => {
    if (!isAdmin) return;
    if (selectedChurchId) {
      localStorage.setItem('om_ocr_studio.selectedChurchId', String(selectedChurchId));
    } else {
      localStorage.removeItem('om_ocr_studio.selectedChurchId');
    }
  }, [selectedChurchId, isAdmin]);

  // Persist workflow state to sessionStorage so navigation doesn't reset progress
  useEffect(() => {
    sessionStorage.setItem('om_ocr_studio.guidelinesAccepted', guidelinesAccepted ? '1' : '0');
  }, [guidelinesAccepted]);

  useEffect(() => {
    sessionStorage.setItem('om_ocr_studio.churchConfirmed', churchConfirmed ? '1' : '0');
  }, [churchConfirmed]);

  const canOpenDrawer = !!effectiveChurchId && guidelinesAccepted && (!isAdmin || churchConfirmed);

  // Count completed steps for sidebar progress
  const completedCount = stepperSteps.filter((s) => s.status === 'completed').length;
  const progressPct = Math.round((completedCount / stepperSteps.length) * 100);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
        pb: 6,
      }}
    >
      <OcrStudioNav />
      {/* ── Hero header ── */}
      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: theme.palette.divider,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          mb: 4,
        }}
      >
        <Box sx={{ maxWidth: isLayout === 'full' ? '100%' : 1100, mx: 'auto', px: { xs: 2, md: 4 }, py: 3.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                OCR Record Uploader
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                Upload, organize, and process church record images with OCR.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {isAdmin && (
                <Chip
                  label="Admin Mode"
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.dark,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.warning.main, 0.3),
                  }}
                />
              )}
              <Chip
                label={`${completedCount}/${stepperSteps.length} Steps`}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                }}
              />
            </Stack>
          </Stack>

          {/* Stepper */}
          <StepperHeader steps={stepperSteps} />
        </Box>
      </Box>

      {/* ── Two-column layout ── */}
      <Box
        sx={{
          maxWidth: isLayout === 'full' ? '100%' : 1100,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          display: 'flex',
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        {/* Left column — Step cards */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* ── Step 1: Prepare Your Record Images ── */}
          <StepCard step={1} title="Prepare Your Record Images" status={step1Status}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Before uploading, ensure your scanned images meet quality standards for accurate OCR
              processing. Following these guidelines will improve text recognition and reduce manual
              corrections.
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
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconCheck size={14} color={theme.palette.success.main} />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {text}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Divider sx={{ my: 2.5 }} />

            {/* What to Expect */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              What to Expect
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Automated Processing:</strong> Once uploaded, images are automatically processed
              using optical character recognition to extract names, dates, and record details.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              <strong>Review Step:</strong> Results with confidence scores below 85% are flagged for
              manual review, allowing you to verify and correct any misread text before final
              approval.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                  sx={{
                    color: theme.palette.primary.main,
                    '&.Mui-checked': { color: theme.palette.primary.main },
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  I understand these guidelines and I'm ready to upload.
                </Typography>
              }
            />
          </StepCard>

          {/* ── Step 2: Select Target Church (admin only) ── */}
          {isAdmin && (
            <StepCard step={2} title="Select Target Church" status={step2Status}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Choose the church database where OCR results will be stored. Make sure this matches the
                physical record book you are scanning. This selection determines where all processed
                records will be saved and organized.
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedChurchId ?? ''}
                    onChange={(e) => {
                      setSelectedChurchId(e.target.value ? Number(e.target.value) : null);
                      setChurchConfirmed(false);
                    }}
                    displayEmpty
                    sx={{ bgcolor: theme.palette.background.paper }}
                  >
                    <MenuItem value="" disabled>
                      <Typography color="text.secondary">Select a church…</Typography>
                    </MenuItem>
                    {churches.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!selectedChurchId || churchConfirmed}
                  onClick={() => setChurchConfirmed(true)}
                  sx={{
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                    alignSelf: 'flex-start',
                    bgcolor: theme.palette.primary.main,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                    '&.Mui-disabled': {
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: alpha(theme.palette.primary.main, 0.4),
                    },
                  }}
                >
                  {churchConfirmed ? 'Church Confirmed' : 'Confirm Selection'}
                </Button>
              </Stack>
            </StepCard>
          )}

          {/* ── Step 3: Add Record Images ── */}
          <StepCard
            step={isAdmin ? 3 : 2}
            title="Add Record Images"
            status={step3Status}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Add scanned images from the current book. Each image should contain a full record page
              with clear, legible text. You can upload up to 50 images per batch for processing.
            </Typography>
            <Button
              variant="contained"
              startIcon={<IconUpload size={18} />}
              disabled={!canOpenDrawer}
              onClick={() => setDrawerOpen(true)}
              sx={{
                fontWeight: 700,
                px: 3,
                py: 1,
                bgcolor: theme.palette.primary.main,
                '&:hover': { bgcolor: theme.palette.primary.dark },
                '&.Mui-disabled': {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: alpha(theme.palette.primary.main, 0.4),
                },
              }}
            >
              Open Upload Drawer
            </Button>
          </StepCard>

          {/* ── Step 4: Review & Finalize (Image History) ── */}
          <StepCard
            step={isAdmin ? 4 : 3}
            title="Review & Finalize"
            status={step4Status}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Click on a completed job below to open the full-page review workbench where you can
              view the source image, transcription, map fields, and finalize records.
            </Typography>
            {effectiveChurchId && canOpenDrawer ? (
              <ImageHistoryPanel churchId={effectiveChurchId} refreshKey={historyRefreshKey} />
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ py: 2, textAlign: 'center' }}>
                Complete the steps above to view upload history.
              </Typography>
            )}
          </StepCard>
        </Box>

        {/* Right column — Status sidebar */}
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            position: 'sticky',
            top: 24,
            display: { xs: 'none', md: 'block' },
          }}
        >
          {/* Progress card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.background.paper,
              mb: 2.5,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Workflow Progress
            </Typography>
            <Box sx={{ position: 'relative', mb: 1.5 }}>
              <LinearProgress
                variant="determinate"
                value={progressPct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    bgcolor: progressPct === 100 ? theme.palette.success.main : theme.palette.primary.main,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {completedCount} of {stepperSteps.length} steps completed ({progressPct}%)
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Step checklist */}
            <Stack spacing={1}>
              {stepperSteps.map((s, i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor:
                        s.status === 'completed'
                          ? alpha(theme.palette.success.main, 0.15)
                          : s.status === 'in_progress'
                          ? alpha(theme.palette.primary.main, 0.15)
                          : alpha(theme.palette.text.primary, 0.06),
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {s.status === 'completed' ? (
                      <IconCheck size={12} color={theme.palette.success.main} />
                    ) : s.status === 'in_progress' ? (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: theme.palette.primary.main,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: theme.palette.text.disabled,
                        }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: s.status === 'in_progress' ? 600 : 400,
                      color:
                        s.status === 'completed'
                          ? theme.palette.success.main
                          : s.status === 'in_progress'
                          ? theme.palette.text.primary
                          : theme.palette.text.disabled,
                      textDecoration: s.status === 'completed' ? 'line-through' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {s.label}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          {/* Church info card (admin) */}
          {isAdmin && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: churchConfirmed
                  ? alpha(theme.palette.success.main, 0.3)
                  : theme.palette.divider,
                bgcolor: churchConfirmed
                  ? alpha(theme.palette.success.main, 0.03)
                  : theme.palette.background.paper,
                mb: 2.5,
                transition: 'all 0.3s ease',
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Target Church
              </Typography>
              {selectedChurchName ? (
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <IconCheck
                      size={16}
                      color={churchConfirmed ? theme.palette.success.main : theme.palette.text.disabled}
                    />
                    <Typography variant="body2" fontWeight={600} color="text.primary">
                      {selectedChurchName}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {churchConfirmed ? 'Confirmed for this session' : 'Not yet confirmed'}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.disabled">
                  No church selected
                </Typography>
              )}
            </Paper>
          )}

          {/* Quick actions card */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: theme.palette.divider,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<IconUpload size={16} />}
                disabled={!canOpenDrawer}
                onClick={() => setDrawerOpen(true)}
                sx={{ justifyContent: 'flex-start', fontWeight: 600 }}
              >
                Upload Images
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<IconRefresh size={16} />}
                disabled={!canOpenDrawer}
                onClick={() => setHistoryRefreshKey((k) => k + 1)}
                sx={{ justifyContent: 'flex-start', fontWeight: 600 }}
              >
                Refresh History
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Upload Drawer */}
      <OcrUploadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        churchId={effectiveChurchId}
        onUploadComplete={() => setHistoryRefreshKey((k) => k + 1)}
      />
    </Box>
  );
};

export default OmOcrStudioPage;
