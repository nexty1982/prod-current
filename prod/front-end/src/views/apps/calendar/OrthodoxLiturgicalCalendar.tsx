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
import PageContainer from '../../../components/container/PageContainer';
import Breadcrumb from '../../../layouts/full/shared/breadcrumb/Breadcrumb';
import { orthodoxCalendarService } from '../../../services/orthodoxCalendarService';
import { 
  OrthodoxCalendarDay, 
  FASTING_TYPES, 
  CalendarLanguage,
  CalendarType 
} from '../../../types/orthodox-calendar.types';
import ModernizeLiturgicalCalendar from '../../../@om/components/features/liturgical-calendar-modern';
import RaydarLiturgicalCalendar from '../../../@om/components/features/liturgical-calendar-raydar';

// Enhanced interface for view state
interface CalendarViewState {
  currentDate: Dayjs;
  viewMode: 'grid' | 'list';
  filter: 'all' | 'saints' | 'readings';
  language: CalendarLanguage;
  calendarType: CalendarType;
  calendarVariant: 'orthodox' | 'modernize' | 'raydar';
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
    viewMode: 'grid',
    filter: 'all',
    language: 'en',
    calendarType: 'gregorian',
    calendarVariant: 'orthodox',
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
        const data = await orthodoxCalendarService.getCalendarMonth(
          viewState.currentDate.year(),
          viewState.currentDate.month() + 1,
          viewState.language,
          viewState.calendarType
        );
        // Ensure data is always an array
        setLiturgicalData(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load liturgical data:', error);
        setError('Failed to load calendar data. Please try again.');
        // Ensure we always have an array even on error
        setLiturgicalData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLiturgicalData();
  }, [viewState.currentDate, viewState.language, viewState.calendarType]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setViewState(prev => ({
      ...prev,
      currentDate: direction === 'prev' 
        ? prev.currentDate.subtract(1, 'month') 
        : prev.currentDate.add(1, 'month')
    }));
  };

  const goToToday = () => {
    setViewState(prev => ({
      ...prev,
      currentDate: dayjs()
    }));
  };

  const updateViewState = (updates: Partial<CalendarViewState>) => {
    setViewState(prev => ({ ...prev, ...updates }));
  };

  const renderDayCard = (dayData: OrthodoxCalendarDay) => {
    const date = dayjs(dayData.date);
    const fastingConfig = FASTING_TYPES[dayData.fastingType];
    const isToday = date.isSame(dayjs(), 'day');
    const dayNumber = date.date();

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={dayData.date}>
        <Card 
          sx={{ 
            height: '100%',
            borderLeft: `4px solid ${fastingConfig.color}`,
            backgroundColor: isToday ? '#f8fafc' : fastingConfig.backgroundColor,
            border: isToday ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 3,
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 2 }}>
            {/* Date Header */}
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  {formatDayNumber(dayNumber)}
                  {dayData.isSunday && <AutoAwesome sx={{ ml: 1, fontSize: 16, color: '#fbbf24' }} />}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {date.format('dddd')}
                </Typography>
              </Box>
              {dayData.tone && (
                <Chip 
                  label={`Tone ${dayData.tone}`} 
                  size="small" 
                  color="info"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>

            {/* Fasting Information */}
            <Box sx={{ mb: 2 }}>
              <Chip
                label={fastingConfig.label}
                size="small"
                sx={{
                  backgroundColor: fastingConfig.color,
                  color: 'white',
                  fontWeight: 'bold',
                  mb: 0.5,
                }}
              />
              <Typography variant="caption" display="block" color="text.secondary">
                {fastingConfig.description}
              </Typography>
            </Box>

            {/* Major Feasts */}
            {dayData.feasts.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {dayData.feasts.map((feast, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Star sx={{ fontSize: 14, color: '#dc2626', mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#dc2626' }}>
                      {feast.name}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Saints */}
            {viewState.filter !== 'readings' && dayData.saints.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {dayData.saints.slice(0, 3).map((saint, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    {getSaintIcon(saint.type)}
                    <Typography variant="body2" color="text.primary" sx={{ ml: 0.5 }}>
                      {saint.name}
                    </Typography>
                  </Box>
                ))}
                {dayData.saints.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{dayData.saints.length - 3} more saints
                  </Typography>
                )}
              </Box>
            )}

            {/* Readings */}
            {viewState.filter !== 'saints' && (
              <Box sx={{ mt: 1 }}>
                {dayData.readings.matinsGospel && (
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <MenuBook sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                    <strong>Matins Gospel:</strong> {dayData.readings.matinsGospel.reference}
                  </Typography>
                )}
                {dayData.readings.epistle && (
                  <Typography variant="caption" display="block" sx={{ mb: 0.5 }}>
                    <strong>Epistle:</strong> {dayData.readings.epistle.reference}
                  </Typography>
                )}
                {dayData.readings.gospel && (
                  <Typography variant="caption" display="block">
                    <strong>Gospel:</strong> {dayData.readings.gospel.reference}
                  </Typography>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderListView = () => (
    <Box>
      {Array.isArray(liturgicalData) && liturgicalData.map((dayData) => {
        const date = dayjs(dayData.date);
        const fastingConfig = FASTING_TYPES[dayData.fastingType];
        const isToday = date.isSame(dayjs(), 'day');
        
        return (
          <Paper 
            key={dayData.date} 
            sx={{ 
              mb: 2, 
              p: 3,
              borderLeft: `4px solid ${fastingConfig.color}`,
              backgroundColor: isToday ? '#f8fafc' : 'white',
              border: isToday ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12} md={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mr: 1 }}>
                    {date.format('D')}
                  </Typography>
                  {dayData.isSunday && <AutoAwesome sx={{ color: '#fbbf24' }} />}
                </Box>
                <Typography variant="h6" color="text.secondary">
                  {date.format('dddd, MMMM DD, YYYY')}
                </Typography>
                <Chip
                  label={fastingConfig.label}
                  size="small"
                  sx={{
                    backgroundColor: fastingConfig.color,
                    color: 'white',
                    fontWeight: 'bold',
                    mt: 1,
                  }}
                />
                {dayData.tone && (
                  <Chip 
                    label={`Tone ${dayData.tone}`} 
                    size="small" 
                    color="info"
                    sx={{ mt: 1, ml: 1 }}
                  />
                )}
              </Grid>
              
              <Grid item xs={12} md={10}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {fastingConfig.description}
                  </Typography>
                </Box>
                
                {dayData.feasts.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#dc2626', mb: 1 }}>
                      Major Feasts
                    </Typography>
                    {dayData.feasts.map((feast, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Star sx={{ fontSize: 18, color: '#dc2626', mr: 1 }} />
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {feast.name}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                
                {dayData.saints.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Saints & Commemorations
                    </Typography>
                    {dayData.saints.map((saint, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {getSaintIcon(saint.type)}
                        <Box sx={{ ml: 1 }}>
                          <Typography variant="body1">
                            {saint.name}
                          </Typography>
                          {saint.title && (
                            <Typography variant="caption" color="text.secondary">
                              {saint.title}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Liturgical Readings
                  </Typography>
                  {dayData.readings.matinsGospel && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Matins Gospel Reading:</strong> {dayData.readings.matinsGospel.reference}
                    </Typography>
                  )}
                  {dayData.readings.epistle && (
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Epistle Reading:</strong> {dayData.readings.epistle.reference}
                    </Typography>
                  )}
                  {dayData.readings.gospel && (
                    <Typography variant="body1">
                      <strong>Gospel Reading:</strong> {dayData.readings.gospel.reference}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        );
      })}
    </Box>
  );

  const renderFastingLegend = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Fasting Legend
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(FASTING_TYPES).map(([key, config]) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={key}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  backgroundColor: config.color,
                  borderRadius: 1,
                  mr: 1,
                }}
              />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {config.label}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {config.description}
            </Typography>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );

  if (isLoading) {
    return (
      <PageContainer title="Orthodox Liturgical Calendar" description="Orthodox Liturgical Calendar">
        <Breadcrumb title="Orthodox Liturgical Calendar" items={BCrumb} />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Orthodox Liturgical Calendar" description="Orthodox Liturgical Calendar">
      <Breadcrumb title="Orthodox Liturgical Calendar" items={BCrumb} />
      
      {/* Calendar Header */}
      <Paper className="responsive-padding" sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box className="calendar-header-controls">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1, md: 0 } }}>
                <IconButton onClick={() => navigateMonth('prev')} size="large">
                  <ChevronLeft />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2rem' } }}>
                  {viewState.currentDate.format('MMMM YYYY')}
                </Typography>
                <IconButton onClick={() => navigateMonth('next')} size="large">
                  <ChevronRight />
                </IconButton>
              </Box>
              <Button
                variant="outlined"
                startIcon={<Today />}
                onClick={goToToday}
                size="medium"
                className="mobile-full-width"
              >
                Today
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} justifyContent="flex-end" flexWrap="wrap">
              {/* Language Selector */}
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={viewState.language}
                  label="Language"
                  onChange={(e) => updateViewState({ language: e.target.value as CalendarLanguage })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="el">Greek</MenuItem>
                  <MenuItem value="ru">Russian</MenuItem>
                  <MenuItem value="ro">Romanian</MenuItem>
                </Select>
              </FormControl>

              {/* Calendar Variant Selector */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Calendar Style</InputLabel>
                <Select
                  value={viewState.calendarVariant}
                  label="Calendar Style"
                  onChange={(e) => updateViewState({ calendarVariant: e.target.value as 'orthodox' | 'modernize' | 'raydar' })}
                >
                  <MenuItem value="orthodox">Orthodox Default</MenuItem>
                  <MenuItem value="modernize">Modernize View</MenuItem>
                  <MenuItem value="raydar">Raydar View</MenuItem>
                </Select>
              </FormControl>

              {/* Calendar Type */}
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Calendar</InputLabel>
                <Select
                  value={viewState.calendarType}
                  label="Calendar"
                  onChange={(e) => updateViewState({ calendarType: e.target.value as CalendarType })}
                >
                  <MenuItem value="gregorian">Gregorian</MenuItem>
                  <MenuItem value="julian">Julian</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
              
              {/* View Mode Toggle - Only show for Orthodox default */}
              {viewState.calendarVariant === 'orthodox' && (
                <ButtonGroup variant="outlined" size="small">
                  <Button
                    variant={viewState.viewMode === 'list' ? 'contained' : 'outlined'}
                    onClick={() => updateViewState({ viewMode: 'list' })}
                    startIcon={<ViewList />}
                  >
                    List
                  </Button>
                  <Button
                    variant={viewState.viewMode === 'grid' ? 'contained' : 'outlined'}
                    onClick={() => updateViewState({ viewMode: 'grid' })}
                    startIcon={<ViewModule />}
                  >
                    Grid
                  </Button>
                </ButtonGroup>
              )}
              
              {/* Filter Options */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Filter</InputLabel>
                <Select
                  value={viewState.filter}
                  label="Filter"
                  onChange={(e) => updateViewState({ filter: e.target.value as any })}
                >
                  <MenuItem value="all">View All</MenuItem>
                  <MenuItem value="saints">View Saints</MenuItem>
                  <MenuItem value="readings">View Readings</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Fasting Legend */}
      {renderFastingLegend()}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Calendar Content */}
      <div className="mobile-calendar-container">
        {viewState.calendarVariant === 'modernize' ? (
          <ModernizeLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            height={600}
            onDateSelect={(date) => console.log('Date selected:', date)}
            onEventSelect={(event) => console.log('Event selected:', event)}
          />
        ) : viewState.calendarVariant === 'raydar' ? (
          <RaydarLiturgicalCalendar
            language={viewState.language}
            calendarType={viewState.calendarType}
            height={600}
            theme="light"
            onDateSelect={(date) => console.log('Date selected:', date)}
            onEventSelect={(event) => console.log('Event selected:', event)}
          />
        ) : (
          <>
            {viewState.viewMode === 'grid' ? (
              <Grid container spacing={{ xs: 1, md: 2 }}>
                {Array.isArray(liturgicalData) && liturgicalData.map(renderDayCard)}
              </Grid>
            ) : (
              renderListView()
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default OrthodoxLiturgicalCalendar;