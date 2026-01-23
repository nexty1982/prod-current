import React from 'react';
import { Box } from '@mui/material';
import {
  FormTextField,
  FormDateField,
  FormSelectSearch,
  FormChipsField,
  RecordSectionCard,
} from '@/features/forms';

export interface BaptismRecordFormData {
  // Person section
  child_first_name: string;
  child_last_name: string;
  date_of_birth: string;
  place_of_birth: string;
  
  // Baptism Event section
  date_of_baptism: string;
  church: string;
  officiating_priest: string;
  
  // Family section
  father_name: string;
  mother_name: string;
  
  // Sponsors section (stored as string, managed as chips)
  godparents: string;
  
  // Registry & Notes section
  register_number: string;
  notes: string;
}

interface BaptismRecordFormProps {
  formData: BaptismRecordFormData;
  onChange: (field: keyof BaptismRecordFormData, value: string) => void;
  priestOptions?: Array<{ id: number | string; name: string }> | string[];
  churchOptions?: Array<{ id: number | string; name: string }>;
  currentChurch?: string; // Pre-selected church from app context
  readOnly?: boolean;
}


export const BaptismRecordForm: React.FC<BaptismRecordFormProps> = ({
  formData,
  onChange,
  priestOptions = [],
  churchOptions = [],
  currentChurch,
  readOnly = false,
}) => {
  // Normalize priest options
  const normalizedPriestOptions = React.useMemo(() => {
    if (priestOptions.length === 0) return [];
    return priestOptions.map((opt) =>
      typeof opt === 'string' ? { id: opt, name: opt } : opt
    );
  }, [priestOptions]);

  // Initialize church value with currentChurch if provided
  const initialChurchValue = React.useMemo(() => {
    return currentChurch || formData.church || '';
  }, [currentChurch, formData.church]);

  return (
    <>
      {/* Person Section */}
      <RecordSectionCard
        title="Person"
        helperText="Enter the personal information of the person being baptized"
      >
        <FormTextField
          name="child_first_name"
          label="First Name"
          required
          disabled={readOnly}
          placeholder="e.g., John"
        />
        <FormTextField
          name="child_last_name"
          label="Last Name"
          required
          disabled={readOnly}
          placeholder="e.g., Smith"
        />
        <FormDateField
          name="date_of_birth"
          label="Date of Birth"
          required
          disabled={readOnly}
          placeholder="MM/DD/YYYY"
        />
        <FormTextField
          name="place_of_birth"
          label="Place of Birth"
          disabled={readOnly}
          placeholder="e.g., New York, NY"
        />
      </RecordSectionCard>

      {/* Baptism Event Section */}
      <RecordSectionCard
        title="Baptism Event"
        helperText="Enter the details of the baptism ceremony"
      >
        <FormDateField
          name="date_of_baptism"
          label="Date of Baptism"
          required
          disabled={readOnly}
          placeholder="MM/DD/YYYY"
        />
        <FormSelectSearch
          name="church"
          label="Church"
          options={churchOptions}
          required
          disabled={readOnly}
          placeholder="Search or select a church..."
          defaultValue={initialChurchValue}
        />
        <FormSelectSearch
          name="officiating_priest"
          label="Priest"
          options={normalizedPriestOptions}
          required
          disabled={readOnly}
          placeholder="Search or select a priest..."
        />
      </RecordSectionCard>

      {/* Family Section */}
      <RecordSectionCard
        title="Family"
        helperText="Enter the names of the parents"
      >
        <FormTextField
          name="father_name"
          label="Father's Name"
          disabled={readOnly}
          placeholder="e.g., John Smith"
        />
        <FormTextField
          name="mother_name"
          label="Mother's Name"
          disabled={readOnly}
          placeholder="e.g., Jane Smith"
        />
      </RecordSectionCard>

      {/* Sponsors Section */}
      <RecordSectionCard
        title="Sponsors"
        helperText="Enter the names of the godparents (press Enter or comma to add each name)"
      >
        <FormChipsField
          name="godparents"
          label="Godparent Names"
          disabled={readOnly}
          placeholder="Type a name and press Enter or comma"
          serializeFormat={(chips) => chips.join('; ')}
        />
      </RecordSectionCard>

      {/* Registry & Notes Section */}
      <RecordSectionCard
        title="Registry & Notes"
        helperText="Enter registry information and any additional notes"
      >
        <FormTextField
          name="register_number"
          label="Registry Number"
          disabled={readOnly}
          placeholder="e.g., 2024-001"
        />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <FormTextField
            name="notes"
            label="Notes"
            disabled={readOnly}
            multiline
            rows={5}
            placeholder="Additional notes or comments"
            sx={{
              '& .MuiOutlinedInput-root': {
                height: 'auto',
                minHeight: '140px',
                alignItems: 'flex-start',
                '& textarea': {
                  paddingTop: '14px',
                  paddingBottom: '14px',
                },
              },
            }}
          />
        </Box>
      </RecordSectionCard>
    </>
  );
};
