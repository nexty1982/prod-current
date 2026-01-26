import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import PageContainer from '@/components/container/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import ParentCard from '@/shared/ui/ParentCard';

import ColumnChartCode from '@/components/charts/Column Chart/code/ColumnChartCode';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Column Chart',
  },
];

const ColumnChart = () => {

  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const error = theme.palette.error.main;
  
  const categories = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const desktopData = [44, 55, 57, 56, 61, 58, 63, 60, 66];
  const mobileData = [76, 85, 101, 98, 87, 105, 91, 114, 94];
  const otherData = [35, 41, 36, 26, 45, 48, 52, 53, 41];
  const maxValue = Math.max(...desktopData, ...mobileData, ...otherData);

  return (
    <PageContainer title="Column Chart" description="this is innerpage">
      {/* breadcrumb */}
      <Breadcrumb title="Column Chart" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title='Column Chart' codeModel={<ColumnChartCode />}>
        <Box sx={{ height: '300px', display: 'flex', alignItems: 'flex-end', gap: 0.5, px: 2 }}>
          {categories.map((_, index) => (
            <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.2 }}>
              <Box
                sx={{
                  height: `${(otherData[index] / maxValue) * 100}%`,
                  bgcolor: error,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                }}
              />
              <Box
                sx={{
                  height: `${(mobileData[index] / maxValue) * 100}%`,
                  bgcolor: secondary,
                  minHeight: '4px',
                }}
              />
              <Box
                sx={{
                  height: `${(desktopData[index] / maxValue) * 100}%`,
                  bgcolor: primary,
                  borderRadius: '0 0 4px 4px',
                  minHeight: '4px',
                }}
              />
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: primary, borderRadius: 1 }} />
            <Typography variant="body2">Desktop</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: secondary, borderRadius: 1 }} />
            <Typography variant="body2">Mobile</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: error, borderRadius: 1 }} />
            <Typography variant="body2">Other</Typography>
          </Box>
        </Box>
      </ParentCard>
    </PageContainer>
  );
};

export default ColumnChart;
