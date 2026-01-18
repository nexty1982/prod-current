import React from 'react';
import {
  TextField,
  Autocomplete,
  Box,
} from '@mui/material';
import { RecordEntryCard } from '@/components/records/RecordEntryCard';
import { RecordEntryGrid } from '@/components/records/RecordEntryGrid';

export interface MarriageRecordFormData {
  groom_first_name: string;
  groom_last_name: string;
  bride_first_name: string;
  bride_last_name: string;
  marriage_date: string;
  marriage_license: string;
  groom_parents: string;
  bride_parents: string;
  officiating_priest: string;
  witnesses: string;
  notes: string;
}

interface MarriageRecordFormProps {
  formData: MarriageRecordFormData;
  onChange: (field: keyof MarriageRecordFormData, value: string) => void;
  priestOptions?: string[];
  headerImageSrc?: string;
  frameImageSrc?: string;
  readOnly?: boolean;
}

export const MarriageRecordForm: React.FC<MarriageRecordFormProps> = ({
  formData,
  onChange,
  priestOptions = [],
  headerImageSrc,
  frameImageSrc,
  readOnly = false,
}) => {
  const handleChange = (field: keyof MarriageRecordFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }
  ) => {
    onChange(field, event.target.value);
  };

  const handleAutocompleteChange = (field: keyof MarriageRecordFormData) => (
    _event: React.SyntheticEvent,
    value: string | null
  ) => {
    onChange(field, value || '');
  };

  return (
    <RecordEntryCard
      title="Marriage Record Entry"
      subtitle="Enter the details of the marriage ceremony"
      showTitle={false}
      headerImageSrc={headerImageSrc}
      frameImageSrc={frameImageSrc}
    >
      <RecordEntryGrid>
        <TextField
          label="Groom First Name"
          value={formData.groom_first_name}
          onChange={handleChange('groom_first_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Groom Last Name"
          value={formData.groom_last_name}
          onChange={handleChange('groom_last_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Bride First Name"
          value={formData.bride_first_name}
          onChange={handleChange('bride_first_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Bride Last Name"
          value={formData.bride_last_name}
          onChange={handleChange('bride_last_name')}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Marriage Date"
          type="date"
          value={formData.marriage_date}
          onChange={handleChange('marriage_date')}
          InputLabelProps={{ shrink: true }}
          fullWidth
          disabled={readOnly}
          required
        />

        <TextField
          label="Marriage License"
          value={formData.marriage_license}
          onChange={handleChange('marriage_license')}
          fullWidth
          disabled={readOnly}
          placeholder="License number or reference"
        />

        <TextField
          label="Groom Parents"
          value={formData.groom_parents}
          onChange={handleChange('groom_parents')}
          fullWidth
          disabled={readOnly}
          placeholder="Names of groom's parents"
        />

        <TextField
          label="Bride Parents"
          value={formData.bride_parents}
          onChange={handleChange('bride_parents')}
          fullWidth
          disabled={readOnly}
          placeholder="Names of bride's parents"
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
                required
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
            required
          />
        )}

        <TextField
          label="Witnesses"
          value={formData.witnesses}
          onChange={handleChange('witnesses')}
          fullWidth
          disabled={readOnly}
          placeholder="Names of witnesses, separated by commas"
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
