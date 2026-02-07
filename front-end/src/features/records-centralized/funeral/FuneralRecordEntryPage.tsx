/**
 * FuneralRecordEntryPage Component
 * 
 * Form page for creating and editing funeral/death records.
 * Supports both create (new) and edit (edit/:id) modes.
 * 
 * Routes: 
 *   /apps/records/funeral/new?church_id={id}
 *   /apps/records/funeral/edit/:id?church_id={id}
 */

import React, { useState, useEffect } from 'react';
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
  Grid
} from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface FuneralRecordFormData {
  first_name: string;
  last_name: string;
  death_date: string;
  burial_date: string;
  burial_location: string;
  age_at_death: string;
  priest_name: string;
  notes: string;
}

const FuneralRecordEntryPage: React.FC = () => {
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
  
  const [formData, setFormData] = useState<FuneralRecordFormData>({
    first_name: '',
    last_name: '',
    death_date: '',
    burial_date: '',
    burial_location: '',
    age_at_death: '',
    priest_name: '',
    notes: ''
  });

  // Load record data for edit mode
  useEffect(() => {
    if (isEditMode && id && churchId) {
      const loadRecord = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const params = new URLSearchParams({ church_id: churchId });
          const response = await fetch(`/api/funeral-records/${id}?${params.toString()}`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error('Failed to load record');
          }
          
          const data = await response.json();
          if (data.success && data.record) {
            const record = data.record;
            // Map backend field names to frontend field names
            setFormData({
              first_name: record.name || '',
              last_name: record.lastname || '',
              death_date: record.deceased_date || '',
              burial_date: record.burial_date || '',
              burial_location: record.burial_location || '',
              age_at_death: record.age?.toString() || '',
              priest_name: record.clergy || '',
              notes: record.notes || ''
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

  const handleChange = (field: keyof FuneralRecordFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!churchId) {
      setError('Church ID is required');
      return;
    }
    
    // Client-side validation for required fields
    const missingFields = [];
    if (!formData.first_name?.trim()) missingFields.push('First Name');
    if (!formData.last_name?.trim()) missingFields.push('Last Name');
    if (!formData.death_date?.trim()) missingFields.push('Death Date');
    if (!formData.priest_name?.trim()) missingFields.push('Priest');
    
    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const url = isEditMode 
        ? `/api/funeral-records/${id}`
        : '/api/funeral-records';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const params = new URLSearchParams({ church_id: churchId });
      
      // Map frontend field names to backend field names
      const backendData = {
        name: formData.first_name,
        lastname: formData.last_name,
        deceased_date: formData.death_date,
        burial_date: formData.burial_date,
        burial_location: formData.burial_location,
        age: formData.age_at_death ? parseInt(formData.age_at_death) : null,
        clergy: formData.priest_name,
        church_id: parseInt(churchId)
      };
      
      console.log('Submitting funeral record:', backendData);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Funeral record submission error:', errorData);
        throw new Error(errorData.error || 'Failed to save record');
      }
      
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        // Redirect to list page after a short delay
        setTimeout(() => {
          navigate(`/apps/records/funeral?church_id=${churchId}`);
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to save record');
      }
    } catch (err: any) {
      console.error('Funeral record error:', err);
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/apps/records/funeral?church_id=${churchId}`);
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
          {isEditMode ? 'Edit Funeral Record' : 'New Funeral Record'}
        </Typography>
        
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={handleChange('first_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={handleChange('last_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Death Date"
                type="date"
                value={formData.death_date}
                onChange={handleChange('death_date')}
                required
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Burial Date"
                type="date"
                value={formData.burial_date}
                onChange={handleChange('burial_date')}
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Burial Location"
                value={formData.burial_location}
                onChange={handleChange('burial_location')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Age at Death"
                type="number"
                value={formData.age_at_death}
                onChange={handleChange('age_at_death')}
                margin="normal"
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Priest"
                value={formData.priest_name}
                onChange={handleChange('priest_name')}
                required
                margin="normal"
              />
            </Grid>
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
              {saving ? 'Saving...' : (isEditMode ? 'Update Record' : 'Create Record')}
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

export default FuneralRecordEntryPage;
