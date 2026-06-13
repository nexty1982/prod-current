import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  fmtAgeSeconds,
  fmtDateTime,
  jobDisplayName,
  mapPipelineStatus,
  normalizeRecordType,
  type StudioJobStatus,
  type StudioRecordType,
} from '../utils/ocrStudioFormatters';

export interface MonitorJobRow {
  id: number;
  church_id: number;
  church_name: string;
  status: string;
  record_type: StudioRecordType;
  original_filename: string;
  filename: string;
  confidence_score: number | null;
  error: string | null;
  created_at: string;
  processing_age_seconds: number | null;
  uiStatus: StudioJobStatus;
  displayName: string;
  age: string;
  started: string;
}

export interface MonitorCounts {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  stale: number;
}

function mapMonitorJob(row: any): MonitorJobRow {
  const status = row.status || 'queued';
  return {
    id: Number(row.id),
    church_id: Number(row.church_id),
    church_name: row.church_name || `Church #${row.church_id}`,
    status,
    record_type: normalizeRecordType(row.record_type),
    original_filename: row.original_filename || '',
    filename: row.filename || '',
    confidence_score: row.confidence_score != null ? Number(row.confidence_score) : null,
    error: row.error || row.error_message || null,
    created_at: row.created_at,
    processing_age_seconds: row.processing_age_seconds ?? null,
    uiStatus: mapPipelineStatus(status, row.review_status),
    displayName: jobDisplayName(row.original_filename, row.filename, Number(row.id)),
    age: fmtAgeSeconds(row.processing_age_seconds) !== '—'
      ? fmtAgeSeconds(row.processing_age_seconds)
      : fmtDateTime(row.created_at),
    started: fmtDateTime(row.created_at),
  };
}

export function useOcrMonitorJobs(churchId: number | null, pollInterval = 5000) {
  const [jobs, setJobs] = useState<MonitorJobRow[]>([]);
  const [counts, setCounts] = useState<MonitorCounts>({
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    stale: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const mountedRef = useRef(true);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (statusFilter) p.set('status', statusFilter);
      if (churchId) p.set('church_id', String(churchId));
      if (search.trim()) p.set('q', search.trim());
      p.set('page', '1');
      p.set('pageSize', '100');

      const res: any = await apiClient.get(`/api/ocr/monitor/jobs?${p.toString()}`);
      const data = res?.data ?? res;
      if (!mountedRef.current) return;
      setJobs((data.rows || []).map(mapMonitorJob));
      setCounts(data.counts || { queued: 0, processing: 0, completed: 0, failed: 0, stale: 0 });
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.response?.data?.error || err?.message || 'Failed to fetch jobs');
      }
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, [churchId, statusFilter, search]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => refresh(true), pollInterval);
    return () => clearInterval(id);
  }, [refresh, pollInterval]);

  const retryJob = useCallback(async (job: MonitorJobRow) => {
    await apiClient.post(`/api/church/${job.church_id}/ocr/jobs/${job.id}/retry`);
    await refresh(true);
  }, [refresh]);

  const reprocessJob = useCallback(async (job: MonitorJobRow) => {
    await apiClient.post(`/api/ocr/monitor/jobs/${job.church_id}/${job.id}/reprocess`);
    await refresh(true);
  }, [refresh]);

  return {
    jobs,
    counts,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh: () => refresh(false),
    retryJob,
    reprocessJob,
  };
}
