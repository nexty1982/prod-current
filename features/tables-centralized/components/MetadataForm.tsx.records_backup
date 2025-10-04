import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Button,
  Stack,
  Autocomplete,
  Alert
} from '@mui/material';
import { MetadataFormData } from './types';

interface MetadataFormProps {
  formData: MetadataFormData;
  onFormChange: (data: MetadataFormData) => void;
  onSave: () => void;
  isSaving: boolean;
  onGenerateCode?: () => void;
  canGenerateCode?: boolean;
}

const MetadataForm: React.FC<MetadataFormProps> = ({
  formData,
  onFormChange,
  onSave,
  isSaving,
  onGenerateCode,
  canGenerateCode
}) => {
  // Sample data for dropdowns
  const sampleRoutes = [
    '/records/baptism',
    '/records/marriage',
    '/records/death',
    '/admin/users',
    '/admin/settings',
    '/dashboard',
    '/reports',
    '/calendar'
  ];

  const sampleTables = [
    'baptism_records',
    'marriage_records',
    'death_records',
    'users',
    'churches',
    'parishes',
    'events',
    'reports'
  ];

  const sampleRoles = [
    'user',
    'priest',
    'admin',
    'super_admin',
    'moderator',
    'viewer'
  ];

  const handleChange = (field: keyof MetadataFormData, value: any) => {
    onFormChange({
      ...formData,
      [field]: value
    });
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom>
          Component Metadata
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Component Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
            required
            helperText="Enter a descriptive name for this component"
          />

          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            fullWidth
            multiline
            rows={3}
            helperText="Describe the purpose and functionality of this component"
          />

          <Autocomplete
            options={sampleRoutes}
            value={formData.route}
            onChange={(_, newValue) => handleChange('route', newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="API Route"
                required
                helperText="Select or enter the API endpoint this component will use"
              />
            )}
            freeSolo
          />

          <Autocomplete
            options={sampleTables}
            value={formData.dbTable}
            onChange={(_, newValue) => handleChange('dbTable', newValue || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Database Table"
                required
                helperText="Select or enter the database table this component will interact with"
              />
            )}
            freeSolo
          />

          <FormControl fullWidth>
            <InputLabel>Size</InputLabel>
            <Select
              value={formData.size}
              onChange={(e) => handleChange('size', e.target.value)}
              label="Size"
            >
              <MenuItem value="small">Small</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="large">Large</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            multiple
            options={sampleRoles}
            value={formData.roles}
            onChange={(_, newValue) => handleChange('roles', newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Access Roles"
                required
                helperText="Select which user roles can access this component"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  size="small"
                />
              ))
            }
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Auto-generated metadata:</strong> This form will automatically generate component metadata including creation timestamp, user info, and validation rules.
            </Typography>
          </Alert>

          <Button
            variant="contained"
            onClick={onSave}
            disabled={isSaving || !formData.name || !formData.route || !formData.dbTable || formData.roles.length === 0}
            sx={{ mt: 2 }}
          >
            {isSaving ? 'Saving...' : 'Save Component'}
          </Button>

          {onGenerateCode && canGenerateCode && (
            <Button
              variant="outlined"
              onClick={onGenerateCode}
              disabled={isSaving || !formData.name || !formData.route || !formData.dbTable || formData.roles.length === 0}
              sx={{ mt: 1 }}
            >
              Generate Code
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MetadataForm; 