import React, { useState, useEffect, useRef } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Formik, FormikProps, Form } from 'formik';
import * as Yup from 'yup';
import { BaptismRecordForm, BaptismRecordFormData } from './BaptismRecordForm';
import { RecordFormShell } from '@/components/records/RecordFormShell';
import { createRecord } from '@/records/api';
import { RECORD_TYPES } from '@/records/constants';

const initialFormData: BaptismRecordFormData = {
  child_first_name: '',
  child_last_name: '',
  date_of_birth: '',
  place_of_birth: '',
  date_of_baptism: '',
  church: '',
  officiating_priest: '',
  father_name: '',
  mother_name: '',
  godparents: '',
  register_number: '',
  notes: '',
};

// Validation schema matching the form requirements
const validationSchema = Yup.object().shape({
  child_first_name: Yup.string().required('First name is required'),
  child_last_name: Yup.string().required('Last name is required'),
  date_of_birth: Yup.string().required('Date of birth is required'),
  date_of_baptism: Yup.string().required('Date of baptism is required'),
  church: Yup.string().required('Church is required'),
});

export const BaptismRecordEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BaptismRecordFormData>(initialFormData);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const formikRef = useRef<FormikProps<BaptismRecordFormData>>(null);

  // Mock data - replace with actual API calls or context
  const [priestOptions, setPriestOptions] = useState<Array<{ id: number | string; name: string }>>([]);
  const [churchOptions, setChurchOptions] = useState<Array<{ id: number | string; name: string }>>([]);
  const [currentChurch, setCurrentChurch] = useState<string>('');

  // Load options on mount (placeholder - replace with actual API calls)
  useEffect(() => {
    // TODO: Replace with actual API calls
    // Example:
    // fetchPriests().then(setPriestOptions);
    // fetchChurches().then(setChurchOptions);
    // getCurrentChurch().then(setCurrentChurch);
    
    // Mock data for now
    setPriestOptions([
      { id: 1, name: 'Fr. John Smith' },
      { id: 2, name: 'Fr. Michael Johnson' },
    ]);
    setChurchOptions([
      { id: 1, name: 'St. Peter and Paul Orthodox Church' },
      { id: 2, name: 'Holy Trinity Orthodox Church' },
    ]);
  }, []);

  const handleChange = (field: keyof BaptismRecordFormData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Check if there are unsaved changes
      const hasChanges = JSON.stringify(newData) !== JSON.stringify(initialFormData);
      setHasUnsavedChanges(hasChanges);
      return newData;
    });
    
    // Also update Formik if it exists
    if (formikRef.current) {
      formikRef.current.setFieldValue(field, value, false);
    }
  };

  // Transform form data to backend payload shape
  const transformToBackendPayload = (data: BaptismRecordFormData) => {
    // Map to backend field names based on constants.js
    // Backend expects: first_name, last_name, birth_date, reception_date, birthplace, 
    //                  entry_type, sponsors, parents, clergy
    return {
      first_name: data.child_first_name,
      last_name: data.child_last_name,
      birth_date: data.date_of_birth,
      reception_date: data.date_of_baptism,
      birthplace: data.place_of_birth,
      entry_type: 'Baptism', // Default to Baptism
      sponsors: data.godparents, // Already serialized as "; " separated string
      parents: data.father_name && data.mother_name 
        ? `${data.father_name} and ${data.mother_name}`
        : data.father_name || data.mother_name || '',
      clergy: data.officiating_priest,
      church: data.church,
      register_number: data.register_number,
      notes: data.notes,
    };
  };

  const handleSubmit = async () => {
    // Validate form
    if (formikRef.current) {
      const errors = await formikRef.current.validateForm();
      if (Object.keys(errors).length > 0) {
        formikRef.current.setTouched(
          Object.keys(errors).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>)
        );
        setSnackbar({ 
          open: true, 
          message: 'Please fix the validation errors before submitting', 
          severity: 'error' 
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = transformToBackendPayload(formData);
      await createRecord(RECORD_TYPES.BAPTISM, payload);
      
      setSnackbar({ 
        open: true, 
        message: 'Record saved successfully.', 
        severity: 'success' 
      });
      setHasUnsavedChanges(false);
      
      setTimeout(() => {
        navigate('/apps/records/baptism');
      }, 1500);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save record';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndAddAnother = async () => {
    // Validate form
    if (formikRef.current) {
      const errors = await formikRef.current.validateForm();
      if (Object.keys(errors).length > 0) {
        formikRef.current.setTouched(
          Object.keys(errors).reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>)
        );
        setSnackbar({ 
          open: true, 
          message: 'Please fix the validation errors before submitting', 
          severity: 'error' 
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = transformToBackendPayload(formData);
      await createRecord(RECORD_TYPES.BAPTISM, payload);
      
      setSnackbar({ 
        open: true, 
        message: 'Record saved successfully.', 
        severity: 'success' 
      });
      
      // Reset form for another entry
      setTimeout(() => {
        setFormData(initialFormData);
        setHasUnsavedChanges(false);
        if (formikRef.current) {
          formikRef.current.resetForm({ values: initialFormData });
        }
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save record';
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/apps/records/baptism');
  };

  return (
    <>
      <Formik
        innerRef={formikRef}
        initialValues={formData}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={() => {
          // Submission handled by handleSubmit
        }}
      >
        {({ setFieldValue }) => {
          // Enhanced onChange that also updates Formik
          const enhancedOnChange = (field: keyof BaptismRecordFormData, value: string) => {
            handleChange(field, value);
            setFieldValue(field, value, false);
          };

          return (
            <RecordFormShell
              title="Add New Baptism Record"
              subtitle="Enter the details of the baptism ceremony [NEW FORM SYSTEM ACTIVE]"
              showTitle={true}
              footerActions={{
                onCancel: handleCancel,
                onSave: handleSubmit,
                onSaveAndAddAnother: handleSaveAndAddAnother,
                cancelLabel: 'Cancel',
                saveLabel: 'Save Record',
                saveAndAddLabel: 'Save & Add Another',
                loading: isSubmitting,
                hasUnsavedChanges: hasUnsavedChanges,
              }}
            >
              <Form>
                <BaptismRecordForm
                  formData={formData}
                  onChange={enhancedOnChange}
                  priestOptions={priestOptions}
                  churchOptions={churchOptions}
                  currentChurch={currentChurch}
                />
              </Form>
            </RecordFormShell>
          );
        }}
      </Formik>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={12000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
        sx={{
          position: 'fixed',
          top: '50% !important',
          left: '50% !important',
          transform: 'translate(-50%, -50%) !important',
          zIndex: 10000,
          '& .MuiSnackbar-root': {
            position: 'fixed',
            top: '50% !important',
            left: '50% !important',
            transform: 'translate(-50%, -50%) !important',
          }
        }}
      >
        <Alert 
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ 
            minWidth: '400px',
            maxWidth: '600px',
            fontSize: '1.1rem',
            padding: '16px 20px',
            '& .MuiAlert-message': {
              fontSize: '1.1rem',
              fontWeight: 500,
            },
            '& .MuiAlert-icon': {
              fontSize: '28px',
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BaptismRecordEntryPage;
