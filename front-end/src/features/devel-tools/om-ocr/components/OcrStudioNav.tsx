/**
 * OcrStudioNav — Compact mini-navigation bar for OCR Studio pages.
 * Drop into any OCR Studio sub-page to enable quick jumps between siblings.
 *
 * Includes a church selector dropdown (super_admin only) that persists the
 * selected church as `?church=XX` in the URL and carries the param across
 * sibling page navigations.
 */

import {
  Assessment as AssessmentIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  Settings as SettingsIcon,
  CloudUpload as UploadIcon,
  ViewColumn as ViewColumnIcon,
  TableRows as TableRowsIcon,
} from '@mui/icons-material';
import { alpha, Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, useTheme } from '@mui/material';
import { apiClient } from '@/shared/lib/axiosInstance';
import { useAuth } from '@/context/AuthContext';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  /** When true, only super_admin sees this link (matches backend requireRole guards). */
  superAdminOnly?: boolean;
}

interface ChurchOption {
  id: number;
  name: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Hub',              path: '/devel/ocr-studio',                 icon: <HomeIcon fontSize="small" /> },
  { label: 'Upload',           path: '/devel/ocr-studio/upload',          icon: <UploadIcon fontSize="small" /> },
  { label: 'Job History',      path: '/devel/ocr-studio/jobs',            icon: <HistoryIcon fontSize="small" />, superAdminOnly: true },
  { label: 'Record Headers',   path: '/devel/ocr-studio/record-fields',   icon: <TableRowsIcon fontSize="small" /> },
  { label: 'Settings',         path: '/devel/ocr-studio/settings',        icon: <SettingsIcon fontSize="small" /> },
  { label: 'Table Extractor',  path: '/devel/ocr-studio/table-extractor', icon: <AssessmentIcon fontSize="small" />, superAdminOnly: true },
  { label: 'Layout Templates', path: '/devel/ocr-studio/layout-templates', icon: <ViewColumnIcon fontSize="small" />, superAdminOnly: true },
];

const OcrStudioNav: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Church selector state (super_admin only) ────────────────────────────
  const [churches, setChurches] = useState<ChurchOption[]>([]);
  const selectedChurchId = searchParams.get('church') ? Number(searchParams.get('church')) : null;

  // Fetch church list once on mount (super_admin only)
  useEffect(() => {
    if (!isSuperAdmin()) return;
    (async () => {
      try {
        const res: any = await apiClient.get('/api/churches');
        const list = res.data?.churches || res.churches || res.data || [];
        const sorted = (Array.isArray(list) ? list : []).sort((a: ChurchOption, b: ChurchOption) =>
          (a.name || '').localeCompare(b.name || ''),
        );
        setChurches(sorted);
        // Auto-select first church if none is in URL and user has no church_id
        if (!searchParams.get('church') && !user?.church_id && sorted.length > 0) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('church', String(sorted[0].id));
            return next;
          }, { replace: true });
        }
      } catch (err) {
        console.error('[OcrStudioNav] Failed to load churches:', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChurchChange = useCallback(
    (newId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('church', String(newId));
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin()),
    [isSuperAdmin],
  );

  // Navigate to sibling page, preserving the ?church= param
  const handleNavigate = useCallback(
    (targetPath: string) => {
      const church = searchParams.get('church');
      if (church) {
        navigate(`${targetPath}?church=${church}`);
      } else {
        navigate(targetPath);
      }
    },
    [navigate, searchParams],
  );

  return (
    <Box
      sx={{
        px: { xs: 1, sm: 2 },
        py: 0.75,
        mb: 1.5,
        borderBottom: '1px solid',
        borderColor: theme.palette.divider,
        bgcolor: alpha(theme.palette.primary.main, 0.03),
      }}
    >
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center">
        {visibleItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Button
              key={item.path}
              size="small"
              startIcon={item.icon}
              onClick={() => !isActive && handleNavigate(item.path)}
              sx={{
                textTransform: 'none',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.78rem',
                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.10) : 'transparent',
                borderRadius: 1,
                px: 1.5,
                minHeight: 32,
                '&:hover': {
                  bgcolor: isActive
                    ? alpha(theme.palette.primary.main, 0.14)
                    : alpha(theme.palette.action.hover, 0.06),
                },
              }}
            >
              {item.label}
            </Button>
          );
        })}

        {/* Spacer pushes church dropdown to the right */}
        {isSuperAdmin() && churches.length > 0 && <Box sx={{ flexGrow: 1 }} />}

        {/* Church selector (super_admin only) */}
        {isSuperAdmin() && churches.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180, maxWidth: 260 }}>
            <InputLabel id="ocr-nav-church-label" sx={{ fontSize: '0.78rem' }}>Church</InputLabel>
            <Select
              labelId="ocr-nav-church-label"
              value={selectedChurchId ?? ''}
              label="Church"
              onChange={(e) => handleChurchChange(Number(e.target.value))}
              sx={{
                fontSize: '0.78rem',
                height: 32,
                '& .MuiSelect-select': { py: 0.5 },
              }}
            >
              {churches.map((c) => (
                <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.78rem' }}>
                  {c.name} (#{c.id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Stack>
    </Box>
  );
};

export default OcrStudioNav;
