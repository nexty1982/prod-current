import React from 'react';
import { Box, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete } from '@mui/material';

interface FormData {
  // Baptism fields
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  dateOfBaptism?: string;
  placeOfBirth?: string;
  entry_type?: string;
  fatherName?: string;
  motherName?: string;
  godparentNames?: string;
  priest?: string;
  registryNumber?: string;
  churchId?: string | number;
  notes?: string;
  customPriest?: boolean;
  
  // Marriage fields
  fname_groom?: string;
  lname_groom?: string;
  fname_bride?: string;
  lname_bride?: string;
  mdate?: string;
  parentsg?: string;
  parentsb?: string;
  witness?: string;
  mlicense?: string;
  clergy?: string;
  
  // Funeral fields
  dateOfBirth?: string; // Added for age calculation
  dateOfDeath?: string;
  burialDate?: string;
  age?: string;
  burialLocation?: string;
}

interface ImageBasedRecordFormProps {
  recordType: 'baptism' | 'marriage' | 'funeral';
  formData: FormData;
  setFormData: (updater: (prev: FormData) => FormData) => void;
  viewingRecord?: any;
  priestOptions: string[];
  churches: Array<{ id: number; church_name: string }>;
  burialLocationOptions?: string[]; // Options for burial location autocomplete
}

const ImageBasedRecordForm: React.FC<ImageBasedRecordFormProps> = ({
  recordType,
  formData,
  setFormData,
  viewingRecord,
  priestOptions,
  churches,
  burialLocationOptions = [],
}) => {
  // Removed getImagePath - no longer using background images
  // Removed age calculation - age is now entered manually

  // Helper function to auto-capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: string } }) => {
    let value = e.target.value;
    
    // Apply auto-capitalization for text fields (not for dates, numbers, or selects)
    const textFields = ['firstName', 'lastName', 'placeOfBirth', 'fatherName', 'motherName', 'godparentNames', 'registryNumber', 'notes', 
                        'fname_groom', 'lname_groom', 'fname_bride', 'lname_bride', 'parentsg', 'parentsb', 'witness', 'mlicense',
                        'burialLocation'];
    
    if (textFields.includes(field) && value.length > 0) {
      // Capitalize first letter of each word
      value = capitalizeWords(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof FormData) => (e: any) => {
    const value = e.target.value;
    if (field === 'priest' || field === 'clergy') {
      if (value === 'custom') {
        setFormData(prev => ({ ...prev, [field]: '', customPriest: true }));
      } else {
        setFormData(prev => ({ ...prev, [field]: value, customPriest: false }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderBaptismForm = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        pt: 1,
      }}
    >
      {/* Form fields in normal grid layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2.5,
          '& .MuiTextField-root': {
            '& .MuiInputLabel-root': {
              transform: 'translate(14px, 16px) scale(1)',
              '&.MuiInputLabel-shrink': {
                transform: 'translate(14px, -9px) scale(0.75)',
              },
            },
          },
        }}
      >
        {/* First Name and Last Name - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.firstName || ''}
          onChange={handleInputChange('firstName')}
          label="First Name"
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.lastName || ''}
          onChange={handleInputChange('lastName')}
          label="Last Name"
          fullWidth
          required
        />

        {/* Date of Birth and Date of Baptism - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          type="date"
          value={formData.dateOfBirth || ''}
          onChange={handleInputChange('dateOfBirth')}
          label="Date of Birth"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Cannot select future dates
          }}
          sx={{
            '& input[type="date"]::-webkit-calendar-picker-indicator': {
              opacity: 1,
              cursor: 'pointer',
              width: '20px',
              height: '20px',
            },
            '& input[type="date"]::-webkit-inner-spin-button': {
              display: 'none',
            },
            '& input[type="date"]::-webkit-outer-spin-button': {
              display: 'none',
            },
          }}
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          type="date"
          value={formData.dateOfBaptism || ''}
          onChange={handleInputChange('dateOfBaptism')}
          label="Date of Baptism"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Cannot select future dates
          }}
          sx={{
            '& input[type="date"]::-webkit-calendar-picker-indicator': {
              opacity: 1,
              cursor: 'pointer',
              width: '20px',
              height: '20px',
            },
            '& input[type="date"]::-webkit-inner-spin-button': {
              display: 'none',
            },
            '& input[type="date"]::-webkit-outer-spin-button': {
              display: 'none',
            },
          }}
          fullWidth
          required
        />

        {/* Entry Type - REQUIRED and Place of Birth - NOT REQUIRED */}
        <FormControl disabled={!!viewingRecord} fullWidth required>
          <InputLabel>Entry Type</InputLabel>
          <Select
            value={formData.entry_type || 'Baptism'}
            onChange={handleSelectChange('entry_type')}
            label="Entry Type"
          >
            <MenuItem value="Baptism">Baptism</MenuItem>
            <MenuItem value="Chrismation">Chrismation</MenuItem>
          </Select>
        </FormControl>
        <TextField
          disabled={!!viewingRecord}
          value={formData.placeOfBirth || ''}
          onChange={handleInputChange('placeOfBirth')}
          label="Place of Birth"
          fullWidth
        />

        {/* Father's Name and Mother's Name - NOT REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.fatherName || ''}
          onChange={handleInputChange('fatherName')}
          label="Father's Name"
          fullWidth
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.motherName || ''}
          onChange={handleInputChange('motherName')}
          label="Mother's Name"
          fullWidth
        />

        {/* Godparent Names - NOT REQUIRED and Priest - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.godparentNames || ''}
          onChange={handleInputChange('godparentNames')}
          label="Godparent Names"
          fullWidth
        />
        <FormControl disabled={!!viewingRecord} fullWidth required>
          <InputLabel>Priest</InputLabel>
          <Select
            value={formData.priest || ''}
            onChange={handleSelectChange('priest')}
            label="Priest"
            displayEmpty
          >
            <MenuItem value="">
              <em>Select a priest...</em>
            </MenuItem>
            {priestOptions.map((priest) => (
              <MenuItem key={priest} value={priest}>
                {priest}
              </MenuItem>
            ))}
            <MenuItem value="custom">
              <em>Other (enter manually)...</em>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Custom Priest Input - REQUIRED if custom selected */}
        {formData.customPriest && (
          <TextField
            disabled={!!viewingRecord}
            value={formData.priest || ''}
            onChange={handleInputChange('priest')}
            label="Enter Priest Name"
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />
        )}

        {/* Registry Number - NOT REQUIRED and Church - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.registryNumber || ''}
          onChange={handleInputChange('registryNumber')}
          label="Registry Number"
          fullWidth
        />
        <FormControl disabled={!!viewingRecord} fullWidth required>
          <InputLabel>Church</InputLabel>
          <Select
            value={formData.churchId || ''}
            onChange={handleSelectChange('churchId')}
            label="Church"
            displayEmpty
          >
            {churches.filter(c => c.id !== 0).map((church) => (
              <MenuItem key={church.id} value={church.id}>
                {church.church_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Notes field - spans full width */}
        <TextField
          disabled={!!viewingRecord}
          multiline
          rows={4}
          value={formData.notes || ''}
          onChange={handleInputChange('notes')}
          label="Notes"
          fullWidth
          sx={{ gridColumn: '1 / -1' }}
        />
      </Box>
    </Box>
  );

  const renderMarriageForm = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        pt: 1,
      }}
    >
      {/* Form fields in normal grid layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2.5,
          '& .MuiTextField-root': {
            '& .MuiInputLabel-root': {
              transform: 'translate(14px, 16px) scale(1)',
              '&.MuiInputLabel-shrink': {
                transform: 'translate(14px, -9px) scale(0.75)',
              },
            },
          },
        }}
      >
        {/* Groom First Name and Last Name - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.fname_groom || ''}
          onChange={handleInputChange('fname_groom')}
          label="Groom First Name"
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.lname_groom || ''}
          onChange={handleInputChange('lname_groom')}
          label="Groom Last Name"
          fullWidth
          required
        />

        {/* Bride First Name and Last Name - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.fname_bride || ''}
          onChange={handleInputChange('fname_bride')}
          label="Bride First Name"
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.lname_bride || ''}
          onChange={handleInputChange('lname_bride')}
          label="Bride Last Name"
          fullWidth
          required
        />

        {/* Marriage Date - REQUIRED and License - NOT REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          type="date"
          value={formData.mdate || ''}
          onChange={handleInputChange('mdate')}
          label="Marriage Date"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Cannot select future dates
            style: { 
              WebkitAppearance: 'none',
              MozAppearance: 'textfield'
            }
          }}
          sx={{
            '& input[type="date"]::-webkit-calendar-picker-indicator': {
              opacity: 1,
              cursor: 'pointer',
              width: '20px',
              height: '20px',
              marginRight: '4px',
            },
            '& input[type="date"]::-webkit-inner-spin-button': {
              display: 'none',
            },
            '& input[type="date"]::-webkit-outer-spin-button': {
              display: 'none',
            },
            '& input[type="date"]': {
              paddingRight: '8px',
            },
          }}
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.mlicense || ''}
          onChange={handleInputChange('mlicense')}
          label="Marriage License"
          fullWidth
        />

        {/* Groom's Parents and Bride's Parents - NOT REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.parentsg || ''}
          onChange={handleInputChange('parentsg')}
          label="Groom's Parents"
          fullWidth
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.parentsb || ''}
          onChange={handleInputChange('parentsb')}
          label="Bride's Parents"
          fullWidth
        />

        {/* Witnesses - REQUIRED, spans full width */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.witness || ''}
          onChange={handleInputChange('witness')}
          label="Witnesses"
          fullWidth
          required
          sx={{ gridColumn: '1 / -1' }}
        />

        {/* Priest - REQUIRED */}
        <FormControl disabled={!!viewingRecord} fullWidth required sx={{ gridColumn: '1 / -1' }}>
          <InputLabel>Priest</InputLabel>
          <Select
            value={formData.clergy || formData.priest || ''}
            onChange={handleSelectChange('clergy')}
            label="Priest"
            displayEmpty
          >
            <MenuItem value="">
              <em>Select a priest...</em>
            </MenuItem>
            {priestOptions.map((priest) => (
              <MenuItem key={priest} value={priest}>
                {priest}
              </MenuItem>
            ))}
            <MenuItem value="custom">
              <em>Other (enter manually)...</em>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Custom Priest Input - REQUIRED if custom selected */}
        {formData.customPriest && (
          <TextField
            disabled={!!viewingRecord}
            value={formData.clergy || formData.priest || ''}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, clergy: e.target.value, priest: e.target.value }));
            }}
            label="Enter Priest Name"
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />
        )}
      </Box>
    </Box>
  );

  const renderFuneralForm = () => (
    <Box
      sx={{
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        pt: 1,
      }}
    >
      {/* Form fields in normal grid layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2.5,
          '& .MuiTextField-root': {
            '& .MuiInputLabel-root': {
              transform: 'translate(14px, 16px) scale(1)',
              '&.MuiInputLabel-shrink': {
                transform: 'translate(14px, -9px) scale(0.75)',
              },
            },
          },
        }}
      >
        {/* First Name and Last Name - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          value={formData.firstName || ''}
          onChange={handleInputChange('firstName')}
          label="First Name"
          fullWidth
          required
        />
        <TextField
          disabled={!!viewingRecord}
          value={formData.lastName || ''}
          onChange={handleInputChange('lastName')}
          label="Last Name"
          fullWidth
          required
        />

        {/* Date of Death - NOT REQUIRED and Burial Date - REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          type="date"
          value={formData.dateOfDeath || ''}
          onChange={handleInputChange('dateOfDeath')}
          label="Date of Death"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Cannot select future dates
          }}
          sx={{
            '& input[type="date"]::-webkit-calendar-picker-indicator': {
              opacity: 1,
              cursor: 'pointer',
              width: '20px',
              height: '20px',
            },
            '& input[type="date"]::-webkit-inner-spin-button': {
              display: 'none',
            },
            '& input[type="date"]::-webkit-outer-spin-button': {
              display: 'none',
            },
          }}
          fullWidth
        />
        <TextField
          disabled={!!viewingRecord}
          type="date"
          value={formData.burialDate || ''}
          onChange={handleInputChange('burialDate')}
          label="Burial Date"
          InputLabelProps={{ shrink: true }}
          inputProps={{
            max: new Date().toISOString().split('T')[0], // Cannot select future dates
          }}
          sx={{
            '& input[type="date"]::-webkit-calendar-picker-indicator': {
              opacity: 1,
              cursor: 'pointer',
              width: '20px',
              height: '20px',
            },
            '& input[type="date"]::-webkit-inner-spin-button': {
              display: 'none',
            },
            '& input[type="date"]::-webkit-outer-spin-button': {
              display: 'none',
            },
          }}
          fullWidth
          required
        />

        {/* Age - NOT REQUIRED (manual entry) and Burial Location - NOT REQUIRED */}
        <TextField
          disabled={!!viewingRecord}
          type="number"
          value={formData.age || ''}
          onChange={handleInputChange('age')}
          label="Age"
          fullWidth
          inputProps={{ min: 0, max: 150 }}
        />
        <Autocomplete
          disabled={!!viewingRecord}
          freeSolo
          options={burialLocationOptions}
          value={formData.burialLocation || ''}
          onInputChange={(event, newValue) => {
            const capitalized = capitalizeWords(newValue);
            setFormData(prev => ({ ...prev, burialLocation: capitalized }));
          }}
          onChange={(event, newValue) => {
            const value = typeof newValue === 'string' ? newValue : newValue || '';
            const capitalized = capitalizeWords(value);
            setFormData(prev => ({ ...prev, burialLocation: capitalized }));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Burial Location"
              fullWidth
            />
          )}
        />

        {/* Priest - REQUIRED */}
        <FormControl disabled={!!viewingRecord} fullWidth required sx={{ gridColumn: '1 / -1' }}>
          <InputLabel>Priest</InputLabel>
          <Select
            value={formData.priest || ''}
            onChange={handleSelectChange('priest')}
            label="Priest"
            displayEmpty
          >
            <MenuItem value="">
              <em>Select a priest...</em>
            </MenuItem>
            {priestOptions.map((priest) => (
              <MenuItem key={priest} value={priest}>
                {priest}
              </MenuItem>
            ))}
            <MenuItem value="custom">
              <em>Other (enter manually)...</em>
            </MenuItem>
          </Select>
        </FormControl>

        {/* Custom Priest Input - REQUIRED if custom selected */}
        {formData.customPriest && (
          <TextField
            disabled={!!viewingRecord}
            value={formData.priest || ''}
            onChange={handleInputChange('priest')}
            label="Enter Priest Name"
            fullWidth
            required
            sx={{ gridColumn: '1 / -1' }}
          />
        )}
      </Box>
    </Box>
  );

  switch (recordType) {
    case 'baptism':
      return renderBaptismForm();
    case 'marriage':
      return renderMarriageForm();
    case 'funeral':
      return renderFuneralForm();
    default:
      return null;
  }
};

export default ImageBasedRecordForm;

