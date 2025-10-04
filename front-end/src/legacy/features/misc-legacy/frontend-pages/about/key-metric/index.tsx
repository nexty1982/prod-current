import Grid2 from '@mui/material/Grid2';
import { Box, Container, Grid } from '@mui/material';
import ContentArea from './ContentArea';
import Key from './Key';

const KeyMetric = () => {
  return (
    (<Box
      sx={{
        paddingTop: {
          xs: '40px',
          lg: '90px',
        },
        paddingBottom: {
          xs: '40px',
          lg: '90px',
        },
        boxShadow: (theme) => theme.shadows[10],
      }}
    >
      <Container maxWidth="lg">
        <Grid2 container spacing={3} justifyContent="space-between">
          <Grid2
            size={{
              xs: 12,
              lg: 5
            }}>
            <ContentArea />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              lg: 5
            }}>
            <Key />
          </Grid2>
        </Grid2>
      </Container>
    </Box>)
  );
};

export default KeyMetric;
