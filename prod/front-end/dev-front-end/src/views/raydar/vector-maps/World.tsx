import React from 'react'
import { Box, Grid, Paper, Typography, Card, CardContent } from '@mui/material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const WorldMapVisualization = () => {
  const sampleData = [
    { country: 'United States', value: 2847, color: '#1976d2' },
    { country: 'China', value: 1843, color: '#2196f3' },
    { country: 'Germany', value: 1247, color: '#42a5f5' },
    { country: 'United Kingdom', value: 945, color: '#64b5f6' },
    { country: 'France', value: 892, color: '#90caf9' },
    { country: 'Japan', value: 743, color: '#bbdefb' },
  ]

  return (
    <ComponentContainerCard
      id="world-map"
      title="Interactive World Map"
      description="Vector-based world map with interactive data visualization capabilities."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper 
            sx={{ 
              height: 400, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              bgcolor: 'grey.50',
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ mb: 2 }}>🗺️</Typography>
              <Typography variant="h6" color="text.secondary">
                Interactive World Map
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Vector map integration coming soon
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                Will support: Zoom, Pan, Click events, Data overlays
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Country Data
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sampleData.map((item, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box 
                        sx={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: '50%',
                          bgcolor: item.color 
                        }} 
                      />
                      <Typography variant="body2">{item.country}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.value.toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const MapFeatures = () => {
  const features = [
    { title: 'Interactive Zooming', description: 'Zoom in and out with mouse wheel or touch gestures' },
    { title: 'Data Binding', description: 'Bind custom data to countries and regions' },
    { title: 'Custom Styling', description: 'Customize colors, borders, and hover effects' },
    { title: 'Event Handling', description: 'Handle click, hover, and selection events' },
    { title: 'Responsive Design', description: 'Automatically adapts to different screen sizes' },
    { title: 'Multiple Projections', description: 'Support for various map projections' },
  ]

  return (
    <ComponentContainerCard
      id="map-features"
      title="Map Features"
      description="Comprehensive features for interactive map visualization."
    >
      <Grid container spacing={2}>
        {features.map((feature, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </ComponentContainerCard>
  )
}

const WorldMap = () => {
  return (
    <>
      <PageBreadcrumb subName="Vector Maps" title="World Map" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <WorldMapVisualization />
            <MapFeatures />
          </Box>
        </Grid>
      </Grid>
    </>
  )
}

export default WorldMap