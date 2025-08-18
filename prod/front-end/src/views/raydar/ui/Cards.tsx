import React from 'react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardMedia, 
  CardActions, 
  Button, 
  Typography, 
  Box, 
  Grid,
  Avatar,
  IconButton,
  Chip
} from '@mui/material'
import { 
  Favorite as FavoriteIcon, 
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const BasicCards = () => {
  return (
    <ComponentContainerCard
      id="basic-cards"
      title="Basic Cards"
      description="A card is a flexible and extensible content container with multiple variants and options."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div">
                Simple Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is a simple card with just text content. Cards can contain various types of content and actions.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Learn More</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" component="div">
                Outlined Card
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This card uses the outlined variant for a different visual style.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Action</Button>
              <Button size="small">Another Action</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const MediaCards = () => {
  return (
    <ComponentContainerCard
      id="media-cards"
      title="Media Cards"
      description="Cards can include media elements like images and videos."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ maxWidth: 345 }}>
            <CardMedia
              sx={{ height: 140 }}
              image="https://via.placeholder.com/345x140"
              title="Sample Image"
            />
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                Card with Image
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This card includes a media element at the top. The image can be any size and ratio.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">Share</Button>
              <Button size="small">Learn More</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ maxWidth: 345 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }} aria-label="recipe">
                  R
                </Avatar>
              }
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
              title="Card with Header"
              subheader="September 14, 2023"
            />
            <CardMedia
              sx={{ height: 194 }}
              image="https://via.placeholder.com/345x194"
              title="Sample content"
            />
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                This card has a header with avatar, title, subtitle, and action menu.
              </Typography>
            </CardContent>
            <CardActions disableSpacing>
              <IconButton aria-label="add to favorites">
                <FavoriteIcon />
              </IconButton>
              <IconButton aria-label="share">
                <ShareIcon />
              </IconButton>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const ActionCards = () => {
  return (
    <ComponentContainerCard
      id="action-cards"
      title="Action Cards"
      description="Cards with various action buttons and interactive elements."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <SettingsIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Settings</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your preferences
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2">
                Configure your application settings and preferences from this panel.
              </Typography>
            </CardContent>
            <CardActions>
              <Button variant="contained" size="small">
                Configure
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Project Status
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Chip label="In Progress" color="warning" size="small" />
              </Box>
              <Typography variant="body2">
                Current project is 75% complete. Estimated completion in 2 weeks.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">View Details</Button>
              <Button size="small">Update</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Statistics
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ mb: 1 }}>
                1,234
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total users this month (+12% from last month)
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">View Report</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const UIExamplesList = ({ examples }: { examples: Array<{ label: string; link: string }> }) => {
  return (
    <Box sx={{ position: 'sticky', top: 20 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Examples</Typography>
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {examples.map((example, index) => (
          <Box component="li" key={index} sx={{ mb: 1 }}>
            <Box 
              component="a" 
              href={example.link}
              sx={{ 
                textDecoration: 'none', 
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              {example.label}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const Cards = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Cards" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicCards />
            <MediaCards />
            <ActionCards />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Basic Cards', link: '#basic-cards' },
              { label: 'Media Cards', link: '#media-cards' },
              { label: 'Action Cards', link: '#action-cards' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Cards