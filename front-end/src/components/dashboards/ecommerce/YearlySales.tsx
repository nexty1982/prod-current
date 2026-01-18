import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';

import DashboardWidgetCard from '@/shared/ui/DashboardWidgetCard';

const YearlySales = () => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const primarylight = theme.palette.grey[100];
  
  const chartData = [20, 15, 30, 25, 10, 15];
  const maxValue = Math.max(...chartData);

  return (
    <DashboardWidgetCard
      title="Yearly Sales"
      subtitle="Total Sales"
      dataLabel1="Salary"
      dataItem1="$36,358"
      dataLabel2="Expance"
      dataItem2="$5,296"
    >
      <Box sx={{ height: '295px', display: 'flex', alignItems: 'flex-end', gap: 1, px: 2 }}>
        {chartData.map((value, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              height: `${(value / maxValue) * 100}%`,
              bgcolor: index === 2 ? primary : primarylight,
              borderRadius: 1,
              minHeight: '20px',
            }}
          />
        ))}
      </Box>
    </DashboardWidgetCard>
  );
};

export default YearlySales;
