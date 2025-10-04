/**
 * Unified Record Form Component
 * Demonstrates how to use the new shared components to replace the existing RecordFormModal
 */

import React, { useMemo } from 'react';
import { RecordsForm } from './RecordsForm';
import { 
   
  FormField, 
  
  useUnifiedRecordMutations,
  useDropdownOptions,
} from '@/features/records-centralized/shared/ui/legacy/../features/records/records/useUnifiedRecords';
import { RecordsModal } from '@/ui/shared/ui/legacy/base/RecordsModal';
import { FIELD_DEFINITIONS, RECORD_TYPES } from '@/constants';

// Types
interface UnifiedRecordFormProps {
  recordType: string;
  churchId: string;
  open: boolean;
  onClose: () => void;
  currentRecord?: any;
  onSuccess?: (record: any) => void;
  onError?: (error: string) => void;
}

export function UnifiedRecordForm({
  recordType,
  churchId,
  open,
  onClose,
  currentRecord,
  onSuccess,
  onError,
}: UnifiedRecordFormProps) {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return null;
  }

  // Mutations
  const { create, update } = useUnifiedRecordMutations(churchId, recordType);
  
  // Dropdown options
  const { options: dropdownOptions, isLoading: optionsLoading } = useDropdownOptions(churchId);

  // Form fields configuration
  const fields: FormField[] = useMemo(() => {
    const formFields = fieldDefs.fields || [];
    
    return formFields.map(field => ({
      key: field.name,
      label: field.label,
      type: getFieldType(field.type),
      required: field.required,
      placeholder: field.placeholder,
      options: getFieldOptions(field, dropdownOptions),
      gridSize: { xs: 12, sm: 6, md: 4 },
      helperText: field.helperText,
      validation: field.validation,
    }));
  }, [fieldDefs.fields, dropdownOptions]);

  // Initial values
  const initialValues = useMemo(() => {
    if (!currentRecord) return {};
    
    const values: any = {};
    fields.forEach(field => {
      let value = currentRecord[field.key];
      
      // Format date fields
      if (field.type === 'date' && value) {
        value = value.split('T')[0]; // Ensure YYYY-MM-DD format
      }
      
      values[field.key] = value || '';
    });
    
    return values;
  }, [currentRecord, fields]);

  // Event handlers
  const handleSubmit = async (data: any) => {
    try {
      let result;
      
      if (currentRecord) {
        // Update existing record
        result = await update.mutateAsync({
          id: currentRecord.id || currentRecord._id,
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

  // Utility functions
  function getFieldType(fieldType: string): FormField['type'] {
    switch (fieldType) {
      case 'email':
        return 'email';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'select':
        return 'select';
      case 'multiselect':
        return 'multiselect';
      case 'textarea':
        return 'textarea';
      case 'switch':
        return 'switch';
      case 'checkbox':
        return 'checkbox';
      case 'radio':
        return 'radio';
      default:
        return 'text';
    }
  }

  function getFieldOptions(field: any, dropdownOptions: any): Array<{ value: any; label: string }> {
    // If field has predefined options
    if (field.options) {
      return field.options;
    }
    
    // If field uses dropdown options
    if (field.optionsSource && dropdownOptions[field.optionsSource]) {
      return dropdownOptions[field.optionsSource].map((option: any) => ({
        value: option.value || option.id,
        label: option.label || option.name || option.value || option.id,
      }));
    }
    
    // Default options for common fields
    switch (field.name) {
      case 'status':
        return [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' },
        ];
      case 'priority':
        return [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ];
      default:
        return [];
    }
  }

  const isEditMode = !!currentRecord;
  const isLoading = create.isPending || update.isPending || optionsLoading;

  return (
    <RecordsModal
      open={open}
      onClose={handleClose}
      title={`${isEditMode ? 'Edit' : 'Add'} ${fieldDefs.displayName || recordType} Record`}
      maxWidth="md"
      loading={isLoading}
      error={create.error?.message || update.error?.message}
    >
      <RecordsForm
        fields={fields}
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

export default UnifiedRecordForm;
