import { Box, Stack, Typography, Grid, Container, Divider } from '@mui/material';
import EditableText from '@/components/frontend-pages/shared/EditableText';

import Icon1 from '@/assets/images/svgs/icon-briefcase.svg';
import FeatureApp from '@/assets/images/frontend-pages/homepage/feature-apps.png';
import IconBubble from '@/assets/images/svgs/icon-speech-bubble.svg';
import IconFav from '@/assets/images/svgs/icon-favorites.svg';

const Process = () => {
  return (
    (<Box pt={10}>
      <Container maxWidth="lg">
        <Grid container spacing={3} justifyContent="center">
          <Grid
            textAlign="center"
            size={{
              xs: 12,
              lg: 7
            }}>
            <Typography
              variant="h4"
              sx={{
                fontSize: {
                  lg: '40px',
                  xs: '35px',
                },
              }}
              fontWeight="700"
              mt={5}
            >
              <EditableText contentKey="about.process.heading" multiline>
                We will provide the initial record intake and provide you the secure access to maintain your churches records.
              </EditableText>
            </Typography>
          </Grid>
        </Grid>

        <Grid container spacing={3} mt={3}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <Box mb={3} bgcolor="warning.light" borderRadius="24px">
              <Box px="20px" py="32px">
                <Stack direction="column" spacing={2} mt={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={Icon1} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    <EditableText contentKey="about.process.card1.title" multiline>
                      For Orthodox Christian churches, the platform is fully equipped with guidelines established by the OCA.
                    </EditableText>
                  </Typography>
                  <Typography variant="body1">
                    <EditableText contentKey="about.process.card1.desc" multiline>
                      Multiple ways to update and add new records, even using your smart phone / tablet.
                    </EditableText>
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <Box
              textAlign="center"
              mb={3}
              bgcolor="secondary.light"
              borderRadius="24px"
              overflow="hidden"
            >
              <Box px="20px" pt="26px" pb="20px">
                <Stack direction="column" spacing={2} textAlign="center">
                  <Typography variant="h6" fontWeight={700} px={1} lineHeight={1.4}>
                    <EditableText contentKey="about.process.card2.title" multiline>
                      We are dynamic, if you have an idea we will consider it
                    </EditableText>
                  </Typography>
                  <Typography variant="body1">
                    <EditableText contentKey="about.process.card2.desc" multiline>
                      No constant back and forth, when we commit we deliver faster than Amazon
                    </EditableText>
                  </Typography>
                </Stack>
              </Box>
              <Box height="70px">
                <img src={FeatureApp} alt="icon1" width={250} height={70} />
              </Box>
            </Box>
          </Grid>

          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <Box textAlign="center" mb={3} bgcolor="success.light" borderRadius="24px">
              <Box px="20px" py="32px">
                <Stack direction="column" spacing={2} mt={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={IconBubble} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    <EditableText contentKey="about.process.card3.title">
                      Continual updates and features
                    </EditableText>
                  </Typography>
                  <Typography variant="body1">
                    <EditableText contentKey="about.process.card3.desc">
                      You make updates at your pace
                    </EditableText>
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 3
            }}>
            <Box textAlign="center" mb={3} bgcolor="error.light" borderRadius="24px">
              <Box px="20px" py="32px">
                <Stack direction="column" spacing={2} mt={2} textAlign="center">
                  <Box textAlign="center">
                    <img src={IconFav} alt="icon1" width={40} height={40} />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    Orthodox platform that tracks Old and New calendar making it easy to schedule baptisms, marriages, and funeral arrangements. 
                  </Typography>
                  <Typography variant="body1">
                    {' '}
                    A rich collection of options
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
      <Divider
        sx={{
          mt: '65px',
        }}
      />
    </Box>)
  );
};

export default Process;
