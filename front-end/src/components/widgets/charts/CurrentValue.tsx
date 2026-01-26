import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Button, CardContent, Grid, Typography, Stack } from '@mui/material';
import BlankCard from '../../shared/BlankCard.tsx';


const CurrentValue = () => {
  // chart color
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = theme.palette.primary.light;
  const secondary = theme.palette.secondary.main;
  const textColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.8)' : '#2A3547';

  const chart1Data = [2.5, 3.7, 3.2, 2.6, 1.9];
  const chart2Data = [2.5, 3.7, 3.2, 2.6, 1.9];

  return (
    (<BlankCard>
      <CardContent sx={{ p: '30px' }}>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Typography variant="h5">Current Value</Typography>
          <Stack spacing={1} direction="row">
            <Button color="primary" variant="contained">
              Buy
            </Button>
            <Button color="primary" variant="outlined">
              Sell
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3} mt={2}>
          {/* 1 */}
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <BlankCard>
              <CardContent sx={{ p: '30px' }}>
                <Box sx={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
                  {chart1Data.map((value, index) => (
                    <Box
                      key={index}
                      sx={{
                        flex: 1,
                        height: `${((value + 5) / 10) * 100}%`,
                        bgcolor: primary,
                        borderRadius: 1,
                        minHeight: '4px',
                      }}
                    />
                  ))}
                </Box>
                <Box mt={4}>
                  <Typography variant="h6" fontWeight={400} mb={1}>
                    Income
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Typography variant="h4">$25,260</Typography>
                    <Typography variant="subtitle1" color="success.main">
                      +1.25%
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </BlankCard>
          </Grid>
          {/* 2 */}
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <BlankCard>
              <CardContent sx={{ p: '30px' }}>
                <Box sx={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
                  {chart2Data.map((value, index) => (
                    <Box
                      key={index}
                      sx={{
                        flex: 1,
                        height: `${((value + 5) / 10) * 100}%`,
                        bgcolor: secondary,
                        borderRadius: 1,
                        minHeight: '4px',
                      }}
                    />
                  ))}
                </Box>
                <Box mt={4}>
                  <Typography variant="h6" fontWeight={400} mb={1}>
                    Expance
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Typography variant="h4">$12,260</Typography>
                    <Typography variant="subtitle1" color="success.main">
                      +4.25%
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </BlankCard>
          </Grid>
          {/* 3 */}
          <Grid
            size={{
              xs: 12,
              sm: 4
            }}>
            <BlankCard>
              <CardContent sx={{ p: '30px' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '220px',
                    borderRadius: '50%',
                    border: `12px solid ${primary}`,
                    borderTopColor: primarylight,
                    borderRightColor: secondary,
                    width: '180px',
                    margin: '0 auto',
                  }}
                >
                  <Typography variant="h5" fontWeight="600">
                    $98,260
                  </Typography>
                </Box>
                <Box mt={4}>
                  <Typography variant="h6" fontWeight={400} mb={1}>
                    Current Year
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="space-between">
                    <Typography variant="h4">$98,260</Typography>
                    <Typography variant="subtitle1" color="success.main">
                      +2.5%
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </BlankCard>
          </Grid>
        </Grid>
      </CardContent>
    </BlankCard>)
  );
};

export default CurrentValue;
