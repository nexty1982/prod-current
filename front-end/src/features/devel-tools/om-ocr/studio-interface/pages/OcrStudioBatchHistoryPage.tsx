import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BatchHistory } from '../components/BatchHistory';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrStudioJobData } from '../hooks/useOcrStudioJobData';
import { useOcrStudioBatches } from '../hooks/useOcrStudioBatches';
import { apiClient } from '@/shared/lib/axiosInstance';

export default function OcrStudioBatchHistoryPage() {
  const { churchId } = useOcrStudioChurch();
  const { jobs, loading, refresh } = useOcrStudioJobData(churchId);
  const batches = useOcrStudioBatches(jobs);

  const onRetryBatch = useCallback(async (jobIds: number[]) => {
    if (!churchId) return;
    await Promise.all(
      jobIds.map((id) => apiClient.post(`/api/church/${churchId}/ocr/jobs/${id}/retry`).catch(() => null)),
    );
    await refresh();
  }, [churchId, refresh]);

  return (
    <BatchHistory
      batches={batches}
      churchId={churchId}
      loading={loading}
      onRefresh={refresh}
      onRetryBatch={onRetryBatch}
    />
  );
}
