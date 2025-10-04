/**
 * Component Library Preview - Showcase of @om/components
 * Interactive preview and documentation of all available components
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Tabs,
  Tab,
  Paper,
  Chip,
  Stack,
  Button,
  Alert,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  MenuItem,
} from '@mui/material';
import { IconComponents, IconForms, IconPalette, IconUsers, IconCode, IconCloudUpload } from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
// Import our component library
import {
  TextFormInput,
  SelectFormInput,
  PasswordFormInput,
  TextAreaFormInput,
  DropzoneFormInput,
} from '@/@om/shared/ui/legacy/ui/forms';
import { ThemeCustomizer } from '@/@om/shared/ui/legacy/ui/theme';
import { UserFormModal } from '@/@om/shared/ui/legacy/features/auth';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`component-tabpanel-${index}`}
      aria-labelledby={`component-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ComponentLibrary: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [themeSettings, setThemeSettings] = useState({
    mode: 'light' as 'light' | 'dark',
    primaryColor: '#1976d2',
    sidebarTheme: 'light' as 'light' | 'dark',
    topbarTheme: 'light' as 'light' | 'dark',
    sidebarSize: 'default' as 'default' | 'condensed' | 'hidden' | 'sm-hover-active' | 'sm-hover',
  });

  // Simple form state for demo purposes
  const [formValues, setFormValues] = useState({
    sampleText: '',
    sampleSelect: '',
    samplePassword: '',
    sampleTextArea: '',
  });

  // Simple form control mock for demo
  const demoControl = {
    register: (name: string) => ({
      onChange: (e: any) => {
        const value = e.target ? e.target.value : e;
        setFormValues(prev => ({ ...prev, [name]: value }));
      },
      value: formValues[name as keyof typeof formValues] || '',
      name,
    }),
  } as any;

  const breadcrumbs = [
    { title: 'Sandbox', link: '/sandbox' },
    { title: 'Component Library', link: '/sandbox/component-library' },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleThemeChange = (settings: any) => {
    setThemeSettings(prev => ({ ...prev, ...settings }));
  };

  const handleThemeReset = () => {
    setThemeSettings({
      mode: 'light',
      primaryColor: '#1976d2',
      sidebarTheme: 'light',
      topbarTheme: 'light',
      sidebarSize: 'default',
    });
  };

      const FormComponentsDemo = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom className="mobile-center">
          🚀 Form Components
        </Typography>
        <Typography color="text.secondary" paragraph className="mobile-center">
          Enhanced form input components with react-hook-form integration and Material-UI styling.
        </Typography>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card className="component-preview-card">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              TextFormInput
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enhanced text input with validation and error handling.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Sample Text Input (Demo)"
                placeholder="Enter some text..."
                fullWidth
                value={formValues.sampleText}
                onChange={(e) => setFormValues(prev => ({ ...prev, sampleText: e.target.value }))}
                helperText="This is a demo version - real TextFormInput uses react-hook-form"
              />
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current value: {formValues.sampleText || 'empty'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card className="component-preview-card">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SelectFormInput
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Enhanced select input with option support.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                select
                label="Sample Select (Demo)"
                fullWidth
                value={formValues.sampleSelect}
                onChange={(e) => setFormValues(prev => ({ ...prev, sampleSelect: e.target.value }))}
                helperText="This is a demo version - real SelectFormInput uses react-hook-form"
              >
                <MenuItem value="option1">Option 1</MenuItem>
                <MenuItem value="option2">Option 2</MenuItem>
                <MenuItem value="option3">Option 3</MenuItem>
              </TextField>
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current value: {formValues.sampleSelect || 'none selected'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card className="component-preview-card">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              PasswordFormInput
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Password input with visibility toggle.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                type="password"
                label="Sample Password (Demo)"
                fullWidth
                value={formValues.samplePassword}
                onChange={(e) => setFormValues(prev => ({ ...prev, samplePassword: e.target.value }))}
                helperText="This is a demo version - real PasswordFormInput has visibility toggle"
              />
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Length: {formValues.samplePassword?.length || 0} characters
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} lg={6}>
        <Card className="component-preview-card">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              TextAreaFormInput
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Multi-line text input with auto-resize.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                multiline
                rows={3}
                label="Sample Text Area (Demo)"
                placeholder="Enter multiple lines of text..."
                fullWidth
                value={formValues.sampleTextArea}
                onChange={(e) => setFormValues(prev => ({ ...prev, sampleTextArea: e.target.value }))}
                helperText="This is a demo version - real TextAreaFormInput has auto-resize"
              />
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Lines: {(formValues.sampleTextArea || '').split('\n').length}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              DropzoneFormInput
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              File upload with drag & drop, previews, and progress tracking.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Paper
                sx={{
                  border: 2,
                  borderStyle: 'dashed',
                  borderColor: 'grey.400',
                  bgcolor: 'grey.50',
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                <IconCloudUpload size={48} />
                <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                  Drag & drop files here, or click to select (Demo)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is a demo version - real DropzoneFormInput has full drag & drop functionality
                </Typography>
              </Paper>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const ThemeComponentsDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          🎨 Theme Components
        </Typography>
        <Typography color="text.secondary" paragraph>
          Theme customization and styling utilities.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              ThemeCustomizer
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Advanced theme customization panel with live preview.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setThemeCustomizerOpen(true)}
                startIcon={<IconPalette />}
              >
                Open Theme Customizer
              </Button>
            </Box>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Current Settings:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip label={`Mode: ${themeSettings.mode}`} size="small" />
                <Chip label={`Sidebar: ${themeSettings.sidebarSize}`} size="small" />
                <Chip label={`Topbar: ${themeSettings.topbarTheme}`} size="small" />
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const FeatureComponentsDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          ⚡ Feature Components
        </Typography>
        <Typography color="text.secondary" paragraph>
          Domain-specific components for authentication, church management, and more.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              UserFormModal
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Comprehensive user management modal with edit, password reset, and deletion modes.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setUserModalOpen(true)}
                startIcon={<IconUsers />}
              >
                Open User Form Modal
              </Button>
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              This is a demo version. In real usage, you would pass actual user data and handlers.
            </Alert>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const UsageGuideDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          📚 Usage Guide
        </Typography>
        <Typography color="text.secondary" paragraph>
          How to use the @om/components library in your projects.
        </Typography>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Installation & Imports
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.900', color: 'white', fontFamily: 'monospace' }}>
              <Typography variant="body2">
                {`// Import individual components
import { TextFormInput, SelectFormInput } from '@om/shared/ui/legacy/ui/forms';
import { UserFormModal } from '@om/shared/ui/legacy/features/auth';
import { ThemeCustomizer } from '@om/shared/ui/legacy/ui/theme';

// Import category bundles
import * as UIComponents from '@om/shared/ui/legacy/ui';
import * as FeatureComponents from '@om/shared/ui/legacy/features';

// Basic usage with react-hook-form
import { useForm } from 'react-hook-form';

const MyForm = () => {
  const { control } = useForm();
  
  return (
    <TextFormInput
      name="email"
      control={control}
      label="Email"
      rules={{ required: 'Email is required' }}
    />
  );
};`}
              </Typography>
            </Paper>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Component Categories
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <IconForms size={32} />
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    /ui/forms
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Input fields, selectors, file uploads
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <IconPalette size={32} />
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    /ui/theme
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Theme customization utilities
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <IconUsers size={32} />
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    /features/auth
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    User management components
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <IconComponents size={32} />
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>
                    More Coming
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Layout, charts, data management
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer title="Component Library" description="Orthodox Metrics Component Library">
      <Breadcrumb title="Component Library" items={breadcrumbs} />
      
      <Card>
        <Box className="responsive-padding">
          <Typography variant="h4" gutterBottom className="mobile-center">
            🧩 @om/components Library
          </Typography>
          <Typography color="text.secondary" paragraph className="mobile-center">
            A unified component library combining the best components from OrthodoxMetrics and Raydar templates.
            All components feature Material-UI integration, TypeScript support, and comprehensive documentation.
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2" component="div">
              <strong>Demo Note:</strong> These are simplified demo versions. The actual components require react-hook-form for full functionality.
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="5 Form Components" color="success" size="small" />
              <Chip label="1 Theme Component" color="success" size="small" />
              <Chip label="1 Feature Component" color="success" size="small" />
            </Box>
          </Alert>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              className="component-tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
            >
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconForms size={16} />
                  <span className="hide-mobile">Form Components</span>
                  <span className="show-mobile">Forms</span>
                </Box>}
              />
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconPalette size={16} />
                  <span className="hide-mobile">Theme Components</span>
                  <span className="show-mobile">Theme</span>
                </Box>}
              />
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconUsers size={16} />
                  <span className="hide-mobile">Feature Components</span>
                  <span className="show-mobile">Features</span>
                </Box>}
              />
              <Tab 
                label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconCode size={16} />
                  <span className="hide-mobile">Usage Guide</span>
                  <span className="show-mobile">Guide</span>
                </Box>}
              />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <FormComponentsDemo />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <ThemeComponentsDemo />
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <FeatureComponentsDemo />
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <UsageGuideDemo />
          </TabPanel>
        </Box>
      </Card>

      {/* Theme Customizer */}
      <ThemeCustomizer
        open={themeCustomizerOpen}
        onClose={() => setThemeCustomizerOpen(false)}
        settings={themeSettings}
        onChange={handleThemeChange}
        onReset={handleThemeReset}
      />

      {/* User Modal Demo */}
      <UserFormModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        user={{
          id: 1,
          email: 'demo@orthodoxmetrics.com',
          first_name: 'Demo',
          last_name: 'User',
          role: 'editor',
          church_id: 1,
          church_name: 'Demo Church',
          preferred_language: 'en',
          is_active: true,
        }}
        churches={[
          { id: 1, name: 'Demo Church' },
          { id: 2, name: 'Another Church' },
        ]}
        mode="edit"
        onSubmit={async (data) => {
          console.log('Demo form submission:', data);
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          setUserModalOpen(false);
        }}
        currentUserRole="super_admin"
      />
    </PageContainer>
  );
};

export default ComponentLibrary;