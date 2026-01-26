import Grid2 from '@/mui/Grid2';
import { Box, Typography, Container, Grid } from '@mui/material';

const Banner = () => {
  return (<>
    <Box
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
        <Grid2 container spacing={3} justifyContent="center">
          <Grid2
            alignItems="center"
            textAlign="center"
            size={{
              xs: 12,
              lg: 8
            }}>
            <Typography color="primary.main" textTransform="uppercase" fontSize="13px">
              Pricing Page
            </Typography>
            <Typography
              variant="h1"
              mb={3}
              lineHeight={1.4}
              fontWeight={700}
              sx={{
                fontSize: {
                  xs: '34px',
                  sm: '48px',
                  lg: '56px',
                },
              }}
            >
              Choose Your Plan
            </Typography>
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  </>);
};

export default Banner;
export { Banner };
