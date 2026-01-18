import React, { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BaptismRecordForm, BaptismRecordFormData } from './BaptismRecordForm';
import { RecordFormShell } from '@/components/records/RecordFormShell';

const initialFormData: BaptismRecordFormData = {
  date_of_birth: '',
  date_of_baptism: '',
  record_type: 'Baptism',
  child_first_name: '',
  child_last_name: '',
  place_of_birth: '',
  father_name: '',
  mother_name: '',
  godparents: '',
  officiating_priest: '',
  church: '',
  register_number: '',
  notes: '',
};

export const BaptismRecordEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BaptismRecordFormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleChange = (field: keyof BaptismRecordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      // TODO: Implement API call to save record
      console.log('Submitting baptism record:', formData);
      setSnackbar({ open: true, message: 'Baptism record saved successfully', severity: 'success' });
      setTimeout(() => {
        navigate('/apps/records/baptism');
      }, 1500);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save record', severity: 'error' });
    }
  };

  const handleSaveAndAddAnother = async () => {
    try {
      // TODO: Implement API call to save record
      console.log('Submitting baptism record:', formData);
      setSnackbar({ open: true, message: 'Baptism record saved successfully', severity: 'success' });
      // Reset form for another entry
      setTimeout(() => {
        setFormData(initialFormData);
      }, 500);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to save record', severity: 'error' });
    }
  };

  const handleCancel = () => {
    navigate('/apps/records/baptism');
  };

  return (
    <>
      <RecordFormShell
        title="Baptism Record Entry"
        subtitle="Enter the details of the baptism ceremony"
        showTitle={false}
        footerActions={{
          onCancel: handleCancel,
          onSave: handleSubmit,
          onSaveAndAddAnother: handleSaveAndAddAnother,
          cancelLabel: 'Cancel',
          saveLabel: 'Save Record',
          saveAndAddLabel: 'Save & Add Another',
        }}
      >
        <BaptismRecordForm
          formData={formData}
          onChange={handleChange}
        />
      </RecordFormShell>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};
