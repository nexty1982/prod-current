/**
 * VersionSwitcher Component for OrthodoxMetrics
 * Allows superadmins to switch between different front-end build directories
 */

import React, { useState, useEffect } from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Build as BuildIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';

interface Version {
  id: string;
  path: string;
  exists: boolean;
  current: boolean;
}

interface VersionInfo {
  success: boolean;
  versions: Version[];
  selected: string;
}

const VersionSwitcher: React.FC = () => {
  const { user } = useAuth();
  const [selectedVersion, setSelectedVersion] = useState<string>('production');
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);

  // Only show for superadmins
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  // Load available versions and current selection on mount
  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/version/info', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data: VersionInfo = await response.json();
        setVersions(data.versions);
        setSelectedVersion(data.selected);
        
        // Sync with localStorage
        localStorage.setItem('om_selected_version', data.selected);
      } else {
        console.error('Failed to load version info:', await response.text());
      }
    } catch (error) {
      console.error('Error loading version info:', error);
    } finally {
      setLoading(false);
    }
  };

  // API endpoints for version management
  const switchVersion = async (version: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/version/switch', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ version })
      });
      
      if (response.ok) {
        localStorage.setItem('om_selected_version', version);
        setSelectedVersion(version);
        // Reload to apply new version
        window.location.reload();
      } else {
        console.error('Failed to switch version:', await response.text());
      }
    } catch (error) {
      console.error('Error switching version:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetVersion = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/version/reset', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        localStorage.removeItem('om_selected_version');
        setSelectedVersion('production');
        window.location.reload();
      } else {
        console.error('Failed to reset version:', await response.text());
      }
    } catch (error) {
      console.error('Error resetting version:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (event: SelectChangeEvent) => {
    const newVersion = event.target.value;
    switchVersion(newVersion);
  };

  const getVersionLabel = (version: Version) => {
    const baseLabel = version.id.charAt(0).toUpperCase() + version.id.slice(1);
    if (!version.exists) {
      return `${baseLabel} (Missing)`;
    }
    if (version.current) {
      return `${baseLabel} (Current)`;
    }
    return baseLabel;
  };

  const getVersionColor = (version: Version) => {
    if (!version.exists) return 'error';
    if (version.current) return 'primary';
    if (version.id === 'production') return 'success';
    if (version.id === 'beta') return 'warning';
    return 'default';
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        padding: 2,
        minWidth: 280,
        color: 'white',
        fontFamily: 'monospace'
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <BuildIcon sx={{ color: '#00ff41', fontSize: 20 }} />
        <Typography
          variant="caption"
          sx={{ 
            color: '#00ff41',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1
          }}
        >
          Version Switcher
        </Typography>
        <Tooltip title="Refresh versions">
          <IconButton
            size="small"
            onClick={loadVersionInfo}
            disabled={loading}
            sx={{ color: 'white', ml: 'auto' }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <Select
          value={selectedVersion}
          onChange={handleVersionChange}
          disabled={loading}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#00ff41',
            },
            '& .MuiSvgIcon-root': {
              color: 'white',
            },
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }
            }
          }}
        >
          {versions.map((version) => (
            <MenuItem
              key={version.id}
              value={version.id}
              disabled={!version.exists}
              sx={{
                color: version.exists ? 'white' : 'rgba(255, 255, 255, 0.5)',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0, 255, 65, 0.2)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 255, 65, 0.3)',
                  },
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={1} width="100%">
                {!version.exists && <WarningIcon fontSize="small" color="error" />}
                <Typography flex={1}>
                  {getVersionLabel(version)}
                </Typography>
                <Chip
                  label={version.id}
                  size="small"
                  color={getVersionColor(version)}
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box display="flex" gap={1}>
        <Chip
          label="Reset to Production"
          size="small"
          color="default"
          variant="outlined"
          onClick={resetVersion}
          disabled={loading || selectedVersion === 'production'}
          sx={{
            color: 'white',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            fontSize: '0.7rem',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&.Mui-disabled': {
              color: 'rgba(255, 255, 255, 0.3)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        />
        
        {selectedVersion !== 'production' && (
          <Chip
            label={`Using: ${selectedVersion}`}
            size="small"
            color="warning"
            sx={{ fontSize: '0.7rem' }}
          />
        )}
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 1,
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.65rem',
        }}
      >
        Switch between build directories without rebuilding
      </Typography>
    </Box>
  );
};

export default VersionSwitcher;
