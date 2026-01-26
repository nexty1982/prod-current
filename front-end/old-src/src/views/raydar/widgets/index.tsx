import React from 'react'
import { 
  Box, 
  Grid, 
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider
} from '@mui/material'
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as MoneyIcon,
  MoreVert as MoreVertIcon,
  Notifications as NotificationsIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const StatWidget = ({ title, value, change, trend, icon, color }: any) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Avatar sx={{ bgcolor: `${color}.main`, color: 'white' }}>
          {icon}
        </Avatar>
        <IconButton size="small">
          <MoreVertIcon />
        </IconButton>
      </Box>
      
      <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
        {value}
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {title}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {trend === 'up' ? (
          <TrendingUpIcon color="success" fontSize="small" />
        ) : (
          <TrendingDownIcon color="error" fontSize="small" />
        )}
        <Typography 
          variant="body2" 
          color={trend === 'up' ? 'success.main' : 'error.main'}
          sx={{ fontWeight: 600 }}
        >
          {change}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          vs last month
        </Typography>
      </Box>
    </CardContent>
  </Card>
)

const ProgressWidget = () => (
  <Card>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Project Progress
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Website Redesign</Typography>
          <Typography variant="body2" color="text.secondary">85%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={85} sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Mobile App</Typography>
          <Typography variant="body2" color="text.secondary">60%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={60} sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">API Development</Typography>
          <Typography variant="body2" color="text.secondary">40%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={40} />
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label="On Track" color="success" size="small" />
        <Chip label="3 Projects" variant="outlined" size="small" />
      </Box>
    </CardContent>
  </Card>
)

const ActivityWidget = () => {
  const activities = [
    { id: 1, title: 'New user registered', time: '2 min ago', avatar: 'U', color: 'primary' },
    { id: 2, title: 'Order #1234 completed', time: '5 min ago', avatar: 'O', color: 'success' },
    { id: 3, title: 'Payment received', time: '10 min ago', avatar: 'P', color: 'warning' },
    { id: 4, title: 'New comment posted', time: '15 min ago', avatar: 'C', color: 'info' },
  ]

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Activity
        </Typography>
        
        <List dense>
          {activities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${activity.color}.main`, width: 32, height: 32, fontSize: '0.875rem' }}>
                    {activity.avatar}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={activity.title}
                  secondary={activity.time}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
              {index < activities.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}

const NotificationWidget = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Notifications
        </Typography>
        <Chip label="5 New" color="error" size="small" />
      </Box>
      
      <List dense>
        <ListItem sx={{ px: 0 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
              <NotificationsIcon fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="System Update Available"
            secondary="A new version is ready to install"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
        
        <ListItem sx={{ px: 0 }}>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32 }}>
              <CalendarIcon fontSize="small" />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="Meeting Reminder"
            secondary="Team standup in 30 minutes"
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      </List>
    </CardContent>
  </Card>
)

const Widgets = () => {
  return (
    <>
      <PageBreadcrumb subName="Raydar" title="Widgets" />
      
      <Grid container spacing={3}>
        {/* Statistics Row */}
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Total Users"
            value="12,345"
            change="+12.5%"
            trend="up"
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Total Sales"
            value="$45,678"
            change="+8.2%"
            trend="up"
            icon={<MoneyIcon />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Orders"
            value="1,234"
            change="-3.1%"
            trend="down"
            icon={<ShoppingCartIcon />}
            color="warning"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatWidget
            title="Revenue"
            value="$78,901"
            change="+15.3%"
            trend="up"
            icon={<TrendingUpIcon />}
            color="info"
          />
        </Grid>
        
        {/* Progress and Activity Row */}
        <Grid item xs={12} md={4}>
          <ProgressWidget />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <ActivityWidget />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <NotificationWidget />
        </Grid>
      </Grid>
    </>
  )
}

export default Widgets