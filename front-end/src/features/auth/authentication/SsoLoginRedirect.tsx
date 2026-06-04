import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

/** Sends users to Keycloak SSO for the OrthodoxMetrics parish app. */
export default function SsoLoginRedirect() {
  const [params] = useSearchParams();
  const signedOut = params.get('logged_out') === '1'
    || sessionStorage.getItem('om_logged_out') === '1';

  useEffect(() => {
    if (signedOut) return;
    const next = '/dashboards/modern';
    window.location.replace(
      `/api/auth/oidc/orthodoxmetrics/start?next=${encodeURIComponent(next)}`,
    );
  }, [signedOut]);

  if (signedOut) {
    const start = `/api/auth/oidc/orthodoxmetrics/start?next=${encodeURIComponent('/dashboards/modern')}&prompt=login`;
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
        <Typography variant="h5">Signed out</Typography>
        <Typography color="text.secondary">Your session has ended. Sign in again when you are ready.</Typography>
        <Button
          variant="contained"
          href={start}
          onClick={() => {
            sessionStorage.removeItem('om_logged_out');
          }}
        >
          Sign in
        </Button>
      </Box>
    );
  }

  return null;
}
