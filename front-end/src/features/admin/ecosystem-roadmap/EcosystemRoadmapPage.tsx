/**
 * EcosystemRoadmapPage — superadmin/admin-only read-only view of the canonical
 * Component Maturity Roadmap owned by OMStudio.
 *
 * Data is fetched from OM's thin proxy at /api/admin/ecosystem-roadmap, which
 * forwards server-to-server to OMStudio /api/governance/component-roadmap.
 * The page never writes; OMStudio remains the canonical owner.
 */

import { apiClient } from '@/api/utils/axiosInstance';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import RoadmapGantt from './RoadmapGantt';
import RoadmapTable from './RoadmapTable';
import type { EcosystemRoadmapResponse, RoadmapComponent } from './types';

type View = 'table' | 'gantt';

const EcosystemRoadmapPage: React.FC = () => {
  const [response, setResponse] = useState<EcosystemRoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('table');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<EcosystemRoadmapResponse>('/admin/ecosystem-roadmap');
      setResponse(res.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to load roadmap';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const components: RoadmapComponent[] = useMemo(() => {
    if (!response || !response.available) return [];
    const data = response.data;
    if (!data || !Array.isArray(data.components)) return [];
    return data.components;
  }, [response]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" fontWeight={600}>
            Ecosystem Roadmap
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Read-only view of the canonical Component Maturity Roadmap. Canonical
            source: <strong>OMStudio</strong>. OM does not store or modify this data.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={load}
          startIcon={<RefreshIcon />}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        {loading && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Loading roadmap from OMStudio…
            </Typography>
          </Stack>
        )}

        {!loading && error && (
          <Alert severity="error">
            <AlertTitle>Failed to load roadmap</AlertTitle>
            <Typography variant="body2">{error}</Typography>
            <Box sx={{ mt: 1 }}>
              <Button size="small" onClick={load}>
                Retry
              </Button>
            </Box>
          </Alert>
        )}

        {!loading && !error && response && !response.available && (
          <Alert
            severity={
              response.error === 'endpoint_not_yet_published' ? 'info' : 'warning'
            }
          >
            <AlertTitle>
              {response.error === 'endpoint_not_yet_published'
                ? 'Upstream endpoint not yet available'
                : 'OMStudio reachability issue'}
            </AlertTitle>
            <Typography variant="body2">
              {response.detail ||
                'The OMStudio component-roadmap endpoint is not currently available.'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Upstream: <code>{response.upstream}</code>
            </Typography>
          </Alert>
        )}

        {!loading && !error && response && response.available && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="baseline" flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">
                Fetched: {new Date(response.fetched_at).toLocaleString()}
              </Typography>
              {response.data?.generated_at && (
                <Typography variant="caption" color="text.secondary">
                  Roadmap generated: {new Date(response.data.generated_at).toLocaleString()}
                </Typography>
              )}
              {response.data?.source_url && (
                <Link
                  href={response.data.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="caption"
                >
                  Source
                </Link>
              )}
              <Typography variant="caption" color="text.secondary">
                Components: {components.length}
              </Typography>
            </Stack>
            {response.data?.notes && (
              <Typography variant="body2" color="text.secondary">
                {response.data.notes}
              </Typography>
            )}
          </Stack>
        )}
      </Paper>

      {!loading && !error && response && response.available && (
        <>
          <Tabs
            value={view}
            onChange={(_e, v) => setView(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab value="table" label="Component table" />
            <Tab value="gantt" label="Gantt / milestones" />
          </Tabs>

          {view === 'table' && <RoadmapTable components={components} />}
          {view === 'gantt' && <RoadmapGantt components={components} />}

          <Divider sx={{ my: 3 }} />
          <Typography variant="caption" color="text.secondary">
            OM is a read-only consumer. To update the roadmap, change the source
            in OMStudio. Any roadmap data displayed here reflects what OMStudio
            published at the time of fetch.
          </Typography>
        </>
      )}
    </Container>
  );
};

export default EcosystemRoadmapPage;
