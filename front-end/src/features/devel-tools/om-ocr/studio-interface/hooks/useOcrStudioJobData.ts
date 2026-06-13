import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  fmtAgeFromIso,
  jobDisplayName,
  mapPipelineStatus,
  normalizeRecordType,
  type StudioJobStatus,
  type StudioRecordType,
} from '../utils/ocrStudioFormatters';

export interface OcrStudioJobRow {
  id: number;
  church_id: number;
  original_filename: string;
  filename?: string;
  status: string;
  review_status: string;
  record_type: StudioRecordType;
  confidence_score: number | null;
  created_at: string;
  updated_at?: string;
  error_message?: string | null;
  uiStatus: StudioJobStatus;
  displayName: string;
  age: string;
}

export interface OcrStudioJobStats {
  active: number;
  queued: number;
  processing: number;
  review: number;
  readyToSeed: number;
  failed: number;
  completed: number;
  seeded: number;
  lowConfidence: number;
  avgConfidence: number | null;
  uploaded: number;
  ocrComplete: number;
}

function emptyStats(): OcrStudioJobStats {
  return {
    active: 0,
    queued: 0,
    processing: 0,
    review: 0,
    readyToSeed: 0,
    failed: 0,
    completed: 0,
    seeded: 0,
    lowConfidence: 0,
    avgConfidence: null,
    uploaded: 0,
    ocrComplete: 0,
  };
}

function mapJob(job: any, churchId: number): OcrStudioJobRow {
  const confidence = job.confidence_score != null ? Number(job.confidence_score) : null;
  const reviewStatus = job.review_status || 'uploaded';
  const status = job.status || 'queued';
  return {
    id: Number(job.id),
    church_id: Number(job.church_id || churchId),
    original_filename: job.original_filename || job.filename || '',
    filename: job.filename,
    status,
    review_status: reviewStatus,
    record_type: normalizeRecordType(job.record_type),
    confidence_score: confidence,
    created_at: job.created_at,
    updated_at: job.updated_at,
    error_message: job.error_message || job.error || null,
    uiStatus: mapPipelineStatus(status, reviewStatus),
    displayName: jobDisplayName(job.original_filename, job.filename, Number(job.id)),
    age: fmtAgeFromIso(job.created_at),
  };
}

function computeStats(jobs: OcrStudioJobRow[]): OcrStudioJobStats {
  const stats = emptyStats();
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const job of jobs) {
    const rs = job.review_status;
    if (rs === 'uploaded') stats.uploaded += 1;
    if (rs === 'ocr_complete') stats.ocrComplete += 1;
    if (rs === 'agent_extracted' || rs === 'pending_review' || rs === 'in_review') stats.review += 1;
    if (rs === 'ready_to_seed') stats.readyToSeed += 1;
    if (rs === 'seeded') stats.seeded += 1;
    if (job.uiStatus === 'failed') stats.failed += 1;
    if (job.uiStatus === 'queued') stats.queued += 1;
    if (job.uiStatus === 'processing') stats.processing += 1;
    if (job.uiStatus === 'completed') stats.completed += 1;
    if (job.confidence_score != null && job.confidence_score > 0) {
      confidenceSum += job.confidence_score;
      confidenceCount += 1;
      if (job.confidence_score < 65) stats.lowConfidence += 1;
    }
  }

  stats.active = stats.processing + stats.queued;
  stats.avgConfidence = confidenceCount > 0 ? Math.round(confidenceSum / confidenceCount) : null;
  return stats;
}

export function useOcrStudioJobData(churchId: number | null, pollInterval = 5000) {
  const [jobs, setJobs] = useState<OcrStudioJobRow[]>([]);
  const [stats, setStats] = useState<OcrStudioJobStats>(emptyStats());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!churchId) {
      setJobs([]);
      setStats(emptyStats());
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res: any = await apiClient.get(`/api/church/${churchId}/ocr/jobs?limit=200`);
      const d = res?.data ?? res;
      const raw =
        Array.isArray(d) ? d :
        d?.jobs ??
        d?.data?.jobs ??
        (Array.isArray(d?.data) ? d.data : []);
      const mapped = (Array.isArray(raw) ? raw : []).map((j) => mapJob(j, churchId));
      setJobs(mapped);
      setStats(computeStats(mapped));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load OCR jobs');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!churchId) return;
    pollRef.current = setInterval(() => refresh(true), pollInterval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [churchId, pollInterval, refresh]);

  return { jobs, stats, loading, error, refresh: () => refresh(false) };
}
