import React, { useState } from 'react';
import { Box, Button, Container, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { MarriageRecordForm, MarriageRecordFormData } from './MarriageRecordForm';

const initialFormData: MarriageRecordFormData = {
  groom_first_name: '',
  groom_last_name: '',
  bride_first_name: '',
  bride_last_name: '',
  marriage_date: '',
  marriage_license: '',
  groom_parents: '',
  bride_parents: '',
  officiating_priest: '',
  witnesses: '',
  notes: '',
};

export const MarriageRecordEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MarriageRecordFormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleChange = (field: keyof MarriageRecordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: Implement API call to save record
      console.log('Submitting marriage record:', formData);
      setSnackbar({ open: true, message: 'Marriage record saved successfully', severity: 'success' });
      setTimeout(() => {
        navigate('/apps/records/marriage');
      }, 1500);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save record', severity: 'error' });
    }
  };

  const handleCancel = () => {
    navigate('/apps/records/marriage');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <MarriageRecordForm
        formData={formData}
        onChange={handleChange}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} color="primary">
          Save Record
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
};
