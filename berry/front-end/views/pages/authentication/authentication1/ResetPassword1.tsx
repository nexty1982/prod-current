import { Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper1 from '../AuthWrapper1';
import AuthCardWrapper from '../AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AuthResetPassword from '../jwt/AuthResetPassword';
import BackgroundPattern1 from 'ui-component/cards/BackgroundPattern1';
import AuthSlider from 'ui-component/cards/AuthSlider';
import { AuthSliderProps } from 'types';

// assets
import AuthErrorCard from 'assets/images/auth/auth-reset-error-card.svg';
import AuthPurpleCard from 'assets/images/auth/auth-reset-purple-card.svg';

// carousel items
const items: AuthSliderProps[] = [
  {
    title: 'Configurable Elements, Easy to Setup',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Configurable Elements, Easy to Setup',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Configurable Elements, Easy to Setup',
    description: 'Powerful and easy to use multipurpose theme'
  }
];

// ============================|| AUTH1 - RESET PASSWORD ||============================ //

export default function ResetPassword() {
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
                        Reset Password
                      </Typography>
                      <Typography color="textPrimary" gutterBottom variant="h4">
                        Please choose new password.
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
                <AuthResetPassword link={'login1'} />
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
                      top: { xs: '40%', xl: '35%' },
                      left: { xs: '10%', lg: '30%' },
                      width: 400,
                      height: 400,
                      backgroundImage: `url(${AuthPurpleCard})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      animation: '15s wings ease-in-out infinite'
                    },
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: { xs: '8%', xl: '12%' },
                      left: { xs: '15%', lg: '20%' },
                      width: 400,
                      height: 270,
                      backgroundImage: `url(${AuthErrorCard})`,
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
