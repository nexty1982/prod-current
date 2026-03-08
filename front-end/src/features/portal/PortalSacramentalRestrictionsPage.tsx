/**
 * PortalSacramentalRestrictionsPage.tsx
 *
 * Portal wrapper for the sacramental date restrictions viewer.
 * Rendered inside ChurchPortalLayout (which provides HpHeader, footer, etc.).
 */

import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import SacramentalRestrictionsViewer from '@/shared/components/SacramentalRestrictionsViewer';

const PortalSacramentalRestrictionsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          startIcon={<IconArrowLeft size={18} />}
          onClick={() => navigate('/portal')}
          size="small"
        >
          Back to Portal
        </Button>
      </Box>

      <Typography variant="h4" sx={{ mb: 3 }}>
        Sacramental Date Restrictions
      </Typography>

      <SacramentalRestrictionsViewer />
    </Box>
  );
};

export default PortalSacramentalRestrictionsPage;
