/**
 * OcrChurchSelector — Full-width "Target Church" selector for OCR Studio pages.
 * Matches the same pattern as the Upload page's admin church selector.
 * Only renders for super_admin / admin users.
 *
 * Reads/writes `?church=XX` in URL search params so the selection
 * persists across page navigation via OcrStudioNav.
 */

import { useAuth } from '@/context/AuthContext';
import churchService from '@/shared/lib/churchService';
import { apiClient } from '@/shared/lib/axiosInstance';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface ChurchOption {
  id: number;
  church_name?: string;
  name?: string;
}

const OcrChurchSelector: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const isAdmin = isSuperAdmin() || user?.role === 'admin' || user?.role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();
  const [churches, setChurches] = useState<ChurchOption[]>([]);

  const churchParam = searchParams.get('church');
  const selectedChurchId = churchParam ? Number(churchParam) : null;

  // Fetch church list on mount (admin/super_admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        let list: any[] = await churchService.fetchChurches();
        if (list.length === 0) {
          const fallback: any = await apiClient.get('/api/churches');
          const body = fallback?.data ?? fallback;
          const inner = body?.data ?? body;
          list = inner?.churches || (Array.isArray(inner) ? inner : []);
        }
        if (cancelled) return;
        setChurches(list);
        // Auto-select first church if none in URL
        if (!searchParams.get('church') && list.length > 0) {
          const userChurchId = user?.church_id ? Number(user.church_id) : null;
          const defaultId = (userChurchId && list.some((c: any) => c.id === userChurchId))
            ? userChurchId
            : list[0].id;
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('church', String(defaultId));
            return next;
          }, { replace: true });
        }
      } catch {
        if (!cancelled) setChurches([]);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin || churches.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2.5 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Target Church</InputLabel>
        <Select
          value={selectedChurchId ?? ''}
          label="Target Church"
          onChange={(e) => {
            const newId = Number(e.target.value);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('church', String(newId));
              return next;
            }, { replace: true });
          }}
        >
          {churches.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.church_name || c.name || `Church ${c.id}`}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

export default OcrChurchSelector;
