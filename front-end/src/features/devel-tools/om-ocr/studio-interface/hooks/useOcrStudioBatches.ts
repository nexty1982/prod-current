import { useMemo } from 'react';
import type { OcrStudioJobRow } from './useOcrStudioJobData';
import { fmtShortDate, inferBatchName, mapPipelineStatus } from '../utils/ocrStudioFormatters';

export interface OcrStudioBatch {
  id: string;
  name: string;
  type: 'baptism' | 'marriage' | 'funeral' | 'unknown';
  files: number;
  date: string;
  dateSort: number;
  status: 'processing' | 'queued' | 'completed' | 'failed' | 'review' | 'approved' | 'seeded';
  confidence: number;
  jobIds: number[];
}

function batchStatusFromJobs(jobs: OcrStudioJobRow[]): OcrStudioBatch['status'] {
  if (jobs.some((j) => j.uiStatus === 'failed')) return 'failed';
  if (jobs.some((j) => j.uiStatus === 'processing' || j.uiStatus === 'queued')) return 'processing';
  if (jobs.some((j) => j.review_status === 'agent_extracted' || j.uiStatus === 'review')) return 'review';
  if (jobs.every((j) => j.review_status === 'seeded')) return 'seeded';
  if (jobs.some((j) => j.review_status === 'ready_to_seed')) return 'approved';
  return 'completed';
}

function dominantRecordType(jobs: OcrStudioJobRow[]): OcrStudioBatch['type'] {
  const counts: Record<string, number> = {};
  for (const j of jobs) {
    counts[j.record_type] = (counts[j.record_type] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as OcrStudioBatch['type']) || 'unknown';
}

export function groupJobsIntoBatches(jobs: OcrStudioJobRow[]): OcrStudioBatch[] {
  const byDay = new Map<string, OcrStudioJobRow[]>();
  for (const job of jobs) {
    const day = job.created_at?.slice(0, 10) || 'unknown';
    const list = byDay.get(day) || [];
    list.push(job);
    byDay.set(day, list);
  }

  const batches: OcrStudioBatch[] = [];
  for (const [day, dayJobs] of byDay.entries()) {
    const dateLabel = fmtShortDate(dayJobs[0]?.created_at);
    const names = dayJobs.map((j) => j.displayName);
    const confidences = dayJobs
      .map((j) => j.confidence_score)
      .filter((c): c is number => c != null && c > 0);
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 0;

    batches.push({
      id: `batch-${day}-${dayJobs[0]?.church_id ?? 0}`,
      name: inferBatchName(names, dateLabel),
      type: dominantRecordType(dayJobs),
      files: dayJobs.length,
      date: dateLabel,
      dateSort: new Date(dayJobs[0]?.created_at || day).getTime(),
      status: batchStatusFromJobs(dayJobs),
      confidence: avgConfidence,
      jobIds: dayJobs.map((j) => j.id),
    });
  }

  return batches.sort((a, b) => b.dateSort - a.dateSort);
}

export function useOcrStudioBatches(jobs: OcrStudioJobRow[]) {
  return useMemo(() => groupJobsIntoBatches(jobs), [jobs]);
}

export function filterReviewQueueJobs(jobs: OcrStudioJobRow[]): OcrStudioJobRow[] {
  return jobs.filter((j) => {
    const rs = j.review_status;
    return ['agent_extracted', 'ocr_complete', 'pending_review', 'in_review', 'returned'].includes(rs)
      || mapPipelineStatus(j.status, rs) === 'review';
  });
}
