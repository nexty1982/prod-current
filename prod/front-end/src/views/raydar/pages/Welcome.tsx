import React from 'react'
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Button,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material'
import { 
  CheckCircle as CheckIcon,
  Star as StarIcon,
  TrendingUp as TrendingIcon,
  People as PeopleIcon,
  Assignment as TaskIcon
} from '@mui/icons-material'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const WelcomeHeader = () => {
  return (
    <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
      <CardContent sx={{ p: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
              Welcome to Raydar! 🎉
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, opacity: 0.9 }}>
              Your comprehensive UI component library for building modern web applications
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
              >
                Get Started
              </Button>
              <Button variant="outlined" sx={{ color: 'white', borderColor: 'white' }}>
                View Documentation
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ fontSize: '4rem', mb: 2 }}>🚀</Box>
            <Typography variant="h6">Ready to Launch</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

const QuickStats = () => {
  const stats = [
    { label: 'UI Components', value: '200+', icon: '🧩', color: 'primary' },
    { label: 'Page Templates', value: '50+', icon: '📄', color: 'success' },
    { label: 'Chart Types', value: '30+', icon: '📊', color: 'warning' },
    { label: 'Icon Libraries', value: '1000+', icon: '🎨', color: 'info' },
  ]

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <Box sx={{ fontSize: '2rem', mb: 1 }}>{stat.icon}</Box>
              <Typography variant="h4" color={`${stat.color}.main`} sx={{ fontWeight: 'bold', mb: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

const FeaturedComponents = () => {
  const components = [
    { 
      name: 'Advanced Charts', 
      description: 'Beautiful and interactive charts for data visualization',
      progress: 100,
      status: 'Ready'
    },
    { 
      name: 'Form Validation', 
      description: 'Comprehensive form components with built-in validation',
      progress: 85,
      status: 'Nearly Complete'
    },
    { 
      name: 'Vector Maps', 
      description: 'Interactive maps with data binding capabilities',
      progress: 70,
      status: 'In Progress'
    },
    { 
      name: 'Data Tables', 
      description: 'Feature-rich tables with sorting, filtering, and pagination',
      progress: 90,
      status: 'Ready'
    },
  ]

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <Card>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              Featured Components
            </Typography>
            <List>
              {components.map((component, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <CheckIcon />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {component.name}
                        </Typography>
                        <Chip 
                          label={component.status} 
                          size="small" 
                          color={component.progress === 100 ? 'success' : 'warning'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {component.description}
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={component.progress} 
                          sx={{ borderRadius: 1 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} lg={4}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color="warning" /> What's New
            </Typography>
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary="Advanced Rating Component" secondary="Interactive star ratings with hover effects" />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary="New Badge Variants" secondary="Dot badges and custom positioning" />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary="Enhanced Cards" secondary="Media cards with improved styling" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingIcon color="success" /> Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button variant="outlined" fullWidth>
                Browse Components
              </Button>
              <Button variant="outlined" fullWidth>
                View Examples
              </Button>
              <Button variant="outlined" fullWidth>
                Check Documentation
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

const Welcome = () => {
  return (
    <>
      <PageBreadcrumb subName="Pages" title="Welcome" />
      <WelcomeHeader />
      <QuickStats />
      <FeaturedComponents />
    </>
  )
}

export default Welcome