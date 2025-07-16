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
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../context/AuthContext';
import { loginType } from 'src/types/auth/auth';
import CustomCheckbox from '../../../components/forms/theme-elements/CustomCheckbox';
import CustomTextField from '../../../components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '../../../components/forms/theme-elements/CustomFormLabel';
import AuthSocialButtons from './AuthSocialButtons';

const AuthLogin = ({ title, subtitle, subtext }: loginType) => {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
    platform: 'orthodox-metrics', // Default to Orthodox Metrics
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

  const handlePlatformChange = (event: SelectChangeEvent<string>) => {
    setFormData(prev => ({
      ...prev,
      platform: event.target.value,
    }));

    // Clear errors when changing platform
    if (error) {
      clearError();
    }
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

    // Redirect to OrthodMetrics portal if selected
    if (formData.platform === 'orthodmetrics') {
      // Redirect to OrthodMetrics portal login
      window.location.href = 'http://localhost:5175/login';
      return;
    }

    try {
      await login(formData.username, formData.password, formData.rememberMe);
      // Redirect to dashboard on successful login
      navigate('/');
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    }
  };

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      <AuthSocialButtons title="Sign in with" />
      <Box mt={3}>
        <Divider>
          <Typography
            component="span"
            color="textSecondary"
            variant="h6"
            fontWeight="400"
            position="relative"
            px={2}
          >
            or sign in with
          </Typography>
        </Divider>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          <Box>
            <CustomFormLabel htmlFor="platform">Login Platform</CustomFormLabel>
            <FormControl fullWidth>
              <Select
                id="platform"
                value={formData.platform}
                onChange={handlePlatformChange}
                disabled={loading}
                sx={{ mt: 1 }}
              >
                <MenuItem value="orthodox-metrics">Orthodox Metrics (Full System)</MenuItem>
                <MenuItem value="orthodmetrics">OrthodMetrics (Church Portal)</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
