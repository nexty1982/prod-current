import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  ButtonGroup,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Badge,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  ViewModule,
  ViewList,
  FilterList,
  Today,
  Church,
  MenuBook,
  Star,
  AutoAwesome,
} from '@mui/icons-material';
import dayjs, { Dayjs } from 'dayjs';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import orthodoxCalendarService from '@/shared/lib/orthodoxCalendarService';
import { 
  OrthodoxCalendarDay, 
  FASTING_TYPES, 
  CalendarLanguage,
  CalendarType 
} from '@/types/orthodox-calendar.types';
import ModernizeLiturgicalCalendar from '@/@om/components/features/liturgical-calendar-modern';
import RaydarLiturgicalCalendar from '@/@om/components/features/liturgical-calendar-raydar';
import MonthlyLiturgicalCalendar from '@/@om/components/features/liturgical-calendar-monthly';

// Enhanced interface for view state
interface CalendarViewState {
  currentDate: Dayjs;
  viewMode: 'monthly' | 'grid' | 'list';
  filter: 'all' | 'saints' | 'readings';
  language: CalendarLanguage;
  calendarType: CalendarType;
  calendarVariant: 'monthly' | 'orthodox' | 'modernize' | 'raydar';
}

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Liturgical Calendar' },
];

// Helper functions
const formatDayNumber = (day: number): string => {
  return day.toString();
};

const getSaintIcon = (saintType: string) => {
  switch (saintType) {
    case 'hieromartyr':
    case 'bishop':
      return <Church fontSize="small" sx={{ color: '#9333ea' }} />;
    case 'martyr':
      return <Star fontSize="small" sx={{ color: '#dc2626' }} />;
    default:
      return null;
  }
};

const OrthodoxLiturgicalCalendar: React.FC = () => {
  const [viewState, setViewState] = useState<CalendarViewState>({
    currentDate: dayjs(),
    viewMode: 'monthly',
    filter: 'all',
    language: 'en',
    calendarType: 'gregorian',
    calendarVariant: 'monthly',
  });
  
  const [liturgicalData, setLiturgicalData] = useState<OrthodoxCalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load liturgical data for current month
  useEffect(() => {
    const loadLiturgicalData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const year = viewState.currentDate.year();
        const month = viewState.currentDate.month() + 1;
        const data = await orthodoxCalendarService.getCalendarMonth(
          year, 
          month, 
          viewState.language, 
          viewState.calendarType
        );
        setLiturgicalData(data);
      } catch (err) {
        setError('Failed to load liturgical data');
        console.error('Error loading liturgical data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLiturgicalData();
  }, [viewState.currentDate, viewState.language, viewState.calendarType]);

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date);
    // You can implement additional logic here
  };

  // Handle event selection
  const handleEventSelect = (event: any) => {
    console.log('Selected event:', event);
    // You can implement additional logic here
  };

  // Render calendar based on variant
  const renderCalendar = () => {
    switch (viewState.calendarVariant) {
      case 'monthly':
        return (
          <MonthlyLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
            height={700}
          />
        );
      case 'modernize':
        return (
          <ModernizeLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
            height={700}
          />
        );
      case 'raydar':
        return (
          <RaydarLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
            height={700}
          />
        );
      default:
        return (
          <MonthlyLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
            height={700}
          />
        );
    }
  };

  return (
    <PageContainer title="Orthodox Liturgical Calendar" description="Monthly view of Orthodox liturgical calendar with saints, feasts, and fasting information">
      <Box className="p-4">
        <Breadcrumb title="Orthodox Liturgical Calendar" items={BCrumb} />
        
        {/* Calendar Controls */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              {/* Calendar Variant Selector */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Calendar View</InputLabel>
                  <Select
                    value={viewState.calendarVariant}
                    onChange={(e) => setViewState(prev => ({
                      ...prev,
                      calendarVariant: e.target.value as any
                    }))}
                    label="Calendar View"
                  >
                    <MenuItem value="monthly">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ViewModule />
                        Monthly Grid
                      </Box>
                    </MenuItem>
                    <MenuItem value="modernize">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesome />
                        Modern View
                      </Box>
                    </MenuItem>
                    <MenuItem value="raydar">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Star />
                        Raydar View
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Language Selector */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={viewState.language}
                    onChange={(e) => setViewState(prev => ({
                      ...prev,
                      language: e.target.value as CalendarLanguage
                    }))}
                    label="Language"
                  >
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="el">Greek</MenuItem>
                    <MenuItem value="ru">Russian</MenuItem>
                    <MenuItem value="ro">Romanian</MenuItem>
                    <MenuItem value="ka">Georgian</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Calendar Type Selector */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Calendar Type</InputLabel>
                  <Select
                    value={viewState.calendarType}
                    onChange={(e) => setViewState(prev => ({
                      ...prev,
                      calendarType: e.target.value as CalendarType
                    }))}
                    label="Calendar Type"
                  >
                    <MenuItem value="gregorian">Gregorian</MenuItem>
                    <MenuItem value="julian">Julian</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Filter Selector */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter</InputLabel>
                  <Select
                    value={viewState.filter}
                    onChange={(e) => setViewState(prev => ({
                      ...prev,
                      filter: e.target.value as any
                    }))}
                    label="Filter"
                  >
                    <MenuItem value="all">All Events</MenuItem>
                    <MenuItem value="saints">Saints Only</MenuItem>
                    <MenuItem value="readings">Readings Only</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Calendar Display */}
        <Box>
          {renderCalendar()}
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </PageContainer>
  );
};

export default OrthodoxLiturgicalCalendar;