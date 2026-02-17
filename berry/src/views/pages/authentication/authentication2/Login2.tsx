import { Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper2 from '../AuthWrapper2';
import AuthCardWrapper from '../AuthCardWrapper';
import AuthLogin from '../jwt/AuthLogin';
import Logo from 'ui-component/Logo';
import BackgroundPattern2 from 'ui-component/cards/BackgroundPattern2';
import AuthFooter from 'ui-component/cards/AuthFooter';
import AuthSlider from 'ui-component/cards/AuthSlider';
import { AuthSliderProps } from 'types';

// assets
import imgMain from 'assets/images/auth/img-a2-login.svg';

// carousel items
const items: AuthSliderProps[] = [
  {
    title: 'Components Based Design System',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Ready to use components',
    description: 'Ready made component to apply directly'
  },
  {
    title: 'Multiple dashboard and widgets',
    description: '100+ widgets and customize controls'
  }
];

// ================================|| AUTH2 - LOGIN ||================================ //

export default function Login() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper2>
      <Grid container sx={{ justifyContent: { xs: 'center', md: 'space-between' }, alignItems: 'center' }}>
        <Grid sx={{ minHeight: '100vh' }} size={{ xs: 12, md: 6, lg: 7 }}>
          <Grid
            container
            sx={{
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: { xs: 'center', md: 'space-between' },
              minHeight: '100vh'
            }}
          >
            <Grid sx={{ display: { xs: 'none', md: 'block' }, m: 3 }}>
              <Link to="#" aria-label="theme logo">
                <Logo />
              </Link>
            </Grid>
            <Grid
              container
              sx={{ justifyContent: 'center', alignItems: 'center', minHeight: { xs: 'calc(100vh - 68px)', md: 'calc(100vh - 152px)' } }}
              size={12}
            >
              <Stack spacing={5} sx={{ justifyContent: 'center', alignItems: 'center', m: 2 }}>
                <Box component={Link} to="#" sx={{ display: { xs: 'block', md: 'none' } }}>
                  <Logo />
                </Box>
                <AuthCardWrapper border={downMD}>
                  <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
                    <Grid>
                      <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                          Hi, Welcome Back
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '16px', textAlign: downMD ? 'center' : 'inherit' }}>
                          Enter your credentials to continue
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <AuthLogin loginProp={2} />
                    </Grid>
                    <Grid size={12}>
                      <Divider />
                    </Grid>
                    <Grid size={12}>
                      <Grid container direction="column" sx={{ alignItems: 'center' }} size={12}>
                        <Typography component={Link} to="/pages/register/register2" variant="subtitle1" sx={{ textDecoration: 'none' }}>
                          Don&apos;t have an account?
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                </AuthCardWrapper>
              </Stack>
            </Grid>
            <Grid sx={{ m: 3 }} size={12}>
              <AuthFooter />
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ position: 'relative', alignSelf: 'stretch', display: { xs: 'none', md: 'block' } }} size={{ xs: 12, md: 6, lg: 5 }}>
          <BackgroundPattern2>
            <Grid container sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <Grid container sx={{ justifyContent: 'center', pb: 8 }}>
                  <Grid sx={{ '& .slick-list': { pb: 2 } }} size={{ xs: 10, lg: 8 }}>
                    <AuthSlider items={items} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid sx={{ position: 'relative' }} size={12}>
                <CardMedia
                  component="img"
                  alt="Auth method"
                  src={imgMain}
                  sx={{ maxWidth: 1, m: '0 auto', display: 'block', width: 300, position: 'relative', zIndex: 5 }}
                />
              </Grid>
            </Grid>
          </BackgroundPattern2>
        </Grid>
      </Grid>
    </AuthWrapper2>
  );
}
