import React from 'react';
import {
  TextField,
  Autocomplete,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Box,
} from '@mui/material';
import { RecordFormGrid } from '@/components/records/RecordFormGrid';

export interface BaptismRecordFormData {
  date_of_birth: string;
  date_of_baptism: string;
  record_type: string;
  child_first_name: string;
  child_last_name: string;
  place_of_birth: string;
  father_name: string;
  mother_name: string;
  godparents: string;
  officiating_priest: string;
  church: string;
  register_number: string;
  notes: string;
}

interface BaptismRecordFormProps {
  formData: BaptismRecordFormData;
  onChange: (field: keyof BaptismRecordFormData, value: string) => void;
  priestOptions?: string[];
  churchOptions?: Array<{ id: number | string; name: string }>;
  readOnly?: boolean;
}

export const BaptismRecordForm: React.FC<BaptismRecordFormProps> = ({
  formData,
  onChange,
  priestOptions = [],
  churchOptions = [],
  readOnly = false,
}) => {
  const handleChange = (field: keyof BaptismRecordFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    onChange(field, event.target.value);
  };

  const handleAutocompleteChange = (field: keyof BaptismRecordFormData) => (
    _event: React.SyntheticEvent,
    value: string | null
  ) => {
    onChange(field, value || '');
  };

  return (
    <RecordFormGrid>
        <TextField
          label="First Name"
          value={formData.child_first_name}
          onChange={handleChange('child_first_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Last Name"
          value={formData.child_last_name}
          onChange={handleChange('child_last_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="mm / dd / yyyy"
          type="date"
          value={formData.date_of_birth}
          onChange={handleChange('date_of_birth')}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="mm / dd / yyyy"
          type="date"
          value={formData.date_of_baptism}
          onChange={handleChange('date_of_baptism')}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Baptism"
          value={formData.record_type}
          onChange={handleChange('record_type')}
          fullWidth
          disabled={readOnly}
          placeholder="Baptism"
        />

        <TextField
          label="Place of Birth"
          value={formData.place_of_birth}
          onChange={handleChange('place_of_birth')}
          fullWidth
          disabled={readOnly}
        />

        <TextField
          label="Father's Name"
          value={formData.father_name}
          onChange={handleChange('father_name')}
          fullWidth
          disabled={readOnly}
        />

        <TextField
          label="Mother's Name"
          value={formData.mother_name}
          onChange={handleChange('mother_name')}
          fullWidth
          disabled={readOnly}
        />

        <TextField
          label="Godparent Names"
          value={formData.godparents}
          onChange={handleChange('godparents')}
          fullWidth
          disabled={readOnly}
          placeholder="Enter godparent names, separated by commas"
        />

        <TextField
          label="Registry Number"
          value={formData.register_number}
          onChange={handleChange('register_number')}
          fullWidth
          disabled={readOnly}
        />

        {priestOptions.length > 0 ? (
          <Autocomplete
            options={priestOptions}
            value={formData.officiating_priest || null}
            onChange={handleAutocompleteChange('officiating_priest')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select a priest..."
                disabled={readOnly}
                required
              />
            )}
            freeSolo
            fullWidth
            disabled={readOnly}
          />
        ) : (
          <TextField
            label="Select a priest..."
            value={formData.officiating_priest}
            onChange={handleChange('officiating_priest')}
            fullWidth
            disabled={readOnly}
            required
          />
        )}

        {churchOptions.length > 0 ? (
          <Autocomplete
            options={churchOptions.map(church => church.name)}
            value={formData.church || null}
            onChange={handleAutocompleteChange('church')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Church"
                disabled={readOnly}
              />
            )}
            freeSolo
            fullWidth
            disabled={readOnly}
          />
        ) : (
          <TextField
            label="Church"
            value={formData.church}
            onChange={handleChange('church')}
            fullWidth
            disabled={readOnly}
          />
        )}

        <Box sx={{ gridColumn: '1 / -1' }}>
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={5}
            disabled={readOnly}
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
      </RecordFormGrid>
  );
};
