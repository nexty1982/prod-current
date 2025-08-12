import React from 'react'
import { Box, Button, Grid, Typography, ButtonGroup } from '@mui/material'
import { styled } from '@mui/material/styles'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'
import IconifyIcon from 'src/components/raydar/wrappers/IconifyIcon'
import { 
  Favorite as HeartIcon, 
  Cloud as CloudIcon, 
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Person as PersonIcon
} from '@mui/icons-material'

const colorVariants = [
  'primary', 'secondary', 'success', 'error', 'warning', 'info'
]

const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0.5),
  textTransform: 'capitalize',
}))

const DefaultButtons = () => {
  return (
    <ComponentContainerCard
      id="default"
      title="Default Buttons"
      description={
        <>
          Use the button classes on an&nbsp; <code>&lt;Button&gt;</code> element with different color variants.
        </>
      }>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {colorVariants.map((color, idx) => (
          <Button 
            key={idx}
            variant="contained" 
            color={color as any}
            sx={{ textTransform: 'capitalize' }}
          >
            {color}
          </Button>
        ))}
      </Box>
    </ComponentContainerCard>
  )
}

const OutlineButtons = () => {
  return (
    <ComponentContainerCard
      id="outline"
      title="Outline Buttons"
      description={
        <>
          Use variant <code>"outlined"</code> to create bordered buttons.
        </>
      }>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {colorVariants.map((color, idx) => (
          <Button 
            key={idx}
            variant="outlined" 
            color={color as any}
            sx={{ textTransform: 'capitalize' }}
          >
            {color}
          </Button>
        ))}
      </Box>
    </ComponentContainerCard>
  )
}

const RoundedButtons = () => {
  return (
    <ComponentContainerCard
      id="rounded"
      title="Rounded Buttons"
      description={
        <>
          Add custom border radius to create rounded buttons.
        </>
      }>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {colorVariants.slice(0, 4).map((color, idx) => (
          <Button 
            key={idx}
            variant="contained" 
            color={color as any}
            sx={{ 
              textTransform: 'capitalize',
              borderRadius: '25px' 
            }}
          >
            {color}
          </Button>
        ))}
      </Box>
    </ComponentContainerCard>
  )
}

const ButtonSizes = () => {
  return (
    <ComponentContainerCard
      id="sizes"
      title="Button Sizes"
      description={
        <>
          Use <code>size</code> prop for different button sizes.
        </>
      }>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Button variant="contained" color="primary" size="large">
          Large
        </Button>
        <Button variant="contained" color="secondary" size="medium">
          Medium
        </Button>
        <Button variant="contained" color="success" size="small">
          Small
        </Button>
      </Box>
    </ComponentContainerCard>
  )
}

const DisabledButtons = () => {
  return (
    <ComponentContainerCard
      id="disabled"
      title="Disabled Buttons"
      description={
        <>
          Add <code>disabled</code> prop to disable buttons.
        </>
      }>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {colorVariants.slice(0, 4).map((color, idx) => (
          <Button 
            key={idx}
            variant="contained" 
            color={color as any}
            disabled
            sx={{ textTransform: 'capitalize' }}
          >
            {color}
          </Button>
        ))}
      </Box>
    </ComponentContainerCard>
  )
}

const IconButtons = () => {
  return (
    <ComponentContainerCard 
      id="icon" 
      title="Icon Buttons" 
      description={<>Buttons with icons for enhanced user experience.</>}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" color="primary" startIcon={<HeartIcon />}>
          Like
        </Button>
        <Button variant="contained" color="secondary" startIcon={<PersonIcon />}>
          Profile
        </Button>
        <Button variant="contained" color="success" startIcon={<CheckIcon />}>
          Complete
        </Button>
        <Button variant="contained" color="info" startIcon={<CloudIcon />}>
          Cloud
        </Button>
        <Button variant="contained" color="warning" startIcon={<InfoIcon />}>
          Warning
        </Button>
      </Box>
    </ComponentContainerCard>
  )
}

const ButtonGroupDemo = () => {
  return (
    <ComponentContainerCard
      id="group"
      title="Button Groups"
      description={
        <>
          Group related buttons together using <code>ButtonGroup</code>.
        </>
      }>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Horizontal Group</Typography>
          <ButtonGroup variant="contained" color="primary">
            <Button>Left</Button>
            <Button>Middle</Button>
            <Button>Right</Button>
          </ButtonGroup>
          
          <Box sx={{ mt: 2 }}>
            <ButtonGroup variant="outlined" color="secondary">
              <Button>One</Button>
              <Button>Two</Button>
              <Button>Three</Button>
              <Button>Four</Button>
            </ButtonGroup>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>Vertical Group</Typography>
          <ButtonGroup orientation="vertical" variant="contained" color="success">
            <Button>Top</Button>
            <Button>Middle</Button>
            <Button>Bottom</Button>
          </ButtonGroup>
        </Grid>
      </Grid>
    </ComponentContainerCard>
  )
}

const FullWidthButtons = () => {
  return (
    <ComponentContainerCard
      id="fullwidth"
      title="Full Width Buttons"
      description={
        <>
          Create full-width buttons using <code>fullWidth</code> prop.
        </>
      }>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button variant="contained" color="primary" fullWidth size="large">
          Full Width Large
        </Button>
        <Button variant="outlined" color="secondary" fullWidth>
          Full Width Outlined
        </Button>
        <Button variant="text" color="success" fullWidth size="small">
          Full Width Text Small
        </Button>
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

const Buttons = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Buttons" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <DefaultButtons />
            <OutlineButtons />
            <RoundedButtons />
            <ButtonSizes />
            <DisabledButtons />
            <IconButtons />
            <ButtonGroupDemo />
            <FullWidthButtons />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Default Buttons', link: '#default' },
              { label: 'Outline Buttons', link: '#outline' },
              { label: 'Rounded Buttons', link: '#rounded' },
              { label: 'Button Sizes', link: '#sizes' },
              { label: 'Disabled Buttons', link: '#disabled' },
              { label: 'Icon Buttons', link: '#icon' },
              { label: 'Button Groups', link: '#group' },
              { label: 'Full Width Buttons', link: '#fullwidth' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Buttons