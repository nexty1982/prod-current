import Grid2 from '@/components/compat/Grid2';
import { Box, Stack, Typography, Container, Grid, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const Banner = () => {
  return (
    (<Box
      bgcolor="primary.light"
      sx={{
        paddingTop: {
          xs: '40px',
          lg: '100px',
        },
        paddingBottom: {
          xs: '40px',
          lg: '100px',
        },
      }}
    >
      <Container maxWidth="lg">
        <Grid2 container spacing={3} justifyContent="space-between">
          <Grid2
            alignItems="center"
            size={{
              xs: 12,
              lg: 6
            }}>
            <Typography
              variant="h1"
              mb={3}
              lineHeight={1.4}
              fontWeight={700}
              sx={{
                fontSize: {
                  xs: '34px',
                  sm: '48px',
                },
              }}
            >
              Get to know Orthodox Metrics 
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button variant="contained" size="large" component={Link} to="/auth/register">
                Create an account
              </Button>
              <Button variant="outlined" size="large">
                Orthodox Metrics History
              </Button>
            </Stack>
          </Grid2>
          <Grid2
            display="flex"
            alignItems="center"
            size={{
              xs: 12,
              lg: 5
            }}>
            <Typography lineHeight={1.9}>
             Orthodox Metrics offers an Orthodox-themed records system designed specifically for baptism, marriage, and funeral documentation. With an intuitive interface, flexible certificate generation, and support for Greek, Russian, Romanian, and English, it brings the sacred work of recordkeeping into a peaceful and organized space. Created with the needs of Orthodox parishes in mind, it honors tradition while simplifying the tools needed to serve your community.
            </Typography>
          </Grid2>
        </Grid2>
      </Container>
    </Box>)
  );
};

export default Banner;
