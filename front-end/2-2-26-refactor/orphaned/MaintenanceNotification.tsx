import React from 'react';
import { Snackbar, Alert, AlertTitle, LinearProgress, Box } from '@mui/material';
import { useMaintenanceStatus } from '../hooks/useMaintenanceStatus';

export const MaintenanceNotification: React.FC = () => {
  const { isInMaintenance, maintenanceInfo } = useMaintenanceStatus();

  return (
    <Snackbar
      open={isInMaintenance}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{ 
        top: '80px !important',
        '& .MuiAlert-root': {
          minWidth: '400px'
        }
      }}
    >
      <Alert 
        severity="info" 
        variant="filled"
        sx={{ 
          width: '100%',
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <AlertTitle sx={{ fontWeight: 600 }}>
          System Update in Progress
        </AlertTitle>
        <Box sx={{ mb: 1 }}>
          {maintenanceInfo?.message || 'The system is being updated. Navigation is temporarily limited.'}
        </Box>
        <LinearProgress 
          sx={{ 
            mt: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'rgba(255, 255, 255, 0.8)'
            }
          }} 
        />
      </Alert>
    </Snackbar>
  );
};
