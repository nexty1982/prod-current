import React from 'react'
import { Box, Grid, Paper, Typography } from '@mui/material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const BasicAreaChart = () => {
  return (
    <ComponentContainerCard
      id="basic-area"
      title="Basic Area Chart"
      description="A simple area chart implementation with sample data visualization."
    >
      <Paper 
        sx={{ 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          border: '2px dashed',
          borderColor: 'grey.300'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            📊 Area Chart Placeholder
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Chart library integration coming soon
          </Typography>
        </Box>
      </Paper>
    </ComponentContainerCard>
  )
}

const StackedAreaChart = () => {
  return (
    <ComponentContainerCard
      id="stacked-area"
      title="Stacked Area Chart"
      description="Multiple data series stacked on top of each other."
    >
      <Paper 
        sx={{ 
          height: 300, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: 'grey.50',
          border: '2px dashed',
          borderColor: 'grey.300'
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            📈 Stacked Area Chart
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Advanced chart visualization
          </Typography>
        </Box>
      </Paper>
    </ComponentContainerCard>
  )
}

const AreaCharts = () => {
  return (
    <>
      <PageBreadcrumb subName="Advanced Charts" title="Area Charts" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicAreaChart />
            <StackedAreaChart />
          </Box>
        </Grid>
      </Grid>
    </>
  )
}

export default AreaCharts