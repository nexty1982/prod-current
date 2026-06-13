import { Box, CircularProgress, Typography } from '@mui/material';
import React, { useEffect } from 'react';

// ==============================|| OMAI BRIDGE — REDIRECT TO OMAI WITH TOKEN ||============================== //

const OMAI_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? `http://${window.location.hostname}:7060`
  : `${window.location.origin}/omai`; // In production, OMAI is proxied under /omai/

const OmaiBridge: React.FC = () => {
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      window.location.href = `${OMAI_URL}/auth/bridge?token=${encodeURIComponent(token)}`;
      return;
    }

    // No local JWT — try shared platform session (orthodoxmetrics.com Keycloak cookie).
    const next = encodeURIComponent('/omai/cp');
    window.location.href = `/api/auth/sso/handoff/omai?next=${next}`;
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
      <CircularProgress />
      <Typography variant="body1">Redirecting to OMAI...</Typography>
    </Box>
  );
};

export default OmaiBridge;
