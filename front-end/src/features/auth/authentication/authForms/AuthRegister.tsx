import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  LinearProgress,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { IconEye, IconEyeOff, IconCheck, IconBuilding, IconKey } from '@tabler/icons-react';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';

// Password strength calculator (matches AcceptInvite pattern)
const getPasswordStrength = (password: string): { score: number; label: string; color: 'error' | 'warning' | 'info' | 'success' } => {
  if (!password) return { score: 0, label: '', color: 'error' };
  let score = 0;
  if (password.length >= 8) score += 25;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 25;
  if (/\d/.test(password)) score += 20;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;

  if (score <= 25) return { score, label: 'Weak', color: 'error' };
  if (score <= 50) return { score, label: 'Fair', color: 'warning' };
  if (score <= 75) return { score, label: 'Good', color: 'info' };
  return { score: Math.min(score, 100), label: 'Strong', color: 'success' };
};

interface AuthRegisterProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;
}

const AuthRegister = ({ title, subtitle, subtext }: AuthRegisterProps) => {
  const [churchName, setChurchName] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!churchName.trim() || !registrationToken.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/church-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_name: churchName.trim(),
          registration_token: registrationToken.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Box textAlign="center" py={3}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <IconCheck size={32} color="#2e7d32" />
        </Box>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Registration Submitted
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Your account has been created and is pending admin review. You will be able to sign in once
          an administrator activates your account.
        </Typography>
        <Button component={Link} to="/auth/login" variant="contained" color="primary" sx={{ mt: 2 }}>
          Return to Sign In
        </Button>
      </Box>
    );
  }

  return (
    <>
      {title ? (
        <Typography fontWeight="700" variant="h3" mb={1}>
          {title}
        </Typography>
      ) : null}

      {subtext}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={0}>
          <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <IconBuilding size={18} /> Church Verification
            </Typography>
            <CustomFormLabel htmlFor="churchName">Church Name</CustomFormLabel>
            <CustomTextField
              id="churchName"
              placeholder="Enter your church's full name"
              variant="outlined"
              fullWidth
              value={churchName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChurchName(e.target.value)}
              required
            />
            <CustomFormLabel htmlFor="registrationToken">Registration Token</CustomFormLabel>
            <CustomTextField
              id="registrationToken"
              placeholder="Paste the token provided by your church"
              variant="outlined"
              fullWidth
              value={registrationToken}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegistrationToken(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconKey size={18} />
                  </InputAdornment>
                ),
              }}
              required
            />
          </Box>

          <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
            Personal Information
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box flex={1}>
              <CustomFormLabel htmlFor="firstName">First Name</CustomFormLabel>
              <CustomTextField
                id="firstName"
                variant="outlined"
                fullWidth
                value={firstName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                required
              />
            </Box>
            <Box flex={1}>
              <CustomFormLabel htmlFor="lastName">Last Name</CustomFormLabel>
              <CustomTextField
                id="lastName"
                variant="outlined"
                fullWidth
                value={lastName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                required
              />
            </Box>
          </Stack>

          <CustomFormLabel htmlFor="email">Email Address</CustomFormLabel>
          <CustomTextField
            id="email"
            type="email"
            placeholder="your.email@example.com"
            variant="outlined"
            fullWidth
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
          />

          <CustomFormLabel htmlFor="password">Password</CustomFormLabel>
          <CustomTextField
            id="password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            required
          />
          {password && (
            <Box mt={0.5}>
              <LinearProgress
                variant="determinate"
                value={passwordStrength.score}
                color={passwordStrength.color}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color={`${passwordStrength.color}.main`} mt={0.5}>
                {passwordStrength.label}
              </Typography>
            </Box>
          )}

          <CustomFormLabel htmlFor="confirmPassword">Confirm Password</CustomFormLabel>
          <CustomTextField
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            error={passwordsMismatch}
            helperText={passwordsMismatch ? 'Passwords do not match' : passwordsMatch ? 'Passwords match' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {passwordsMatch && <IconCheck size={18} color="#2e7d32" style={{ marginRight: 4 }} />}
                  <IconButton size="small" onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                    {showConfirmPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            required
          />
        </Stack>

        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          type="submit"
          disabled={submitting || !churchName || !registrationToken || !firstName || !lastName || !email || !password || !confirmPassword}
          sx={{ mt: 3 }}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
        </Button>
      </Box>
      {subtitle}
    </>
  );
};

export default AuthRegister;
