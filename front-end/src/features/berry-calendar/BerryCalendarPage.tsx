import React, { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Alert,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DateSelectArg, EventClickArg, EventDropArg, DatesSetArg } from '@fullcalendar/core';
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
  eventType?: string;
  isAvailableSlot?: boolean;
  isAppointment?: boolean;
  appointmentId?: number;
  appointmentContact?: string;
  appointmentEmail?: string;
  appointmentStatus?: string;
}

const colorOptions = [
  { value: '#1e88e5', label: 'Blue' },
  { value: '#43a047', label: 'Green' },
  { value: '#e53935', label: 'Red' },
  { value: '#fb8c00', label: 'Orange' },
  { value: '#8e24aa', label: 'Purple' },
  { value: '#00acc1', label: 'Cyan' },
];

const eventTypeOptions = [
  { value: 'general', label: 'General' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'demo', label: 'Demo' },
  { value: 'tech_support', label: 'Tech Support' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'task', label: 'Task' },
  { value: 'block', label: 'Blocked Time' },
];

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Admin' },
  { title: 'Calendar' },
];


export default function BerryCalendarPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const calendarRef = useRef<FullCalendar>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAppointments, setShowAppointments] = useState(true);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formColor, setFormColor] = useState('#1e88e5');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formEventType, setFormEventType] = useState('general');
  const [formAvailableSlot, setFormAvailableSlot] = useState(false);

  // ── Data fetching ────────────────────────────────────────────
  const fetchEvents = useCallback(async (start: string, end: string) => {
    try {
      const [myEvents, appointments] = await Promise.all([
        apiClient.get<any>(`/admin/calendar/events?start=${start}&end=${end}`),
        showAppointments ? apiClient.get<any>(`/admin/calendar/appointments?start=${start}&end=${end}`) : { success: true, events: [] },
      ]);

      const combined: CalendarEvent[] = [];
      if (myEvents.success) combined.push(...myEvents.events);
      if (appointments.success) combined.push(...appointments.events);
      setEvents(combined);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    }
  }, [showAppointments]);

  // Refetch when date range or appointment toggle changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchEvents(dateRange.start, dateRange.end);
    }
  }, [dateRange, fetchEvents]);

  const handleDatesSet = useCallback((info: DatesSetArg) => {
    const start = info.startStr.split('T')[0];
    const end = info.endStr.split('T')[0];
    setDateRange({ start, end });
  }, []);

  // ── Dialog handlers ──────────────────────────────────────────
  const openNewEventDialog = useCallback((selectInfo?: DateSelectArg) => {
    setIsEditing(false);
    setSelectedEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormColor('#1e88e5');
    setFormEventType('general');
    setFormAvailableSlot(false);
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

    // Appointments are read-only in the calendar
    if (evt.isAppointment) {
      setSelectedEvent(evt);
      setIsEditing(false);
      setFormTitle(evt.title);
      setFormDescription(evt.description || '');
      setFormStart(evt.start);
      setFormEnd(evt.end || evt.start);
      setFormColor(evt.color || '#fb8c00');
      setFormAllDay(false);
      setFormEventType(evt.eventType || 'demo');
      setFormAvailableSlot(false);
      setDialogOpen(true);
      return;
    }

    setIsEditing(true);
    setSelectedEvent(evt);
    setFormTitle(evt.title);
    setFormStart(evt.start);
    setFormEnd(evt.end || evt.start);
    setFormColor(evt.color || '#1e88e5');
    setFormAllDay(evt.allDay || false);
    setFormDescription(evt.description || '');
    setFormEventType(evt.eventType || 'general');
    setFormAvailableSlot(evt.isAvailableSlot || false);
    setDialogOpen(true);
  }, [events]);

  const handleEventDrop = useCallback(async (dropInfo: EventDropArg) => {
    const evt = events.find(e => e.id === dropInfo.event.id);
    if (!evt || evt.isAppointment) {
      dropInfo.revert();
      return;
    }

    const newStart = dropInfo.event.startStr;
    const newEnd = dropInfo.event.endStr || newStart;

    try {
      await apiClient.put<any>(`/admin/calendar/events/${evt.id}`, { start: newStart, end: newEnd });
      setEvents(prev => prev.map(e =>
        e.id === evt.id ? { ...e, start: newStart, end: newEnd } : e
      ));
    } catch {
      dropInfo.revert();
    }
  }, [events]);

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (isEditing && selectedEvent && !selectedEvent.isAppointment) {
        await apiClient.put<any>(`/admin/calendar/events/${selectedEvent.id}`, {
          title: formTitle, description: formDescription,
          start: formStart, end: formEnd, allDay: formAllDay,
          color: formColor, eventType: formEventType, isAvailableSlot: formAvailableSlot,
        });
      } else if (!isEditing) {
        await apiClient.post<any>('/admin/calendar/events', {
          title: formTitle, description: formDescription,
          start: formStart, end: formEnd, allDay: formAllDay,
          color: formColor, eventType: formEventType, isAvailableSlot: formAvailableSlot,
        });
      }
      // Refresh
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
      setDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || selectedEvent.isAppointment) return;
    setSaving(true);
    try {
      await apiClient.delete<any>(`/admin/calendar/events/${selectedEvent.id}`);
      if (dateRange.start && dateRange.end) {
        await fetchEvents(dateRange.start, dateRange.end);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setSaving(false);
      setDialogOpen(false);
    }
  };

  const isViewingAppointment = selectedEvent?.isAppointment;

  return (
    <PageContainer title="Calendar" description="Admin Calendar">
      <Breadcrumb title="Calendar" items={BCrumb} />
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1 }}>
            <CalendarToolbar
              calendarRef={calendarRef}
              onAddEvent={() => openNewEventDialog()}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mb: 2, mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={showAppointments} onChange={(e) => setShowAppointments(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Show CRM Appointments</Typography>}
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#fb8c00' }} />
              <Typography variant="caption" color="textSecondary">Scheduled</Typography>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#43a047', ml: 1 }} />
              <Typography variant="caption" color="textSecondary">Completed</Typography>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e53935', ml: 1 }} />
              <Typography variant="caption" color="textSecondary">No-show</Typography>
            </Stack>
          </Stack>

          <Box
            sx={{
              '& .fc': {
                '--fc-border-color': theme.palette.divider,
                '--fc-today-bg-color': alpha(theme.palette.primary.main, 0.04),
                '--fc-page-bg-color': 'transparent',
              },
              '& .fc .fc-toolbar-title': { fontSize: '1.2rem', fontWeight: 600 },
              '& .fc .fc-button': { textTransform: 'capitalize' },
              '& .fc-theme-standard .fc-scrollgrid': { borderColor: theme.palette.divider },
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
              datesSet={handleDatesSet}
              height="auto"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isViewingAppointment ? 'Appointment Details' : isEditing ? 'Edit Event' : 'Add New Event'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {isViewingAppointment && selectedEvent && (
              <Alert severity="info" icon={false}>
                <Typography variant="body2"><strong>Contact:</strong> {selectedEvent.appointmentContact}</Typography>
                <Typography variant="body2"><strong>Email:</strong> {selectedEvent.appointmentEmail}</Typography>
                <Typography variant="body2"><strong>Status:</strong>{' '}
                  <Chip label={selectedEvent.appointmentStatus} size="small"
                    color={selectedEvent.appointmentStatus === 'completed' ? 'success' : selectedEvent.appointmentStatus === 'no_show' ? 'error' : 'warning'} />
                </Typography>
                {selectedEvent.description && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}><strong>Details:</strong> {selectedEvent.description}</Typography>
                )}
              </Alert>
            )}

            {!isViewingAppointment && (
              <>
                <TextField
                  label="Event Title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  fullWidth
                  autoFocus
                  size="small"
                />
                <TextField
                  label="Description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Start"
                      type={formAllDay ? 'date' : 'datetime-local'}
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      fullWidth
                      size="small"
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
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>
                <Stack direction="row" spacing={2}>
                  <TextField
                    select
                    label="Type"
                    value={formEventType}
                    onChange={(e) => setFormEventType(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {eventTypeOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    fullWidth
                    size="small"
                  >
                    {colorOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: opt.value }} />
                          <span>{opt.label}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <FormControlLabel
                    control={<Switch checked={formAllDay} onChange={(e) => setFormAllDay(e.target.checked)} size="small" />}
                    label="All Day"
                  />
                  <FormControlLabel
                    control={<Switch checked={formAvailableSlot} onChange={(e) => setFormAvailableSlot(e.target.checked)} size="small" />}
                    label="Public Availability Slot"
                  />
                </Stack>
                {formAvailableSlot && (
                  <Alert severity="info" variant="outlined">
                    This time block will appear as available for public meeting scheduling on the registration page.
                  </Alert>
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          {isEditing && !isViewingAppointment && (
            <Button onClick={handleDelete} color="error" sx={{ mr: 'auto' }} disabled={saving}>
              Delete
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>
            {isViewingAppointment ? 'Close' : 'Cancel'}
          </Button>
          {!isViewingAppointment && (
            <Button onClick={handleSave} variant="contained" disabled={!formTitle.trim() || saving}>
              {saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
