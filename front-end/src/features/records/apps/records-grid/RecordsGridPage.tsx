import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { listRecords, type TableKey, type SortDir } from '@/shared/lib/recordsApi';
import AdvancedGrid from '../records/components/AdvancedGrid';

export default function RecordsGridPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: any };
  const [sp] = useSearchParams();

  // read from state first, then from query params
  const table = (state?.table || sp.get('table') || 'baptism') as TableKey;
  const churchId = Number(state?.churchId || sp.get('churchId') || sp.get('church_id') || 0);
  const search = String(state?.search || sp.get('search') || '');
  const sortField = state?.sortField || sp.get('sortField') || undefined;
  const sortDirection = (state?.sortDirection || sp.get('sortDirection') || 'desc') as SortDir;

  const [rows, setRows] = useState<any[]>(state?.prefetch?.rows || []);
  const [count, setCount] = useState<number>(state?.prefetch?.count || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(undefined);

    listRecords({
      table,
      churchId,
      page: 1,
      limit: 500, // adjust if you want paging inside grid
      search,
      sortField,
      sortDirection,
      signal: ctrl.signal
    })
      .then(({ rows, count }) => {
        setRows(rows);
        setCount(count);
      })
      .catch((e: any) => {
        if (!ctrl.signal.aborted) setError(e?.message || 'Failed to load');
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [table, churchId, search, sortField, sortDirection]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const getTitle = () => {
    const tableNames = {
      baptism: 'Baptism',
      marriage: 'Marriage', 
      funeral: 'Funeral'
    };
    return `${tableNames[table]} Records - Advanced Grid`;
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleGoBack} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            {getTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {count} records
          </Typography>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading {table} records...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button onClick={() => window.location.reload()} sx={{ ml: 2 }}>
              Retry
            </Button>
          </Alert>
        ) : (
          <Box sx={{ flex: 1 }}>
            <AdvancedGrid
              table={table}
              churchId={churchId}
              search={search}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}