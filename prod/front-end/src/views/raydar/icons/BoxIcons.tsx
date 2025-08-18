import React, { useState } from 'react'
import { 
  Box, 
  Grid, 
  Card,
  CardContent,
  Typography,
  IconButton,
  TextField,
  Chip,
  Paper,
  Tooltip
} from '@mui/material'
import { 
  Home as HomeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  ShoppingCart as ShoppingCartIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Search as SearchIcon,
  Favorite as FavoriteIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Menu as MenuIcon,
  Star as StarIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const iconData = [
  { name: 'Home', component: HomeIcon, category: 'Navigation' },
  { name: 'Person', component: PersonIcon, category: 'User' },
  { name: 'Settings', component: SettingsIcon, category: 'Action' },
  { name: 'Notifications', component: NotificationsIcon, category: 'Communication' },
  { name: 'ShoppingCart', component: ShoppingCartIcon, category: 'Commerce' },
  { name: 'Email', component: EmailIcon, category: 'Communication' },
  { name: 'Phone', component: PhoneIcon, category: 'Communication' },
  { name: 'LocationOn', component: LocationIcon, category: 'Maps' },
  { name: 'Search', component: SearchIcon, category: 'Action' },
  { name: 'Favorite', component: FavoriteIcon, category: 'Action' },
  { name: 'Share', component: ShareIcon, category: 'Social' },
  { name: 'Download', component: DownloadIcon, category: 'File' },
  { name: 'Upload', component: UploadIcon, category: 'File' },
  { name: 'Edit', component: EditIcon, category: 'Editor' },
  { name: 'Delete', component: DeleteIcon, category: 'Action' },
  { name: 'Add', component: AddIcon, category: 'Action' },
  { name: 'Remove', component: RemoveIcon, category: 'Action' },
  { name: 'Check', component: CheckIcon, category: 'Action' },
  { name: 'Close', component: CloseIcon, category: 'Action' },
  { name: 'ChevronLeft', component: ChevronLeftIcon, category: 'Navigation' },
  { name: 'ChevronRight', component: ChevronRightIcon, category: 'Navigation' },
  { name: 'ExpandMore', component: ExpandMoreIcon, category: 'Navigation' },
  { name: 'ExpandLess', component: ExpandLessIcon, category: 'Navigation' },
  { name: 'Menu', component: MenuIcon, category: 'Navigation' },
  { name: 'Star', component: StarIcon, category: 'Action' },
]

const IconShowcase = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(iconData.map(icon => icon.category)))

  const filteredIcons = iconData.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !selectedCategory || icon.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <ComponentContainerCard
      id="icon-showcase"
      title="Material-UI Icons"
      description="Comprehensive collection of Material-UI icons for your applications."
    >
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label="All"
                onClick={() => setSelectedCategory(null)}
                color={!selectedCategory ? 'primary' : 'default'}
                size="small"
              />
              {categories.map(category => (
                <Chip
                  key={category}
                  label={category}
                  onClick={() => setSelectedCategory(category)}
                  color={selectedCategory === category ? 'primary' : 'default'}
                  size="small"
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={2}>
        {filteredIcons.map((icon, index) => {
          const IconComponent = icon.component
          return (
            <Grid item xs={6} sm={4} md={3} lg={2} key={index}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'primary.50',
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
              >
                <Tooltip title={`Copy: <${icon.name} />`}>
                  <Box>
                    <IconComponent 
                      sx={{ 
                        fontSize: 32, 
                        color: 'primary.main',
                        mb: 1
                      }} 
                    />
                    <Typography variant="caption" display="block">
                      {icon.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {icon.category}
                    </Typography>
                  </Box>
                </Tooltip>
              </Paper>
            </Grid>
          )
        })}
      </Grid>

      {filteredIcons.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No icons found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or category filter
          </Typography>
        </Box>
      )}
    </ComponentContainerCard>
  )
}

const IconUsageExamples = () => {
  return (
    <ComponentContainerCard
      id="icon-usage"
      title="Icon Usage Examples"
      description="Different ways to use and style Material-UI icons."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Different Sizes</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <StarIcon fontSize="small" />
                <StarIcon fontSize="medium" />
                <StarIcon fontSize="large" />
                <StarIcon sx={{ fontSize: 48 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Different Colors</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <FavoriteIcon color="primary" />
                <FavoriteIcon color="secondary" />
                <FavoriteIcon color="error" />
                <FavoriteIcon sx={{ color: 'orange' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>In Buttons</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <IconButton color="primary">
                  <EditIcon />
                </IconButton>
                <IconButton color="error">
                  <DeleteIcon />
                </IconButton>
                <IconButton color="success">
                  <CheckIcon />
                </IconButton>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const BoxIcons = () => {
  return (
    <>
      <PageBreadcrumb subName="Icon Libraries" title="BoxIcons" />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <IconShowcase />
            <IconUsageExamples />
          </Box>
        </Grid>
      </Grid>
    </>
  )
}

export default BoxIcons