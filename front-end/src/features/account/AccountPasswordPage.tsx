/**
 * AccountPasswordPage — Password & Authentication security page.
 *
 * Sections:
 * 1. Security Overview — account age, last login, password age, session count
 * 2. Change Password — current/new/confirm with strength guidance
 * 3. Two-Factor Authentication — truthful status (not yet implemented)
 * 4. Security Tips — actionable recommendations based on real state
 *
 * Uses:
 *   PUT  /api/user/profile/password       — change password + revoke other sessions
 *   GET  /api/user/profile/security-status — security metadata
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import LockIcon from '@mui/icons-material/Lock';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';
import DevicesIcon from '@mui/icons-material/Devices';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SendIcon from '@mui/icons-material/Send';

// ── Types ──────────────────────────────────────────────────────────────────

interface SecurityStatus {
  account_created_at: string | null;
  last_login: string | null;
  password_changed_at: string | null;
  email_verified: boolean;
  verification_status: 'none' | 'pending' | 'verified';
  verification_sent_at: string | null;
  active_sessions: number;
  two_factor_enabled: boolean;
}

// SnackbarState imported from accountConstants — uses SNACKBAR_DURATION_LONG for security actions
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION_LONG } from './accountConstants';
import { profileApi, extractErrorMessage } from './accountApi';

// ── Password Strength ──────────────────────────────────────────────────────

interface StrengthResult {
  score: number; // 0–4
  label: string;
  color: 'error' | 'warning' | 'info' | 'success';
  checks: { label: string; met: boolean }[];
}

function evaluateStrength(pw: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters', met: pw.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(pw) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(pw) },
    { label: 'Contains a number', met: /\d/.test(pw) },
    { label: 'Contains special character', met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = checks.filter((c) => c.met).length;
  if (score <= 1) return { score: 0, label: 'Very weak', color: 'error', checks };
  if (score === 2) return { score: 1, label: 'Weak', color: 'error', checks };
  if (score === 3) return { score: 2, label: 'Fair', color: 'warning', checks };
  if (score === 4) return { score: 3, label: 'Good', color: 'info', checks };
  return { score: 4, label: 'Strong', color: 'success', checks };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

function formatAbsoluteDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────

// ── Shared action button styles ──────────────────────────────────────────
const useActionStyles = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#d4af37' : '#2d1b4e';
  const accentHover = isDark ? '#c29d2f' : '#1f1236';
  const accentBorder = isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(45, 27, 78, 0.2)';
  const accentBorderHover = isDark ? 'rgba(212, 175, 55, 0.5)' : 'rgba(45, 27, 78, 0.4)';
  const accentBgHover = isDark ? 'rgba(212, 175, 55, 0.08)' : 'rgba(45, 27, 78, 0.04)';
  const onAccent = isDark ? '#1a1a2e' : '#fff';

  return { isDark, accent, accentHover, accentBorder, accentBorderHover, accentBgHover, onAccent };
};

const AccountPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { accent, accentHover, accentBorder, accentBorderHover, accentBgHover, onAccent } = useActionStyles();

  // Password form
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);

  // Security status
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(true);
  const [sendingVerification, setSendingVerification] = useState(false);

  // ── Load security status ──

  const loadSecurityStatus = useCallback(async () => {
    try {
      const data = await profileApi.getSecurityStatus();
      if (data.success && data.security) {
        setSecurity(data.security);
      }
    } catch {
      // Non-critical — page still works without status
    } finally {
      setLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityStatus();
  }, [loadSecurityStatus]);

  // ── Resend verification email ──

  const handleResendVerification = useCallback(async () => {
    setSendingVerification(true);
    try {
      const data = await profileApi.resendVerification();
      setSnackbar({ open: true, message: data.message || 'Verification email sent.', severity: 'success' });
      loadSecurityStatus(); // Refresh to pick up verification_sent_at
    } catch (err: any) {
      if (err.status === 429) {
        setSnackbar({ open: true, message: err.message || 'Please wait before requesting another verification email.', severity: 'info' });
      } else {
        setSnackbar({ open: true, message: err.message || 'Failed to send verification email.', severity: 'error' });
      }
    } finally {
      setSendingVerification(false);
    }
  }, [loadSecurityStatus]);

  // ── Password strength ──

  const strength = useMemo(() => evaluateStrength(form.newPassword), [form.newPassword]);

  // ── Validation ──

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (form.newPassword && form.newPassword.length < 8) {
      errors.newPassword = 'Must be at least 8 characters';
    }
    if (form.confirmPassword && form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (form.newPassword && form.currentPassword && form.newPassword === form.currentPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    return errors;
  }, [form]);

  const canSubmit = useMemo(
    () =>
      form.currentPassword.length > 0 &&
      form.newPassword.length >= 8 &&
      form.confirmPassword.length > 0 &&
      form.newPassword === form.confirmPassword &&
      form.newPassword !== form.currentPassword &&
      !saving,
    [form, saving],
  );

  // ── Handlers ──

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleShow = (field: keyof typeof showPw) => {
    setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const data = await profileApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      const revokedMsg =
        data.sessions_revoked > 0
          ? ` ${data.sessions_revoked} other session${data.sessions_revoked > 1 ? 's' : ''} signed out for security.`
          : '';
      setSnackbar({ open: true, message: `Password changed successfully.${revokedMsg}`, severity: 'success' });
      // Refresh security status to reflect new password_changed_at
      loadSecurityStatus();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to change password', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ── Security recommendations ──

  const recommendations = useMemo(() => {
    if (!security) return [];
    const items: { text: string; severity: 'warning' | 'info' }[] = [];
    if (!security.password_changed_at) {
      items.push({ text: 'You have never changed your password. Consider updating it regularly.', severity: 'warning' });
    } else {
      const daysSince = Math.floor((Date.now() - new Date(security.password_changed_at).getTime()) / 86400000);
      if (daysSince > 180) {
        items.push({ text: `Your password was last changed ${daysSince} days ago. Consider updating it.`, severity: 'warning' });
      }
    }
    if (security.active_sessions > 3) {
      items.push({
        text: `You have ${security.active_sessions} active sessions. Review them to ensure they are all yours.`,
        severity: 'info',
      });
    }
    if (!security.email_verified) {
      items.push({ text: 'Your email is not verified. Verify it to ensure you can receive password resets and security alerts.', severity: 'warning' });
    }
    if (!security.two_factor_enabled) {
      items.push({ text: 'Two-factor authentication is not yet available. It will add an extra layer of security when released.', severity: 'info' });
    }
    return items;
  }, [security]);

  // ── Password field helper ──

  const pwField = (
    label: string,
    field: 'current' | 'new' | 'confirm',
    formKey: keyof typeof form,
    helperText?: string,
  ) => (
    <TextField
      label={label}
      type={showPw[field] ? 'text' : 'password'}
      value={form[formKey]}
      onChange={handleChange(formKey)}
      error={!!validationErrors[formKey]}
      helperText={validationErrors[formKey] || helperText || ''}
      fullWidth
      autoComplete={field === 'current' ? 'current-password' : 'new-password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={() => toggleShow(field)} edge="end" size="small" tabIndex={-1}>
              {showPw[field] ? <IconEyeOff size={18} /> : <IconEye size={18} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  // ── Render ──

  return (
    <>
      {/* ── Security Overview ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <SecurityIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Security Overview
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            A summary of your account's security status.
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {loadingSecurity ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={24} />
            </Box>
          ) : security ? (
            <Box
              display="grid"
              gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }}
              gap={2}
            >
              <StatusItem
                icon={<ScheduleIcon sx={{ fontSize: 20 }} />}
                label="Account created"
                value={formatRelativeDate(security.account_created_at)}
                tooltip={formatAbsoluteDate(security.account_created_at)}
              />
              <StatusItem
                icon={<LockIcon sx={{ fontSize: 20 }} />}
                label="Password last changed"
                value={security.password_changed_at ? formatRelativeDate(security.password_changed_at) : 'Never'}
                tooltip={security.password_changed_at ? formatAbsoluteDate(security.password_changed_at) : 'Password has not been changed since account creation'}
                warn={!security.password_changed_at}
              />
              <StatusItem
                icon={<DevicesIcon sx={{ fontSize: 20 }} />}
                label="Active sessions"
                value={String(security.active_sessions)}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate('/account/sessions')}
                    sx={{
                      '&&': {
                        color: `${accent} !important`,
                        borderColor: `${accentBorder} !important`,
                      },
                      ml: 1,
                      minWidth: 'auto',
                      textTransform: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      px: 1.5,
                      py: 0.25,
                      borderRadius: '4px',
                      letterSpacing: '0.02em',
                      '&:hover': {
                        borderColor: `${accentBorderHover} !important`,
                        bgcolor: accentBgHover,
                      },
                    }}
                  >
                    View
                  </Button>
                }
              />
              <StatusItem
                icon={<MarkEmailReadIcon sx={{ fontSize: 20 }} />}
                label="Email verification"
                value={security.email_verified ? 'Verified' : 'Not verified'}
                chipColor={security.email_verified ? 'success' : 'warning'}
                action={
                  !security.email_verified ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResendVerification}
                      disabled={sendingVerification}
                      startIcon={sendingVerification ? <CircularProgress size={10} /> : <SendIcon sx={{ fontSize: 12 }} />}
                      sx={{
                        '&&': {
                          color: `${accent} !important`,
                          borderColor: `${accentBorder} !important`,
                        },
                        ml: 1,
                        minWidth: 'auto',
                        textTransform: 'none',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        px: 1.5,
                        py: 0.25,
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                        '&:hover': {
                          borderColor: `${accentBorderHover} !important`,
                          bgcolor: accentBgHover,
                        },
                      }}
                    >
                      {sendingVerification ? 'Sending...' : 'Verify'}
                    </Button>
                  ) : undefined
                }
              />
              <StatusItem
                icon={<ShieldIcon sx={{ fontSize: 20 }} />}
                label="Two-factor auth"
                value={security.two_factor_enabled ? 'Enabled' : 'Not available'}
                chipColor={security.two_factor_enabled ? 'success' : 'default'}
              />
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Unable to load security status.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Email Verification ── */}
      {security && !security.email_verified && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <MarkEmailReadIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                Email Verification
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Verify your email address to secure your account and enable all platform features.
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'warning.light',
                border: '1px solid',
                borderColor: 'warning.main',
              }}
            >
              <WarningAmberIcon sx={{ color: 'warning.dark', mt: 0.25 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} color="warning.dark" mb={0.5}>
                  Your email is not verified
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  Without a verified email, you may not receive password reset links, security alerts,
                  or important notifications about your account. Verify now to ensure uninterrupted access.
                </Typography>
                {security.verification_sent_at && (
                  <Typography variant="caption" color="text.disabled" display="block" mb={1}>
                    Last sent {formatAbsoluteDate(security.verification_sent_at)}.
                    Check your inbox and spam folder.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  size="small"
                  startIcon={sendingVerification ? <CircularProgress size={14} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResendVerification}
                  disabled={sendingVerification}
                  sx={{
                    '&&': {
                      bgcolor: `${accent} !important`,
                      color: `${onAccent} !important`,
                    },
                    borderRadius: '4px',
                    px: 2.5,
                    py: 0.75,
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    letterSpacing: '0.01em',
                    '&:hover': {
                      bgcolor: `${accentHover} !important`,
                    },
                  }}
                >
                  {sendingVerification ? 'Sending...' : 'Send Verification Email'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Change Password ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LockIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Change Password
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>
            Choose a strong, unique password you don't use elsewhere.
          </Typography>
          <Typography variant="caption" color="text.disabled" mb={3} component="div">
            Changing your password will sign out all other devices for security.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2.5} sx={{ maxWidth: 480 }}>
            {pwField('Current Password', 'current', 'currentPassword')}
            {pwField('New Password', 'new', 'newPassword', 'Minimum 8 characters')}

            {/* Strength indicator */}
            {form.newPassword.length > 0 && (
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Password strength
                  </Typography>
                  <Typography variant="caption" color={`${strength.color}.main`} fontWeight={600}>
                    {strength.label}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(strength.score / 4) * 100}
                  color={strength.color}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Stack spacing={0.25} mt={1}>
                  {strength.checks.map((c) => (
                    <Typography
                      key={c.label}
                      variant="caption"
                      color={c.met ? 'success.main' : 'text.disabled'}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      {c.met ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : <InfoOutlinedIcon sx={{ fontSize: 14 }} />}
                      {c.label}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}

            {pwField('Confirm New Password', 'confirm', 'confirmPassword')}

            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canSubmit}
              sx={{
                '&&': {
                  bgcolor: `${accent} !important`,
                  color: `${onAccent} !important`,
                },
                alignSelf: 'flex-start',
                borderRadius: '4px',
                px: 3,
                py: 0.875,
                fontSize: '0.8125rem',
                fontWeight: 600,
                letterSpacing: '0.01em',
                '&:hover': {
                  bgcolor: `${accentHover} !important`,
                },
              }}
            >
              {saving ? <CircularProgress size={20} color="inherit" /> : 'Change Password'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* ── Two-Factor Authentication ── */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <ShieldIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Two-Factor Authentication
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Add an extra layer of security by requiring a second verification step when signing in.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <ShieldIcon sx={{ color: 'text.disabled', mt: 0.25 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  Status
                </Typography>
                <Chip
                  label="Not Available"
                  size="small"
                  variant="outlined"
                  color="default"
                  sx={{ borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 500, letterSpacing: '0.02em' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Two-factor authentication is not yet implemented on this platform. When available,
                you'll be able to use an authenticator app (TOTP) to add a second verification
                step during sign-in. This section will update automatically when the feature is released.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Security Recommendations ── */}
      {recommendations.length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <InfoOutlinedIcon color="primary" />
              <Typography variant="h5" fontWeight={600}>
                Security Recommendations
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Suggestions to improve your account security.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              {recommendations.map((rec, i) => (
                <Box
                  key={i}
                  display="flex"
                  alignItems="flex-start"
                  gap={1.5}
                  sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
                >
                  {rec.severity === 'warning' ? (
                    <WarningAmberIcon sx={{ fontSize: 20, color: 'warning.main', mt: 0.25 }} />
                  ) : (
                    <InfoOutlinedIcon sx={{ fontSize: 20, color: 'info.main', mt: 0.25 }} />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {rec.text}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION_LONG}
        onClose={() => setSnackbar(SNACKBAR_CLOSED)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(SNACKBAR_CLOSED)}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// ── StatusItem sub-component ───────────────────────────────────────────────

interface StatusItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip?: string;
  warn?: boolean;
  chipColor?: 'default' | 'success' | 'warning' | 'error';
  action?: React.ReactNode;
}

const StatusItem: React.FC<StatusItemProps> = ({ icon, label, value, tooltip, warn, chipColor, action }) => {
  const content = (
    <Box
      display="flex"
      alignItems="center"
      gap={1.5}
      sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
    >
      <Box sx={{ color: warn ? 'warning.main' : 'text.secondary' }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.disabled">
          {label}
        </Typography>
        <Box display="flex" alignItems="center">
          {chipColor ? (
            <Chip label={value} size="small" variant="outlined" color={chipColor} sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 500, borderRadius: '4px', letterSpacing: '0.02em' }} />
          ) : (
            <Typography variant="body2" fontWeight={500} color={warn ? 'warning.main' : 'text.primary'}>
              {value}
            </Typography>
          )}
          {action}
        </Box>
      </Box>
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip} placement="top">{content}</Tooltip> : content;
};

export default AccountPasswordPage;
