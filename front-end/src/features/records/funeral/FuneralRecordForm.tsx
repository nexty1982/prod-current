import React from 'react';
import {
  TextField,
  Autocomplete,
  Box,
} from '@mui/material';
import { RecordEntryCard } from '@/components/records/RecordEntryCard';
import { RecordEntryGrid } from '@/components/records/RecordEntryGrid';

export interface FuneralRecordFormData {
  deceased_first_name: string;
  deceased_last_name: string;
  date_of_death: string;
  burial_date: string;
  age: string;
  cause_of_death: string;
  place_of_burial: string;
  officiating_priest: string;
  next_of_kin: string;
  notes: string;
}

interface FuneralRecordFormProps {
  formData: FuneralRecordFormData;
  onChange: (field: keyof FuneralRecordFormData, value: string) => void;
  priestOptions?: string[];
  headerImageSrc?: string;
  frameImageSrc?: string;
  readOnly?: boolean;
}

export const FuneralRecordForm: React.FC<FuneralRecordFormProps> = ({
  formData,
  onChange,
  priestOptions = [],
  headerImageSrc,
  frameImageSrc,
  readOnly = false,
}) => {
  const handleChange = (field: keyof FuneralRecordFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    onChange(field, event.target.value);
  };

  const handleAutocompleteChange = (field: keyof FuneralRecordFormData) => (
    _event: React.SyntheticEvent,
    value: string | null
  ) => {
    onChange(field, value || '');
  };

  return (
    <RecordEntryCard
      title="Funeral Record Entry"
      subtitle="Enter the details of the funeral service"
      headerImageSrc={headerImageSrc}
      frameImageSrc={frameImageSrc}
    >
      <RecordEntryGrid>
        <TextField
          label="Deceased First Name"
          value={formData.deceased_first_name}
          onChange={handleChange('deceased_first_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Deceased Last Name"
          value={formData.deceased_last_name}
          onChange={handleChange('deceased_last_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Date of Death"
          type="date"
          value={formData.date_of_death}
          onChange={handleChange('date_of_death')}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Burial Date"
          type="date"
          value={formData.burial_date}
          onChange={handleChange('burial_date')}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled={readOnly}
        />

        <TextField
          label="Age"
          type="number"
          value={formData.age}
          onChange={handleChange('age')}
          fullWidth
          disabled={readOnly}
          inputProps={{ min: 0, max: 150 }}
        />

        <TextField
          label="Cause of Death"
          value={formData.cause_of_death}
          onChange={handleChange('cause_of_death')}
          fullWidth
          disabled={readOnly}
        />

        <TextField
          label="Place of Burial"
          value={formData.place_of_burial}
          onChange={handleChange('place_of_burial')}
          fullWidth
          disabled={readOnly}
          placeholder="Cemetery or burial location"
        />

        {priestOptions.length > 0 ? (
          <Autocomplete
            options={priestOptions}
            value={formData.officiating_priest}
            onChange={handleAutocompleteChange('officiating_priest')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Officiating Priest"
                disabled={readOnly}
              />
            )}
            freeSolo
            fullWidth
            disabled={readOnly}
          />
        ) : (
          <TextField
            label="Officiating Priest"
            value={formData.officiating_priest}
            onChange={handleChange('officiating_priest')}
            fullWidth
            disabled={readOnly}
          />
        )}

        <TextField
          label="Next of Kin"
          value={formData.next_of_kin}
          onChange={handleChange('next_of_kin')}
          fullWidth
          disabled={readOnly}
          placeholder="Name and relationship of next of kin"
        />

        <Box sx={{ gridColumn: '1 / -1' }}>
          <TextField
            label="Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={4}
            disabled={readOnly}
            placeholder="Additional notes or comments"
          />
        </Box>
      </RecordEntryGrid>
    </RecordEntryCard>
  );
};
