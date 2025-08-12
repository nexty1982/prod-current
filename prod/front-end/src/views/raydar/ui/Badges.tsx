import React from 'react'
import { 
  Badge, 
  Button, 
  Typography, 
  Box, 
  Grid,
  Avatar,
  IconButton,
  Chip
} from '@mui/material'
import { 
  Mail as MailIcon, 
  Notifications as NotificationsIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const BasicBadges = () => {
  return (
    <ComponentContainerCard
      id="basic-badges"
      title="Basic Badges"
      description="Badges are small status descriptors for UI elements."
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
        <Badge badgeContent={4} color="primary">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={4} color="secondary">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={4} color="error">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={4} color="warning">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={4} color="info">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={4} color="success">
          <MailIcon />
        </Badge>
      </Box>
    </ComponentContainerCard>
  )
}

const DotBadges = () => {
  return (
    <ComponentContainerCard
      id="dot-badges"
      title="Dot Badges"
      description="Use dot badges for simple status indicators."
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
        <Badge variant="dot" color="primary">
          <MailIcon />
        </Badge>
        
        <Badge variant="dot" color="secondary">
          <MailIcon />
        </Badge>
        
        <Badge variant="dot" color="error">
          <MailIcon />
        </Badge>
        
        <Badge variant="dot" color="warning">
          <MailIcon />
        </Badge>
        
        <Badge variant="dot" color="info">
          <MailIcon />
        </Badge>
        
        <Badge variant="dot" color="success">
          <MailIcon />
        </Badge>
      </Box>
    </ComponentContainerCard>
  )
}

const BadgeOverlap = () => {
  return (
    <ComponentContainerCard
      id="badge-overlap"
      title="Badge Overlap"
      description="Badges can be positioned in different ways relative to their content."
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Circular Overlap</Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Badge badgeContent={4} color="primary" overlap="circular">
              <Avatar>U</Avatar>
            </Badge>
            
            <Badge badgeContent={4} color="error" overlap="circular">
              <Avatar sx={{ bgcolor: 'secondary.main' }}>A</Avatar>
            </Badge>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Rectangular Overlap</Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <Badge badgeContent={4} color="primary" overlap="rectangular">
              <Box sx={{ width: 40, height: 40, bgcolor: 'grey.300' }} />
            </Badge>
            
            <Badge badgeContent={4} color="error" overlap="rectangular">
              <Box sx={{ width: 40, height: 40, bgcolor: 'grey.400' }} />
            </Badge>
          </Box>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const BadgeMax = () => {
  return (
    <ComponentContainerCard
      id="badge-max"
      title="Badge Maximum Value"
      description="Control the maximum value displayed in badges."
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
        <Badge badgeContent={99} color="primary">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={100} color="primary">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={1000} max={999} color="primary">
          <MailIcon />
        </Badge>
        
        <Badge badgeContent={1000} max={99} color="error">
          <NotificationsIcon />
        </Badge>
      </Box>
    </ComponentContainerCard>
  )
}

const BadgeButtons = () => {
  return (
    <ComponentContainerCard
      id="badge-buttons"
      title="Badges with Buttons"
      description="Badges can be used with buttons and other interactive elements."
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Badge badgeContent={4} color="primary">
          <Button variant="contained">Messages</Button>
        </Badge>
        
        <Badge badgeContent={2} color="error">
          <Button variant="outlined">Notifications</Button>
        </Badge>
        
        <Badge badgeContent={17} color="success">
          <IconButton color="primary">
            <ShoppingCartIcon />
          </IconButton>
        </Badge>
        
        <Badge variant="dot" color="warning">
          <Chip label="Status" />
        </Badge>
      </Box>
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

const Badges = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Badges" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicBadges />
            <DotBadges />
            <BadgeOverlap />
            <BadgeMax />
            <BadgeButtons />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Basic Badges', link: '#basic-badges' },
              { label: 'Dot Badges', link: '#dot-badges' },
              { label: 'Badge Overlap', link: '#badge-overlap' },
              { label: 'Badge Maximum', link: '#badge-max' },
              { label: 'Badge Buttons', link: '#badge-buttons' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Badges