// Add Church Page - First step in the church setup workflow
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  NavigateNext as NavigateNextIcon,
  Church as ChurchIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Types
interface ChurchFormData {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country: string;
  description_multilang: string;
  founded_year: number | '';
  preferred_language: string;
  timezone: string;
  currency: string;
  tax_id: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'el', name: 'Greek (Ελληνικά)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'ro', name: 'Romanian (Română)' },
  { code: 'sr', name: 'Serbian (Српски)' }
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/Athens',
  'Europe/Moscow',
  'Europe/Bucharest',
  'Europe/Belgrade',
  'Australia/Sydney'
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'RUB', name: 'Russian Ruble (₽)' },
  { code: 'RON', name: 'Romanian Leu (lei)' },
  { code: 'RSD', name: 'Serbian Dinar (дин.)' }
];

const COUNTRIES = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'Greece',
  'Russia',
  'Romania',
  'Serbia',
  'Other'
];

export default function AddChurchPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ChurchFormData>({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    description_multilang: '',
    founded_year: '',
    preferred_language: 'en',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_id: ''
  });

  const [errors, setErrors] = useState<Partial<ChurchFormData>>({});

  const handleInputChange = (field: keyof ChurchFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: field === 'founded_year' ? (value === '' ? '' : parseInt(value)) : value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelectChange = (field: keyof ChurchFormData) => (
    event: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ChurchFormData> = {};

    // Required fields
    if (!formData.name.trim()) newErrors.name = 'Church name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Founded year validation
    if (formData.founded_year && (formData.founded_year < 1 || formData.founded_year > new Date().getFullYear())) {
      newErrors.founded_year = 'Please enter a valid year';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      enqueueSnackbar('Please fix the errors in the form', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/churches', {
        ...formData,
        founded_year: formData.founded_year || null
      });

      if (response.data.success) {
        const { church_id, slug } = response.data;
        
        enqueueSnackbar(`Church "${formData.name}" created successfully!`, { 
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });

        // Navigate to setup wizard with the new church ID
        navigate(`/church-setup-wizard?church_id=${church_id}&slug=${slug}`);
      } else {
        throw new Error(response.data.error || 'Failed to create church');
      }
    } catch (error: any) {
      console.error('Church creation failed:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Failed to create church. Please try again.',
        { 
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <Link color="inherit" href="/churches">
          Churches
        </Link>
        <Typography color="text.primary">Add Church</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <ChurchIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">
            Add New Church
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create a new church profile. After creation, you'll proceed to the setup wizard.
          </Typography>
        </Box>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Church Name"
                      value={formData.name}
                      onChange={handleInputChange('name')}
                      error={!!errors.name}
                      helperText={errors.name}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange('email')}
                      error={!!errors.email}
                      helperText={errors.email}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange('phone')}
                      error={!!errors.phone}
                      helperText={errors.phone}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      value={formData.website}
                      onChange={handleInputChange('website')}
                      error={!!errors.website}
                      helperText={errors.website}
                      placeholder="https://example.org"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={3}
                      value={formData.description_multilang}
                      onChange={handleInputChange('description_multilang')}
                      error={!!errors.description_multilang}
                      helperText={errors.description_multilang}
                      placeholder="Brief description of the church..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Location Information */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Location Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.address}
                      onChange={handleInputChange('address')}
                      error={!!errors.address}
                      helperText={errors.address}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.city}
                      onChange={handleInputChange('city')}
                      error={!!errors.city}
                      helperText={errors.city}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="State/Province"
                      value={formData.state_province}
                      onChange={handleInputChange('state_province')}
                      error={!!errors.state_province}
                      helperText={errors.state_province}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Postal Code"
                      value={formData.postal_code}
                      onChange={handleInputChange('postal_code')}
                      error={!!errors.postal_code}
                      helperText={errors.postal_code}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Country</InputLabel>
                      <Select
                        value={formData.country}
                        onChange={handleSelectChange('country')}
                      >
                        {COUNTRIES.map(country => (
                          <MenuItem key={country} value={country}>
                            {country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Church Details */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Church Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Founded Year"
                      type="number"
                      value={formData.founded_year}
                      onChange={handleInputChange('founded_year')}
                      error={!!errors.founded_year}
                      helperText={errors.founded_year}
                      inputProps={{ min: 1, max: new Date().getFullYear() }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Tax ID"
                      value={formData.tax_id}
                      onChange={handleInputChange('tax_id')}
                      error={!!errors.tax_id}
                      helperText={errors.tax_id}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Preferences */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Preferences & Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Language</InputLabel>
                      <Select
                        value={formData.preferred_language}
                        onChange={handleSelectChange('preferred_language')}
                      >
                        {LANGUAGES.map(lang => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Timezone</InputLabel>
                      <Select
                        value={formData.timezone}
                        onChange={handleSelectChange('timezone')}
                      >
                        {TIMEZONES.map(tz => (
                          <MenuItem key={tz} value={tz}>
                            {tz}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Currency</InputLabel>
                      <Select
                        value={formData.currency}
                        onChange={handleSelectChange('currency')}
                      >
                        {CURRENCIES.map(curr => (
                          <MenuItem key={curr.code} value={curr.code}>
                            {curr.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Submit Actions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Ready to Create Church
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      After creation, you'll proceed to the Church Setup Wizard
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/churches')}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <AddIcon />}
                      endIcon={!loading ? <NavigateNextIcon /> : undefined}
                    >
                      {loading ? 'Creating...' : 'Create Church & Continue'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
