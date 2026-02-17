import { Link } from 'react-router-dom';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import AuthWrapper2 from '../AuthWrapper2';
import AuthCardWrapper from '../AuthCardWrapper';
import Logo from 'ui-component/Logo';
import AnimateButton from 'ui-component/extended/AnimateButton';
import AuthCodeVerification from '../jwt/AuthCodeVerification';
import BackgroundPattern2 from 'ui-component/cards/BackgroundPattern2';
import AuthFooter from 'ui-component/cards/AuthFooter';
import AuthSlider from 'ui-component/cards/AuthSlider';
import { AuthSliderProps } from 'types';

// assets
import imgMain from 'assets/images/auth/img-a2-codevarify.svg';

// carousel items
const items: AuthSliderProps[] = [
  {
    title: 'Powerful and easy to use multi-purpose theme.',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Powerful and easy to use multi-purpose theme.',
    description: 'Powerful and easy to use multipurpose theme'
  },
  {
    title: 'Powerful and easy to use multi-purpose theme.',
    description: 'Powerful and easy to use multipurpose theme'
  }
];

// ===========================|| AUTH2 - CODE VERIFICATION ||=========================== //

export default function CodeVerification() {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  return (
    <AuthWrapper2>
      <Grid container sx={{ justifyContent: { xs: 'center', md: 'space-between' }, alignItems: 'center' }}>
        <Grid sx={{ minHeight: '100vh' }} size={{ md: 6, lg: 7, xs: 12 }}>
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
                    <Grid size={12}>
                      <Stack spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Typography gutterBottom variant={downMD ? 'h3' : 'h2'} sx={{ color: 'secondary.main' }}>
                          Enter Verification Code
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontSize: '1rem' }}>
                          We send you on mail.
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: '0.875rem', textAlign: 'center' }}>
                          We’ve send you code on john.****@company.com
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid size={12}>
                      <AuthCodeVerification />
                    </Grid>
                    <Grid size={12}>
                      <Divider />
                    </Grid>
                    <Grid size={12}>
                      <Grid container direction="column" sx={{ alignItems: 'center' }} size={12}>
                        <Typography component={Link} to="#" variant="subtitle1" sx={{ textAlign: 'center', textDecoration: 'none' }}>
                          Did not receive the email? Check your spam filter, or
                        </Typography>
                      </Grid>
                    </Grid>
                    <Grid size={12}>
                      <AnimateButton>
                        <Button disableElevation fullWidth size="large" type="submit" variant="outlined" color="secondary">
                          Resend Code
                        </Button>
                      </AnimateButton>
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
        <Grid sx={{ position: 'relative', alignSelf: 'stretch', display: { xs: 'none', md: 'block' } }} size={{ md: 6, lg: 5 }}>
          <BackgroundPattern2>
            <Grid container sx={{ justifyContent: 'center' }}>
              <Grid size={12}>
                <Grid container sx={{ justifyContent: 'center', pb: 8 }}>
                  <Grid sx={{ '& .slick-list': { pb: 2 } }} size={{ xs: 10, lg: 8 }}>
                    <AuthSlider items={items} />
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <CardMedia
                  component="img"
                  alt="Auth method"
                  src={imgMain}
                  sx={{ maxWidth: 1, m: '0 auto', display: 'block', width: 300 }}
                />
              </Grid>
            </Grid>
          </BackgroundPattern2>
        </Grid>
      </Grid>
    </AuthWrapper2>
  );
}
