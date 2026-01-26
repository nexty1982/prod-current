import Grid2 from '@/components/compat/Grid2';
import { Box, Grid, Typography } from '@mui/material';

const FeatureTitle = () => {
  return (
    (<Grid2 container spacing={3} justifyContent="center">
      <Grid2
        textAlign="center"
        size={{
          xs: 12,
          lg: 6
        }}>
        <Typography variant="body1">
          Introducing Orthodox Metrics rotating themes,{' '}
          <Box fontWeight={500} component="span">
            Exceptional Dashboards
          </Box>
          , and <br />
          Dynamic Pages - Stay Updated on What's New!
        </Typography>
      </Grid2>
    </Grid2>)
  );
};

export default FeatureTitle;
