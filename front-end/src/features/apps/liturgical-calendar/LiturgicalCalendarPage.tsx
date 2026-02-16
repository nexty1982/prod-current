/**
 * Liturgical Calendar Page
 * Page wrapper for the liturgical calendar component
 */

import React from 'react';
import { Box } from '@mui/material';
import { LiturgicalCalendar } from '@/components/calendar/LiturgicalCalendar';

const LiturgicalCalendarPage: React.FC = () => {
  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <LiturgicalCalendar className="flex-1" />
    </Box>
  );
};

export default LiturgicalCalendarPage;
