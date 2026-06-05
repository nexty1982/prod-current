import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AuthService from '@/shared/lib/authService';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

/** Parish sign-in — Keycloak OIDC redirect (password + MFA/TOTP). */
export default function SsoLoginRedirect() {
  const [params] = useSearchParams();
  const signedOut = params.get('logged_out') === '1'
    || sessionStorage.getItem('om_logged_out') === '1'
    || sessionStorage.getItem('om_logout_in_progress') === '1';

  const next = params.get('next') || '/portal';
  const start = `/api/auth/oidc/orthodoxmetrics/start?next=${encodeURIComponent(
    next.startsWith('/') ? next : '/portal',
  )}`;

  useEffect(() => {
    if (signedOut) {
      sessionStorage.removeItem('om_logged_out');
      sessionStorage.removeItem('om_logout_in_progress');
      document.cookie = 'om_logged_out=; path=/; max-age=0; SameSite=Lax';
      return;
    }
    AuthService.prepareForLogin();
    window.location.replace(start);
  }, [signedOut, start]);

  if (signedOut) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
        <Typography variant="h5">Signed out</Typography>
        <Typography color="text.secondary">Your session has ended.</Typography>
        <Button variant="contained" href={start}>Sign in</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
      <CircularProgress />
      <Typography variant="body1">Redirecting to sign in…</Typography>
    </Box>
  );
}
