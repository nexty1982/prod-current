/**
 * Dynamic Record Form Component
 * Works with any table schema using column positions
 */

import React, { useMemo } from 'react';
import { 
  RecordsForm, 
  RecordsModal,
  useDynamicRecordMutations,
  useFormFields,
  useDynamicDropdownOptions,
} from '@/../features/records/records/useUnifiedRecords';

// Types
interface DynamicRecordFormProps {
  churchId: string;
  tableName: string;
  open: boolean;
  onClose: () => void;
  currentRecord?: any;
  onSuccess?: (record: any) => void;
  onError?: (error: string) => void;
}

export function DynamicRecordForm({
  churchId,
  tableName,
  open,
  onClose,
  currentRecord,
  onSuccess,
  onError,
}: DynamicRecordFormProps) {
  // Get form fields from table schema
  const { 
    fields, 
    isLoading: fieldsLoading, 
    error: fieldsError, 
    schema 
  } = useFormFields(churchId, tableName);

  // Mutations
  const { create, update } = useDynamicRecordMutations(churchId, tableName);
  
  // Dropdown options
  const { options: dropdownOptions, isLoading: optionsLoading } = useDynamicDropdownOptions(churchId);

  // Enhanced form fields with dropdown options
  const enhancedFields = useMemo(() => {
    if (!fields || !schema) return [];

    return fields.map(field => {
      const enhancedField = { ...field };
      
      // Add dropdown options for select fields
      if (field.type === 'select' && field.key) {
        // Try to find matching dropdown options
        const column = schema.columns.find(col => col.name === field.key);
        if (column && dropdownOptions[column.name]) {
          enhancedField.options = dropdownOptions[column.name].map((option: any) => ({
            value: option.value || option.id,
            label: option.label || option.name || option.value || option.id,
          }));
        }
      }
      
      return enhancedField;
    });
  }, [fields, schema, dropdownOptions]);

  // Initial values
  const initialValues = useMemo(() => {
    if (!currentRecord || !schema) return {};
    
    const values: any = {};
    enhancedFields.forEach(field => {
      let value = currentRecord[field.key];
      
      // Format date fields
      if (field.type === 'date' && value) {
        value = value.split('T')[0]; // Ensure YYYY-MM-DD format
      }
      
      values[field.key] = value || '';
    });
    
    return values;
  }, [currentRecord, enhancedFields, schema]);

  // Event handlers
  const handleSubmit = async (data: any) => {
    try {
      let result;
      
      if (currentRecord) {
        // Update existing record
        const recordId = currentRecord.id || currentRecord._id || currentRecord[Object.keys(currentRecord)[0]];
        result = await update.mutateAsync({
          id: recordId,
          data,
        });
      } else {
        // Create new record
        result = await create.mutateAsync(data);
      }
      
      if (result.success) {
        onSuccess?.(result.data);
        onClose();
      } else {
        onError?.(result.error || 'Failed to save record');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      onError?.(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const isEditMode = !!currentRecord;
  const isLoading = create.isPending || update.isPending || fieldsLoading || optionsLoading;

  // Loading state
  if (fieldsLoading) {
    return (
      <RecordsModal
        open={open}
        onClose={onClose}
        title="Loading Form..."
        maxWidth="md"
      >
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading form fields...</Typography>
        </Box>
      </RecordsModal>
    );
  }

  // Error state
  if (fieldsError) {
    return (
      <RecordsModal
        open={open}
        onClose={onClose}
        title="Error"
        maxWidth="md"
      >
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            Error loading form fields: {fieldsError}
          </Alert>
        </Box>
      </RecordsModal>
    );
  }

  return (
    <RecordsModal
      open={open}
      onClose={handleClose}
      title={`${isEditMode ? 'Edit' : 'Add'} ${schema?.displayName || tableName} Record`}
      maxWidth="md"
      loading={isLoading}
      error={create.error?.message || update.error?.message}
    >
      <RecordsForm
        fields={enhancedFields}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        loading={isLoading}
        error={create.error?.message || update.error?.message}
        submitLabel={isEditMode ? 'Update' : 'Create'}
        cancelLabel="Cancel"
        disabled={isLoading}
      />
    </RecordsModal>
  );
}

export default DynamicRecordForm;
