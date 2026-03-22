/**
 * AccountChurchDetailsPage — View and edit basic church information.
 * Uses GET/PUT /api/my/church-settings.
 *
 * Liturgical Settings (jurisdiction, calendar_type) are auto-determined from
 * the jurisdictions reference table. CRM data from us_churches is used to
 * suggest initial values when not yet set.
 *
 * Editable by: super_admin, admin, church_admin, priest
 * Read-only for all other authenticated users with church context.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useAuth } from '@/context/AuthContext';
import { canEditBasicChurchInfo } from './accountPermissions';
import {
  SnackbarState,
  SNACKBAR_CLOSED,
  SNACKBAR_DURATION,
  LANGUAGE_OPTIONS,
  getChurchDisplayName,
} from './accountConstants';
import { churchApi, CrmMatch, extractErrorMessage } from './accountApi';

// ── Types ──────────────────────────────────────────────────────────────────

interface Jurisdiction {
  id: number;
  name: string;
  abbreviation: string;
  calendar_type: 'Julian' | 'Revised Julian';
}

interface ChurchFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  jurisdiction: string;
  jurisdiction_id: number | null;
  preferred_language: string;
  calendar_type: string;
  website: string;
}

const EMPTY_FORM: ChurchFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state_province: '',
  postal_code: '',
  country: '',
  jurisdiction: '',
  jurisdiction_id: null,
  preferred_language: 'en',
  calendar_type: '',
  website: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidEmail(v: string): boolean {
  if (!v) return true; // optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidWebsite(v: string): boolean {
  if (!v) return true; // optional
  // Accept with or without protocol
  return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(v);
}

function trimFields(data: ChurchFormData): ChurchFormData {
  const trimmed = { ...data };
  for (const key of Object.keys(trimmed) as (keyof ChurchFormData)[]) {
    if (typeof trimmed[key] === 'string') {
      (trimmed as any)[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

// ── Component ──────────────────────────────────────────────────────────────

const AccountChurchDetailsPage: React.FC = () => {
  const { user } = useAuth();
  const editable = canEditBasicChurchInfo(user);

  const [form, setForm] = useState<ChurchFormData>(EMPTY_FORM);
  const [saved, setSaved] = useState<ChurchFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>(SNACKBAR_CLOSED);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [crmMatch, setCrmMatch] = useState<CrmMatch | null>(null);
  const [crmApplied, setCrmApplied] = useState(false);

  // ── Load jurisdictions ──

  useEffect(() => {
    fetch('/api/jurisdictions', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) setJurisdictions(data.items);
      })
      .catch(() => {});
  }, []);

  // ── Load church settings ──

  useEffect(() => {
    if (!user?.church_id) {
      setLoading(false);
      return;
    }

    const fetchChurch = async () => {
      try {
        const result = await churchApi.getSettingsWithCrm();
        const settings = result.settings;
        if (settings) {
          const loaded: ChurchFormData = {
            name: getChurchDisplayName(settings),
            email: settings.email || '',
            phone: settings.phone || '',
            address: settings.address || '',
            city: settings.city || '',
            state_province: settings.state_province || '',
            postal_code: settings.postal_code || '',
            country: settings.country || '',
            jurisdiction: settings.jurisdiction || '',
            jurisdiction_id: settings.jurisdiction_id || null,
            preferred_language: settings.preferred_language || 'en',
            calendar_type: settings.calendar_type || '',
            website: settings.website || '',
          };
          setForm(loaded);
          setSaved(loaded);
        }
        if (result.crm_match) {
          setCrmMatch(result.crm_match);
        }
      } catch (err) {
        console.error('Failed to load church details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChurch();
  }, [user?.church_id]);

  // ── Dirty detection ──

  const isDirty = useMemo(() => {
    return (Object.keys(form) as (keyof ChurchFormData)[]).some((k) => form[k] !== saved[k]);
  }, [form, saved]);

  // ── Validation ──

  const emailError = !isValidEmail(form.email) ? 'Invalid email format' : '';
  const websiteError = !isValidWebsite(form.website) ? 'Invalid website format' : '';
  const hasErrors = !!emailError || !!websiteError;

  // ── Derived: selected jurisdiction details ──

  const selectedJurisdiction = useMemo(() => {
    if (!form.jurisdiction_id) return null;
    return jurisdictions.find((j) => j.id === form.jurisdiction_id) || null;
  }, [form.jurisdiction_id, jurisdictions]);

  // ── CRM suggestion available? ──

  const hasCrmSuggestion = useMemo(() => {
    if (!crmMatch || crmApplied) return false;
    // Suggest if jurisdiction_id is not set but CRM has one
    return !form.jurisdiction_id && !!crmMatch.jurisdiction_id;
  }, [crmMatch, crmApplied, form.jurisdiction_id]);

  // ── Handlers ──

  const handleChange = useCallback(
    (field: keyof ChurchFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  const handleJurisdictionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const jId = e.target.value ? parseInt(e.target.value, 10) : null;
      setForm((prev) => {
        const matched = jId ? jurisdictions.find((j) => j.id === jId) : null;
        return {
          ...prev,
          jurisdiction_id: jId,
          jurisdiction: matched?.name || '',
          calendar_type: matched?.calendar_type || '',
        };
      });
    },
    [jurisdictions],
  );

  const handleApplyCrm = useCallback(() => {
    if (!crmMatch?.jurisdiction_id) return;
    const matched = jurisdictions.find((j) => j.id === crmMatch.jurisdiction_id);
    if (matched) {
      setForm((prev) => ({
        ...prev,
        jurisdiction_id: matched.id,
        jurisdiction: matched.name,
        calendar_type: matched.calendar_type,
      }));
      setCrmApplied(true);
      setSnackbar({
        open: true,
        message: `Liturgical settings populated from CRM: ${matched.name} (${matched.calendar_type})`,
        severity: 'info',
      });
    }
  }, [crmMatch, jurisdictions]);

  const handleCancel = useCallback(() => {
    setForm(saved);
    setCrmApplied(false);
  }, [saved]);

  const handleSave = useCallback(async () => {
    if (!isDirty || hasErrors || saving) return;

    setSaving(true);
    try {
      const trimmed = trimFields(form);
      // Send null for empty calendar_type (DB ENUM doesn't accept empty string)
      const payload = {
        ...trimmed,
        calendar_type: trimmed.calendar_type || null,
        jurisdiction_id: trimmed.jurisdiction_id || null,
      };
      await churchApi.updateSettings(payload);
      setSaved({ ...form });
      setCrmApplied(false);
      setSnackbar({ open: true, message: 'Church details saved successfully.', severity: 'success' });
    } catch (err: any) {
      console.error('Failed to save church details:', err);
      setSnackbar({ open: true, message: err.message || 'Network error. Please try again.', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }, [form, isDirty, hasErrors, saving]);

  // ── Loading / No-church states ──

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user?.church_id) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ p: 3, textAlign: 'center', py: 6 }}>
          <InfoOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Church details are available when you are affiliated with a parish.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // ── Render ──

  return (
    <>
      {!editable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You are viewing your church&apos;s information in read-only mode.
        </Alert>
      )}

      <Card variant="outlined">
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <InfoOutlinedIcon color="primary" />
            <Typography variant="h5" fontWeight={600}>
              Church Details
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Basic information about your parish — name, contact, address, and liturgical settings.
          </Typography>
          <Divider sx={{ mb: 3 }} />

          {/* ── Church Name ── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, maxWidth: 700 }}>
            <TextField
              label="Church Name"
              value={form.name}
              onChange={handleChange('name')}
              fullWidth
              disabled={!editable}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />

            {/* ── Contact ── */}
            <TextField
              label="Email"
              value={form.email}
              onChange={handleChange('email')}
              fullWidth
              disabled={!editable}
              error={!!emailError}
              helperText={emailError || undefined}
              type="email"
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={handleChange('phone')}
              fullWidth
              disabled={!editable}
            />
            <TextField
              label="Website"
              value={form.website}
              onChange={handleChange('website')}
              fullWidth
              disabled={!editable}
              error={!!websiteError}
              helperText={websiteError || undefined}
              placeholder="https://example.com"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ── Address ── */}
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Address
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, maxWidth: 700 }}>
            <TextField
              label="Street Address"
              value={form.address}
              onChange={handleChange('address')}
              fullWidth
              disabled={!editable}
              sx={{ gridColumn: { sm: '1 / -1' } }}
            />
            <TextField
              label="City"
              value={form.city}
              onChange={handleChange('city')}
              fullWidth
              disabled={!editable}
            />
            <TextField
              label="State / Province"
              value={form.state_province}
              onChange={handleChange('state_province')}
              fullWidth
              disabled={!editable}
            />
            <TextField
              label="Postal Code"
              value={form.postal_code}
              onChange={handleChange('postal_code')}
              fullWidth
              disabled={!editable}
            />
            <TextField
              label="Country"
              value={form.country}
              onChange={handleChange('country')}
              fullWidth
              disabled={!editable}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* ── Liturgical Settings ── */}
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="subtitle2" color="text.secondary">
              Liturgical Settings
            </Typography>
            {hasCrmSuggestion && editable && (
              <Tooltip title={`CRM data suggests: ${crmMatch?.jurisdiction_name || crmMatch?.jurisdiction}`}>
                <Chip
                  icon={<AutoFixHighIcon />}
                  label="Auto-fill from CRM"
                  size="small"
                  color="primary"
                  variant="outlined"
                  onClick={handleApplyCrm}
                  clickable
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
            )}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5, maxWidth: 700 }}>
            <TextField
              select
              label="Jurisdiction"
              value={form.jurisdiction_id ?? ''}
              onChange={handleJurisdictionChange}
              fullWidth
              disabled={!editable}
              helperText={
                selectedJurisdiction
                  ? `Calendar: ${selectedJurisdiction.calendar_type}`
                  : 'Select a jurisdiction to auto-set calendar type'
              }
            >
              <MenuItem value="">
                <em>Not set</em>
              </MenuItem>
              {jurisdictions.map((j) => (
                <MenuItem key={j.id} value={j.id}>
                  {j.name} ({j.abbreviation})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Calendar Type"
              value={form.calendar_type || 'Not set'}
              fullWidth
              disabled
              helperText="Determined by jurisdiction"
              InputProps={{ readOnly: true }}
            />
            <TextField
              select
              label="Preferred Language"
              value={form.preferred_language}
              onChange={handleChange('preferred_language')}
              fullWidth
              disabled={!editable}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* ── Actions ── */}
          {editable && (
            <Box display="flex" justifyContent="flex-end" gap={1.5} mt={4}>
              <Button variant="outlined" disabled={!isDirty || saving} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="contained" disabled={!isDirty || hasErrors || saving} onClick={handleSave}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          )}
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

export default AccountChurchDetailsPage;
