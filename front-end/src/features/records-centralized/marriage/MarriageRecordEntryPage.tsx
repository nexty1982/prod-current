/**
 * MarriageRecordEntryPage Component
 * 
 * Form page for creating and editing marriage records.
 * Supports both create (new) and edit (edit/:id) modes.
 * 
 * Routes: 
 *   /apps/records/marriage/new?church_id={id}
 *   /apps/records/marriage/edit/:id?church_id={id}
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
  Grid,
  Divider
} from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface MarriageRecordFormData {
  groom_first_name: string;
  groom_last_name: string;
  bride_first_name: string;
  bride_last_name: string;
  marriage_date: string;
  clergy: string;
  witnesses: string;
  marriage_place: string;
  notes: string;
}

const MarriageRecordEntryPage: React.FC = () => {
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
  
  const [formData, setFormData] = useState<MarriageRecordFormData>({
    groom_first_name: '',
    groom_last_name: '',
    bride_first_name: '',
    bride_last_name: '',
    marriage_date: '',
    clergy: '',
    witnesses: '',
    marriage_place: '',
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
          const response = await fetch(`/api/marriage-records/${id}?${params.toString()}`, {
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
              groom_first_name: record.fname_groom || '',
              groom_last_name: record.lname_groom || '',
              bride_first_name: record.fname_bride || '',
              bride_last_name: record.lname_bride || '',
              marriage_date: record.mdate || '',
              clergy: record.clergy || '',
              witnesses: record.witness || '',
              marriage_place: record.mlicense || '',
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

  const handleChange = (field: keyof MarriageRecordFormData) => (
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
    if (!formData.groom_first_name?.trim()) missingFields.push('Groom First Name');
    if (!formData.groom_last_name?.trim()) missingFields.push('Groom Last Name');
    if (!formData.bride_first_name?.trim()) missingFields.push('Bride First Name');
    if (!formData.bride_last_name?.trim()) missingFields.push('Bride Last Name');
    if (!formData.marriage_date?.trim()) missingFields.push('Marriage Date');
    if (!formData.clergy?.trim()) missingFields.push('Clergy');
    
    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      const url = isEditMode 
        ? `/api/marriage-records/${id}`
        : '/api/marriage-records';
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const params = new URLSearchParams({ church_id: churchId });
      
      // Map frontend field names to backend field names
      const backendData = {
        fname_groom: formData.groom_first_name,
        lname_groom: formData.groom_last_name,
        fname_bride: formData.bride_first_name,
        lname_bride: formData.bride_last_name,
        mdate: formData.marriage_date,
        witness: formData.witnesses,
        mlicense: formData.marriage_place,
        clergy: formData.clergy,
        church_id: parseInt(churchId)
      };
      
      console.log('Submitting marriage record:', backendData);
      
      const response = await fetch(`${url}?${params.toString()}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Marriage record submission error:', errorData);
        throw new Error(errorData.error || 'Failed to save record');
      }
      
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        // Redirect to list page after a short delay
        setTimeout(() => {
          navigate(`/apps/records/marriage?church_id=${churchId}`);
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to save record');
      }
    } catch (err: any) {
      console.error('Marriage record error:', err);
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/apps/records/marriage?church_id=${churchId}`);
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
          {isEditMode ? 'Edit Marriage Record' : 'New Marriage Record'}
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
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Groom Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Groom First Name"
                value={formData.groom_first_name}
                onChange={handleChange('groom_first_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Groom Last Name"
                value={formData.groom_last_name}
                onChange={handleChange('groom_last_name')}
                required
                margin="normal"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Bride Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bride First Name"
                value={formData.bride_first_name}
                onChange={handleChange('bride_first_name')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bride Last Name"
                value={formData.bride_last_name}
                onChange={handleChange('bride_last_name')}
                required
                margin="normal"
              />
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Marriage Details</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marriage Date"
                type="date"
                value={formData.marriage_date}
                onChange={handleChange('marriage_date')}
                required
                InputLabelProps={{ shrink: true }}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marriage Place"
                value={formData.marriage_place}
                onChange={handleChange('marriage_place')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Clergy"
                value={formData.clergy}
                onChange={handleChange('clergy')}
                required
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Witnesses"
                value={formData.witnesses}
                onChange={handleChange('witnesses')}
                margin="normal"
                multiline
                rows={2}
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

export default MarriageRecordEntryPage;
