/** Shared formatters for OCR Studio Figma UI. */

export function fmtFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fmtShortDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function fmtAgeFromIso(iso?: string | null): string {
  if (!iso) return '—';
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function fmtAgeSeconds(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export type StudioRecordType = 'baptism' | 'marriage' | 'funeral' | 'unknown';

export function normalizeRecordType(raw?: string | null): StudioRecordType {
  const t = (raw || 'unknown').toLowerCase();
  if (t === 'baptism' || t === 'marriage' || t === 'funeral') return t;
  return 'unknown';
}

export type StudioJobStatus =
  | 'processing'
  | 'queued'
  | 'completed'
  | 'failed'
  | 'review'
  | 'approved'
  | 'seeded'
  | 'needs_correction';

export function mapPipelineStatus(
  status: string,
  reviewStatus?: string | null,
): StudioJobStatus {
  const rs = reviewStatus || 'uploaded';
  if (status === 'failed' || status === 'error') return 'failed';
  if (rs === 'returned') return 'needs_correction';
  if (rs === 'seeded') return 'seeded';
  if (rs === 'ready_to_seed') return 'approved';
  if (rs === 'agent_extracted' || rs === 'ocr_complete' || rs === 'pending_review' || rs === 'in_review') {
    return 'review';
  }
  if (status === 'processing') return 'processing';
  if (status === 'completed' || status === 'complete') return 'completed';
  return 'queued';
}

export function jobDisplayName(original?: string, filename?: string, id?: number): string {
  const name = (original || filename || '').split('/').pop();
  return name || (id != null ? `Job #${id}` : 'Untitled');
}

/** Infer a batch label from a group of filenames on the same upload day. */
export function inferBatchName(filenames: string[], dateLabel: string): string {
  if (filenames.length === 0) return `Upload ${dateLabel}`;
  const first = filenames[0].replace(/\.[^.]+$/, '');
  const prefix = first.replace(/[_\-\s]?(page|p|pg)[_\-\s]?\d+$/i, '').replace(/[_\-\s]?\d+$/, '');
  if (prefix.length >= 4) return prefix.replace(/_/g, ' ');
  return `Upload ${dateLabel}`;
}
