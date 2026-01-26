import Grid2 from '@mui/material/Grid2';
import { Box, Grid, Container } from '@mui/material';
import ContentArea from './ContentArea';
import ReviewCarousel from './ReviewCarousel';

const Reviews = () => {
  return (<>
    <Box
      sx={{
        py: {
          xs: 5,
          lg: 10,
        },
      }}
    >
      <Container maxWidth="lg">
        <Grid2 container spacing={3} alignItems="center" justifyContent="space-between">
          <Grid2
            pr={6}
            size={{
              xs: 12,
              lg: 5,
              sm: 8
            }}>
            <ContentArea />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              lg: 6,
              sm: 12
            }}>
            <Grid2 container spacing={3} justifyContent="center">
              <Grid2
                size={{
                  xs: 12,
                  lg: 10
                }}>
                <ReviewCarousel />
              </Grid2>
            </Grid2>
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  </>);
};

export default Reviews;
