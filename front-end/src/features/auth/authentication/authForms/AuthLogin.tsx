import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { loginType } from '@/types/auth/auth';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Typography,
} from '@mui/material';
import React from 'react';
import { Link } from 'react-router-dom';

const AuthLogin = ({ subtitle, subtext }: loginType) => {
  const { login, loading, error, clearError } = useAuth();
  const { t } = useLanguage();

  const handleSignIn = async () => {
    if (error) clearError();
    try {
      const result = await login('', '', false);
      if (result && typeof result === 'object' && 'pendingRedirect' in result && (result as { pendingRedirect?: boolean }).pendingRedirect) {
        return;
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <>
      {subtext}

      {error && (
        <Alert
          severity="error"
          icon={<ErrorOutlineIcon />}
          sx={{ mt: 2, mb: 2 }}
        >
          <Box>
            <Typography variant="body1" component="div" sx={{ mb: 1 }}>
              {error}
            </Typography>
            {error.includes("connecting to the server") && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_still_trouble')}{' '}
                <Typography
                  component="a"
                  href="/support"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {t('auth.error_contact_support')}
                </Typography>
                {' '}{t('auth.error_or_refresh')}
              </Typography>
            )}
            {(error.includes("Incorrect email or password") || error.includes("credentials")) && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_forgot_password')}{' '}
                <Typography
                  component={Link}
                  to="/auth/forgot-password"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline'
                  }}
                >
                  {t('auth.error_reset_here')}
                </Typography>
              </Typography>
            )}
            {error.includes("temporarily unavailable") && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: '0.875rem' }}
              >
                {t('auth.error_check_status_prefix')}{' '}
                <Typography
                  component="a"
                  href="/status"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {t('auth.error_status_page')}
                </Typography>
                {' '}{t('auth.error_check_status_suffix')}
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
        You will be redirected to secure sign-in. Use your organization account; authenticator app (MFA) may be required.
      </Typography>
      <Box mt={2}>
        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? t('auth.btn_signing_in') : t('auth.btn_sign_in')}
        </Button>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthLogin;
