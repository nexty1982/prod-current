import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { JobOperations } from '../components/JobOperations';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrMonitorJobs } from '../hooks/useOcrMonitorJobs';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';

export default function OcrStudioJobOperationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toReview } = useOcrStudioPaths();
  const { churchId } = useOcrStudioChurch();
  const monitor = useOcrMonitorJobs(churchId);

  const onOpenReview = (cid: number, jobId: number) => {
    navigate(ocrStudioPathWithChurch(toReview(cid, jobId), searchParams));
  };

  return (
    <JobOperations
      jobs={monitor.jobs}
      counts={monitor.counts}
      loading={monitor.loading}
      error={monitor.error}
      statusFilter={monitor.statusFilter}
      search={monitor.search}
      onStatusFilterChange={monitor.setStatusFilter}
      onSearchChange={monitor.setSearch}
      onRefresh={monitor.refresh}
      onRetry={monitor.retryJob}
      onOpenReview={onOpenReview}
    />
  );
}
