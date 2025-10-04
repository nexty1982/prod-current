// Simple import test
const path = require('path');
const fs = require('fs');

// Check if files exist
const files = [
  'src/components/calendar/LiturgicalCalendar.tsx',
  'src/components/calendar/CalendarDayDetail.tsx', 
  'src/hooks/useCalendarData.ts',
  'src/types/liturgical.types.ts',
  'src/pages/calendar/LiturgicalCalendarPage.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
  }
});
