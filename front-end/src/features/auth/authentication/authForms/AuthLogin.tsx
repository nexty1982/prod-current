// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { loginType } from '@/types/auth/auth';
import CustomCheckbox from '@/components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }

    // Clear global error
    if (error) {
      clearError();
    }
  };

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      rememberMe: event.target.checked,
    }));
  };


  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!formData.username.trim()) {
      errors.username = 'Email or username is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }


    try {
      const result = await login(formData.username, formData.password, formData.rememberMe);
      // Use redirectUrl from login response if available, otherwise redirect to Super Dashboard
      if (result && typeof result === 'object' && 'redirectUrl' in result && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else {
        navigate('/');
      }
    } catch (err) {
      // Error is handled by the auth context
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
                Still having trouble?{' '}
                <Typography 
                  component="a" 
                  href="/support" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'underline',
                    cursor: 'pointer' 
                  }}
                >
                  Contact support
                </Typography>
                {' '}or try refreshing the page.
              </Typography>
            )}
            {(error.includes("Incorrect email or password") || error.includes("credentials")) && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ fontSize: '0.875rem' }}
              >
                Forgot your password?{' '}
                <Typography 
                  component={Link} 
                  to="/auth/forgot-password" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'underline' 
                  }}
                >
                  Reset it here
                </Typography>
              </Typography>
            )}
            {error.includes("temporarily unavailable") && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ fontSize: '0.875rem' }}
              >
                Please check our{' '}
                <Typography 
                  component="a" 
                  href="/status" 
                  sx={{ 
                    color: 'primary.main', 
                    textDecoration: 'underline',
                    cursor: 'pointer' 
                  }}
                >
                  system status page
                </Typography>
                {' '}for updates.
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box>
            <CustomFormLabel htmlFor="username">Email or Username</CustomFormLabel>
            <CustomTextField
              id="username"
              variant="outlined"
              fullWidth
              value={formData.username}
              onChange={handleInputChange('username')}
              error={!!formErrors.username}
              helperText={formErrors.username}
              disabled={loading}
            />
          </Box>
          <Box>
            <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
            <CustomTextField
              id="password"
              type="password"
              variant="outlined"
              fullWidth
              value={formData.password}
              onChange={handleInputChange('password')}
              error={!!formErrors.password}
              helperText={formErrors.password}
              disabled={loading}
            />
          </Box>
          <Stack justifyContent="space-between" direction="row" alignItems="center" my={2}>
            <FormGroup>
              <FormControlLabel
                control={
                  <CustomCheckbox
                    checked={formData.rememberMe}
                    onChange={handleRememberMeChange}
                    disabled={loading}
                  />
                }
                label="Remember this Device"
              />
            </FormGroup>
            <Typography
              component={Link}
              to="/auth/forgot-password"
              fontWeight="500"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
              }}
            >
              Forgot Password?
            </Typography>
          </Stack>
        </Stack>
        <Box mt={3}>
          <Button
            color="primary"
            variant="contained"
            size="large"
            fullWidth
            type="submit"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </Box>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthLogin;
