import React from 'react'
import { Alert, Box, Grid, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import ComponentContainerCard from 'src/components/raydar/ComponentContainerCard'
import PageBreadcrumb from 'src/components/raydar/PageBreadcrumb'
import IconifyIcon from 'src/components/raydar/wrappers/IconifyIcon'

const StyledAlert = styled(Alert)(({ theme }) => ({
  '&.alert-icon': {
    display: 'flex',
    alignItems: 'center',
    '& .avatar-sm': {
      width: 32,
      height: 32,
      borderRadius: theme.shape.borderRadius,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontSize: 18,
      marginRight: theme.spacing(2),
      flexShrink: 0,
    }
  }
}))

const BasicAlerts = () => {
  return (
    <ComponentContainerCard
      id="overview"
      title="Basic Example"
      description={
        <>
          Provide contextual feedback messages for typical user actions with the handful of available and flexible alert messages. Alerts are
          available for any length of text, as well as an optional dismiss button.
        </>
      }>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="info">A simple primary alert—check it out!</Alert>
        <Alert severity="warning">A simple secondary alert—check it out!</Alert>
        <Alert severity="success">A simple success alert—check it out!</Alert>
        <Alert severity="error">A simple danger alert—check it out!</Alert>
        <Alert severity="warning">A simple warning alert—check it out!</Alert>
        <Alert severity="info">A simple info alert—check it out!</Alert>
      </Box>
    </ComponentContainerCard>
  )
}

const DismissibleAlerts = () => {
  return (
    <ComponentContainerCard
      id="alert-dismissible"
      title="Dismissible Alerts Example"
      description={
        <>
          Add a dismiss button to make alerts closable by users.
        </>
      }>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="info" onClose={() => {}}>
          A simple primary alert—check it out!
        </Alert>
        <Alert severity="warning" onClose={() => {}}>
          A simple secondary alert—check it out!
        </Alert>
        <Alert severity="success" onClose={() => {}}>
          A simple success alert—check it out!
        </Alert>
        <Alert severity="error" onClose={() => {}}>
          A simple danger alert—check it out!
        </Alert>
      </Box>
    </ComponentContainerCard>
  )
}

const IconAlerts = () => {
  return (
    <ComponentContainerCard
      id="alert-icon"
      title="Icons Alert Example"
      description={<>You can also include additional elements like icons, heading, etc along side the actual message.</>}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <StyledAlert severity="info" className="alert-icon">
          <Box className="avatar-sm" sx={{ bgcolor: 'info.main', color: 'white' }}>
            <IconifyIcon icon="bx:info-circle" />
          </Box>
          <Box sx={{ flexGrow: 1 }}>A simple primary alert—check it out!</Box>
        </StyledAlert>
        
        <StyledAlert severity="success" className="alert-icon">
          <Box className="avatar-sm" sx={{ bgcolor: 'success.main', color: 'white' }}>
            <IconifyIcon icon="bx:check-shield" />
          </Box>
          <Box sx={{ flexGrow: 1 }}>A simple success alert—check it out!</Box>
        </StyledAlert>
        
        <StyledAlert severity="error" className="alert-icon">
          <Box className="avatar-sm" sx={{ bgcolor: 'error.main', color: 'white' }}>
            <IconifyIcon icon="bx:error-circle" />
          </Box>
          <Box sx={{ flexGrow: 1 }}>A simple danger alert—check it out!</Box>
        </StyledAlert>
      </Box>
    </ComponentContainerCard>
  )
}

const AdditionalContentAlerts = () => {
  return (
    <ComponentContainerCard
      id="alert-additional"
      title="Additional Content Alert Example"
      description={<>Alerts can also contain additional HTML elements like headings, paragraphs and dividers.</>}>
      <Grid container spacing={3}>
        <Grid item xs={12} xl={6}>
          <Alert severity="info" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Well done!</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how
              spacing within an alert works with this kind of content.
            </Typography>
            <hr />
            <Typography variant="body2" sx={{ mb: 0 }}>
              Whenever you need to, be sure to use margin utilities to keep things nice and tidy.
            </Typography>
          </Alert>
        </Grid>
        <Grid item xs={12} xl={6}>
          <Alert severity="warning" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Well done!</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Aww yeah, you successfully read this important alert message. This example text is going to run a bit longer so that you can see how
              spacing within an alert works with this kind of content.
            </Typography>
            <hr />
            <Typography variant="body2" sx={{ mb: 0 }}>
              Whenever you need to, be sure to use margin utilities to keep things nice and tidy.
            </Typography>
          </Alert>
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

const Alerts = () => {
  return (
    <>
      <PageBreadcrumb subName="Base UI" title="Alerts" />
      <Grid container spacing={3}>
        <Grid item xs={12} xl={9}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BasicAlerts />
            <DismissibleAlerts />
            <IconAlerts />
            <AdditionalContentAlerts />
          </Box>
        </Grid>
        <Grid item xs={12} xl={3}>
          <UIExamplesList
            examples={[
              { label: 'Basic Example', link: '#overview' },
              { label: 'Alert Dismissible', link: '#alert-dismissible' },
              { label: 'Icons Alert', link: '#alert-icon' },
              { label: 'Additional Content Alert', link: '#alert-additional' },
            ]}
          />
        </Grid>
      </Grid>
    </>
  )
}

export default Alerts