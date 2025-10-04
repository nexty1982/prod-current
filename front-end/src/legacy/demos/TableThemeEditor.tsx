/**
 * Orthodox Metrics - Table Theme Editor
 * Interactive table theming with real-time preview and Orthodox liturgical palettes
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Alert,
  useTheme
} from '@mui/material';
import { Save, Download, Upload, Refresh, Palette } from '@mui/icons-material';
import { useTableStyleStore } from '../store/useTableStyleStore';
import ColorPaletteSelector from '../shared/ui/legacy/ColorPaletteSelector';
import TableControlPanel from '../shared/ui/legacy/TableControlPanel';
import { ThemedTable } from '../shared/ui/legacy/ThemedTable';

// Dummy baptism records for testing
const dummyBaptismRecords = [
  {
    id: '1',
    childName: 'Maria Theodoros',
    parentNames: 'John & Anna Theodoros',
    baptismDate: '2024-01-15',
    priest: 'Fr. Michael Constantinou',
    godparents: 'Peter & Helen Dimitriou',
    parish: 'St. Nicholas Orthodox Church'
  },
  {
    id: '2',
    childName: 'Constantine Gabriel',
    parentNames: 'George & Sophia Gabriel',
    baptismDate: '2024-02-28',
    priest: 'Fr. John Papadopoulos',
    godparents: 'Nicholas & Maria Kostas',
    parish: 'Holy Trinity Orthodox Church'
  },
  {
    id: '3',
    childName: 'Alexandra Christina',
    parentNames: 'Andreas & Christina Stavros',
    baptismDate: '2024-03-12',
    priest: 'Fr. Peter Angelou',
    godparents: 'Michael & Anastasia Demos',
    parish: 'St. George Orthodox Cathedral'
  },
  {
    id: '4',
    childName: 'Nicholas Basilios',
    parentNames: 'Dimitri & Elena Basilios',
    baptismDate: '2024-04-20',
    priest: 'Fr. Anthony Kouretas',
    godparents: 'George & Theodora Lambros',
    parish: 'Annunciation Orthodox Church'
  },
  {
    id: '5',
    childName: 'Sophia Evangelia',
    parentNames: 'Paul & Victoria Evangelia',
    baptismDate: '2024-05-08',
    priest: 'Fr. Stephen Nicolaou',
    godparents: 'Constantine & Anna Christou',
    parish: 'St. Demetrios Orthodox Church'
  }
];

export const TableThemeEditor: React.FC = () => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedElement, setSelectedElement] = useState<string>('header');
  const [livePreview, setLivePreview] = useState(true);
  const [liturgicalMode, setLiturgicalMode] = useState(false);
  
  const {
    tableTheme,
    setHeaderColor,
    setCellColor,
    setRowColor,
    setBorderStyle,
    resetTheme,
    saveTheme,
    loadTheme,
    exportTheme,
    importTheme
  } = useTableStyleStore();

  const handleColorChange = (color: string) => {
    if (!livePreview) return;
    
    switch (selectedElement) {
      case 'header':
        setHeaderColor(color);
        break;
      case 'cell':
        setCellColor(color);
        break;
      case 'row':
        setRowColor(color);
        break;
    }
  };

  const handleExportTheme = () => {
    const themeData = exportTheme();
    const blob = new Blob([JSON.stringify(themeData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orthodox-table-theme-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeData = JSON.parse(e.target?.result as string);
        importTheme(themeData);
      } catch (error) {
        console.error('Failed to import theme:', error);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveTheme = () => {
    const themeName = `orthodox-theme-${Date.now()}`;
    saveTheme(themeName);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: theme.palette.primary.main,
          fontWeight: 600
        }}>
          <Palette sx={{ mr: 2 }} />
          Orthodox Table Theme Editor
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Interactive table theming with Orthodox liturgical palettes and real-time preview
        </Typography>
        
        {/* Quick Stats */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${dummyBaptismRecords.length} Sample Records`} 
            color="primary" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            label={liturgicalMode ? "Liturgical Mode" : "Traditional Mode"} 
            color="secondary" 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            label={livePreview ? "Live Preview" : "Manual Apply"} 
            color={livePreview ? "success" : "default"} 
            variant="outlined" 
            size="small" 
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Panel - Controls */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, height: 'fit-content' }}>
            {/* Mode Controls */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Editor Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={livePreview}
                    onChange={(e) => setLivePreview(e.target.checked)}
                    color="primary"
                  />
                }
                label="Live Preview"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={liturgicalMode}
                    onChange={(e) => setLiturgicalMode(e.target.checked)}
                    color="secondary"
                  />
                }
                label="Liturgical Mode"
                sx={{ ml: 2 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Element Selection & Control Panel */}
            <TableControlPanel
              selectedElement={selectedElement}
              onElementSelect={setSelectedElement}
              tableTheme={tableTheme}
              onBorderStyleChange={setBorderStyle}
            />

            <Divider sx={{ my: 2 }} />

            {/* Color Palette Selector */}
            <ColorPaletteSelector
              selectedColor={
                selectedElement === 'header' ? tableTheme.headerColor :
                selectedElement === 'cell' ? tableTheme.cellColor :
                tableTheme.rowColor
              }
              onColorChange={handleColorChange}
              liturgicalMode={liturgicalMode}
            />

            <Divider sx={{ my: 2 }} />

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveTheme}
                fullWidth
              >
                Save Theme
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExportTheme}
                fullWidth
              >
                Export Theme
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                fullWidth
              >
                Import Theme
              </Button>
              
              <Button
                variant="text"
                startIcon={<Refresh />}
                onClick={resetTheme}
                fullWidth
                color="warning"
              >
                Reset to Default
              </Button>
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportTheme}
            />
          </Paper>
        </Grid>

        {/* Right Panel - Table Preview */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Table Preview
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Click on table elements to select them for styling. 
                Current selection: <strong>{selectedElement}</strong>
              </Alert>
            </Box>

            <ThemedTable
              data={dummyBaptismRecords}
              theme={tableTheme}
              selectedElement={selectedElement}
              onElementSelect={setSelectedElement}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TableThemeEditor;
