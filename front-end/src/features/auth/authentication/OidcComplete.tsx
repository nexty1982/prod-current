import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AuthService from '@/shared/lib/authService';
import { getPostLoginPath } from '@/utils/roles';

/**
 * Keycloak → OM JWT handoff after /api/auth/oidc/orthodoxmetrics/callback.
 */
export default function OidcComplete() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    if (!accessToken) {
      setError('Missing access token. Try signing in again from /login.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        AuthService.persistAuthSession(accessToken, refreshToken);

        let user = (await AuthService.checkAuthWithRetry(3)).user;
        if (!user) {
          user = AuthService.userFromAccessToken(accessToken);
          if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
        }

        if (!user) {
          if (!cancelled) {
            setError('Sign-in token was not accepted by the API. Try signing in again.');
          }
          return;
        }

        if (cancelled) return;

        // Full navigation so AuthContext re-initializes with the new session (one sign-in).
        window.location.replace(getPostLoginPath(user));
      } catch (e) {
        console.error('[OidcComplete]', e);
        if (!cancelled) setError('Could not process sign-in response.');
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams]);

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, p: 3 }}>
        <Typography color="error" variant="h6">{error}</Typography>
        <Button variant="contained" href="/auth/login2">Try again</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <CircularProgress />
      <Typography>Signing you in…</Typography>
    </Box>
  );
}
