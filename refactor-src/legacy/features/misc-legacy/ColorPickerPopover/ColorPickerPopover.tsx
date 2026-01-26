/**
 * Orthodox Metrics - Color Picker Popover Component
 * Interactive color picker with predefined palettes and custom color selection
 */

import React, { useState, useCallback } from 'react';
import {
  Popover,
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  Tooltip,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

import { DEFAULT_PALETTES } from '@/types/church-records-advanced.types';

interface ColorPickerPopoverProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  currentColor?: string;
  onColorSelect: (color: string) => void;
  onClose: () => void;
  predefinedColors?: string[];
}

/**
 * Color Picker Popover Component
 */
const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  open,
  anchorEl,
  currentColor,
  onColorSelect,
  onClose,
  predefinedColors,
}) => {
  const [customColor, setCustomColor] = useState(currentColor || '#1976d2');

  // Handle predefined color selection
  const handlePredefinedColorSelect = useCallback((color: string) => {
    onColorSelect(color);
  }, [onColorSelect]);

  // Handle custom color input
  const handleCustomColorChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(event.target.value);
  }, []);

  // Apply custom color
  const handleCustomColorApply = useCallback(() => {
    onColorSelect(customColor);
  }, [customColor, onColorSelect]);

  // Clear color (remove color override)
  const handleClearColor = useCallback(() => {
    onColorSelect('');
  }, [onColorSelect]);

  // Reset to default
  const handleResetColor = useCallback(() => {
    onColorSelect('#1976d2'); // Default primary color
  }, [onColorSelect]);

  // Common color palette
  const commonColors = predefinedColors || [
    '#1976d2', // Blue
    '#dc004e', // Red
    '#9c27b0', // Purple
    '#673ab7', // Deep Purple
    '#3f51b5', // Indigo
    '#2196f3', // Blue
    '#03a9f4', // Light Blue
    '#00bcd4', // Cyan
    '#009688', // Teal
    '#4caf50', // Green
    '#8bc34a', // Light Green
    '#cddc39', // Lime
    '#ffeb3b', // Yellow
    '#ffc107', // Amber
    '#ff9800', // Orange
    '#ff5722', // Deep Orange
    '#795548', // Brown
    '#607d8b', // Blue Grey
    '#9e9e9e', // Grey
    '#000000', // Black
  ];

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
    >
      <Paper sx={{ p: 3, minWidth: 300, maxWidth: 400 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">
            Field Color
          </Typography>
          <Box>
            <Tooltip title="Clear color">
              <IconButton size="small" onClick={handleClearColor}>
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset to default">
              <IconButton size="small" onClick={handleResetColor}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Current Color Display */}
        {currentColor && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Color:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: currentColor,
                  borderRadius: 1,
                  border: '1px solid #ccc',
                }}
              />
              <Typography variant="body2" fontFamily="monospace">
                {currentColor}
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Orthodox Color Palettes */}
        {DEFAULT_PALETTES.map(palette => (
          <Box key={palette.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {palette.name}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {Object.entries(palette.colors).map(([name, color]) => (
                <Tooltip key={name} title={`${name}: ${color}`}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: color,
                        borderRadius: 1,
                        border: currentColor === color ? '3px solid #333' : '1px solid #ccc',
                        cursor: 'pointer',
                        position: 'relative',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s',
                        },
                      }}
                      onClick={() => handlePredefinedColorSelect(color)}
                    >
                      {currentColor === color && (
                        <CheckIcon
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: 16,
                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
              ))}
            </Box>
          </Box>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Common Colors */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Common Colors
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {commonColors.map((color) => (
                <Tooltip key={color} title={color}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      backgroundColor: color,
                      borderRadius: 1,
                      border: currentColor === color ? '2px solid #333' : '1px solid #ccc',
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s',
                      },
                    }}
                    onClick={() => handlePredefinedColorSelect(color)}
                  >
                    {currentColor === color && (
                      <CheckIcon
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          color: color === '#000000' ? 'white' : 'black',
                          fontSize: 12,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Custom Color Input */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Custom Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#1976d2"
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: (
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      backgroundColor: customColor,
                      borderRadius: 1,
                      border: '1px solid #ccc',
                      mr: 1,
                    }}
                  />
                ),
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleCustomColorApply}
              disabled={!customColor}
            >
              Apply
            </Button>
          </Box>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outlined" onClick={handleClearColor}>
            Remove Color
          </Button>
        </Box>
      </Paper>
    </Popover>
  );
};

export default ColorPickerPopover;
