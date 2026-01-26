/**
 * Orthodox Metrics - Theme Customizer Component
 * Provides UI for selecting and managing application themes
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Paper,
  useMediaQuery,
  useTheme as useMuiTheme,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  AutoMode as AutoModeIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Church as ChurchIcon,
  Settings as SettingsIcon,
  SaveOutlined as SaveIcon,
} from '@mui/icons-material';

import { useTheme, ThemeConfig, ThemeName, THEME_CONFIGS } from '../../context/ThemeContext.tsx';

interface ThemeCustomizerProps {
  variant?: 'button' | 'menu' | 'full';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Theme Color Preview Component
 */
const ThemeColorPreview: React.FC<{ themeConfig: ThemeConfig }> = ({ themeConfig }) => (
  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: themeConfig.colors.primary,
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: themeConfig.colors.secondary,
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: themeConfig.colors.accent,
        border: '1px solid',
        borderColor: 'divider',
      }}
    />
  </Box>
);

/**
 * Theme Selection Menu Item
 */
const ThemeMenuItem: React.FC<{
  theme: ThemeConfig;
  isSelected: boolean;
  onSelect: (themeName: ThemeName) => void;
}> = ({ theme, isSelected, onSelect }) => {
  const muiTheme = useMuiTheme();
  
  return (
    <MenuItem 
      onClick={() => onSelect(theme.name)}
      sx={{
        minWidth: 280,
        flexDirection: 'column',
        alignItems: 'stretch',
        p: 2,
        borderLeft: isSelected ? `4px solid ${theme.colors.primary}` : '4px solid transparent',
        backgroundColor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="span">
            {theme.icon}
          </Typography>
          <Typography variant="subtitle1" fontWeight={isSelected ? 600 : 400}>
            {theme.displayName}
          </Typography>
        </Box>
        <ThemeColorPreview themeConfig={theme} />
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {theme.description}
      </Typography>
      
      {theme.season && theme.season !== 'ordinary' && (
        <Chip
          label={`${theme.season.charAt(0).toUpperCase() + theme.season.slice(1)} Season`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ alignSelf: 'flex-start' }}
        />
      )}
      
      {isSelected && (
        <Chip
          label="Current"
          size="small"
          color="success"
          sx={{ alignSelf: 'flex-end', mt: 1 }}
        />
      )}
    </MenuItem>
  );
};

/**
 * Theme Customizer Component
 */
const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  variant = 'button',
  showLabel = true,
  size = 'medium'
}) => {
  const {
    currentTheme,
    themeConfig,
    setTheme,
    availableThemes,
    autoThemeEnabled,
    setAutoThemeEnabled,
    getCurrentLiturgicalSeason,
    isSystemDarkMode
  } = useTheme();
  
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
    setShowAdvanced(false);
  };
  
  const handleThemeSelect = (themeName: ThemeName) => {
    setTheme(themeName);
    if (variant === 'button') {
      handleClose();
    }
  };
  
  const handleAutoThemeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoThemeEnabled(event.target.checked);
  };
  
  const currentSeason = getCurrentLiturgicalSeason();
  const seasonalThemes = availableThemes.filter(theme => theme.season === currentSeason);
  const liturgicalThemes = availableThemes.filter(theme => theme.season && theme.season !== 'ordinary');
  const generalThemes = availableThemes.filter(theme => !theme.season || theme.season === 'ordinary');
  
  // Button variant
  if (variant === 'button') {
    return (
      <>
        <Tooltip title="Customize Theme">
          <Button
            variant="outlined"
            startIcon={<PaletteIcon />}
            onClick={handleClick}
            size={size}
            sx={{
              borderColor: themeConfig.colors.primary,
              color: themeConfig.colors.primary,
              '&:hover': {
                borderColor: themeConfig.colors.primary,
                backgroundColor: `${themeConfig.colors.primary}10`,
              },
            }}
          >
            {showLabel && !isMobile && themeConfig.displayName}
            {!showLabel && themeConfig.icon}
          </Button>
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              maxHeight: 600,
              minWidth: 320,
            },
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          {/* Auto Theme Toggle */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoThemeEnabled}
                  onChange={handleAutoThemeToggle}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    Auto Liturgical Theme
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Automatically change theme based on liturgical season
                  </Typography>
                </Box>
              }
            />
            
            {autoThemeEnabled && (
              <Box sx={{ mt: 1 }}>
                <Chip
                  icon={<AutoModeIcon />}
                  label={`Current season: ${currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1)}`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
          
          {/* Current Season Themes */}
          {seasonalThemes.length > 0 && (
            <>
              <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 1, display: 'block', fontWeight: 600 }}>
                Current Season ({currentSeason})
              </Typography>
              {seasonalThemes.map(theme => (
                <ThemeMenuItem
                  key={theme.name}
                  theme={theme}
                  isSelected={currentTheme === theme.name}
                  onSelect={handleThemeSelect}
                />
              ))}
              <Divider />
            </>
          )}
          
          {/* All Liturgical Themes */}
          <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 1, display: 'block', fontWeight: 600 }}>
            Liturgical Themes
          </Typography>
          {liturgicalThemes.map(theme => (
            <ThemeMenuItem
              key={theme.name}
              theme={theme}
              isSelected={currentTheme === theme.name}
              onSelect={handleThemeSelect}
            />
          ))}
          
          <Divider />
          
          {/* General Themes */}
          <Typography variant="overline" sx={{ px: 2, pt: 2, pb: 1, display: 'block', fontWeight: 600 }}>
            General Themes
          </Typography>
          {generalThemes.map(theme => (
            <ThemeMenuItem
              key={theme.name}
              theme={theme}
              isSelected={currentTheme === theme.name}
              onSelect={handleThemeSelect}
            />
          ))}
          
          {/* Advanced Settings */}
          <Divider />
          <Box sx={{ p: 2 }}>
            <Button
              variant="text"
              startIcon={<SettingsIcon />}
              onClick={() => setShowAdvanced(!showAdvanced)}
              size="small"
              fullWidth
            >
              Advanced Theme Settings
            </Button>
            
            {showAdvanced && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  System preference: {isSystemDarkMode ? 'Dark' : 'Light'} mode
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  AG Grid theme: {themeConfig.agGridTheme}
                </Typography>
                <br />
                <Typography variant="caption" color="text.secondary">
                  CSS class: {themeConfig.cssClass}
                </Typography>
              </Box>
            )}
          </Box>
        </Menu>
      </>
    );
  }
  
  // Menu variant (for sidebar integration)
  if (variant === 'menu') {
    return (
      <Box sx={{ p: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PaletteIcon fontSize="small" />
          <Typography variant="subtitle2">Theme</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableThemes.slice(0, 4).map(theme => (
            <Tooltip key={theme.name} title={theme.displayName}>
              <IconButton
                size="small"
                onClick={() => handleThemeSelect(theme.name)}
                sx={{
                  border: currentTheme === theme.name ? 2 : 1,
                  borderColor: currentTheme === theme.name ? theme.colors.primary : 'divider',
                  borderStyle: 'solid',
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: theme.colors.secondary,
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 12 }}>
                  {theme.icon}
                </Typography>
              </IconButton>
            </Tooltip>
          ))}
        </Box>
        
        <FormControlLabel
          control={
            <Switch
              checked={autoThemeEnabled}
              onChange={handleAutoThemeToggle}
              size="small"
            />
          }
          label={<Typography variant="caption">Auto Season</Typography>}
          sx={{ mt: 1 }}
        />
      </Box>
    );
  }
  
  // Full variant (for dedicated theme settings page)
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Theme Customization
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={autoThemeEnabled}
              onChange={handleAutoThemeToggle}
              color="primary"
            />
          }
          label="Automatically change theme based on liturgical season"
        />
      </Box>
      
      <Typography variant="subtitle1" gutterBottom>
        Available Themes
      </Typography>
      
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {availableThemes.map(theme => (
          <Paper
            key={theme.name}
            variant="outlined"
            sx={{
              p: 2,
              cursor: 'pointer',
              border: currentTheme === theme.name ? 2 : 1,
              borderColor: currentTheme === theme.name ? theme.colors.primary : 'divider',
              '&:hover': {
                borderColor: theme.colors.primary,
              },
            }}
            onClick={() => handleThemeSelect(theme.name)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6">{theme.icon}</Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {theme.displayName}
              </Typography>
              <Box sx={{ ml: 'auto' }}>
                <ThemeColorPreview themeConfig={theme} />
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {theme.description}
            </Typography>
            
            {theme.season && (
              <Chip
                label={`${theme.season.charAt(0).toUpperCase() + theme.season.slice(1)} Season`}
                size="small"
                variant="outlined"
              />
            )}
          </Paper>
        ))}
      </Box>
    </Paper>
  );
};

export default ThemeCustomizer;
