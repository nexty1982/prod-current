import React from 'react';

// material-ui
import { styled } from '@mui/material/styles';
import { linearProgressClasses } from '@mui/material/LinearProgress';
import CircularProgress, { CircularProgressProps } from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import LinearProgress, { LinearProgressProps } from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// customized with label
function CircularProgressWithLabel({ value, ...other }: CircularProgressProps) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress variant="determinate" value={value} {...other} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="caption" color="textSecondary">{`${Math.round(value!)}%`}</Typography>
      </Box>
    </Box>
  );
}

function LinearProgressWithLabel({ value, ...other }: LinearProgressProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={value} {...other} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(value!)}%`}</Typography>
      </Box>
    </Box>
  );
}

// style constant
const BorderLinearProgress = styled(LinearProgress)(() => ({
  height: 10,
  borderRadius: 5,
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5
  }
}));

// ==============================|| UI PROGRESS ||============================== //

export default function UIProgress() {
  const [progress, setProgress] = React.useState(0);
  const [buffer, setBuffer] = React.useState(10);

  const progressRef = React.useRef(() => {});
  React.useEffect(() => {
    progressRef.current = () => {
      if (progress > 100) {
        setProgress(0);
        setBuffer(10);
      } else {
        const diff = Math.random() * 10;
        const diff2 = Math.random() * 10;
        setProgress(progress + diff);
        setBuffer(progress + diff + diff2);
      }
    };
  });

  React.useEffect(() => {
    const timer = setInterval(() => {
      progressRef.current();
    }, 500);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <MainCard title="Progress" secondary={<SecondaryAction link="https://next.material-ui.com/components/progress/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Circular Indeterminate">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <CircularProgress aria-label="progress" />
              </Grid>
              <Grid>
                <CircularProgress color="secondary" aria-label="progress with secondary color" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Circular Determinate">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <CircularProgress variant="determinate" value={25} aria-label="progress 25%" />
              </Grid>
              <Grid>
                <CircularProgress variant="determinate" value={50} aria-label="progress 50%" />
              </Grid>
              <Grid>
                <CircularProgress variant="determinate" value={75} aria-label="progress 75%" />
              </Grid>
              <Grid>
                <CircularProgress variant="determinate" value={100} aria-label="progress 100%" />
              </Grid>
              <Grid>
                <CircularProgress variant="determinate" value={50} aria-label="progress 50%" />
              </Grid>
              <Grid>
                <CircularProgress variant="determinate" value={progress} aria-label="progress" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Circular Label">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <CircularProgressWithLabel value={progress} aria-label="circular progress" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Linear Indeterminate">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <LinearProgress aria-label="linear progress" />
              </Grid>
              <Grid size={12}>
                <LinearProgress color="secondary" aria-label="linear progress with secondary color" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Linear Label">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <LinearProgressWithLabel value={progress} aria-label="linear label progress" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Linear Determinate">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <LinearProgress variant="determinate" value={progress} aria-label="linear Determinate progress" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Linear Buffer">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <LinearProgress variant="buffer" value={progress} valueBuffer={buffer} aria-label="linear Buffer progress" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Color">
            <Grid container direction="column" spacing={3}>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid size="grow">
                    <LinearProgress variant="determinate" color="secondary" value={progress} aria-label="secondary color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'success.main' }} size="grow">
                    <LinearProgress color="inherit" variant="determinate" value={progress} aria-label="success color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'error.main' }} size="grow">
                    <LinearProgress color="inherit" variant="determinate" value={progress} aria-label="danger color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'warning.main' }} size="grow">
                    <LinearProgress color="inherit" variant="determinate" value={progress} aria-label="warning color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'info.main' }} size="grow">
                    <LinearProgress color="inherit" variant="determinate" value={progress} aria-label="info color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <SubCard title="Color With Height">
            <Grid container direction="column" spacing={3}>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid size="grow">
                    <BorderLinearProgress variant="determinate" color="secondary" value={progress} aria-label="secondary color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'success.main' }} size="grow">
                    <BorderLinearProgress color="inherit" variant="determinate" value={progress} aria-label="success color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'error.main' }} size="grow">
                    <BorderLinearProgress color="inherit" variant="determinate" value={progress} aria-label="danger color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'warning.main' }} size="grow">
                    <BorderLinearProgress color="inherit" variant="determinate" value={progress} aria-label="warning color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Grid>
                    <Typography variant="caption">Progress</Typography>
                  </Grid>
                  <Grid sx={{ color: 'info.main' }} size="grow">
                    <BorderLinearProgress color="inherit" variant="determinate" value={progress} aria-label="info color progress" />
                  </Grid>
                  <Grid>
                    <Typography variant="h6">{Math.round(progress)}%</Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
