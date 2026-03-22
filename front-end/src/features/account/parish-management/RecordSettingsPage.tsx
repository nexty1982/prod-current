/**
 * RecordSettingsPage — Per-record-type toggle settings.
 */

import React, { useState } from 'react';
import { Box, Paper, Typography, Switch, useTheme } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import PreviewBanner from './PreviewBanner';

interface RecordTypeConfig {
  name: string;
  icon: React.ElementType;
  count: number;
  settings: { label: string; enabled: boolean }[];
}

const initialRecordTypes: RecordTypeConfig[] = [
  {
    name: 'Baptism Records',
    icon: DescriptionOutlinedIcon,
    count: 1248,
    settings: [
      { label: 'Require godparent information', enabled: true },
      { label: 'Auto-generate certificate numbers', enabled: true },
      { label: 'Send notification emails', enabled: false },
    ],
  },
  {
    name: 'Marriage Records',
    icon: FavoriteOutlinedIcon,
    count: 456,
    settings: [
      { label: 'Require witness information', enabled: true },
      { label: 'Track pre-marital counseling', enabled: true },
      { label: 'Generate marriage certificates', enabled: true },
    ],
  },
  {
    name: 'Funeral Records',
    icon: DescriptionOutlinedIcon,
    count: 892,
    settings: [
      { label: 'Record burial location', enabled: true },
      { label: 'Track memorial services', enabled: false },
      { label: 'Link to family records', enabled: true },
    ],
  },
];

const RecordSettingsPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [recordTypes, setRecordTypes] = useState(initialRecordTypes);

  const toggleSetting = (rtIdx: number, settingIdx: number) => {
    setRecordTypes((prev) =>
      prev.map((rt, i) =>
        i === rtIdx
          ? {
              ...rt,
              settings: rt.settings.map((s, j) =>
                j === settingIdx ? { ...s, enabled: !s.enabled } : s,
              ),
            }
          : rt,
      ),
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827', mb: 0.5 }}>
          Record Settings
        </Typography>
        <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
          Configure behavior and requirements for each record type
        </Typography>
      </Box>

      <PreviewBanner />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {recordTypes.map((rt, rtIdx) => {
          const Icon = rt.icon;
          return (
            <Paper
              key={rt.name}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: isDark ? 'rgba(45,27,78,0.3)' : 'rgba(45,27,78,0.08)' }}>
                    <Icon sx={{ fontSize: 18, color: isDark ? '#d4af37' : '#2d1b4e' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#f3f4f6' : '#111827' }}>
                      {rt.name}
                    </Typography>
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.6875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {rt.count.toLocaleString()} records
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  component="span"
                  role="button"
                  tabIndex={0}
                  aria-label={`Configure ${rt.name}`}
                  sx={{
                    fontFamily: "'Inter'",
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: isDark ? '#d4af37' : '#2d1b4e',
                    cursor: 'pointer',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Configure
                </Typography>
              </Box>
              <Box sx={{ px: 2.5 }}>
                {rt.settings.map((setting, sIdx) => (
                  <Box
                    key={setting.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 1.5,
                      borderBottom: sIdx < rt.settings.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` : 'none',
                    }}
                  >
                    <Typography sx={{ fontFamily: "'Inter'", fontSize: '0.8125rem', color: isDark ? '#f3f4f6' : '#111827' }}>
                      {setting.label}
                    </Typography>
                    <Switch
                      size="small"
                      checked={setting.enabled}
                      onChange={() => toggleSetting(rtIdx, sIdx)}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default RecordSettingsPage;
