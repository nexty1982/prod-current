/**
 * AccountNotificationsPage — Manage notification preferences per type/channel.
 * Uses GET/PUT /api/notifications/preferences (existing endpoints).
 *
 * Accessible to all authenticated users.
 * Preferences are user-scoped and persisted in user_notification_preferences table.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import EmailIcon from '@mui/icons-material/Email';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SecurityIcon from '@mui/icons-material/Security';
import DescriptionIcon from '@mui/icons-material/Description';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { notificationsApi, extractErrorMessage } from './accountApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface NotifPref {
  type_name: string;
  category: string;
  email_enabled: number | boolean;
  push_enabled: number | boolean;
  in_app_enabled: number | boolean;
  sms_enabled: number | boolean;
  frequency: string;
}

// ── Category & Type Metadata ───────────────────────────────────────────────

/** User-facing labels and descriptions for notification types. */
const TYPE_META: Record<string, { label: string; description: string }> = {
  // Security
  login_alert: { label: 'Login Alerts', description: 'Notify when a new device signs in to your account' },
  password_reset: { label: 'Password Changes', description: 'Confirmations when your password is changed' },
  account_locked: { label: 'Account Lock Warnings', description: 'Alert when your account is locked due to failed login attempts' },

  // User / Account
  welcome: { label: 'Welcome Messages', description: 'Onboarding notifications for new accounts' },
  profile_updated: { label: 'Profile Updates', description: 'Confirmation when your profile information changes' },
  church_invitation: { label: 'Parish Invitations', description: 'Invitations to join a parish on the platform' },
  role_changed: { label: 'Role Changes', description: 'Notifications when your role is updated by an administrator' },
  weekly_digest: { label: 'Weekly Digest', description: 'A weekly summary of activity in your parish' },

  // Records & Certificates
  certificate_ready: { label: 'Certificate Ready', description: 'When a certificate is generated and available for download' },
  certificate_expiring: { label: 'Certificate Expiring', description: 'Reminders about certificates nearing expiration' },
  reminder_baptism: { label: 'Baptism Reminders', description: 'Upcoming baptism record reminders' },
  reminder_marriage: { label: 'Marriage Reminders', description: 'Upcoming marriage record reminders' },
  reminder_funeral: { label: 'Funeral Reminders', description: 'Upcoming funeral record reminders' },
  data_export_ready: { label: 'Data Export Ready', description: 'When a requested data export is available for download' },

  // System
  system_alert: { label: 'System Alerts', description: 'Important platform alerts and announcements' },
  system_maintenance: { label: 'Maintenance Notices', description: 'Scheduled maintenance and downtime notifications' },

  // Notes & Collaboration
  note_shared: { label: 'Shared Notes', description: 'When someone shares a note with you' },
  note_comment: { label: 'Note Comments', description: 'When someone comments on your note' },
};

/** Categories shown to regular users, in display order. */
const USER_CATEGORIES: { key: string; label: string; icon: React.ReactNode; description: string }[] = [
  {
    key: 'security',
    label: 'Security',
    icon: <SecurityIcon fontSize="small" />,
    description: 'Critical alerts about your account security. We recommend keeping these enabled.',
  },
  {
    key: 'user',
    label: 'Account & Activity',
    icon: <NotificationsIcon fontSize="small" />,
    description: 'Notifications about your account, invitations, and weekly summaries.',
  },
  {
    key: 'certificates',
    label: 'Certificates & Records',
    icon: <DescriptionIcon fontSize="small" />,
    description: 'Alerts about certificates and record-related activity.',
  },
  {
    key: 'reminders',
    label: 'Reminders',
    icon: <EventNoteIcon fontSize="small" />,
    description: 'Reminders for upcoming sacramental events.',
  },
  {
    key: 'system',
    label: 'System',
    icon: <NotificationsActiveIcon fontSize="small" />,
    description: 'Platform alerts and maintenance notices.',
  },
];

/** Categories only relevant to admins — hidden from regular users. */
const ADMIN_CATEGORIES = new Set(['admin', 'billing', 'backup']);

/** Notification types that should not be user-togglable (always on). */
const LOCKED_TYPES = new Set(['password_reset', 'account_locked']);

// ── Helpers ────────────────────────────────────────────────────────────────

function toBool(v: number | boolean): boolean {
  return v === 1 || v === true;
}

function getTypeLabel(typeName: string): string {
  return TYPE_META[typeName]?.label || typeName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getTypeDescription(typeName: string): string {
  return TYPE_META[typeName]?.description || '';
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountNotificationsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<NotifPref[]>([]);
  const [saved, setSaved] = useState<NotifPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);

  // ── Load ──

  useEffect(() => {
    const load = async () => {
      try {
        const preferences = await notificationsApi.getPreferences();
        setPrefs(preferences as NotifPref[]);
        setSaved(preferences as NotifPref[]);
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Grouped & filtered data ──

  const grouped = useMemo(() => {
    const map = new Map<string, NotifPref[]>();
    for (const p of prefs) {
      if (ADMIN_CATEGORIES.has(p.category)) continue;
      if (!TYPE_META[p.type_name]) continue; // Skip types with no user-facing metadata
      const list = map.get(p.category) || [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [prefs]);

  // ── Dirty detection ──

  const isDirty = useMemo(() => {
    if (prefs.length !== saved.length) return false;
    return prefs.some((p, i) => {
      const s = saved.find((sp) => sp.type_name === p.type_name);
      if (!s) return true;
      return (
        toBool(p.email_enabled) !== toBool(s.email_enabled) ||
        toBool(p.in_app_enabled) !== toBool(s.in_app_enabled)
      );
    });
  }, [prefs, saved]);

  // ── Handlers ──

  const handleToggle = useCallback(
    (typeName: string, channel: 'email_enabled' | 'in_app_enabled') => {
      if (LOCKED_TYPES.has(typeName)) return;
      setPrefs((prev) =>
        prev.map((p) =>
          p.type_name === typeName ? { ...p, [channel]: toBool(p[channel]) ? 0 : 1 } : p,
        ),
      );
    },
    [],
  );

  const handleCancel = useCallback(() => {
    setPrefs([...saved]);
  }, [saved]);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      // Only send changed preferences
      const changed = prefs.filter((p) => {
        const s = saved.find((sp) => sp.type_name === p.type_name);
        if (!s) return false;
        return (
          toBool(p.email_enabled) !== toBool(s.email_enabled) ||
          toBool(p.in_app_enabled) !== toBool(s.in_app_enabled)
        );
      });

      await notificationsApi.updatePreferences(
        changed.map((p) => ({
          type_name: p.type_name,
          email_enabled: toBool(p.email_enabled),
          push_enabled: toBool(p.in_app_enabled), // mirror in-app for push
          in_app_enabled: toBool(p.in_app_enabled),
          sms_enabled: false,
          frequency: p.frequency || 'immediate',
        })),
      );
      setSaved([...prefs]);
      setSnackbar({ open: true, message: 'Notification preferences saved.', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save preferences.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [prefs, saved, isDirty, saving]);

  // ── Loading ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  // ── Render ──

  return (
    <>
      {/* Header */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Notification Preferences
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Control how and when you receive notifications. Changes apply to your account across all devices.
          </Typography>
        </CardContent>
      </Card>

      {/* Category Sections */}
      {USER_CATEGORIES.map((cat) => {
        const items = grouped.get(cat.key);
        if (!items || items.length === 0) return null;

        return (
          <Card key={cat.key} variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                {cat.icon}
                <Typography variant="subtitle1" fontWeight={600}>
                  {cat.label}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {cat.description}
              </Typography>
              <Divider sx={{ mb: 1 }} />

              {/* Column Headers */}
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                px={1}
                py={0.5}
              >
                <Typography variant="caption" color="text.disabled" sx={{ flex: 1 }}>
                  Notification
                </Typography>
                <Box display="flex" gap={4} sx={{ minWidth: 160, justifyContent: 'center' }}>
                  <Tooltip title="Receive email notifications">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <EmailIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        Email
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Receive in-app notifications">
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <NotificationsIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled">
                        In-App
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Preference Rows */}
              {items.map((p) => {
                const isLocked = LOCKED_TYPES.has(p.type_name);
                return (
                  <Box
                    key={p.type_name}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    py={1}
                    px={1}
                    sx={{
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {getTypeLabel(p.type_name)}
                      </Typography>
                      {getTypeDescription(p.type_name) && (
                        <Typography variant="caption" color="text.secondary">
                          {getTypeDescription(p.type_name)}
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={4} sx={{ minWidth: 160, justifyContent: 'center' }}>
                      <Tooltip title={isLocked ? 'This notification cannot be disabled for security reasons' : ''}>
                        <span>
                          <Switch
                            size="small"
                            checked={toBool(p.email_enabled)}
                            onChange={() => handleToggle(p.type_name, 'email_enabled')}
                            disabled={isLocked}
                          />
                        </span>
                      </Tooltip>
                      <Tooltip title={isLocked ? 'This notification cannot be disabled for security reasons' : ''}>
                        <span>
                          <Switch
                            size="small"
                            checked={toBool(p.in_app_enabled)}
                            onChange={() => handleToggle(p.type_name, 'in_app_enabled')}
                            disabled={isLocked}
                          />
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <Box display="flex" justifyContent="flex-end" gap={1.5} mt={1} mb={3}>
        <Button variant="outlined" disabled={!isDirty || saving} onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!isDirty || saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={SNACKBAR_DURATION}
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

export default AccountNotificationsPage;
