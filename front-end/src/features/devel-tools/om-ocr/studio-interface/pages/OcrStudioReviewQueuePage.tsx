import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ReviewQueue } from '../components/ReviewQueue';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrStudioJobData } from '../hooks/useOcrStudioJobData';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';

export default function OcrStudioReviewQueuePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toReview } = useOcrStudioPaths();
  const { churchId } = useOcrStudioChurch();
  const { jobs, stats, loading, refresh } = useOcrStudioJobData(churchId);

  const onOpenReview = (cid: number, jobId: number) => {
    navigate(ocrStudioPathWithChurch(toReview(cid, jobId), searchParams));
  };

  return (
    <ReviewQueue
      jobs={jobs}
      stats={stats}
      churchId={churchId}
      loading={loading}
      onRefresh={refresh}
      onOpenReview={onOpenReview}
    />
  );
}
