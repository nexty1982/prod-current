import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  GeolocateControl,
  ScaleControl,
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

const MAPBOX_TOKEN = import.meta.env.VITE_APP_MAPBOX_ACCESS_TOKEN || '';

const mapThemes = [
  { id: 'light-v10', label: 'Light' },
  { id: 'dark-v10', label: 'Dark' },
  { id: 'streets-v11', label: 'Streets' },
  { id: 'outdoors-v11', label: 'Outdoors' },
  { id: 'satellite-v9', label: 'Satellite' },
  { id: 'satellite-streets-v11', label: 'Sat + Streets' },
];

interface MarkerData {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

const markers: MarkerData[] = [
  { id: 1, name: 'New York', latitude: 40.7128, longitude: -73.9060, description: 'The Big Apple' },
  { id: 2, name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, description: 'City of Angels' },
  { id: 3, name: 'Chicago', latitude: 41.8781, longitude: -87.6298, description: 'The Windy City' },
  { id: 4, name: 'Houston', latitude: 29.7604, longitude: -95.3698, description: 'Space City' },
  { id: 5, name: 'Phoenix', latitude: 33.4484, longitude: -112.0740, description: 'Valley of the Sun' },
];

const mapContainerSx = {
  height: 576,
  borderRadius: 2,
  overflow: 'hidden',
  position: 'relative',
  '& .mapboxgl-ctrl-logo, & .mapboxgl-ctrl-attrib': {
    display: 'none !important',
  },
};

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'Map' },
];

export default function BerryMapPage() {
  const theme = useTheme();
  const [selectedTheme, setSelectedTheme] = useState('streets-v11');
  const [popupInfo, setPopupInfo] = useState<MarkerData | null>(null);

  const noToken = !MAPBOX_TOKEN;

  return (
    <PageContainer title="Map" description="Berry Map with Mapbox GL">
      <Breadcrumb title="Map" items={BCrumb} />
      <Grid container spacing={3}>
        {/* Theme Variants Map */}
        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Theme Variants
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                {mapThemes.map((t) => (
                  <Chip
                    key={t.id}
                    label={t.label}
                    color={selectedTheme === t.id ? 'primary' : 'default'}
                    variant={selectedTheme === t.id ? 'filled' : 'outlined'}
                    onClick={() => setSelectedTheme(t.id)}
                    clickable
                  />
                ))}
              </Stack>
              {noToken ? (
                <Box sx={{ ...mapContainerSx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                  <Typography color="text.secondary">
                    Add VITE_APP_MAPBOX_ACCESS_TOKEN to .env to enable maps
                  </Typography>
                </Box>
              ) : (
                <Box sx={mapContainerSx}>
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      latitude: 39.8283,
                      longitude: -98.5795,
                      zoom: 3.5,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle={`mapbox://styles/mapbox/${selectedTheme}`}
                  >
                    <NavigationControl position="top-right" />
                    <FullscreenControl position="top-right" />
                    <GeolocateControl position="top-right" />
                    <ScaleControl />
                  </Map>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Markers & Popups */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Markers & Popups
              </Typography>
              {noToken ? (
                <Box sx={{ ...mapContainerSx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                  <Typography color="text.secondary">Mapbox token required</Typography>
                </Box>
              ) : (
                <Box sx={mapContainerSx}>
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      latitude: 39.8283,
                      longitude: -98.5795,
                      zoom: 3.5,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/light-v10"
                  >
                    <NavigationControl position="top-right" />
                    {markers.map((m) => (
                      <Marker
                        key={m.id}
                        latitude={m.latitude}
                        longitude={m.longitude}
                        anchor="bottom"
                        onClick={(e) => {
                          e.originalEvent.stopPropagation();
                          setPopupInfo(m);
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            border: '3px solid white',
                            boxShadow: 2,
                            cursor: 'pointer',
                          }}
                        />
                      </Marker>
                    ))}
                    {popupInfo && (
                      <Popup
                        latitude={popupInfo.latitude}
                        longitude={popupInfo.longitude}
                        anchor="top"
                        onClose={() => setPopupInfo(null)}
                        closeOnClick={false}
                      >
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="subtitle2">{popupInfo.name}</Typography>
                          <Typography variant="caption">{popupInfo.description}</Typography>
                        </Box>
                      </Popup>
                    )}
                  </Map>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Interactive Map */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Interactive Map
              </Typography>
              {noToken ? (
                <Box sx={{ ...mapContainerSx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                  <Typography color="text.secondary">Mapbox token required</Typography>
                </Box>
              ) : (
                <Box sx={mapContainerSx}>
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      latitude: 40.7128,
                      longitude: -74.006,
                      zoom: 11,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle={`mapbox://styles/mapbox/${theme.palette.mode === 'dark' ? 'dark-v10' : 'streets-v11'}`}
                  >
                    <NavigationControl position="top-right" />
                    <FullscreenControl position="top-right" />
                    <GeolocateControl position="top-right" />
                    <ScaleControl />
                  </Map>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Satellite View */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Satellite View
              </Typography>
              {noToken ? (
                <Box sx={{ ...mapContainerSx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                  <Typography color="text.secondary">Mapbox token required</Typography>
                </Box>
              ) : (
                <Box sx={mapContainerSx}>
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      latitude: 36.1069,
                      longitude: -112.1129,
                      zoom: 13,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/satellite-streets-v11"
                  >
                    <NavigationControl position="top-right" />
                  </Map>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Dark Mode Map */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Dark Mode
              </Typography>
              {noToken ? (
                <Box sx={{ ...mapContainerSx, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
                  <Typography color="text.secondary">Mapbox token required</Typography>
                </Box>
              ) : (
                <Box sx={mapContainerSx}>
                  <Map
                    mapboxAccessToken={MAPBOX_TOKEN}
                    initialViewState={{
                      latitude: 51.5074,
                      longitude: -0.1278,
                      zoom: 10,
                    }}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/dark-v10"
                  >
                    <NavigationControl position="top-right" />
                  </Map>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
}
