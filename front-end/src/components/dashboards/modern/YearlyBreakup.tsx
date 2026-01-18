import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Grid, Stack, Typography, Avatar, Box } from '@mui/material';
import { IconArrowUpLeft } from '@tabler/icons-react';

import DashboardCard from '../../shared/DashboardCard.tsx';

const YearlyBreakup = () => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = theme.palette.primary.light;
  const successlight = theme.palette.success.light;

  return (
    (<DashboardCard title="Yearly Breakup">
      <Grid container spacing={3}>
        {/* column */}
        <Grid
          size={{
            xs: 7,
            sm: 7
          }}>
          <Typography variant="h3" fontWeight="700">
            $36,358
          </Typography>
          <Stack direction="row" spacing={1} mt={1} alignItems="center">
            <Avatar sx={{ bgcolor: successlight, width: 27, height: 27 }}>
              <IconArrowUpLeft width={20} color="#39B69A" />
            </Avatar>
            <Typography variant="subtitle2" fontWeight="600">
              +9%
            </Typography>
            <Typography variant="subtitle2" color="textSecondary">
              last year
            </Typography>
          </Stack>
          <Stack spacing={3} mt={5} direction="row">
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{ width: 9, height: 9, bgcolor: primary, svg: { display: 'none' } }}
              ></Avatar>
              <Typography variant="subtitle2" color="textSecondary">
                2022
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{ width: 9, height: 9, bgcolor: primarylight, svg: { display: 'none' } }}
              ></Avatar>
              <Typography variant="subtitle2" color="textSecondary">
                2023
              </Typography>
            </Stack>
          </Stack>
        </Grid>
        {/* column */}
        <Grid
          size={{
            xs: 5,
            sm: 5
          }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '130px',
              borderRadius: '50%',
              border: `8px solid ${primary}`,
              borderTopColor: primarylight,
              borderRightColor: primarylight,
              borderBottomColor: '#F9F9FD',
              width: '130px',
              margin: '0 auto',
            }}
          >
            <Typography variant="h6" fontWeight="600">
              38%
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </DashboardCard>)
  );
};

export default YearlyBreakup;
