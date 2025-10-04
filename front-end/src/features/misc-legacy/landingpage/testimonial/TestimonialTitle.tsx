import Grid2 from '@/components/compat/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Grid, Typography } from '@mui/material';
import AnimationFadeIn from '@/animation/Animation';

const TestimonialTitle = () => {
  return (
    (<Grid2 container spacing={3} justifyContent="center">
      <Grid2
        size={{
          xs: 12,
          sm: 10,
          lg: 8
        }}>
        <AnimationFadeIn>
          <Typography
            variant="h2"
            fontWeight={700}
            textAlign="center"
            sx={{
              fontSize: {
                lg: '36px',
                xs: '25px',
              },
              lineHeight: {
                lg: '43px',
                xs: '30px',
              },
            }}
          >
            Don’t just take our words for it, See what developers like you are saying
          </Typography>
        </AnimationFadeIn>
      </Grid2>
    </Grid2>)
  );
};

export default TestimonialTitle;
