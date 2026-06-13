import React from 'react';
import { Alert, Box } from '@mui/material';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useOcrChurchSelector } from '../../hooks/useOcrChurchSelector';
import { useOcrStudioPaths } from '../OcrStudioPathContext';
import { ocrStudioPathWithChurch } from '../../utils/ocrStudioChurch';

/** Review workbench opens at /review/:churchId — redirect when church is selected. */
export default function OcrStudioReviewQueuePage() {
  const { user } = useAuth();
  const { selectedChurchId } = useOcrChurchSelector();
  const [searchParams] = useSearchParams();
  const { toReview } = useOcrStudioPaths();
  const churchId = selectedChurchId ?? (user?.church_id ? Number(user.church_id) : null);

  if (!churchId) {
    return (
      <Box sx={{ pt: 2 }}>
        <Alert severity="info">Select a target church above to open the OCR review queue.</Alert>
      </Box>
    );
  }

  const path = ocrStudioPathWithChurch(toReview(churchId), searchParams);
  return <Navigate to={path} replace />;
}
