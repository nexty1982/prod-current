import React from 'react'
import { 
  Avatar, 
  AvatarGroup,
  Badge,
  Typography, 
  Box, 
  Grid,
  Chip,
  Stack
} from '@mui/material'
import { 
  Person as PersonIcon,
  PhotoCamera as CameraIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'

const BasicAvatars = () => {
  return (
    <ComponentContainerCard
      id="basic-avatars"
      title="Basic Avatars"
      description="Avatars are found throughout material design with uses in everything from tables to dialog menus."
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Avatar>H</Avatar>
        <Avatar sx={{ bgcolor: 'secondary.main' }}>A</Avatar>
        <Avatar sx={{ bgcolor: 'success.main' }}>V</Avatar>
        <Avatar sx={{ bgcolor: 'error.main' }}>T</Avatar>
        <Avatar sx={{ bgcolor: 'warning.main' }}>R</Avatar>
        <Avatar sx={{ bgcolor: 'info.main' }}>S</Avatar>
      </Stack>
    </ComponentContainerCard>
  )
}

const ImageAvatars = () => {
  return (
    <ComponentContainerCard
      id="image-avatars"
      title="Image Avatars"
      description="Image avatars can be created by passing standard img props to the component."
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Avatar 
          alt="User 1" 
          src="https://images.unsplash.com/photo-1494790108755-2616b6997699?w=150&h=150&fit=crop&crop=face"
        />
        <Avatar 
          alt="User 2" 
          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
        />
        <Avatar 
          alt="User 3" 
          src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
        />
        <Avatar 
          alt="User 4" 
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
        />
      </Stack>
    </ComponentContainerCard>
  )
}

const IconAvatars = () => {
  return (
    <ComponentContainerCard
      id="icon-avatars"
      title="Icon Avatars"
      description="Icon avatars are created by passing an icon as children."
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Avatar>
          <PersonIcon />
        </Avatar>
        <Avatar sx={{ bgcolor: 'secondary.main' }}>
          <CameraIcon />
        </Avatar>
        <Avatar sx={{ bgcolor: 'success.main' }}>
          <SettingsIcon />
        </Avatar>
        <Avatar sx={{ bgcolor: 'error.main' }}>
          <PersonIcon />
        </Avatar>
      </Stack>
    </ComponentContainerCard>
  )
}

const AvatarSizes = () => {
  return (
    <ComponentContainerCard
      id="avatar-sizes"
      title="Avatar Sizes"
      description="You can change the size of the avatar with height and width CSS properties."
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>S</Avatar>
        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>M</Avatar>
        <Avatar>D</Avatar>
        <Avatar sx={{ width: 56, height: 56, fontSize: '1.5rem' }}>L</Avatar>
        <Avatar sx={{ width: 64, height: 64, fontSize: '1.75rem' }}>XL</Avatar>
      </Stack>
    </ComponentContainerCard>
  )
}

const BadgedAvatars = () => {
  return (
    <ComponentContainerCard
      id="badged-avatars"
      title="Badges with Avatars"
      description="Avatars can be combined with badges to show status or notifications."
    >
      <Stack direction="row" spacing={3} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Avatar sx={{ width: 22, height: 22, bgcolor: 'success.main' }}>
              <Box sx={{ width: 8, height: 8, bgcolor: 'white', borderRadius: '50%' }} />
            </Avatar>
          }
        >
          <Avatar 
            alt="Online User" 
            src="https://images.unsplash.com/photo-1494790108755-2616b6997699?w=150&h=150&fit=crop&crop=face"
          />
        </Badge>

        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          color="success"
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
        </Badge>

        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          badgeContent={3}
          color="error"
        >
          <Avatar sx={{ bgcolor: 'secondary.main' }}>MP</Avatar>
        </Badge>
      </Stack>
    </ComponentContainerCard>
  )
}

const AvatarGroups = () => {
  return (
    <ComponentContainerCard
      id="avatar-groups"
      title="Avatar Groups"
      description="AvatarGroup renders its children as a stack. Use the max prop to limit the number of avatars."
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Default Group</Typography>
          <AvatarGroup max={4}>
            <Avatar alt="User 1" src="https://images.unsplash.com/photo-1494790108755-2616b6997699?w=150&h=150&fit=crop&crop=face" />
            <Avatar alt="User 2" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" />
            <Avatar alt="User 3" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" />
            <Avatar alt="User 4" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" />
            <Avatar sx={{ bgcolor: 'primary.main' }}>+3</Avatar>
          </AvatarGroup>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>With Total Count</Typography>
          <AvatarGroup total={24} max={3}>
            <Avatar alt="User 1" src="https://images.unsplash.com/photo-1494790108755-2616b6997699?w=150&h=150&fit=crop&crop=face" />
            <Avatar alt="User 2" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" />
            <Avatar alt="User 3" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" />
          </AvatarGroup>
        </Box>
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

const Avatars = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Avatars" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicAvatars />
            <ImageAvatars />
            <IconAvatars />
            <AvatarSizes />
            <BadgedAvatars />
            <AvatarGroups />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Basic Avatars', link: '#basic-avatars' },
              { label: 'Image Avatars', link: '#image-avatars' },
              { label: 'Icon Avatars', link: '#icon-avatars' },
              { label: 'Avatar Sizes', link: '#avatar-sizes' },
              { label: 'Badged Avatars', link: '#badged-avatars' },
              { label: 'Avatar Groups', link: '#avatar-groups' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Avatars