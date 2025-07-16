/**
 * Orthodox Metrics - Color Palette Selector
 * Color selection component with Orthodox liturgical palettes
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Paper,
  Tooltip,
  Chip,
  ButtonGroup,
  Button,
  useTheme
} from '@mui/material';
import { Palette, Colorize, History } from '@mui/icons-material';
import { liturgicalThemes } from '../store/useTableStyleStore';

interface ColorPaletteProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  liturgicalMode: boolean;
}

// Orthodox Color Palettes
const orthodoxTraditionalColors = [
  '#2c5aa0', // Orthodox blue
  '#1976d2', // Light blue
  '#0d47a1', // Dark blue
  '#c62828', // Red
  '#ad1457', // Deep pink
  '#4a148c', // Purple
  '#2e7d32', // Green
  '#f57c00', // Orange
  '#c9b037', // Gold
  '#5d4037', // Brown
  '#424242', // Dark gray
  '#ffffff'  // White
];

const liturgicalSeasonColors = [
  // Lent
  '#4a148c', '#6a1b9a', '#8e24aa', '#9c27b0',
  // Pascha
  '#c62828', '#d32f2f', '#e53935', '#f44336',
  // Theophany
  '#0277bd', '#0288d1', '#039be5', '#03a9f4',
  // Pentecost
  '#2e7d32', '#388e3c', '#43a047', '#4caf50',
  // Nativity
  '#c9b037', '#ffa000', '#ffb300', '#ffc107',
  // Theotokos
  '#1565c0', '#1976d2', '#1e88e5', '#2196f3'
];

const recentColors = [
  '#2c5aa0', '#4a148c', '#c62828', '#2e7d32', '#c9b037'
];

export const ColorPaletteSelector: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorChange,
  liturgicalMode
}) => {
  const theme = useTheme();
  const [customColor, setCustomColor] = useState(selectedColor);
  const [paletteMode, setPaletteMode] = useState<'orthodox' | 'liturgical' | 'themes'>('orthodox');

  const colorPalettes = {
    orthodox: orthodoxTraditionalColors,
    liturgical: liturgicalSeasonColors,
    themes: Object.keys(liturgicalThemes)
  };

  const handleColorClick = (color: string) => {
    setCustomColor(color);
    onColorChange(color);
  };

  const handleThemeSelect = (themeName: string) => {
    const theme = liturgicalThemes[themeName];
    if (theme) {
      onColorChange(theme.headerColor);
    }
  };

  const handleCustomColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const color = event.target.value;
    setCustomColor(color);
    onColorChange(color);
  };

  const ColorSwatch: React.FC<{ color: string; selected?: boolean; onClick: () => void; tooltip?: string }> = ({
    color,
    selected,
    onClick,
    tooltip
  }) => (
    <Tooltip title={tooltip || color}>
      <Box
        onClick={onClick}
        sx={{
          width: 32,
          height: 32,
          backgroundColor: color,
          border: selected ? `3px solid ${theme.palette.primary.main}` : '1px solid #ccc',
          borderRadius: 1,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: theme.shadows[4]
          }
        }}
      />
    </Tooltip>
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <Palette sx={{ mr: 1 }} />
        Color Palette
      </Typography>

      {/* Palette Mode Selector */}
      <ButtonGroup variant="outlined" size="small" fullWidth sx={{ mb: 2 }}>
        <Button
          variant={paletteMode === 'orthodox' ? 'contained' : 'outlined'}
          onClick={() => setPaletteMode('orthodox')}
        >
          Orthodox
        </Button>
        <Button
          variant={paletteMode === 'liturgical' ? 'contained' : 'outlined'}
          onClick={() => setPaletteMode('liturgical')}
        >
          Liturgical
        </Button>
        <Button
          variant={paletteMode === 'themes' ? 'contained' : 'outlined'}
          onClick={() => setPaletteMode('themes')}
        >
          Themes
        </Button>
      </ButtonGroup>

      {/* Current Color Display */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              backgroundColor: selectedColor,
              border: '1px solid #ccc',
              borderRadius: 1
            }}
          />
          <Box>
            <Typography variant="body2" color="text.secondary">
              Current Color
            </Typography>
            <Typography variant="body1" fontFamily="monospace">
              {selectedColor}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Theme Presets (when themes mode is selected) */}
      {paletteMode === 'themes' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Liturgical Themes
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(liturgicalThemes).map(([themeName, themeData]) => (
              <Grid item xs={12} key={themeName}>
                <Chip
                  label={themeName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  onClick={() => handleThemeSelect(themeName)}
                  variant={selectedColor === themeData.headerColor ? 'filled' : 'outlined'}
                  sx={{
                    width: '100%',
                    '& .MuiChip-label': {
                      color: themeData.headerColor
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Color Grid */}
      {paletteMode !== 'themes' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {paletteMode === 'orthodox' ? 'Orthodox Traditional' : 'Liturgical Seasons'}
          </Typography>
          <Grid container spacing={1}>
            {colorPalettes[paletteMode].map((color) => (
              <Grid item xs={3} key={color}>
                <ColorSwatch
                  color={color}
                  selected={selectedColor === color}
                  onClick={() => handleColorClick(color)}
                  tooltip={`Click to select ${color}`}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recent Colors */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <History sx={{ mr: 1, fontSize: 16 }} />
          Recent Colors
        </Typography>
        <Grid container spacing={1}>
          {recentColors.map((color) => (
            <Grid item xs={2.4} key={color}>
              <ColorSwatch
                color={color}
                selected={selectedColor === color}
                onClick={() => handleColorClick(color)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Custom Color Input */}
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Colorize sx={{ mr: 1, fontSize: 16 }} />
          Custom Color
        </Typography>
        <TextField
          type="color"
          value={customColor}
          onChange={handleCustomColorChange}
          fullWidth
          size="small"
          sx={{
            '& input[type="color"]': {
              width: '100%',
              height: 40,
              border: 'none',
              borderRadius: 1
            }
          }}
        />
        <TextField
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            onColorChange(e.target.value);
          }}
          placeholder="#000000"
          fullWidth
          size="small"
          sx={{ mt: 1 }}
          InputProps={{
            style: { fontFamily: 'monospace' }
          }}
        />
      </Box>
    </Box>
  );
};
