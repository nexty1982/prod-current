import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import FullCalendar from '@fullcalendar/react';

interface CalendarToolbarProps {
  calendarRef: React.RefObject<FullCalendar | null>;
  onAddEvent: () => void;
}

const viewOptions = [
  { label: 'Month', value: 'dayGridMonth' },
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'Day', value: 'timeGridDay' },
  { label: 'List', value: 'listWeek' },
];

export default function CalendarToolbar({ calendarRef, onAddEvent }: CalendarToolbarProps) {
  const [title, setTitle] = useState('');
  const [currentView, setCurrentView] = useState('dayGridMonth');

  const updateTitle = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      setTitle(api.view.title);
    }
  };

  useEffect(() => {
    // Small delay to let FullCalendar initialize
    const timer = setTimeout(updateTitle, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      updateTitle();
    }
  };

  const handleNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      updateTitle();
    }
  };

  const handleToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      updateTitle();
    }
  };

  const handleViewChange = (view: string) => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(view);
      setCurrentView(view);
      updateTitle();
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
    >
      {/* Left: Navigation */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="outlined" size="small" onClick={handleToday}>
          Today
        </Button>
        <IconButton onClick={handlePrev} size="small">
          <IconChevronLeft size={20} />
        </IconButton>
        <IconButton onClick={handleNext} size="small">
          <IconChevronRight size={20} />
        </IconButton>
        <Typography variant="h6" sx={{ ml: 1 }}>
          {title}
        </Typography>
      </Stack>

      {/* Right: View switcher + Add */}
      <Stack direction="row" spacing={1} alignItems="center">
        <ButtonGroup size="small" variant="outlined">
          {viewOptions.map((opt) => (
            <Button
              key={opt.value}
              onClick={() => handleViewChange(opt.value)}
              variant={currentView === opt.value ? 'contained' : 'outlined'}
            >
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>
        <Button
          variant="contained"
          size="small"
          startIcon={<IconPlus size={18} />}
          onClick={onAddEvent}
        >
          New Event
        </Button>
      </Stack>
    </Stack>
  );
}
