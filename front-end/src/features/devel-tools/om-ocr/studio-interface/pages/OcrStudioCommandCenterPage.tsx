import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CommandCenter } from '../components/CommandCenter';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import type { OcrStudioScreen } from '../ocrStudioPaths';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrStudioJobData } from '../hooks/useOcrStudioJobData';
import { useOcrStudioBatches } from '../hooks/useOcrStudioBatches';

export default function OcrStudioCommandCenterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toScreen } = useOcrStudioPaths();
  const { churchId } = useOcrStudioChurch();
  const { stats, jobs, loading, refresh } = useOcrStudioJobData(churchId);
  const batches = useOcrStudioBatches(jobs);

  const onNavigate = (screen: string) => {
    const path = toScreen(screen as OcrStudioScreen);
    navigate(ocrStudioPathWithChurch(path, searchParams));
  };

  return (
    <CommandCenter
      onNavigate={onNavigate}
      stats={stats}
      recentBatches={batches}
      loading={loading}
      churchSelected={!!churchId}
      onRefresh={refresh}
    />
  );
}
