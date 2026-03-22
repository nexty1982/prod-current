/**
 * AccountPersonalInfoPage — Editable personal info form.
 * Uses existing GET/PUT /api/user/profile endpoints.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { SnackbarState, SNACKBAR_CLOSED, SNACKBAR_DURATION } from './accountConstants';
import { profileApi, extractErrorMessage } from './accountApi';

interface ProfileFields {
  display_name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
}

const EMPTY_FIELDS: ProfileFields = {
  display_name: '',
  email: '',
  phone: '',
  company: '',
  location: '',
};

const AccountPersonalInfoPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ProfileFields>(EMPTY_FIELDS);
  const [saved, setSaved] = useState<ProfileFields>(EMPTY_FIELDS);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileApi.getProfile();
        if (data.success && data.profile) {
          const p = data.profile;
          const loaded: ProfileFields = {
            display_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
            email: p.email || user?.email || '',
            phone: p.phone || '',
            company: p.company || '',
            location: p.location || '',
          };
          setFields(loaded);
          setSaved(loaded);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleChange = (field: keyof ProfileFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isDirty = useMemo(() => {
    return (Object.keys(fields) as (keyof ProfileFields)[]).some((k) => fields[k] !== saved[k]);
  }, [fields, saved]);

  const handleCancel = () => setFields(saved);

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await profileApi.updateProfile({
        display_name: fields.display_name,
        company: fields.company,
        location: fields.location,
        phone: fields.phone,
      });
      setSaved(fields);
      setSnackbar({ open: true, message: 'Profile saved successfully.', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Failed to save profile.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" fontWeight={600} mb={0.5}>
            Personal Information
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Update your personal details
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2.5,
              maxWidth: 700,
            }}
          >
            <TextField
              label="Email Address"
              value={fields.email}
              disabled
              fullWidth
              helperText="Email cannot be changed"
            />
            <TextField
              label="Display Name"
              value={fields.display_name}
              onChange={handleChange('display_name')}
              fullWidth
            />
            <TextField
              label="Phone Number"
              value={fields.phone}
              onChange={handleChange('phone')}
              fullWidth
            />
            <TextField
              label="Organization"
              value={fields.company}
              onChange={handleChange('company')}
              fullWidth
            />
            <TextField
              label="Location"
              value={fields.location}
              onChange={handleChange('location')}
              fullWidth
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
          </Box>

          <Box display="flex" justifyContent="flex-end" gap={1.5} mt={4}>
            <Button variant="outlined" disabled={!isDirty || saving} onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={!isDirty || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </CardContent>
      </Card>

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

export default AccountPersonalInfoPage;
