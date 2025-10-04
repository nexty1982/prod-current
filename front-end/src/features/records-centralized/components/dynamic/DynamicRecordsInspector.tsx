/**
 * Enhanced Dynamic Records Inspector with Side Rails, Branding & Liturgical Themes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Divider,
  Chip,
  Grid,
  Paper,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Stack,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DynamicRecordsDisplay } from './DynamicRecordsDisplay';
import { mapFieldDefinitionsToDynamicColumns } from './columnMappers';
import { enhancedTableStore, THEME_MAP, LiturgicalThemeKey, ThemeTokens, FieldStyleRule, Branding } from '../../../../store/enhancedTableStore';

const SAMPLE_DATASETS = {
  baptisms: [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Smith',
      baptism_date: '2024-01-15',
      birth_date: '2023-06-10',
      priest: 'Fr. Michael',
      godparents: 'Mary Smith, Peter Jones',
      church_id: 1,
      notes: 'Beautiful ceremony',
      created_at: '2024-01-16T10:30:00Z',
    },
    {
      id: 2,
      first_name: 'Sarah',
      last_name: 'Johnson',
      baptism_date: '2024-02-20',
      birth_date: '2023-08-15',
      priest: 'Fr. John',
      godparents: 'Lisa Johnson',
      church_id: 1,
      notes: null,
      created_at: '2024-02-21T14:15:00Z',
    },
    {
      id: 3,
      first_name: 'Michael',
      last_name: 'Brown',
      baptism_date: '2024-03-10',
      birth_date: '2023-12-01',
      priest: 'Fr. Michael',
      godparents: 'David Brown, Anna Brown',
      church_id: 1,
      created_at: '2024-03-11T09:45:00Z',
    },
  ],
  marriages: [
    {
      id: 1,
      groom_first: 'James',
      groom_last: 'Wilson',
      bride_first: 'Emily',
      bride_last: 'Davis',
      marriage_date: '2024-05-15',
      priest: 'Fr. Michael',
      witnesses: 'Mark Wilson, Sarah Davis',
      church_id: 1,
    },
    {
      id: 2,
      groom_first: 'Robert',
      groom_last: 'Taylor',
      bride_first: 'Jessica',
      bride_last: 'Miller',
      marriage_date: '2024-06-20',
      priest: 'Fr. John',
      witnesses: 'Tom Taylor, Lisa Miller',
      church_id: 1,
    },
  ],
  funerals: [
    {
      id: 1,
      first_name: 'George',
      last_name: 'Anderson',
      death_date: '2024-01-25',
      funeral_date: '2024-01-28',
      age: 78,
      priest: 'Fr. Michael',
      burial_location: 'St. Mary Cemetery',
      church_id: 1,
    },
  ],
};

const BrandingRail: React.FC<{
  branding: Branding;
  onBrandingChange: (updates: Partial<Branding>) => void;
}> = ({ branding, onBrandingChange }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleLogoSelect = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    onBrandingChange({ logoPreview: preview });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (response.ok) {
        const { url } = await response.json();
        onBrandingChange({ logoUrl: url, logoPreview: undefined });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Logo upload failed:', error);
      onBrandingChange({ logoPreview: undefined });
    }
  }, [onBrandingChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      handleLogoSelect(imageFile);
    }
  }, [handleLogoSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoSelect(file);
    }
  }, [handleLogoSelect]);

  return (
    <Card sx={{ height: 'fit-content' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon />
          Branding
        </Typography>
        
        <Stack spacing={3}>
          {/* Church Name */}
          <TextField
            label="Church Name"
            value={branding.churchName || ''}
            onChange={(e) => onBrandingChange({ churchName: e.target.value })}
            fullWidth
            variant="outlined"
          />
          
          {/* Logo Upload */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Church Logo
            </Typography>
            <Box
              sx={{
                border: '2px dashed',
                borderColor: dragOver ? 'primary.main' : 'grey.300',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              {branding.logoPreview || branding.logoUrl ? (
                <Box sx={{ position: 'relative' }}>
                  <img
                    src={branding.logoPreview || branding.logoUrl}
                    alt="Church Logo"
                    style={{ maxHeight: 80, maxWidth: '100%', borderRadius: 4 }}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBrandingChange({ logoUrl: undefined, logoPreview: undefined });
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <>
                  <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Drop logo here or click to upload
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    PNG, JPG, SVG up to 2MB
                  </Typography>
                </>
              )}
            </Box>
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />
          </Box>
          
          {/* Logo Alignment */}
          <FormControl fullWidth>
            <InputLabel>Logo Alignment</InputLabel>
            <Select
              value={branding.logoAlign || 'left'}
              label="Logo Alignment"
              onChange={(e) => onBrandingChange({ logoAlign: e.target.value as 'left' | 'center' | 'right' })}
            >
              <MenuItem value="left">Left</MenuItem>
              <MenuItem value="center">Center</MenuItem>
              <MenuItem value="right">Right</MenuItem>
            </Select>
          </FormControl>
          
          {/* Show Brand Header */}
          <FormControlLabel
            control={
              <Switch
                checked={branding.showBrandHeader ?? true}
                onChange={(e) => onBrandingChange({ showBrandHeader: e.target.checked })}
              />
            }
            label="Show Brand Header"
          />
        </Stack>
      </CardContent>
    </Card>
  );
};

const ThemeRail: React.FC<{
  liturgicalTheme: LiturgicalThemeKey;
  tokens: ThemeTokens;
  fieldRules: FieldStyleRule[];
  onThemeChange: (theme: LiturgicalThemeKey) => void;
  onFieldRulesChange: (rules: FieldStyleRule[]) => void;
  onExport: () => void;
  onImport: (config: any) => void;
}> = ({ liturgicalTheme, tokens, fieldRules, onThemeChange, onFieldRulesChange, onExport, onImport }) => {
  const [editingRule, setEditingRule] = useState<FieldStyleRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const handleAddRule = () => {
    setEditingRule({ field: '', weight: 'regular' });
    setRuleDialogOpen(true);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      const existingIndex = fieldRules.findIndex(r => r.field === editingRule.field);
      if (existingIndex >= 0) {
        const updated = [...fieldRules];
        updated[existingIndex] = editingRule;
        onFieldRulesChange(updated);
      } else {
        onFieldRulesChange([...fieldRules, editingRule]);
      }
      setRuleDialogOpen(false);
      setEditingRule(null);
    }
  };

  const handleRemoveRule = (field: string) => {
    onFieldRulesChange(fieldRules.filter(r => r.field !== field));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target?.result as string);
          onImport(config);
        } catch (error) {
          console.error('Failed to import config:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card sx={{ height: 'fit-content' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaletteIcon />
          Liturgical Themes
        </Typography>
        
        <Stack spacing={3}>
          {/* Theme Selector */}
          <FormControl fullWidth>
            <InputLabel>Liturgical Theme</InputLabel>
            <Select
              value={liturgicalTheme}
              label="Liturgical Theme"
              onChange={(e) => onThemeChange(e.target.value as LiturgicalThemeKey)}
            >
              {Object.keys(THEME_MAP).map((theme) => (
                <MenuItem key={theme} value={theme}>
                  {theme.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Theme Preview */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Theme Preview
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: tokens.headerBg, color: tokens.headerText, p: 1, borderRadius: 1, textAlign: 'center' }}>
                  Header
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: tokens.accent, color: tokens.cellText, p: 1, borderRadius: 1, textAlign: 'center' }}>
                  Accent
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: tokens.rowOddBg, color: tokens.cellText, p: 1, border: `1px solid ${tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                  Row Odd
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: tokens.rowEvenBg, color: tokens.cellText, p: 1, border: `1px solid ${tokens.border}`, borderRadius: 1, textAlign: 'center' }}>
                  Row Even
                </Box>
              </Grid>
            </Grid>
          </Box>
          
          {/* Field Style Rules */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              Field Style Rules
              <IconButton size="small" onClick={handleAddRule}>
                <AddIcon />
              </IconButton>
            </Typography>
            <Stack spacing={1}>
              {fieldRules.map((rule, index) => (
                <Chip
                  key={rule.field}
                  label={`${rule.field} ${rule.weight === 'bold' ? '(Bold)' : ''} ${rule.italic ? '(Italic)' : ''} ${rule.uppercase ? '(Upper)' : ''}`}
                  onDelete={() => handleRemoveRule(rule.field)}
                  onClick={() => {
                    setEditingRule(rule);
                    setRuleDialogOpen(true);
                  }}
                  sx={{
                    bgcolor: rule.bg || 'default',
                    color: rule.color || 'default',
                    fontWeight: rule.weight === 'bold' ? 'bold' : 'normal',
                    fontStyle: rule.italic ? 'italic' : 'normal',
                    textTransform: rule.uppercase ? 'uppercase' : 'none',
                  }}
                />
              ))}
            </Stack>
          </Box>
          
          {/* Actions */}
          <Divider />
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onExport} size="small">
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              size="small"
              onClick={() => document.getElementById('config-import')?.click()}
            >
              Import
            </Button>
            <input
              id="config-import"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </Stack>
        </Stack>
        
        {/* Field Rule Dialog */}
        <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Field Style Rule</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Field Name"
                value={editingRule?.field || ''}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, field: e.target.value } : null)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Weight</InputLabel>
                <Select
                  value={editingRule?.weight || 'regular'}
                  label="Weight"
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, weight: e.target.value as 'regular' | 'bold' } : null)}
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="bold">Bold</MenuItem>
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Switch
                    checked={editingRule?.italic || false}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, italic: e.target.checked } : null)}
                  />
                }
                label="Italic"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={editingRule?.uppercase || false}
                    onChange={(e) => setEditingRule(prev => prev ? { ...prev, uppercase: e.target.checked } : null)}
                  />
                }
                label="Uppercase"
              />
              <TextField
                label="Text Color"
                type="color"
                value={editingRule?.color || '#000000'}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, color: e.target.value } : null)}
                fullWidth
              />
              <TextField
                label="Background Color"
                type="color"
                value={editingRule?.bg || '#ffffff'}
                onChange={(e) => setEditingRule(prev => prev ? { ...prev, bg: e.target.value } : null)}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRule} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export const DynamicRecordsInspector: React.FC = () => {
  const [state, setState] = useState(enhancedTableStore.getState());
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof SAMPLE_DATASETS>('baptisms');
  const [layout, setLayout] = useState<'table' | 'dense' | 'cards'>('table');
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [hiddenFields, setHiddenFields] = useState<string[]>(['id', 'church_id']);
  const [dateFields, setDateFields] = useState<string[]>(['baptism_date', 'birth_date', 'created_at', 'marriage_date', 'death_date', 'funeral_date']);
  
  useEffect(() => {
    const unsubscribe = enhancedTableStore.subscribe(() => {
      setState(enhancedTableStore.getState());
    });
    return unsubscribe;
  }, []);

  const handleExportConfig = () => {
    const config = enhancedTableStore.exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dynamic-inspector-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRecords = SAMPLE_DATASETS[selectedDataset];
  const mappedColumns = mapFieldDefinitionsToDynamicColumns(selectedDataset === 'baptisms' ? 'baptism' : selectedDataset === 'marriages' ? 'marriage' : 'funeral');

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dynamic Records Inspector
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Configure liturgical themes, branding, and field styling. Changes are automatically saved and applied to all record displays.
      </Alert>
      
      <Grid container spacing={3}>
        {/* Left Rail - Branding */}
        <Grid item xs={12} md={3}>
          <BrandingRail
            branding={state.branding}
            onBrandingChange={(updates) => enhancedTableStore.setBranding(updates)}
          />
        </Grid>
        
        {/* Main Content */}
        <Grid item xs={12} md={6}>
          {/* Configuration Panel */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preview Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Dataset</InputLabel>
                    <Select
                      value={selectedDataset}
                      label="Dataset"
                      onChange={(e) => setSelectedDataset(e.target.value as keyof typeof SAMPLE_DATASETS)}
                    >
                      <MenuItem value="baptisms">Baptisms</MenuItem>
                      <MenuItem value="marriages">Marriages</MenuItem>
                      <MenuItem value="funerals">Funerals</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Layout</InputLabel>
                    <Select
                      value={layout}
                      label="Layout"
                      onChange={(e) => setLayout(e.target.value as 'table' | 'dense' | 'cards')}
                    >
                      <MenuItem value="table">Table</MenuItem>
                      <MenuItem value="dense">Dense</MenuItem>
                      <MenuItem value="cards">Cards</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          {/* Brand Header Preview */}
          {state.branding.showBrandHeader && (
            <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, bgcolor: state.tokens.headerBg, color: state.tokens.headerText }}>
              {(state.branding.logoPreview || state.branding.logoUrl) && (
                <Box sx={{ textAlign: state.branding.logoAlign }}>
                  <img 
                    src={state.branding.logoPreview || state.branding.logoUrl} 
                    alt="Church Logo" 
                    style={{ maxHeight: 56 }} 
                  />
                </Box>
              )}
              <Typography variant="h5">
                {state.branding.churchName || 'Church Name'}
              </Typography>
            </Paper>
          )}
          
          {/* Records Display Preview */}
          <Paper sx={{ p: 0 }}>
            <DynamicRecordsDisplay
              records={previewRecords}
              columns={mappedColumns}
              inferColumns={true}
              layout={layout}
              initialSort={{ field: 'baptism_date', direction: 'desc' }}
              dateFields={dateFields}
              hiddenFields={hiddenFields}
              showActions={true}
              themeTokens={state.tokens}
              fieldRules={state.fieldRules}
              onView={(record) => console.log('View:', record)}
              onEdit={(record) => console.log('Edit:', record)}
              onDelete={(id) => console.log('Delete:', id)}
            />
          </Paper>
        </Grid>
        
        {/* Right Rail - Theme */}
        <Grid item xs={12} md={3}>
          <ThemeRail
            liturgicalTheme={state.liturgicalTheme}
            tokens={state.tokens}
            fieldRules={state.fieldRules}
            onThemeChange={(theme) => enhancedTableStore.setLiturgicalTheme(theme)}
            onFieldRulesChange={(rules) => enhancedTableStore.setFieldRules(rules)}
            onExport={handleExportConfig}
            onImport={(config) => enhancedTableStore.importConfig(config)}
          />
        </Grid>
      </Grid>
    </Container>
  );
};

export default DynamicRecordsInspector;
