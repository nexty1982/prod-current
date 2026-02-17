import { Link as RouterLink } from 'react-router-dom';
import { useMemo } from 'react';

// material-ui
import { styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import { motion } from 'framer-motion';

// project imports
import AnimateButton from 'ui-component/extended/AnimateButton';

import { ThemeDirection, ThemeMode, DASHBOARD_PATH } from 'config';
import useConfig from 'hooks/useConfig';

// assets
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TechLight from 'assets/images/landing/tech-light.svg';
import TechDark from 'assets/images/landing/tech-dark.svg';
import dashboard from 'assets/images/landing/hero-dashboard.png';
import widget1 from 'assets/images/landing/hero-widget-1.png';
import widget2 from 'assets/images/landing/hero-widget-2.png';
import BgDark from 'assets/images/landing/bg-hero-block-dark.png';
import BgLight from 'assets/images/landing/bg-hero-block-light.png';

// styles
const HeaderImage = styled('img')(({ theme }) => ({
  maxWidth: '100%',
  borderRadius: 20,
  transform: theme.direction === 'rtl' ? 'scale(1.63)' : 'scale(1.55)',
  transformOrigin: theme.direction === 'rtl' ? '100% 50%' : '0 50%',
  [theme.breakpoints.down('xl')]: {
    transform: 'scale(1.5)'
  },
  [theme.breakpoints.down('lg')]: {
    transform: 'scale(1.2)'
  }
}));

const HeaderAnimationImage = styled('img')({
  maxWidth: '100%',
  filter: 'drop-shadow(0px 0px 50px rgb(33 150 243 / 30%))'
});

// ==============================|| LANDING - HEADER PAGE ||============================== //

export default function HeaderSection() {
  const { mode, themeDirection } = useConfig();

  const headerSX = { fontSize: { xs: '2rem', sm: '3rem', md: '3.5rem', lg: '3.5rem' } };

  const HeaderAnimationImagememo = useMemo(
    () => (
      <HeaderAnimationImage
        src={mode === ThemeMode.DARK ? BgDark : BgLight}
        alt="Berry"
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'absolute',
          filter: 'none',
          bottom: { md: 0 },
          right: 0,
          width: '50%',
          transformOrigin: '50% 50%',
          transform: themeDirection === ThemeDirection.RTL ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      />
    ),
    [themeDirection, mode]
  );

  return (
    <Container sx={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Grid
        container
        sx={{ justifyContent: 'space-between', alignItems: 'center', mt: { xs: 10, sm: 6, md: 18.75 }, mb: { xs: 2.5, md: 10 } }}
      >
        <Grid size={{ xs: 12, md: 5 }}>
          <Grid container spacing={6}>
            <Grid size={12}>
              <motion.div
                initial={{ opacity: 0, translateY: 550 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30 }}
              >
                <Stack spacing={1}>
                  <Typography variant="h1" sx={{ textAlign: { xs: 'center', md: 'left' }, ...headerSX }}>
                    Use Berry to Power Your Next
                  </Typography>

                  <Typography variant="h1" color="primary" sx={{ textAlign: { xs: 'center', md: 'left' }, ...headerSX }}>
                    React Project
                  </Typography>
                </Stack>
              </motion.div>
            </Grid>
            <Grid sx={{ mt: -2.5, textAlign: { xs: 'center', md: 'left' } }} size={12}>
              <motion.div
                initial={{ opacity: 0, translateY: 550 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30, delay: 0.2 }}
              >
                <Typography
                  variant="body1"
                  sx={{ textAlign: { xs: 'center', md: 'left' }, color: 'text.primary', fontSize: { xs: '1rem', md: '1.125rem' } }}
                >
                  Berry is React based Dashboard template which helps you to build faster and beautiful web applications.
                </Typography>
              </motion.div>
            </Grid>
            <Grid size={12}>
              <motion.div
                initial={{ opacity: 0, translateY: 550 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30, delay: 0.4 }}
              >
                <Grid container spacing={2} sx={{ justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <Grid>
                    <AnimateButton>
                      <Button
                        component={RouterLink}
                        to={DASHBOARD_PATH}
                        target="_blank"
                        size="large"
                        variant="contained"
                        color="secondary"
                        startIcon={<PlayArrowIcon />}
                      >
                        Live Preview
                      </Button>
                    </AnimateButton>
                  </Grid>
                  <Grid>
                    <Button component={Link} href="https://links.codedthemes.com/hsqll" target="_blank" size="large">
                      Purchase Now
                    </Button>
                  </Grid>
                </Grid>
              </motion.div>
            </Grid>
            <Grid size={12}>
              <motion.div
                initial={{ opacity: 0, translateY: 550 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30, delay: 0.6 }}
              >
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' } }}>
                  <CardMedia
                    component="img"
                    image={mode === ThemeMode.DARK ? TechDark : TechLight}
                    alt="Berry Tech"
                    sx={{ width: { xs: '75%', sm: '50%', md: '75%' } }}
                  />
                </Stack>
              </motion.div>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ display: { xs: 'none', md: 'flex' } }} size={{ xs: 12, md: 7 }}>
          <Box sx={{ position: 'relative', mt: 8.75, zIndex: 9 }}>
            <HeaderImage src={dashboard} alt="Berry" />
            <Box
              sx={{
                position: 'absolute',
                top: { md: -35, lg: -110 },
                right: themeDirection === ThemeDirection.RTL ? 170 : { md: -50, lg: -140, xl: -220 },
                width: { md: 220, lg: 290 },
                animation: '10s slideY linear infinite'
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30, delay: 0.2 }}
              >
                <HeaderAnimationImage src={widget1} alt="Berry" />
              </motion.div>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: { md: -20, lg: -90 },
                left: { md: 100, lg: 300 },
                width: { md: 220, lg: 280 },
                animation: '10s slideY linear infinite',
                animationDelay: '2s'
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 30, delay: 0.4 }}
              >
                <HeaderAnimationImage src={widget2} alt="Berry" />
              </motion.div>
            </Box>
          </Box>
          {HeaderAnimationImagememo}
        </Grid>
      </Grid>
    </Container>
  );
}
