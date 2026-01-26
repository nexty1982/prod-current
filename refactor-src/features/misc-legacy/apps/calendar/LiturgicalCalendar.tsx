// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect, useMemo } from 'react';
import {
  CardContent,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Chip,
  Avatar,
  Stack,
  Paper,
  CircularProgress,
  DialogTitle,
  IconButton,
  Box,
  SelectChangeEvent,
} from '@mui/material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import dayjs, { Dayjs } from 'dayjs';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Star as StarIcon,
  LocalDining as FeastIcon,
  SelfImprovement as FastIcon,
} from '@mui/icons-material';
import { useLiturgicalCalendar } from '@/hooks/useLiturgicalCalendar';
import { CalendarType, Language } from '@/types/liturgical.types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import PageContainer from '@/shared/ui/PageContainer';
import BlankCard from '@/shared/ui/BlankCard';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';

moment.locale('en-GB');
const localizer = momentLocalizer(moment);

type LiturgicalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  liturgical_color?: string;
  description?: string;
  is_feast?: boolean;
  is_fast?: boolean;
  is_major_feast?: boolean;
  saints?: any[];
  date: string;
  calendar_type: CalendarType;
  language: Language;
};

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Liturgical Calendar',
  },
];

const LiturgicalCalendar: React.FC<{ isBreadcrumb?: boolean }> = ({ isBreadcrumb = true }) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [calendarType, setCalendarType] = useState<CalendarType>('gregorian');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedEvent, setSelectedEvent] = useState<LiturgicalEvent | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<LiturgicalEvent[]>([]);

  // Use a stable date object to prevent infinite re-renders
  const stableDate = useMemo(() => selectedDate.toDate(), [selectedDate.year(), selectedDate.month()]);

  const {
    events,
    saints,
    isLoading,
    error,
    refreshData,
  } = useLiturgicalCalendar(stableDate, language);

  // Transform liturgical events to calendar events
  useEffect(() => {
    if (events) {
      const transformedEvents: LiturgicalEvent[] = events.map((event, index) => ({
        id: `event-${index}`,
        title: event.title,
        start: new Date(event.date),
        end: new Date(event.date),
        allDay: true,
        color: getLiturgicalEventColor(event),
        liturgical_color: event.liturgical_color,
        description: event.description,
        is_feast: event.is_feast,
        is_fast: event.is_fast,
        is_major_feast: event.is_major_feast,
        saints: event.saints,
        date: event.date,
        calendar_type: calendarType,
        language: language,
      }));
      setCalendarEvents(transformedEvents);
    }
  }, [events, calendarType, language]);

  const handleCalendarTypeChange = (event: SelectChangeEvent) => {
    setCalendarType(event.target.value as CalendarType);
  };

  const handleLanguageChange = (event: SelectChangeEvent) => {
    setLanguage(event.target.value as Language);
  };

  const handleRefresh = async () => {
    await refreshData();
  };

  const exportToExcel = () => {
    if (!events || events.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(events);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Liturgical Events');
    XLSX.writeFile(workbook, `liturgical-calendar-${selectedDate.format('YYYY-MM')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!events || events.length === 0) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Liturgical Calendar', 20, 20);
    doc.setFontSize(12);

    let yPos = 40;
    events.forEach((event, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${event.title} - ${dayjs(event.date).format('MMMM D, YYYY')}`, 20, yPos);
      yPos += 10;
    });

    doc.save(`liturgical-calendar-${selectedDate.format('YYYY-MM')}.pdf`);
  };

  const getLiturgicalEventColor = (event: any) => {
    if (event.is_major_feast) return 'red';
    if (event.is_feast) return 'warning';
    if (event.is_fast) return 'azure';
    if (event.liturgical_color) {
      const colorMap: { [key: string]: string } = {
        'red': 'red',
        'white': 'default',
        'green': 'green',
        'purple': 'azure',
        'gold': 'warning',
        'blue': 'azure',
        'black': 'default',
      };
      return colorMap[event.liturgical_color.toLowerCase()] || 'default';
    }
    return 'default';
  };

  const getSaintIcon = (saint: any) => {
    if (saint?.icon_url) {
      return <Avatar src={saint.icon_url} sx={{ width: 24, height: 24 }} />;
    }
    return <PersonIcon fontSize="small" />;
  };

  const editEvent = (event: LiturgicalEvent) => {
    setSelectedEvent(event);
  };

  const handleClose = () => {
    setSelectedEvent(null);
  };

  const eventColors = (event: LiturgicalEvent) => {
    if (event.is_major_feast) {
      return { className: 'event-major-feast' };
    }
    if (event.is_feast) {
      return { className: 'event-feast' };
    }
    if (event.is_fast) {
      return { className: 'event-fasting' };
    }
    if (event.saints && event.saints.length > 0) {
      return { className: 'event-saint' };
    }
    if (event.color) {
      return { className: `event-${event.color}` };
    }
    return { className: 'event-default' };
  };

  if (isLoading) {
    return (
      <PageContainer title="Liturgical Calendar" description="Orthodox Liturgical Calendar">
        {isBreadcrumb && <Breadcrumb title="Liturgical Calendar" items={BCrumb} />}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Liturgical Calendar" description="Orthodox Liturgical Calendar">
        {isBreadcrumb && <Breadcrumb title="Liturgical Calendar" items={BCrumb} />}
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Liturgical Calendar" description="Orthodox Liturgical Calendar">
      {isBreadcrumb && <Breadcrumb title="Liturgical Calendar" items={BCrumb} />}

      <BlankCard>
        <CardContent>
          {/* Controls */}
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Calendar Type</InputLabel>
                  <Select
                    value={calendarType}
                    onChange={handleCalendarTypeChange}
                    label="Calendar Type"
                  >
                    <MenuItem value="gregorian">Gregorian</MenuItem>
                    <MenuItem value="julian">Julian</MenuItem>
                    <MenuItem value="both">Both</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    onChange={handleLanguageChange}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="el">Greek</MenuItem>
                    <MenuItem value="ro">Romanian</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={handleRefresh}
                    startIcon={<RefreshIcon />}
                    size="small"
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={exportToExcel}
                    startIcon={<DownloadIcon />}
                    size="small"
                  >
                    Excel
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={exportToPDF}
                    startIcon={<DownloadIcon />}
                    size="small"
                  >
                    PDF
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Calendar */}
          <Calendar
            events={calendarEvents}
            defaultView="month"
            scrollToTime={new Date(1970, 1, 1, 6)}
            defaultDate={selectedDate.toDate()}
            localizer={localizer}
            style={{ height: "calc(100vh - 350px)" }}
            onSelectEvent={(event: LiturgicalEvent) => editEvent(event)}
            eventPropGetter={(event: LiturgicalEvent) => eventColors(event)}
            views={['month', 'week', 'day']}
            popup={true}
            popupOffset={30}
            components={{
              event: ({ event }) => (
                <div>
                  <strong>{event.title}</strong>
                  {event.is_feast && <span style={{ marginLeft: 4 }}>🎉</span>}
                  {event.is_fast && <span style={{ marginLeft: 4 }}>⛪</span>}
                  {event.is_major_feast && <span style={{ marginLeft: 4 }}>⭐</span>}
                </div>
              ),
            }}
          />
        </CardContent>
      </BlankCard>

      {/* Event Details Dialog */}
      <Dialog
        open={!!selectedEvent}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h5">{selectedEvent.title}</Typography>
                <IconButton onClick={handleClose}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" color="text.secondary">
                  <CalendarIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {dayjs(selectedEvent.date).format('MMMM D, YYYY')}
                </Typography>
                {selectedEvent.liturgical_color && (
                  <Typography variant="body1" color="text.secondary">
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: selectedEvent.liturgical_color,
                        mr: 1,
                        verticalAlign: 'middle',
                      }}
                    />
                    Liturgical Color: {selectedEvent.liturgical_color}
                  </Typography>
                )}
              </Box>

              {selectedEvent.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1">{selectedEvent.description}</Typography>
                </Box>
              )}

              {selectedEvent.saints && selectedEvent.saints.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>Saints</Typography>
                  <Grid container spacing={1}>
                    {selectedEvent.saints.map((saint: any, index: number) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                          {getSaintIcon(saint)}
                          <Box sx={{ ml: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {saint.name}
                            </Typography>
                            {saint.feast_day && (
                              <Typography variant="caption" color="text.secondary">
                                Feast: {dayjs(saint.feast_day).format('MMMM D')}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedEvent.is_feast && (
                  <Chip
                    label="Feast Day"
                    color="warning"
                    icon={<FeastIcon fontSize="small" />}
                  />
                )}
                {selectedEvent.is_fast && (
                  <Chip
                    label="Fasting Day"
                    color="info"
                    icon={<FastIcon fontSize="small" />}
                  />
                )}
                {selectedEvent.is_major_feast && (
                  <Chip
                    label="Major Feast"
                    color="error"
                    icon={<StarIcon fontSize="small" />}
                  />
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default LiturgicalCalendar;
