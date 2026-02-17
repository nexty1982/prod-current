/**
 * USChurchMapPage.tsx
 * Interactive choropleth map of Orthodox Churches in the United States.
 * Located at /devel-tools/us-church-map
 *
 * Data source: GET /api/analytics/us-church-counts
 * Geo data:    /data/us-states-paths.json (pre-projected Albers USA SVG paths)
 * Color scale: d3-scale (scaleQuantile) with 7-class sequential palette
 */

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as ArrowBackIcon,
    Phone as PhoneIcon,
    Place as PlaceIcon,
    Refresh as RefreshIcon,
    CenterFocusStrong as ResetIcon,
    Language as WebIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
} from '@mui/icons-material';
import {
    Alert,
    alpha,
    Box,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Link,
    Paper,
    Skeleton,
    Tab,
    Tabs,
    Tooltip,
    Typography,
    useTheme
} from '@mui/material';
import { scaleQuantile } from 'd3-scale';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

interface StateGeo {
  name: string;
  path: string;
  cx: number;
  cy: number;
}

interface ChurchCountsResponse {
  states: Record<string, number>;
  min: number;
  max: number;
  total: number;
  stateCount: number;
  generatedAt: string;
}

interface ChurchEntry {
  name: string;
  street: string | null;
  city: string | null;
  state_code: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  jurisdiction: string;
}

interface JurisdictionCount {
  jurisdiction: string;
  count: number;
}

interface StateChurchesResponse {
  state: string;
  total: number;
  jurisdictions: JurisdictionCount[];
  churches: ChurchEntry[];
}

interface OMChurch {
  id: number;
  name: string;
  church_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
}

// ─── Region definitions ─────────────────────────────────────────────

interface Region {
  label: string;
  states: string[];
}

const REGIONS: Record<string, Region> = {
  all: {
    label: 'All States',
    states: [],
  },
  northeast: {
    label: 'Northeast',
    states: ['CT', 'DE', 'ME', 'MD', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DC'],
  },
  midwest: {
    label: 'Midwest',
    states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
  },
  south: {
    label: 'South',
    states: [
      'AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'OK', 'SC',
      'TN', 'TX', 'VA', 'WV',
    ],
  },
  west: {
    label: 'West',
    states: [
      'AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR',
      'UT', 'WA', 'WY',
    ],
  },
};

// ─── Color palette (7-class sequential blue) ────────────────────────

const COLOR_RAMP_LIGHT = [
  '#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594',
];
const COLOR_RAMP_DARK = [
  '#1a2332', '#1e3a5f', '#22528c', '#2d6db5', '#4a90d9', '#7ab8f5', '#b0d9ff',
];

const NO_DATA_COLOR_LIGHT = '#f0f0f0';
const NO_DATA_COLOR_DARK = '#2a2a2a';

// ─── SVG viewport (matches pre-projected Albers USA) ────────────────
const SVG_WIDTH = 975;
const SVG_HEIGHT = 610;

// ─── Manual Albers USA projection (approximation for pin placement) ──
// This converts WGS84 lat/lng to the pre-projected SVG coordinate space
function projectToAlbersUsa(lng: number, lat: number): [number, number] | null {
  // Bounds check for continental US
  if (lat < 24 || lat > 50 || lng < -125 || lng > -66) {
    // Check Alaska
    if (lat >= 51 && lat <= 72 && lng >= -180 && lng <= -129) {
      const x = 150 + (lng + 180) * 2.5;
      const y = 490 + (72 - lat) * 4;
      return [x, y];
    }
    // Check Hawaii
    if (lat >= 18 && lat <= 23 && lng >= -161 && lng <= -154) {
      const x = 250 + (lng + 161) * 15;
      const y = 520 + (23 - lat) * 12;
      return [x, y];
    }
    return null;
  }
  // Continental US: simple affine approximation
  const x = 960 + (lng + 96) * 11.5;
  const y = 620 + (lat - 38) * -14;
  return [Math.max(0, Math.min(SVG_WIDTH, x)), Math.max(0, Math.min(SVG_HEIGHT, y))];
}

// ─── Small-state label offsets (states too small for centered labels) ──
const LABEL_OFFSETS: Record<string, { x: number; y: number; anchor?: 'start' | 'middle' | 'end' }> = {
  CT: { x: 893, y: 218, anchor: 'start' },
  DC: { x: 851, y: 295, anchor: 'start' },
  DE: { x: 851, y: 275, anchor: 'start' },
  MA: { x: 893, y: 203, anchor: 'start' },
  MD: { x: 851, y: 285, anchor: 'start' },
  NH: { x: 893, y: 163, anchor: 'start' },
  NJ: { x: 851, y: 260, anchor: 'start' },
  RI: { x: 893, y: 210, anchor: 'start' },
  VT: { x: 843, y: 163, anchor: 'end' },
};

// ─── Component ──────────────────────────────────────────────────────

const USChurchMapPage: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const svgRef = useRef<SVGSVGElement>(null);

  // State
  const [geoData, setGeoData] = useState<Record<string, StateGeo> | null>(null);
  const [churchData, setChurchData] = useState<ChurchCountsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState('all');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // State drill-down
  const [stateChurches, setStateChurches] = useState<StateChurchesResponse | null>(null);
  const [churchesLoading, setChurchesLoading] = useState(false);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string | null>(null);

  // OM churches (green pins)
  const [omChurches, setOmChurches] = useState<OMChurch[]>([]);

  // Breadcrumbs
  const BCrumb = [
    { to: '/', title: 'Home' },
    { to: '/devel-tools', title: 'Developer Tools' },
    { title: 'US Church Map' },
  ];

  // ─── Data fetching ──────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [geoRes, countsRes, omRes] = await Promise.all([
        fetch('/data/us-states-paths.json'),
        fetch('/api/analytics/us-church-counts', { credentials: 'include' }),
        fetch('/api/analytics/om-churches', { credentials: 'include' }),
      ]);

      if (!geoRes.ok) throw new Error(`Failed to load map geometry: ${geoRes.status}`);
      if (!countsRes.ok) throw new Error(`Failed to load church counts: ${countsRes.status}`);

      const geo: Record<string, StateGeo> = await geoRes.json();
      const counts: ChurchCountsResponse = await countsRes.json();
      const omData = omRes.ok ? await omRes.json() : { churches: [] };

      setGeoData(geo);
      setChurchData(counts);
      setOmChurches(omData.churches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Color scale ────────────────────────────────────────────────

  const colorScale = useMemo(() => {
    if (!churchData) return null;
    const values = Object.values(churchData.states);
    const ramp = isDark ? COLOR_RAMP_DARK : COLOR_RAMP_LIGHT;
    return scaleQuantile<string>().domain(values).range(ramp);
  }, [churchData, isDark]);

  const getStateColor = useCallback(
    (code: string) => {
      if (!churchData || !colorScale) {
        return isDark ? NO_DATA_COLOR_DARK : NO_DATA_COLOR_LIGHT;
      }
      const count = churchData.states[code];
      if (count === undefined) {
        return isDark ? NO_DATA_COLOR_DARK : NO_DATA_COLOR_LIGHT;
      }
      return colorScale(count);
    },
    [churchData, colorScale, isDark],
  );

  // ─── Region filtering ──────────────────────────────────────────

  const regionStates = useMemo(() => {
    if (activeRegion === 'all') return null;
    return new Set(REGIONS[activeRegion]?.states || []);
  }, [activeRegion]);

  const isStateInRegion = useCallback(
    (code: string) => {
      if (!regionStates) return true;
      return regionStates.has(code);
    },
    [regionStates],
  );

  // ─── Zoom/pan ──────────────────────────────────────────────────

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 5));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedState(null);
  };


  // Drag to pan
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0,
  });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan({
      x: dragRef.current.startPanX + dx / zoom,
      y: dragRef.current.startPanY + dy / zoom,
    });
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // ─── Tooltip tracking ──────────────────────────────────────────

  const handleStateMouseMove = useCallback((e: React.MouseEvent, code: string) => {
    setHoveredState(code);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const handleStateMouseLeave = useCallback(() => {
    setHoveredState(null);
  }, []);

  const handleStateClick = useCallback((code: string) => {
    setSelectedState((prev) => {
      const newState = prev === code ? null : code;
      if (!newState) {
        setStateChurches(null);
        setJurisdictionFilter(null);
      }
      return newState;
    });
  }, []);

  // Fetch churches when state is selected
  const fetchStateChurches = useCallback(async (stateCode: string) => {
    setChurchesLoading(true);
    try {
      const resp = await fetch(`/api/analytics/us-churches?state=${stateCode}`, { credentials: 'include' });
      if (resp.ok) {
        const data: StateChurchesResponse = await resp.json();
        setStateChurches(data);
        setJurisdictionFilter(null);
      }
    } catch (err) {
      console.warn('Failed to fetch state churches:', err);
    } finally {
      setChurchesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedState) {
      fetchStateChurches(selectedState);
    }
  }, [selectedState, fetchStateChurches]);

  // Filtered churches by jurisdiction
  const filteredChurches = useMemo(() => {
    if (!stateChurches) return [];
    if (!jurisdictionFilter) return stateChurches.churches;
    return stateChurches.churches.filter(c => c.jurisdiction === jurisdictionFilter);
  }, [stateChurches, jurisdictionFilter]);

  // ─── Sorted states for detail panel ────────────────────────────

  const sortedStates = useMemo(() => {
    if (!churchData) return [];
    return Object.entries(churchData.states)
      .filter(([code]) => isStateInRegion(code))
      .sort((a, b) => b[1] - a[1]);
  }, [churchData, isStateInRegion]);

  // ─── Legend quantiles ──────────────────────────────────────────

  const legendItems = useMemo(() => {
    if (!colorScale || !churchData) return [];
    const quantiles = colorScale.quantiles();
    const ramp = isDark ? COLOR_RAMP_DARK : COLOR_RAMP_LIGHT;
    const items: { color: string; label: string }[] = [];

    items.push({ color: ramp[0], label: `${churchData.min}–${Math.floor(quantiles[0]) - 1}` });
    for (let i = 0; i < quantiles.length; i++) {
      const lo = Math.floor(quantiles[i]);
      const hi = i < quantiles.length - 1 ? Math.floor(quantiles[i + 1]) - 1 : churchData.max;
      items.push({ color: ramp[i + 1], label: `${lo}–${hi}` });
    }
    return items;
  }, [colorScale, churchData, isDark]);

  // ─── Region totals ────────────────────────────────────────────

  const regionTotal = useMemo(() => {
    if (!churchData) return 0;
    if (activeRegion === 'all') return churchData.total;
    const regionCodes = REGIONS[activeRegion]?.states || [];
    return regionCodes.reduce((sum, code) => sum + (churchData.states[code] || 0), 0);
  }, [churchData, activeRegion]);

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <PageContainer title="US Church Map" description="Orthodox Churches in the United States">
        <Breadcrumb title="US Church Map" items={BCrumb} />
        <Box p={3}>
          <Paper sx={{ p: 3 }}>
            <Skeleton variant="text" width={300} height={40} />
            <Skeleton variant="rectangular" height={500} sx={{ mt: 2, borderRadius: 1 }} />
          </Paper>
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="US Church Map" description="Orthodox Churches in the United States">
        <Breadcrumb title="US Church Map" items={BCrumb} />
        <Box p={3}>
          <Alert severity="error" action={
            <IconButton size="small" onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          }>
            {error}
          </Alert>
        </Box>
      </PageContainer>
    );
  }

  const selectedData = selectedState && churchData
    ? { code: selectedState, name: geoData?.[selectedState]?.name || selectedState, count: churchData.states[selectedState] || 0 }
    : null;

  return (
    <PageContainer title="US Church Map" description="Orthodox Churches in the United States">
      <Breadcrumb title="Orthodox Churches in the United States" items={BCrumb} />
      <Box p={3}>
        {/* Header stats */}
        <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Orthodox Churches in the United States
          </Typography>
          <Chip label={`${churchData?.total?.toLocaleString() || 0} total churches`} color="primary" />
          <Chip label={`${churchData?.stateCount || 0} states + DC`} variant="outlined" />
          <Chip label={`Region: ${REGIONS[activeRegion].label} (${regionTotal.toLocaleString()})`} variant="outlined" color="secondary" />
          <IconButton size="small" onClick={fetchData} title="Refresh data">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Region tabs */}
        <Paper sx={{ mb: 2 }}>
          <Tabs
            value={activeRegion}
            onChange={(_, v) => setActiveRegion(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {Object.entries(REGIONS).map(([key, region]) => (
              <Tab key={key} value={key} label={region.label} />
            ))}
          </Tabs>
        </Paper>

        {/* Map + detail panel */}
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Map */}
          <Paper
            sx={{
              flex: '1 1 auto',
              position: 'relative',
              overflow: 'hidden',
              cursor: dragRef.current.dragging ? 'grabbing' : 'grab',
              userSelect: 'none',
            }}
          >
            {/* Zoom controls */}
            <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <IconButton size="small" onClick={handleZoomIn} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                <ZoomInIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleZoomOut} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                <ZoomOutIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleReset} sx={{ bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                <ResetIcon fontSize="small" />
              </IconButton>
            </Box>

            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              style={{ width: '100%', height: 'auto', minHeight: 400 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${pan.x * zoom}, ${pan.y * zoom}) scale(${zoom})`}>
                {geoData && Object.entries(geoData).map(([code, state]) => {
                  const inRegion = isStateInRegion(code);
                  const isHovered = hoveredState === code;
                  const isSelected = selectedState === code;
                  const fillColor = getStateColor(code);

                  return (
                    <path
                      key={code}
                      d={state.path}
                      fill={fillColor}
                      stroke={isDark ? '#555' : '#fff'}
                      strokeWidth={isHovered || isSelected ? 2 / zoom : 0.75 / zoom}
                      opacity={inRegion ? 1 : 0.2}
                      style={{
                        transition: 'fill 0.2s, opacity 0.3s, stroke-width 0.15s',
                        cursor: inRegion ? 'pointer' : 'default',
                        filter: isSelected ? `drop-shadow(0 0 ${3 / zoom}px ${isDark ? '#fff' : '#000'})` : undefined,
                      }}
                      onMouseMove={(e) => inRegion && handleStateMouseMove(e, code)}
                      onMouseLeave={handleStateMouseLeave}
                      onClick={() => inRegion && handleStateClick(code)}
                    />
                  );
                })}

                {/* State labels */}
                {geoData && Object.entries(geoData).map(([code, state]) => {
                  if (!isStateInRegion(code)) return null;
                  const offset = LABEL_OFFSETS[code];
                  const x = offset ? offset.x : state.cx;
                  const y = offset ? offset.y : state.cy;
                  const fontSize = 10 / zoom;

                  // Skip labels for very small zoom levels
                  if (zoom < 0.7) return null;

                  return (
                    <text
                      key={`label-${code}`}
                      x={x}
                      y={y}
                      textAnchor={offset?.anchor || 'middle'}
                      dominantBaseline="central"
                      fontSize={fontSize}
                      fontWeight={selectedState === code ? 700 : 500}
                      fill={isDark ? '#ddd' : '#333'}
                      pointerEvents="none"
                      style={{ textShadow: isDark ? '0 0 3px #000' : '0 0 3px #fff' }}
                    >
                      {code}
                    </text>
                  );
                })}

                {/* OM Church pins (green markers) */}
                {omChurches.map((church) => {
                  // Project lat/lng to Albers USA coordinates
                  const coords = projectToAlbersUsa(church.longitude, church.latitude);
                  if (!coords) return null; // Outside projection bounds

                  const pinSize = 6 / zoom;
                  return (
                    <Tooltip key={`om-pin-${church.id}`} title={church.church_name || church.name} arrow>
                      <g style={{ cursor: 'pointer' }}>
                        <circle
                          cx={coords[0]}
                          cy={coords[1]}
                          r={pinSize}
                          fill="#22c55e"
                          stroke="#fff"
                          strokeWidth={1.5 / zoom}
                          style={{ filter: `drop-shadow(0 ${1/zoom}px ${2/zoom}px rgba(0,0,0,0.3))` }}
                        />
                        <circle
                          cx={coords[0]}
                          cy={coords[1]}
                          r={pinSize * 0.4}
                          fill="#fff"
                        />
                      </g>
                    </Tooltip>
                  );
                })}
              </g>
            </svg>

            {/* Legend */}
            <Box sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              bgcolor: alpha(theme.palette.background.paper, 0.9),
              borderRadius: 1,
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.3,
              minWidth: 120,
            }}>
              <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5 }}>Churches per State</Typography>
              {legendItems.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, bgcolor: item.color, borderRadius: 0.5, border: `1px solid ${isDark ? '#555' : '#ccc'}` }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{item.label}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                <Box sx={{ width: 14, height: 14, bgcolor: isDark ? NO_DATA_COLOR_DARK : NO_DATA_COLOR_LIGHT, borderRadius: 0.5, border: `1px solid ${isDark ? '#555' : '#ccc'}` }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>No data</Typography>
              </Box>
              {omChurches.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, pt: 0.5, borderTop: `1px solid ${isDark ? '#555' : '#ddd'}` }}>
                  <Box sx={{ width: 14, height: 14, bgcolor: '#22c55e', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>OrthodoxMetrics ({omChurches.length})</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Detail side panel */}
          <Paper sx={{ width: { xs: '100%', lg: 380 }, flexShrink: 0, maxHeight: 650, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selectedData ? (
              <>
                {/* State header */}
                <Box sx={{ p: 2, pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <IconButton size="small" onClick={() => { setSelectedState(null); setStateChurches(null); setJurisdictionFilter(null); }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>{selectedData.name}</Typography>
                    <Chip label={selectedData.count.toLocaleString()} color="primary" size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" variant="outlined" label={`Rank #${sortedStates.findIndex(([c]) => c === selectedData.code) + 1} of ${sortedStates.length}`} />
                    <Chip size="small" variant="outlined" label={churchData ? `${((selectedData.count / churchData.total) * 100).toFixed(1)}% of total` : ''} />
                  </Box>

                  {/* Jurisdiction filter chips */}
                  {stateChurches && stateChurches.jurisdictions.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                      <Chip
                        size="small"
                        label={`All (${stateChurches.total})`}
                        color={jurisdictionFilter === null ? 'primary' : 'default'}
                        variant={jurisdictionFilter === null ? 'filled' : 'outlined'}
                        onClick={() => setJurisdictionFilter(null)}
                        sx={{ fontSize: '0.7rem', height: 24 }}
                      />
                      {stateChurches.jurisdictions.map(j => (
                        <Chip
                          key={j.jurisdiction}
                          size="small"
                          label={`${j.jurisdiction} (${j.count})`}
                          color={jurisdictionFilter === j.jurisdiction ? 'primary' : 'default'}
                          variant={jurisdictionFilter === j.jurisdiction ? 'filled' : 'outlined'}
                          onClick={() => setJurisdictionFilter(jurisdictionFilter === j.jurisdiction ? null : j.jurisdiction)}
                          sx={{ fontSize: '0.7rem', height: 24 }}
                        />
                      ))}
                    </Box>
                  )}
                  <Divider sx={{ mt: 1.5 }} />
                </Box>

                {/* Church list */}
                <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
                  {churchesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={28} />
                    </Box>
                  ) : filteredChurches.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No churches found</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                        Showing {filteredChurches.length} church{filteredChurches.length !== 1 ? 'es' : ''}
                      </Typography>
                      {filteredChurches.map((church, i) => (
                        <Box
                          key={`${church.name}-${i}`}
                          sx={{
                            py: 1,
                            borderBottom: `1px solid ${isDark ? '#333' : '#eee'}`,
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem', lineHeight: 1.3 }}>
                            {church.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                            <PlaceIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {[church.street, church.city, church.state_code, church.zip].filter(Boolean).join(', ')}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
                            <Chip label={church.jurisdiction} size="small" sx={{ fontSize: '0.65rem', height: 18 }} />
                            {church.phone && (
                              <Tooltip title={church.phone} arrow>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                  <PhoneIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>{church.phone}</Typography>
                                </Box>
                              </Tooltip>
                            )}
                            {church.website && (
                              <Tooltip title={church.website} arrow>
                                <Link href={church.website} target="_blank" rel="noopener" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, textDecoration: 'none' }}>
                                  <WebIcon sx={{ fontSize: 12 }} />
                                  <Typography variant="caption" sx={{ fontSize: '0.68rem' }}>Website</Typography>
                                </Link>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </>
            ) : (
              <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click a state to see its churches
                </Typography>

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {REGIONS[activeRegion].label} Rankings
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {sortedStates.map(([code, count], i) => (
                    <Box
                      key={code}
                      onClick={() => handleStateClick(code)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.5,
                        borderRadius: 0.5,
                        cursor: 'pointer',
                        bgcolor: selectedState === code
                          ? alpha(theme.palette.primary.main, 0.15)
                          : 'transparent',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ width: 20, textAlign: 'right' }}>
                        {i + 1}.
                      </Typography>
                      <Box sx={{ width: 12, height: 12, bgcolor: getStateColor(code), borderRadius: 0.3, border: `1px solid ${isDark ? '#555' : '#ccc'}`, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flexGrow: 1, fontSize: '0.8rem' }}>
                        {geoData?.[code]?.name || code}
                      </Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                        {count.toLocaleString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Floating tooltip */}
        {hoveredState && churchData && (
          <Box
            sx={{
              position: 'fixed',
              left: tooltipPos.x + 12,
              top: tooltipPos.y - 40,
              bgcolor: alpha(theme.palette.background.paper, 0.95),
              border: `1px solid ${isDark ? '#555' : '#ddd'}`,
              borderRadius: 1,
              px: 1.5,
              py: 0.75,
              pointerEvents: 'none',
              zIndex: 1500,
              boxShadow: theme.shadows[4],
              minWidth: 120,
            }}
          >
            <Typography variant="subtitle2">{geoData?.[hoveredState]?.name || hoveredState}</Typography>
            <Typography variant="h6" color="primary">
              {(churchData.states[hoveredState] || 0).toLocaleString()} churches
            </Typography>
          </Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default USChurchMapPage;
