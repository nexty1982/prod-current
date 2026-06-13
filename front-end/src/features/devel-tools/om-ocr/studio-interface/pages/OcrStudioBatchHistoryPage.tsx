import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';

/** Batch history lives on the Upload page "My Uploads" tab. */
export default function OcrStudioBatchHistoryPage() {
  const [searchParams] = useSearchParams();
  const { toScreen } = useOcrStudioPaths();
  const path = ocrStudioPathWithChurch(toScreen('upload-intake'), searchParams);
  const [base, qs = ''] = path.split('?');
  const merged = new URLSearchParams(qs);
  merged.set('tab', 'uploads');
  return <Navigate to={`${base}?${merged.toString()}`} replace />;
}
