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
import AuthLogin from '../jwt/AuthLogin';
import Logo from 'ui-component/Logo';
import BackgroundPattern1 from 'ui-component/cards/BackgroundPattern1';
import AuthSlider from 'ui-component/cards/AuthSlider';
import { AuthSliderProps } from 'types';

// assets
import AuthBlueCard from 'assets/images/auth/auth-blue-card.svg';
import AuthPurpleCard from 'assets/images/auth/auth-purple-card.svg';

// carousel items
const items: AuthSliderProps[] = [
  {
    title: 'Components Based Design System',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Components Based Design System',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Components Based Design System',
    description: 'Powerful and easy to use multipurpose theme'
  }
];

// ================================|| AUTH1 - LOGIN ||================================ //

export default function Login() {
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
                    <Stack sx={{ justifyContent: { xs: 'center', md: 'flex-start' }, textAlign: { xs: 'center', md: 'inherit' } }}>
                      <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                        Hi, Welcome Back
                      </Typography>
                      <Typography color="textPrimary" gutterBottom variant="h4">
                        Login in to your account
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
                <AuthLogin loginProp={1} />
              </Grid>
              <Grid size={12}>
                <Divider />
              </Grid>
              <Grid size={12}>
                <Grid container direction="column" sx={{ alignItems: 'flex-end' }} size={12}>
                  <Typography component={Link} to="/pages/register/register1" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                    Don&apos;t have an account?
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
                      top: '32%',
                      left: { xs: '25%', lg: '35%' },
                      width: 313,
                      backgroundSize: 380,
                      height: 280,
                      backgroundImage: `url(${AuthPurpleCard})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      animation: '15s wings ease-in-out infinite'
                    },
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: '22%',
                      left: { xs: '20%', lg: '30%' },
                      width: 243,
                      height: 210,
                      backgroundSize: 380,
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
