import React from 'react';
import { Snackbar, Alert, Button, Typography, Box } from '@mui/material';
import { SystemUpdateAlt as UpdateIcon } from '@mui/icons-material';
import { useVersionCheck } from '@/hooks/useVersionCheck';

const UpdateAvailableBanner: React.FC = () => {
  const { updateAvailable, latestBuild, reload, dismiss } = useVersionCheck({
    pollIntervalMs: 60_000,
  });

  return (
    <Snackbar
      open={updateAvailable}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ zIndex: 9999 }}
    >
      <Alert
        severity="info"
        variant="filled"
        icon={<UpdateIcon />}
        sx={{
          minWidth: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          alignItems: 'center',
        }}
        action={
          <Box display="flex" gap={1}>
            <Button
              color="inherit"
              size="small"
              onClick={dismiss}
              sx={{ fontWeight: 500 }}
            >
              Later
            </Button>
            <Button
              color="inherit"
              size="small"
              variant="outlined"
              onClick={reload}
              sx={{ fontWeight: 600, borderColor: 'rgba(255,255,255,0.5)' }}
            >
              Reload Now
            </Button>
          </Box>
        }
      >
        <Typography variant="body2" fontWeight={500}>
          A new version of Orthodox Metrics is available
        </Typography>
        {latestBuild && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            v{latestBuild.version} ({latestBuild.gitSha})
          </Typography>
        )}
      </Alert>
    </Snackbar>
  );
};

export default UpdateAvailableBanner;
