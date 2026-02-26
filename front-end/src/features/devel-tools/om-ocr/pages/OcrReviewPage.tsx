/**
 * OcrReviewPage — Full-page workbench route for reviewing OCR jobs.
 * Routes: /devel/ocr-studio/review/:churchId        (jobs list)
 *         /devel/ocr-studio/review/:churchId/:jobId  (specific job)
 */

import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import { WorkbenchProvider } from '../context/WorkbenchContext';
import OcrWorkbench from '../components/workbench/OcrWorkbench';
import { useAuth } from '@/context/AuthContext';

const OcrReviewPage: React.FC = () => {
  const theme = useTheme();
  const { churchId: churchIdParam, jobId: jobIdParam } = useParams<{ churchId: string; jobId: string }>();
  const { user } = useAuth();

  // Resolve churchId: URL param → localStorage → user's church_id
  const churchId = useMemo(() => {
    if (churchIdParam) return Number(churchIdParam);
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('om_ocr_studio.selectedChurchId');
      if (stored) return Number(stored);
    }
    return user?.church_id ?? null;
  }, [churchIdParam, user]);

  const jobId = jobIdParam ? Number(jobIdParam) : null;

  if (!churchId) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Missing church ID
        </Typography>
        <Button component={Link} to="/devel/ocr-studio/upload" startIcon={<IconArrowLeft size={18} />}>
          Back to Upload
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Back link */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Button
          component={Link}
          to="/devel/ocr-studio/upload"
          startIcon={<IconArrowLeft size={16} />}
          size="small"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
        >
          Back to Upload
        </Button>
      </Box>

      {/* Workbench — shows jobs list when jobId is null, specific job when provided */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <WorkbenchProvider>
          <OcrWorkbench churchId={churchId} initialJobId={jobId ?? undefined} />
        </WorkbenchProvider>
      </Box>
    </Box>
  );
};

export default OcrReviewPage;
