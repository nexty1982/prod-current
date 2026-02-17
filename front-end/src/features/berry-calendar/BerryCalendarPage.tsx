import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import CalendarToolbar from './components/CalendarToolbar';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  color?: string;
  description?: string;
}

const colorOptions = [
  { value: '#1e88e5', label: 'Blue' },
  { value: '#43a047', label: 'Green' },
  { value: '#e53935', label: 'Red' },
  { value: '#fb8c00', label: 'Orange' },
  { value: '#8e24aa', label: 'Purple' },
  { value: '#00acc1', label: 'Cyan' },
];

const initialEvents: CalendarEvent[] = [
  { id: '1', title: 'All Day Event', start: getDateOffset(0), allDay: true, color: '#1e88e5' },
  { id: '2', title: 'Meeting with Team', start: getDateOffset(1, 10), end: getDateOffset(1, 12), color: '#43a047' },
  { id: '3', title: 'Lunch Break', start: getDateOffset(2, 12), end: getDateOffset(2, 13), color: '#fb8c00' },
  { id: '4', title: 'Conference', start: getDateOffset(3), end: getDateOffset(5), allDay: true, color: '#8e24aa' },
  { id: '5', title: 'Birthday Party', start: getDateOffset(-2, 18), end: getDateOffset(-2, 21), color: '#e53935' },
  { id: '6', title: 'Sprint Review', start: getDateOffset(7, 14), end: getDateOffset(7, 16), color: '#00acc1' },
];

function getDateOffset(days: number, hour?: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  if (hour !== undefined) {
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }
  return d.toISOString().split('T')[0];
}

let nextId = 100;

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'Calendar' },
];

export default function BerryCalendarPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formColor, setFormColor] = useState('#1e88e5');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formDescription, setFormDescription] = useState('');

  const openNewEventDialog = useCallback((selectInfo?: DateSelectArg) => {
    setIsEditing(false);
    setSelectedEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormColor('#1e88e5');
    if (selectInfo) {
      setFormStart(selectInfo.startStr);
      setFormEnd(selectInfo.endStr || selectInfo.startStr);
      setFormAllDay(selectInfo.allDay);
    } else {
      const now = new Date().toISOString().slice(0, 16);
      setFormStart(now);
      setFormEnd(now);
      setFormAllDay(false);
    }
    setDialogOpen(true);
  }, []);

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    openNewEventDialog(selectInfo);
  }, [openNewEventDialog]);

  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const evt = events.find((e) => e.id === clickInfo.event.id);
    if (!evt) return;
    setIsEditing(true);
    setSelectedEvent(evt);
    setFormTitle(evt.title);
    setFormStart(evt.start);
    setFormEnd(evt.end || evt.start);
    setFormColor(evt.color || '#1e88e5');
    setFormAllDay(evt.allDay || false);
    setFormDescription(evt.description || '');
    setDialogOpen(true);
  }, [events]);

  const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === dropInfo.event.id
          ? {
              ...e,
              start: dropInfo.event.startStr,
              end: dropInfo.event.endStr || dropInfo.event.startStr,
            }
          : e
      )
    );
  }, []);

  const handleSave = () => {
    if (!formTitle.trim()) return;
    if (isEditing && selectedEvent) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === selectedEvent.id
            ? { ...e, title: formTitle, start: formStart, end: formEnd, color: formColor, allDay: formAllDay, description: formDescription }
            : e
        )
      );
    } else {
      const newEvent: CalendarEvent = {
        id: String(nextId++),
        title: formTitle,
        start: formStart,
        end: formEnd,
        color: formColor,
        allDay: formAllDay,
        description: formDescription,
      };
      setEvents((prev) => [...prev, newEvent]);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (selectedEvent) {
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
    }
    setDialogOpen(false);
  };

  return (
    <PageContainer title="Calendar" description="Berry Calendar with FullCalendar">
      <Breadcrumb title="Calendar" items={BCrumb} />
      <Card>
        <CardContent>
          <CalendarToolbar
            calendarRef={calendarRef}
            onAddEvent={() => openNewEventDialog()}
          />
          <Box
            sx={{
              mt: 2,
              '& .fc': {
                '--fc-border-color': theme.palette.divider,
                '--fc-today-bg-color': theme.palette.action.hover,
                '--fc-page-bg-color': 'transparent',
              },
              '& .fc .fc-toolbar-title': {
                fontSize: '1.2rem',
                fontWeight: 600,
              },
              '& .fc .fc-button': {
                textTransform: 'capitalize',
              },
              '& .fc-theme-standard .fc-scrollgrid': {
                borderColor: theme.palette.divider,
              },
            }}
          >
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
              headerToolbar={false}
              events={events}
              editable
              selectable
              selectMirror
              dayMaxEvents
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Event Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Start"
                  type={formAllDay ? 'date' : 'datetime-local'}
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="End"
                  type={formAllDay ? 'date' : 'datetime-local'}
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
            <TextField
              select
              label="Event Color"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
              fullWidth
            >
              {colorOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: opt.value,
                      }}
                    />
                    <span>{opt.label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          {isEditing && (
            <Button onClick={handleDelete} color="error" sx={{ mr: 'auto' }}>
              Delete
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formTitle.trim()}>
            {isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
