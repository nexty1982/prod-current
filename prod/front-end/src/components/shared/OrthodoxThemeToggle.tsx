import React, { useContext } from 'react';
import {
  IconButton,
  Tooltip,
  Box,
  Switch,
  FormControlLabel,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Paper,
  Stack,
  Chip
} from '@mui/material';
import {
  IconSun,
  IconMoon,
  IconPalette,
  IconSettings,
  IconBuildingChurch
} from '@tabler/icons-react';
import { CustomizerContext } from 'src/context/CustomizerContext';

interface OrthodoxThemeToggleProps {
  showText?: boolean;
  variant?: 'icon' | 'switch' | 'menu';
  size?: 'small' | 'medium' | 'large';
}

const OrthodoxThemeToggle: React.FC<OrthodoxThemeToggleProps> = ({
  showText = false,
  variant = 'icon',
  size = 'medium'
}) => {
  const {
    activeMode,
    setActiveMode,
    activeTheme,
    setActiveTheme,
  } = useContext(CustomizerContext);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleMode = () => {
    setActiveMode(activeMode === 'light' ? 'dark' : 'light');
  };

  const themes = [
    { key: 'BLUE_THEME', name: 'Traditional Blue', color: '#1976d2' },
    { key: 'GREEN_THEME', name: 'Orthodox Green', color: '#1d442d' },
    { key: 'PURPLE_THEME', name: 'Episcopal Purple', color: '#7b1fa2' },
    { key: 'ORANGE_THEME', name: 'Warm Gold', color: '#f57c00' },
    { key: 'AQUA_THEME', name: 'Peaceful Aqua', color: '#00acc1' },
  ];

  // Icon variant - simple toggle button
  if (variant === 'icon') {
    return (
      <Tooltip 
        title={`Switch to ${activeMode === 'light' ? 'dark' : 'light'} mode`}
        placement="bottom"
      >
        <IconButton 
          onClick={toggleMode}
          size={size}
          className="orthodox-theme-toggle"
          sx={{
            color: activeMode === 'light' ? 'var(--orthodox-gold)' : 'var(--orthodox-cream)',
            '&:hover': {
              backgroundColor: 'var(--orthodox-maroon)',
              color: 'var(--orthodox-cream)',
            }
          }}
        >
          {activeMode === 'light' ? <IconMoon size={20} /> : <IconSun size={20} />}
        </IconButton>
      </Tooltip>
    );
  }

  // Switch variant - toggle switch with text
  if (variant === 'switch') {
    return (
      <Box className="orthodox-theme-switch" sx={{ display: 'flex', alignItems: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={activeMode === 'dark'}
              onChange={toggleMode}
              sx={{
                '& .MuiSwitch-thumb': {
                  backgroundColor: activeMode === 'dark' ? 'var(--orthodox-gold)' : 'var(--orthodox-maroon)',
                },
                '& .MuiSwitch-track': {
                  backgroundColor: 'var(--orthodox-border-light)',
                }
              }}
            />
          }
          label={showText ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeMode === 'light' ? <IconSun size={16} /> : <IconMoon size={16} />}
              <Typography variant="body2" sx={{ fontFamily: 'var(--font-orthodox-header)' }}>
                {activeMode === 'light' ? 'Light Mode' : 'Dark Mode'}
              </Typography>
            </Box>
          ) : ''}
        />
      </Box>
    );
  }

  // Menu variant - advanced settings menu
  if (variant === 'menu') {
    return (
      <>
        <Tooltip title="Orthodox Theme Settings" placement="bottom">
          <IconButton
            onClick={handleMenuOpen}
            size={size}
            className="orthodox-theme-menu-toggle"
            sx={{
              color: 'var(--orthodox-maroon)',
              '&:hover': {
                backgroundColor: 'var(--orthodox-gold)',
                color: 'var(--orthodox-maroon)',
              }
            }}
          >
            <IconBuildingChurch size={20} />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          PaperProps={{
            className: 'orthodox-theme-menu',
            sx: {
              minWidth: 280,
              fontFamily: 'var(--font-orthodox-serif)',
              border: '2px solid var(--orthodox-gold)',
              borderRadius: 2,
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontFamily: 'var(--font-orthodox-decorative)',
                color: 'var(--orthodox-maroon)',
                textAlign: 'center',
                mb: 1
              }}
            >
              Orthodox Theme Settings
            </Typography>
            <Divider sx={{ borderColor: 'var(--orthodox-gold)' }} />
          </Box>

          {/* Mode Toggle */}
          <MenuItem onClick={handleMenuClose}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" width="100%">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {activeMode === 'light' ? <IconSun size={18} /> : <IconMoon size={18} />}
                <Typography sx={{ fontFamily: 'var(--font-orthodox-serif)' }}>
                  {activeMode === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Typography>
              </Box>
              <Switch
                checked={activeMode === 'dark'}
                onChange={toggleMode}
                size="small"
                sx={{
                  '& .MuiSwitch-thumb': {
                    backgroundColor: activeMode === 'dark' ? 'var(--orthodox-gold)' : 'var(--orthodox-maroon)',
                  }
                }}
              />
            </Stack>
          </MenuItem>

          <Divider sx={{ borderColor: 'var(--orthodox-border-light)' }} />

          {/* Theme Colors */}
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontFamily: 'var(--font-orthodox-header)',
                color: 'var(--orthodox-maroon)',
                mb: 1
              }}
            >
              Theme Colors
            </Typography>
            <Stack spacing={1}>
              {themes.map((theme) => (
                <MenuItem
                  key={theme.key}
                  onClick={() => {
                    setActiveTheme(theme.key);
                    handleMenuClose();
                  }}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: activeTheme === theme.key ? 'var(--orthodox-gold)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'var(--orthodox-bg-light)',
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2} width="100%">
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: theme.color,
                        border: '2px solid var(--orthodox-border-light)',
                      }}
                    />
                    <Typography 
                      sx={{ 
                        fontFamily: 'var(--font-orthodox-serif)',
                        flexGrow: 1
                      }}
                    >
                      {theme.name}
                    </Typography>
                    {activeTheme === theme.key && (
                      <Chip 
                        label="Active" 
                        size="small" 
                        className="orthodox-badge" 
                        sx={{ 
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: 'var(--orthodox-maroon)',
                          color: 'var(--orthodox-cream)'
                        }}
                      />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Stack>
          </Box>

          {/* Font Preview */}
          <Divider sx={{ borderColor: 'var(--orthodox-border-light)' }} />
          <Box sx={{ p: 2 }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontFamily: 'var(--font-orthodox-header)',
                color: 'var(--orthodox-maroon)',
                mb: 1
              }}
            >
              Font Preview
            </Typography>
            <Paper 
              sx={{ 
                p: 2, 
                backgroundColor: 'var(--orthodox-bg-light)',
                border: '1px solid var(--orthodox-border-light)'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'var(--font-orthodox-decorative)',
                  color: 'var(--orthodox-gold)',
                  textAlign: 'center',
                  mb: 1
                }}
              >
                ☦ Orthodox Typography ☦
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'var(--font-orthodox-serif)',
                  color: 'var(--orthodox-maroon)',
                  textAlign: 'center'
                }}
              >
                Beautiful ecclesiastical fonts for sacred records
              </Typography>
            </Paper>
          </Box>
        </Menu>
      </>
    );
  }

  return null;
};

export default OrthodoxThemeToggle;
