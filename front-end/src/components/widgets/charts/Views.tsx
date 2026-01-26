import React from 'react';
import { useTheme } from '@mui/material/styles';
import { CardContent, Typography, Stack, Box } from '@mui/material';
import BlankCard from '../../shared/BlankCard.tsx';

const Views = () => {
  const theme = useTheme();
  const secondary = theme.palette.secondary.main;
  const secondarylight = theme.palette.secondary.light;
  
  const chartData = [20, 15, 30, 25, 10, 18, 20];
  const maxValue = Math.max(...chartData);

  return (
    <BlankCard>
      <CardContent sx={{ p: '30px' }}>
        <Typography variant="h4">15,480</Typography>
        <Stack direction="row" spacing={2} justifyContent="space-between" mb={2}>
          <Typography variant="subtitle2" color="textSecondary">
            Views
          </Typography>
          <Typography variant="subtitle2" color="error.main">
            -4.150%
          </Typography>
        </Stack>
        <Box sx={{ height: '80px', display: 'flex', alignItems: 'flex-end', gap: 0.5 }}>
          {chartData.map((value, index) => (
            <Box
              key={index}
              sx={{
                flex: 1,
                height: `${(value / maxValue) * 100}%`,
                bgcolor: index === 2 ? secondary : secondarylight,
                borderRadius: 1,
                minHeight: '4px',
              }}
            />
          ))}
        </Box>
      </CardContent>
    </BlankCard>
  );
};

export default Views;
