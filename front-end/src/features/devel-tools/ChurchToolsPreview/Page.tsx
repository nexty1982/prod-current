import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
import { IconLayoutTemplate } from '@tabler/icons-react';
import ChurchToolsPanel from '../../admin/dashboard/OrthodoxMetrics/ChurchToolsPanel';

const ChurchToolsPreviewPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'info.light', color: 'info.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconLayoutTemplate size={24} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Church Tools Preview
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Development preview of the Church Tools panel for Orthodox Metrics dashboard
            </Typography>
          </Box>
          <Chip 
            label="DEV MODE" 
            size="small" 
            sx={{ 
              backgroundColor: 'warning.main', 
              color: 'warning.contrastText',
              fontWeight: 'bold'
            }} 
          />
        </Box>
      </Paper>

      {/* Church Tools Panel */}
      <ChurchToolsPanel />
    </Box>
  );
};

export default ChurchToolsPreviewPage;
