import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  IconSettings,
  IconPalette,
  IconUpload,
  IconSave
} from '@tabler/icons-react';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customizer-tabpanel-${index}`}
      aria-labelledby={`customizer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ParishCustomizer: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [churchId, setChurchId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('orthodox-classic');
  const [customization, setCustomization] = useState({
    primaryColor: '#D4AF37',
    secondaryColor: '#8B7355',
    headerImage: '',
    leftRailImage: '',
    rightRailImage: '',
    customCSS: '',
    fieldLabels: {
      'baptism_records.first_name': 'First Name',
      'baptism_records.last_name': 'Last Name',
      'baptism_records.date_performed': 'Baptism Date'
    }
  });

  const templates = [
    { id: 'orthodox-classic', name: 'Orthodox Classic', colors: ['#D4AF37', '#8B7355'] },
    { id: 'minimal-clean', name: 'Minimal Clean', colors: ['#2563EB', '#E5E7EB'] }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = () => {
    console.log('Saving customization for church:', churchId, customization);
  };

  const handleImageUpload = (field: 'headerImage' | 'leftRailImage' | 'rightRailImage') => {
    console.log('Uploading image for:', field);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconSettings size={32} style={{ marginRight: 16 }} />
          <Typography variant="h4" component="h1">
            Parish Customizer
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Customize field labels, colors, theme assets, and parish-specific settings for the Records Suite display.
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Changes will apply to all records views for the selected parish. Template selection provides base styling that can be further customized.
        </Alert>

        {/* Church Selection */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Church ID"
              value={churchId}
              onChange={(e) => setChurchId(e.target.value)}
              placeholder="Enter church ID (e.g., 12345)"
              helperText="Numeric ID of the church database"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Base Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Base Template"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Customization Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Colors & Theme" />
            <Tab label="Assets & Images" />
            <Tab label="Field Labels" />
            <Tab label="Preview" />
          </Tabs>
        </Box>

        {/* Colors & Theme Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Theme Colors
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="Primary Color"
                      value={customization.primaryColor}
                      onChange={(e) => setCustomization({...customization, primaryColor: e.target.value})}
                      type="color"
                      sx={{ width: '100px' }}
                    />
                    <TextField
                      label="Secondary Color"
                      value={customization.secondaryColor}
                      onChange={(e) => setCustomization({...customization, secondaryColor: e.target.value})}
                      type="color"
                      sx={{ width: '100px' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Custom CSS
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={customization.customCSS}
                    onChange={(e) => setCustomization({...customization, customCSS: e.target.value})}
                    placeholder="/* Custom CSS rules */
.records-table {
  /* Your styles here */
}"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Assets & Images Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {[
              { field: 'headerImage' as const, label: 'Header Image', description: 'Displayed at the top of records pages' },
              { field: 'leftRailImage' as const, label: 'Left Rail Image', description: 'Decorative image for left sidebar' },
              { field: 'rightRailImage' as const, label: 'Right Rail Image', description: 'Decorative image for right sidebar' }
            ].map((asset) => (
              <Grid item xs={12} md={4} key={asset.field}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {asset.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {asset.description}
                    </Typography>
                    {customization[asset.field] ? (
                      <Chip label="Image uploaded" color="success" sx={{ mb: 2 }} />
                    ) : (
                      <Chip label="No image" color="default" sx={{ mb: 2 }} />
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<IconUpload />}
                      onClick={() => handleImageUpload(asset.field)}
                    >
                      Upload
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Field Labels Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Custom Field Labels
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Override default field labels with parish-specific terminology.
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(customization.fieldLabels).map(([field, label]) => (
              <Grid item xs={12} md={6} key={field}>
                <TextField
                  fullWidth
                  label={`Label for ${field.split('.')[1]}`}
                  value={label}
                  onChange={(e) => setCustomization({
                    ...customization, 
                    fieldLabels: { ...customization.fieldLabels, [field]: e.target.value }
                  })}
                  helperText={`Table: ${field.split('.')[0]}`}
                />
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Preview Tab */}
        <TabPanel value={activeTab} index={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Preview functionality will show how the customizations appear in the actual records interface.
          </Alert>
          <Box sx={{ 
            p: 3, 
            border: '2px dashed #ccc', 
            borderRadius: 1,
            textAlign: 'center',
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" color="text.secondary">
              Preview will be rendered here
            </Typography>
          </Box>
        </TabPanel>

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button 
            variant="contained" 
            startIcon={<IconSave />}
            onClick={handleSave}
            disabled={!churchId}
          >
            Save Customization
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ParishCustomizer;