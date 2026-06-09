/**
 * Empty-state upload UI for Confirm & Seed — drag-and-drop zone + pipeline status panel.
 */

import { alpha, Box, LinearProgress, Paper, Typography, useTheme } from '@mui/material';
import {
  IconCheck,
  IconClock,
  IconCloudUpload,
  IconPhoto,
  IconRobot,
  IconScan,
  IconX,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

export type ReviewUploadQueueItem = {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'error';
  progress: number;
  jobId?: string;
  error?: string;
};

export type PipelinePhase =
  | 'idle'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'ready'
  | 'complete'
  | 'failed';

export type PipelineState = {
  phase: PipelinePhase;
  label: string;
  detail?: string;
  progress: number;
  indeterminate?: boolean;
  jobId?: number | null;
};

export type PipelineFocusJob = {
  id: string | number;
  filename?: string;
  status: string;
  review_status: string;
};

export function isJobInFlight(job: { status: string; review_status: string }): boolean {
  if (job.status === 'failed' || job.status === 'error') return false;
  if (['agent_extracted', 'ready_to_seed', 'seeded', 'returned'].includes(job.review_status)) return false;
  if (['processing', 'pending', 'queued'].includes(job.status)) return true;
  return job.review_status === 'uploaded' || job.review_status === 'ocr_complete';
}

function pipelineFromJob(job: PipelineFocusJob): PipelineState {
  const jobId = Number(job.id);
  const detail = job.filename || `Job #${job.id}`;

  if (job.status === 'failed' || job.status === 'error') {
    return { phase: 'failed', label: 'Processing failed', detail, progress: 0, jobId };
  }
  if (job.status === 'processing') {
    return { phase: 'processing', label: 'Processing OCR', detail, progress: 48, indeterminate: true, jobId };
  }
  if (job.status === 'pending' || job.status === 'queued') {
    return { phase: 'queued', label: 'Queued for OCR', detail, progress: 26, indeterminate: true, jobId };
  }
  const mapped = REVIEW_PIPELINE[job.review_status];
  if (mapped) {
    return {
      phase: mapped.phase,
      label: mapped.label,
      detail,
      progress: mapped.progress,
      indeterminate: mapped.phase !== 'ready',
      jobId,
    };
  }
  return { phase: 'queued', label: 'Queued', detail, progress: 20, indeterminate: true, jobId };
}

const REVIEW_PIPELINE: Record<string, { label: string; progress: number; phase: PipelinePhase }> = {
  uploaded: { label: 'Queued for OCR', progress: 28, phase: 'queued' },
  ocr_complete: { label: 'OCR complete', progress: 52, phase: 'processing' },
  agent_extracted: { label: 'Extracting fields', progress: 78, phase: 'extracting' },
  ready_to_seed: { label: 'Ready for review', progress: 92, phase: 'ready' },
};

const pulseKeyframes = {
  '@keyframes pipelinePulse': {
    '0%, 100%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.1)', opacity: 0.82 },
  },
  '@keyframes pipelineSpin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
};

function phaseIcon(phase: PipelinePhase, color: string) {
  const size = 22;
  switch (phase) {
    case 'uploading':
      return <IconCloudUpload size={size} color={color} />;
    case 'queued':
      return <IconClock size={size} color={color} />;
    case 'processing':
      return <IconScan size={size} color={color} />;
    case 'extracting':
      return <IconRobot size={size} color={color} />;
    case 'ready':
    case 'complete':
      return <IconCheck size={size} color={color} />;
    case 'failed':
      return <IconX size={size} color={color} />;
    default:
      return <IconPhoto size={size} color={color} />;
  }
}

export function buildPipelineState(
  queue: ReviewUploadQueueItem[],
  jobsById: Map<string, { status: string; review_status: string }>,
  focusJob?: PipelineFocusJob | null,
): PipelineState {
  if (queue.length === 0) {
    if (focusJob && isJobInFlight(focusJob)) {
      return pipelineFromJob(focusJob);
    }
    return {
      phase: 'idle',
      label: 'Ready',
      detail: 'Drop images in the center to upload',
      progress: 0,
      indeterminate: false,
    };
  }

  const failed = queue.filter((f) => f.status === 'failed' || f.status === 'error');
  const active = queue.filter((f) => !['completed', 'failed', 'error'].includes(f.status));

  if (active.length === 0 && failed.length > 0) {
    return {
      phase: 'failed',
      label: 'Upload failed',
      detail: failed[0]?.error || failed[0]?.name,
      progress: 0,
    };
  }

  if (active.length === 0) {
    return {
      phase: 'complete',
      label: 'Complete',
      detail: `${queue.length} image${queue.length === 1 ? '' : 's'} processed`,
      progress: 100,
    };
  }

  const uploading = active.find((f) => f.status === 'uploading');
  if (uploading) {
    return {
      phase: 'uploading',
      label: 'Uploading',
      detail: uploading.name,
      progress: Math.max(uploading.progress, 12),
      indeterminate: uploading.progress < 90,
      jobId: uploading.jobId ? Number(uploading.jobId) : null,
    };
  }

  const pending = active.filter((f) => f.status === 'pending');
  if (pending.length > 0) {
    return {
      phase: 'uploading',
      label: 'Preparing upload',
      detail: `${pending.length} of ${queue.length} file${queue.length === 1 ? '' : 's'}`,
      progress: 8,
      indeterminate: true,
    };
  }

  let best: PipelineState | null = null;
  for (const item of active) {
    if (!item.jobId) continue;
    const job = jobsById.get(item.jobId);
    if (!job) {
      const candidate: PipelineState = {
        phase: 'queued',
        label: 'Queued',
        detail: item.name,
        progress: 22,
        indeterminate: true,
      };
      if (!best || candidate.progress > best.progress) best = candidate;
      continue;
    }

    if (job.status === 'processing' || job.status === 'pending') {
      const candidate: PipelineState = {
        phase: 'processing',
        label: 'Processing OCR',
        detail: item.name,
        progress: 45,
        indeterminate: true,
      };
      if (!best || candidate.progress > best.progress) best = candidate;
      continue;
    }

    const mapped = REVIEW_PIPELINE[job.review_status];
    if (mapped) {
      const candidate: PipelineState = {
        phase: mapped.phase,
        label: mapped.label,
        detail: item.name,
        progress: mapped.progress,
        indeterminate: mapped.phase !== 'ready',
        jobId: Number(item.jobId),
      };
      if (!best || candidate.progress > best.progress) best = candidate;
    }
  }

  if (best) {
    const done = queue.filter((f) => f.status === 'completed').length;
    if (queue.length > 1 && done > 0) {
      return {
        ...best,
        detail: `${done + 1} of ${queue.length} — ${best.detail}`,
      };
    }
    return best;
  }

  const fallback = active[0];
  return {
    phase: 'queued',
    label: 'Queued',
    detail: fallback?.name,
    progress: 20,
    indeterminate: true,
    jobId: fallback?.jobId ? Number(fallback.jobId) : null,
  };
}

function PipelinePreviewImage({ churchId, jobId }: { churchId: number; jobId: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <Box
        sx={{
          width: '100%',
          aspectRatio: '4 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          color: 'text.disabled',
        }}
      >
        <IconPhoto size={28} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`/api/church/${churchId}/ocr/jobs/${jobId}/image`}
      alt=""
      onError={() => setFailed(true)}
      sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }}
    />
  );
}

type DropZoneProps = {
  dragActive: boolean;
  disabled?: boolean;
  isUploading?: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onBrowse: () => void;
  fileInput: React.ReactNode;
};

export const OcrReviewDropZone: React.FC<DropZoneProps> = ({
  dragActive,
  disabled,
  isUploading,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onBrowse,
  fileInput,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 320,
        p: 3,
      }}
    >
      <Paper
        variant="outlined"
        onDragEnter={disabled ? undefined : onDragEnter}
        onDragLeave={disabled ? undefined : onDragLeave}
        onDragOver={disabled ? undefined : onDragOver}
        onDrop={disabled ? undefined : onDrop}
        onClick={disabled ? undefined : onBrowse}
        sx={{
          width: '100%',
          maxWidth: 720,
          p: { xs: 4, md: 6 },
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragActive ? 'primary.main' : 'divider',
          bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.06) : alpha(theme.palette.primary.main, 0.02),
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.25s ease',
          '&:hover': disabled
            ? {}
            : {
                borderColor: 'primary.light',
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
              },
        }}
      >
        {fileInput}
        <IconCloudUpload
          size={56}
          color={theme.palette.primary.main}
          style={{ opacity: dragActive ? 1 : 0.55 }}
        />
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            mt: 2.5,
            letterSpacing: '0.06em',
            color: dragActive ? 'primary.main' : 'text.primary',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          DRAG &amp; DROP
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5, fontWeight: 500 }}>
          {isUploading ? 'Upload in progress — drop more images when finished' : 'Drop record images here to upload and process'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          or click to browse · JPG, PNG, TIFF · 300 DPI recommended
        </Typography>
      </Paper>
    </Box>
  );
};

type PipelinePanelProps = {
  state: PipelineState;
  churchId?: number | null;
};

export const OcrReviewPipelinePanel: React.FC<PipelinePanelProps> = ({ state, churchId }) => {
  const theme = useTheme();
  const showPreview = !!churchId && !!state.jobId && state.phase !== 'idle';
  const showProgress = state.phase !== 'idle';

  const accent = useMemo(() => {
    switch (state.phase) {
      case 'uploading':
      case 'queued':
        return theme.palette.info.main;
      case 'processing':
      case 'extracting':
        return theme.palette.warning.main;
      case 'ready':
      case 'complete':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  }, [state.phase, theme]);

  const animate = state.phase !== 'idle' && state.phase !== 'complete';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: alpha(accent, 0.04),
        borderColor: alpha(accent, 0.25),
        position: 'relative',
        ...pulseKeyframes,
      }}
    >
      {showPreview && (
        <Box
          sx={{
            mb: 1.25,
            borderRadius: 1,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: alpha(accent, 0.2),
          }}
        >
          <PipelinePreviewImage churchId={churchId!} jobId={state.jobId!} />
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            bgcolor: alpha(accent, 0.12),
            color: accent,
            animation: animate
              ? state.phase === 'queued'
                ? 'pipelineSpin 2.4s linear infinite'
                : 'pipelinePulse 1.6s ease-in-out infinite'
              : undefined,
          }}
        >
          {phaseIcon(state.phase, accent)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {state.label}
          </Typography>
          {state.detail && (
            <Typography variant="caption" color="text.secondary" noWrap title={state.detail} sx={{ display: 'block' }}>
              {state.detail}
            </Typography>
          )}
        </Box>
      </Box>
      {showProgress && (
      <LinearProgress
        variant={state.indeterminate ? 'indeterminate' : 'determinate'}
        value={state.indeterminate ? undefined : state.progress}
        sx={{
          mt: 1.5,
          height: 6,
          borderRadius: 3,
          bgcolor: alpha(accent, 0.12),
          '& .MuiLinearProgress-bar': {
            borderRadius: 3,
            bgcolor: accent,
          },
        }}
      />
      )}
      {!state.indeterminate && showProgress && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
          {Math.round(state.progress)}%
        </Typography>
      )}
    </Paper>
  );
};
