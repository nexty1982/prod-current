/**
 * BaptismRecordEntryPage Component
 *
 * Form page for creating and editing baptism records.
 * Supports both create (new) and edit (edit/:id) modes.
 *
 * Routes:
 *   /portal/records/baptism/new?church_id={id}
 *   /portal/records/baptism/edit/:id?church_id={id}
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Grid,
  Autocomplete,
  MenuItem,
} from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';
import LookupService, { LookupItem } from '../../../shared/lib/lookupService';

// ─── Orthodox Pascha calculation (Julian → Gregorian) ────────
function calculatePascha(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const julianDate = new Date(year, month - 1, day);
  return new Date(julianDate.getTime() + 13 * 24 * 60 * 60 * 1000);
}

/**
 * Check whether a date falls on a day when baptisms are forbidden.
 * Returns null if allowed, or a description string if restricted.
 */
function getBaptismDateRestriction(dateStr: string): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return null;

  const month = d.getMonth() + 1; // 1-based
  const day = d.getDate();
  const year = d.getFullYear();

  // Fixed dates (Gregorian / New Calendar)
  if ((month === 12 && day >= 25) || (month === 1 && day <= 6)) {
    return 'Baptisms are not permitted during the Christmas to Theophany period (Dec 25 – Jan 6).';
  }
  if (month === 9 && day === 14) return 'Baptisms are not permitted on the Elevation of the Cross (Sep 14).';
  if (month === 2 && day === 2) return 'Baptisms are not permitted on the Presentation of Christ in the Temple (Feb 2).';
  if (month === 3 && day === 25) return 'Baptisms are not permitted on the Annunciation (Mar 25).';
  if (month === 8 && day === 6) return 'Baptisms are not permitted on the Transfiguration (Aug 6).';
  if (month === 8 && day >= 1 && day <= 14) return 'Baptisms are not permitted during the Dormition Fast (Aug 1–14).';

  // Moveable dates — depend on Pascha
  const pascha = calculatePascha(year);
  const pMs = pascha.getTime();
  const dMs = d.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Also check Jan dates against previous year's Pascha
  const diffDays = Math.round((dMs - pMs) / dayMs);

  // Palm Sunday (Pascha - 7)
  if (diffDays === -7) return 'Baptisms are not permitted on Palm Sunday.';
  // Holy Week (Pascha - 6 through Pascha - 1)
  if (diffDays >= -6 && diffDays <= -1) return 'Baptisms are not permitted during Holy Week.';
  // Pascha itself
  if (diffDays === 0) return 'Baptisms are not permitted on Pascha (Easter).';
  // Ascension (Pascha + 39)
  if (diffDays === 39) return 'Baptisms are not permitted on the Ascension.';
  // Pentecost (Pascha + 49)
  if (diffDays === 49) return 'Baptisms are not permitted on Pentecost.';

  return null;
}

// ─── Required fields ─────────────────────────────────────────
const REQUIRED_FIELDS: (keyof BaptismRecordFormData)[] = [
  'first_name',
  'last_name',
  'birth_date',
  'reception_date',
  'clergy',
  'entry_type',
];

interface BaptismRecordFormData {
  first_name: string;
  last_name: string;
  birth_date: string;
  reception_date: string;
  clergy: string;
  birthplace: string;
  parents: string;
  sponsors: string;
  entry_type: string;
  notes: string;
}

const BaptismRecordEntryPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isEditMode = !!id;
  const churchId = searchParams.get('church_id') || user?.church_id?.toString() || '';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Clergy dropdown state
  const [clergyOptions, setClergyOptions] = useState<string[]>([]);
  const [clergyLoading, setClergyLoading] = useState(false);

  const [formData, setFormData] = useState<BaptismRecordFormData>({
    first_name: '',
    last_name: '',
    birth_date: '',
    reception_date: '',
    clergy: '',
    birthplace: '',
    parents: '',
    sponsors: '',
    entry_type: 'Baptism',
    notes: '',
  });

  // Load clergy options
  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    const fetchClergy = async () => {
      setClergyLoading(true);
      try {
        const res = await LookupService.getClergy({ churchId, recordType: 'baptism' });
        if (!cancelled) {
          setClergyOptions(res.items.map((item: LookupItem) => item.label));
        }
      } catch {
        // Silently fail — user can still type a name
      } finally {
        if (!cancelled) setClergyLoading(false);
      }
    };
    fetchClergy();
    return () => { cancelled = true; };
  }, [churchId]);

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);

          const params = new URLSearchParams({ church_id: churchId });
          const response = await fetch(`/api/baptism-records/${id}?${params.toString()}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            throw new Error('Failed to load record');
          }

          const data = await response.json();
          if (data.success && data.record) {
            const record = data.record;
            setFormData({
              first_name: record.first_name || '',
              last_name: record.last_name || '',
              birth_date: record.birth_date || '',
              reception_date: record.reception_date || '',
              clergy: record.clergy || '',
              birthplace: record.birthplace || '',
              parents: record.parents || '',
              sponsors: record.sponsors || '',
              entry_type: record.entry_type || 'Baptism',
              notes: record.notes || '',
            });
          }
        } catch (err: any) {
          setError(err.message || 'Failed to load record');
        } finally {
          setLoading(false);
        }
      };

      loadRecord();
    }
  }, [isEditMode, id, churchId]);

  // ─── Validation ────────────────────────────────────────────
  const dateRestriction = useMemo(
    () => getBaptismDateRestriction(formData.reception_date),
    [formData.reception_date],
  );

  const dateBeforeBirth = useMemo(() => {
    if (!formData.birth_date || !formData.reception_date) return false;
    return formData.reception_date < formData.birth_date;
  }, [formData.birth_date, formData.reception_date]);

  const isFieldError = (field: keyof BaptismRecordFormData) => {
    if (!REQUIRED_FIELDS.includes(field)) return false;
    const show = submitAttempted || touched.has(field);
    return show && !formData[field].trim();
  };

  const handleChange = (field: keyof BaptismRecordFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => new Set(prev).add(field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!churchId) {
      setError('Church ID is required');
      return;
    }

    // Required field validation
    const missingFields = REQUIRED_FIELDS.filter((f) => !formData[f].trim());
    if (missingFields.length > 0) {
      setError('Please fill in all required fields.');
      return;
    }

    // Date validation
    if (dateBeforeBirth) {
      setError('Reception date cannot be before birth date.');
      return;
    }

    // Baptism date restriction — hard block for new records only
    if (!isEditMode && dateRestriction) {
      setError(dateRestriction);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const url = isEditMode ? `/api/baptism-records/${id}` : '/api/baptism-records';
      const method = isEditMode ? 'PUT' : 'POST';
      const params = new URLSearchParams({ church_id: churchId });

      const response = await fetch(`${url}?${params.toString()}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, church_id: parseInt(churchId) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save record');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate(`/portal/records/baptism?church_id=${churchId}`);
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to save record');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/portal/records/baptism?church_id=${churchId}`);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Baptism Record' : 'New Baptism Record'}
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          Fields marked in <strong style={{ color: '#d32f2f' }}>red</strong> are required.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Record {isEditMode ? 'updated' : 'created'} successfully. Redirecting...
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* First Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                onBlur={handleBlur('first_name')}
                required
                error={isFieldError('first_name')}
                helperText={isFieldError('first_name') ? 'This field is required' : ''}
                margin="normal"
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={handleChange('last_name')}
                onBlur={handleBlur('last_name')}
                required
                error={isFieldError('last_name')}
                helperText={isFieldError('last_name') ? 'This field is required' : ''}
                margin="normal"
              />
            </Grid>

            {/* Birth Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birth Date"
                type="date"
                value={formData.birth_date}
                onChange={handleChange('birth_date')}
                onBlur={handleBlur('birth_date')}
                InputLabelProps={{ shrink: true }}
                required
                error={isFieldError('birth_date')}
                helperText={isFieldError('birth_date') ? 'This field is required' : ''}
                margin="normal"
              />
            </Grid>

            {/* Reception Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Reception Date (Baptism Date)"
                type="date"
                value={formData.reception_date}
                onChange={handleChange('reception_date')}
                onBlur={handleBlur('reception_date')}
                InputLabelProps={{ shrink: true }}
                required
                error={isFieldError('reception_date') || dateBeforeBirth || (!isEditMode && !!dateRestriction)}
                helperText={
                  isFieldError('reception_date')
                    ? 'This field is required'
                    : dateBeforeBirth
                      ? 'Baptism date cannot be before birth date'
                      : ''
                }
                margin="normal"
              />
              {dateRestriction && (
                <Alert
                  severity={isEditMode ? 'warning' : 'error'}
                  sx={{ mt: 0.5 }}
                >
                  {dateRestriction}
                  {isEditMode && ' This is allowed in edit mode for historical records.'}
                </Alert>
              )}
            </Grid>

            {/* Clergy — Autocomplete dropdown */}
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={clergyOptions}
                loading={clergyLoading}
                value={formData.clergy}
                onInputChange={(_e, value) => {
                  setFormData((prev) => ({ ...prev, clergy: value }));
                  setError(null);
                  setSuccess(false);
                }}
                onBlur={handleBlur('clergy')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Clergy"
                    required
                    error={isFieldError('clergy')}
                    helperText={isFieldError('clergy') ? 'This field is required' : ''}
                    margin="normal"
                  />
                )}
              />
            </Grid>

            {/* Entry Type — Select dropdown */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Entry Type"
                value={formData.entry_type}
                onChange={handleChange('entry_type')}
                onBlur={handleBlur('entry_type')}
                required
                error={isFieldError('entry_type')}
                helperText={isFieldError('entry_type') ? 'This field is required' : ''}
                margin="normal"
              >
                <MenuItem value="Baptism">Baptism</MenuItem>
                <MenuItem value="Chrismation">Chrismation</MenuItem>
              </TextField>
            </Grid>

            {/* Birthplace */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birthplace"
                value={formData.birthplace}
                onChange={handleChange('birthplace')}
                margin="normal"
              />
            </Grid>

            {/* Parents */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Parents"
                value={formData.parents}
                onChange={handleChange('parents')}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>

            {/* Sponsors */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sponsors (Godparents)"
                value={formData.sponsors}
                onChange={handleChange('sponsors')}
                margin="normal"
                multiline
                rows={2}
              />
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                margin="normal"
                multiline
                rows={4}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<IconCheck size={18} />}
              disabled={saving}
            >
              {saving ? 'Saving...' : isEditMode ? 'Update Record' : 'Create Record'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              startIcon={<IconX size={18} />}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
};

export default BaptismRecordEntryPage;
