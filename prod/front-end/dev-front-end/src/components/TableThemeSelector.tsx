import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Popover,
  Grid,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import '../styles/table-themes.css';

export interface TableTheme {
  value: string;
  label: string;
  description: string;
  preview: {
    headerColor: string;
    rowColor: string;
    hoverColor: string;
  };
}

const TABLE_THEMES: TableTheme[] = [
  {
    value: 'table-theme-ocean-serenity',
    label: 'Ocean Serenity',
    description: 'Clean and professional blue gradient theme',
    preview: {
      headerColor: '#1e3a8a',
      rowColor: '#f8fafc',
      hoverColor: '#dbeafe',
    },
  },
  {
    value: 'table-theme-forest-harmony',
    label: 'Forest Harmony',
    description: 'Natural and calming green gradient theme',
    preview: {
      headerColor: '#166534',
      rowColor: '#f0fdf4',
      hoverColor: '#dcfce7',
    },
  },
  {
    value: 'table-theme-sunset-warmth',
    label: 'Sunset Warmth',
    description: 'Warm and inviting orange gradient theme',
    preview: {
      headerColor: '#ea580c',
      rowColor: '#fff7ed',
      hoverColor: '#fed7aa',
    },
  },
  {
    value: 'table-theme-royal-elegance',
    label: 'Royal Elegance',
    description: 'Elegant and sophisticated purple gradient theme',
    preview: {
      headerColor: '#7c3aed',
      rowColor: '#faf5ff',
      hoverColor: '#e9d5ff',
    },
  },
  {
    value: 'table-theme-midnight-sophistication',
    label: 'Midnight Sophistication',
    description: 'Modern and sleek dark theme',
    preview: {
      headerColor: '#111827',
      rowColor: '#374151',
      hoverColor: '#4b5563',
    },
  },
];

interface TableThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  variant?: 'dropdown' | 'popover';
  size?: 'small' | 'medium';
  showLabel?: boolean;
}

export const TableThemeSelector: React.FC<TableThemeSelectorProps> = ({
  selectedTheme,
  onThemeChange,
  variant = 'dropdown',
  size = 'medium',
  showLabel = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Ensure selectedTheme is valid on mount
  useEffect(() => {
    const isValidTheme = TABLE_THEMES.find(theme => theme.value === selectedTheme);
    if (!isValidTheme && TABLE_THEMES.length > 0) {
      onThemeChange(TABLE_THEMES[0].value);
    }
  }, [selectedTheme, onThemeChange]);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const getSelectedTheme = () => {
    return TABLE_THEMES.find(theme => theme.value === selectedTheme) || TABLE_THEMES[0];
  };

  const renderDropdown = () => {
    // Ensure selectedTheme is valid, fallback to first theme if not
    const validSelectedTheme = TABLE_THEMES.find(theme => theme.value === selectedTheme) 
      ? selectedTheme 
      : TABLE_THEMES[0]?.value || '';
    
    return (
      <FormControl size={size} sx={{ minWidth: 200 }}>
        {showLabel && <InputLabel>Table Theme</InputLabel>}
        <Select
          value={validSelectedTheme}
          onChange={(e) => onThemeChange(e.target.value)}
          label={showLabel ? 'Table Theme' : undefined}
          sx={{
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          {TABLE_THEMES.map((theme) => (
            <MenuItem key={theme.value} value={theme.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    background: theme.preview.headerColor,
                    border: '1px solid #e0e0e0',
                  }}
                />
                <Typography variant="body2">{theme.label}</Typography>
                {validSelectedTheme === theme.value && (
                  <CheckIcon sx={{ ml: 'auto', fontSize: 16, color: 'primary.main' }} />
                )}
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const renderPopover = () => (
    <>
      <Tooltip title="Select Table Theme">
        <IconButton
          onClick={handlePopoverOpen}
          size={size}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'primary.main',
            },
          }}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            p: 2,
            minWidth: 300,
            maxWidth: 400,
          },
        }}
        disableRestoreFocus
        keepMounted={false}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Select Table Theme
        </Typography>
        <Grid container spacing={1}>
          {TABLE_THEMES.map((theme) => (
            <Grid size={12} key={theme.value}>
              <Card
                sx={{
                  border: selectedTheme === theme.value ? '2px solid' : '1px solid',
                  borderColor: selectedTheme === theme.value ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                  },
                }}
              >
                <CardActionArea onClick={() => {
                  onThemeChange(theme.value);
                  handlePopoverClose();
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          background: theme.preview.headerColor,
                          border: '1px solid #e0e0e0',
                        }}
                      />
                      <Typography variant="subtitle2" fontWeight={600}>
                        {theme.label}
                      </Typography>
                      {selectedTheme === theme.value && (
                        <CheckIcon sx={{ ml: 'auto', color: 'primary.main' }} />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {theme.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: 0.5,
                          background: theme.preview.headerColor,
                        }}
                      />
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: 0.5,
                          background: theme.preview.rowColor,
                          border: '1px solid #e0e0e0',
                        }}
                      />
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: 0.5,
                          background: theme.preview.hoverColor,
                          border: '1px solid #e0e0e0',
                        }}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Popover>
    </>
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {variant === 'dropdown' ? renderDropdown() : renderPopover()}
      {variant === 'popover' && (
        <Chip
          label={getSelectedTheme().label}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.75rem' }}
        />
      )}
    </Box>
  );
};

export default TableThemeSelector; 