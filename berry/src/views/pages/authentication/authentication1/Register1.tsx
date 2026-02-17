import { Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from '../AuthWrapper1';
import AuthCardWrapper from '../AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AuthRegister from '../jwt/AuthRegister';
import BackgroundPattern1 from 'ui-component/cards/BackgroundPattern1';
import AuthSlider from 'ui-component/cards/AuthSlider';
import { AuthSliderProps } from 'types';

// assets
import AuthBlueCard from 'assets/images/auth/auth-signup-blue-card.svg';
import AuthWhiteCard from 'assets/images/auth/auth-signup-white-card.svg';

// carousel items
const items: AuthSliderProps[] = [
  {
    title: 'Powerful and easy to use multipurpose theme.',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Power of React with Material UI',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Power of React with Material UI',
    description: 'Powerful and easy to use multipurpose theme'
  }
];

// ===============================|| AUTH1 - REGISTER ||=============================== //

export default function Register() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper1>
      <Grid container sx={{ justifyContent: 'space-between', alignItems: 'center', minHeight: '100vh' }}>
        <Grid container sx={{ justifyContent: 'center', my: 3 }} size={{ xs: 12, md: 6, lg: 7 }}>
          <AuthCardWrapper>
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <Grid
                  container
                  direction={{ xs: 'column-reverse', md: 'row' }}
                  sx={{ alignItems: { xs: 'center', md: 'inherit' }, justifyContent: { xs: 'center', md: 'space-between' } }}
                >
                  <Grid>
                    <Stack
                      sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'inherit' }, pt: { sm: 1 } }}
                    >
                      <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                        Sign up
                      </Typography>
                      <Typography color="textPrimary" gutterBottom variant="h4">
                        Enter details to continue
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid sx={{ mb: { xs: 3, sm: 0 } }}>
                    <Link to="#" aria-label="theme logo">
                      <Logo />
                    </Link>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <AuthRegister />
              </Grid>
              <Grid size={12}>
                <Divider />
              </Grid>
              <Grid size={12}>
                <Grid container direction="column" sx={{ alignItems: 'flex-end' }} size={12}>
                  <Typography component={Link} to="/pages/login/login1" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                    Already have an account?
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </AuthCardWrapper>
        </Grid>
        <Grid sx={{ position: 'relative', alignSelf: 'stretch', display: { xs: 'none', md: 'block' } }} size={{ md: 6, lg: 5 }}>
          <BackgroundPattern1>
            <Grid container spacing={3} sx={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Grid size={12}>
                <span />
                <Box
                  sx={{
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      top: { xs: '50%', xl: '45%' },
                      left: { xs: '25%', lg: '35%' },
                      width: 260,
                      backgroundSize: 380,
                      height: 290,
                      backgroundImage: `url(${AuthWhiteCard})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      animation: '15s wings ease-in-out infinite'
                    },
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: { xs: '10%', xl: '12%' },
                      left: { xs: '15%', lg: '25%' },
                      width: 360,
                      height: 350,
                      backgroundSize: 460,
                      backgroundImage: `url(${AuthBlueCard})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      animation: '15s wings ease-in-out infinite',
                      animationDelay: '1s'
                    }
                  }}
                />
              </Grid>
              <Grid size={12}>
                <Grid container sx={{ justifyContent: 'center', pb: 8 }}>
                  <Grid sx={{ '& .slick-list': { pb: 2 } }} size={{ xs: 10, lg: 8 }}>
                    <AuthSlider items={items} />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </BackgroundPattern1>
        </Grid>
      </Grid>
    </AuthWrapper1>
  );
}
