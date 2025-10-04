import { Box, Stack, Typography, Grid, Container } from '@mui/material';
import FeatureTitle from './FeatureTitle.tsx';

import icon1 from '@/assets/images/svgs/icon-briefcase.svg';
import FeatureApp from '@/assets/images/frontend-pages/homepage/feature-apps.png';
import LogoIcon from '@/assets/images/logos/logoIcon.svg';
import Screen1 from '@/assets/images/frontend-pages/homepage/screen1.png';
import IconBubble from '@/assets/images/svgs/icon-speech-bubble.svg';
import IconFav from '@/assets/images/svgs/icon-favorites.svg';

const Features = () => {
  return (
    (<Box pt={10} pb={10}>
      <Container maxWidth="lg">
        <FeatureTitle />

        <Grid container spacing={3} mt={3}>
          <Grid
            size={{
              xs: "grow",
              sm: 6,
              lg: "grow"
            }}>
            <Box mb={3} bgcolor="warning.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={icon1} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Light & Dark Color Schemes
                  </Typography>
                  <Typography variant="body1">
                    Day and night themes.
                  </Typography>
                </Stack>
              </Box>
            </Box>
            <Box textAlign="center" mb={3} bgcolor="secondary.light" borderRadius="24px">
              <Box px={4} py="50px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Typography variant="h6" fontWeight={700}>
                    8+ Ready to Use Templates to choose from
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    On demand record processing for English, Greek, Russian, and Romanian
                  </Typography>
                </Stack>
              </Box>
              <Box height="70px">
                <img src={FeatureApp} alt="icon1" width={250} height={70} />
              </Box>
            </Box>
          </Grid>
          <Grid
            sx={{
              order: {
                xs: 3,
                lg: 2,
              },
            }}
            size={{
              xs: 12,
              lg: 5
            }}>
            <Box textAlign="center" mb={3} bgcolor="primary.light" borderRadius="24px">
              <Box pt="65px" pb="40px" px={5}>
                <img src={LogoIcon} alt="logo" height="50" width="50" />
                <Typography
                  variant="h2"
                  fontWeight="700"
                  mt={4}
                  sx={{
                    fontSize: {
                      lg: '40px',
                      xs: '35px',
                    },
                  }}
                >
                  New language support coming out
                </Typography>
                <Typography variant="body1" mt={2}>
                  Customizable record layouts with as many fields as needed:{' '}
                  <Typography component="span" fontWeight={600}>
                    Dark and Right-to-Left.
                  </Typography>
                </Typography>
                <Box mt={5} mb={2}>
                  <img
                    src={Screen1}
                    alt="icon1"
                    width={405}
                    height={245}
                    style={{ width: '100%', height: 'auto' }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>
          <Grid
            sx={{
              order: {
                xs: 2,
                lg: 3,
              },
            }}
            size={{
              xs: "grow",
              sm: 6,
              lg: "grow"
            }}>
            <Box textAlign="center" mb={3} bgcolor="success.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={IconBubble} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Priceless information
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    The history of the Orthodox church in your community
                  </Typography>
                </Stack>
              </Box>
            </Box>
            <Box textAlign="center" mb={3} bgcolor="error.light" borderRadius="24px">
              <Box px={4} py="65px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={IconFav} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Orthodox tradition and integrity
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    Rich new updates
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>)
  );
};

export default Features;
