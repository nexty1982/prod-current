/**
 * SearchConfigurationPage — Search performance, filters, and results display settings.
 */

import React, { useState } from 'react';
import { Box, Paper, Typography, Switch, Slider, useTheme } from '@mui/material';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import PreviewBanner from './PreviewBanner';

interface SettingGroup {
  title: string;
  icon: React.ElementType;
  settings: SettingItem[];
}

interface SettingItem {
  type: 'toggle' | 'slider';
  label: string;
  description?: string;
  key: string;
}

const SearchConfigurationPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    fastSearch: true,
    fuzzyMatching: true,
    dateRangeFilter: true,
    recordTypeFilter: true,
    parishFilter: false,
    highlightMatches: true,
  });

  const [sliders, setSliders] = useState<Record<string, number>>({
    minSearchLength: 3,
    resultsPerPage: 25,
  });

  const groups: SettingGroup[] = [
    {
      title: 'Search Performance',
      icon: BoltOutlinedIcon,
      settings: [
        { type: 'toggle', label: 'Enable Fast Search', description: 'Use indexed search for faster results', key: 'fastSearch' },
        { type: 'toggle', label: 'Fuzzy Matching', description: 'Find results even with typos or misspellings', key: 'fuzzyMatching' },
        { type: 'slider', label: 'Minimum Search Length', key: 'minSearchLength' },
      ],
    },
    {
      title: 'Available Filters',
      icon: FilterListOutlinedIcon,
      settings: [
        { type: 'toggle', label: 'Date Range Filter', key: 'dateRangeFilter' },
        { type: 'toggle', label: 'Record Type Filter', key: 'recordTypeFilter' },
        { type: 'toggle', label: 'Parish Filter', key: 'parishFilter' },
      ],
    },
    {
      title: 'Results Display',
      icon: SearchOutlinedIcon,
      settings: [
        { type: 'slider', label: 'Results Per Page', key: 'resultsPerPage' },
        { type: 'toggle', label: 'Highlight Matches', description: 'Show matching text in search results', key: 'highlightMatches' },
      ],
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
          Search Configuration
        </Typography>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
          Configure global search behavior and performance settings
        </Typography>
      </Box>

      <PreviewBanner />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 720 }}>
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <Paper
              key={group.title}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)' }}>
                  <Icon sx={{ fontSize: 18, color: isDark ? '#d4af37' : '#2d1b4e' }} />
                </Box>
                <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
                  {group.title}
                </Typography>
              </Box>

              {group.settings.map((setting, i) => (
                <Box
                  key={setting.key}
                  sx={{
                    py: 1.5,
                    borderBottom: i < group.settings.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`
                      : 'none',
                  }}
                >
                  {setting.type === 'toggle' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                          {setting.label}
                        </Typography>
                        {setting.description && (
                          <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                            {setting.description}
                          </Typography>
                        )}
                      </Box>
                      <Switch
                        size="small"
                        checked={toggles[setting.key] ?? false}
                        onChange={(e) => setToggles((prev) => ({ ...prev, [setting.key]: e.target.checked }))}
                      />
                    </Box>
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', fontWeight: 500, color: isDark ? '#f3f4f6' : '#111827' }}>
                          {setting.label}
                        </Typography>
                        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.75rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                          {setting.key === 'minSearchLength'
                            ? `${sliders[setting.key]} characters`
                            : `${sliders[setting.key]} results`}
                        </Typography>
                      </Box>
                      <Slider
                        size="small"
                        value={sliders[setting.key]}
                        onChange={(_, val) => setSliders((prev) => ({ ...prev, [setting.key]: val as number }))}
                        min={setting.key === 'minSearchLength' ? 1 : 10}
                        max={setting.key === 'minSearchLength' ? 5 : 100}
                        step={setting.key === 'minSearchLength' ? 1 : 5}
                        sx={{
                          color: isDark ? '#d4af37' : '#2d1b4e',
                          '& .MuiSlider-track': { bgcolor: isDark ? '#d4af37' : '#2d1b4e' },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default SearchConfigurationPage;
