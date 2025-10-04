// Liturgical Calendar Hook for OrthodoxMetrics
import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { liturgicalService } from '../services/liturgicalService';
import type {
  LiturgicalDay,
  LiturgicalCalendarFilters,
  LiturgicalCalendarEvent,
} from '../types/liturgical.types';

// Hook for liturgical calendar data
export const useLiturgicalCalendarData = (filters: LiturgicalCalendarFilters) => {
  const { data, error, isLoading, mutate } = useSWR(
    ['liturgical-calendar', filters],
    () => liturgicalService.getCalendar(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

  return {
    days: data || [],
    loading: isLoading,
    error,
    refetch: mutate,
  };
};

// Hook for liturgical calendar by year - TEMPORARILY DISABLED
export const useLiturgicalCalendarByYear = (
  year: number,
  language: string = 'en',
  calendarType: string = 'revised_julian'
) => {
  // Disabled to prevent infinite loop conflicts
  return {
    days: [],
    loading: false,
    error: null,
    refetch: () => { },
  };
};

// Hook for liturgical calendar by month - TEMPORARILY DISABLED
export const useLiturgicalCalendarByMonth = (
  year: number,
  month: number,
  language: string = 'en',
  calendarType: string = 'revised_julian'
) => {
  // Disabled to prevent infinite loop conflicts
  return {
    days: [],
    loading: false,
    error: null,
    refetch: () => { },
  };
};

// Hook for fasting status
export const useFastingStatus = (date: string) => {
  const { data, error, isLoading } = useSWR(
    ['fasting-status', date],
    () => liturgicalService.getFastingStatus(date),
    {
      revalidateOnFocus: false,
      dedupingInterval: 86400000, // 24 hours
    }
  );

  return {
    fastingPeriods: data || [],
    isFasting: (data || []).length > 0,
    loading: isLoading,
    error,
  };
};

// Hook for saint search
export const useSearchSaints = (query: string, language: string = 'en', limit: number = 10) => {
  const { data, error, isLoading } = useSWR(
    query.length >= 2 ? ['search-saints', query, language, limit] : null,
    () => liturgicalService.searchSaints(query, language, limit),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    saints: data || [],
    loading: isLoading,
    error,
  };
};

// Hook for feast search
export const useSearchFeasts = (query: string, language: string = 'en', limit: number = 10) => {
  const { data, error, isLoading } = useSWR(
    query.length >= 2 ? ['search-feasts', query, language, limit] : null,
    () => liturgicalService.searchFeasts(query, language, limit),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  );

  return {
    feasts: data || [],
    loading: isLoading,
    error,
  };
};

// Convert liturgical days to calendar events
export const useLiturgicalCalendarEvents = (
  days: LiturgicalDay[],
  includeFeasts: boolean = true,
  includeSaints: boolean = true,
  includeFasting: boolean = true,
  includeEvents: boolean = true
) => {
  const events = useMemo(() => {
    const calendarEvents: LiturgicalCalendarEvent[] = [];

    days.forEach(day => {
      const dayDate = new Date(day.date);

      // Add feasts
      if (includeFeasts && day.feasts) {
        day.feasts.forEach(feast => {
          calendarEvents.push({
            id: `feast-${feast.id}-${day.date}`,
            title: feast.name,
            start: dayDate,
            end: dayDate,
            allDay: true,
            color: getLiturgicalColor(feast.color),
            type: 'feast',
            data: feast,
            description: feast.description,
            importance: feast.importance,
          });
        });
      }

      // Add saints
      if (includeSaints && day.saints) {
        day.saints.forEach(saint => {
          calendarEvents.push({
            id: `saint-${saint.id}-${day.date}`,
            title: `St. ${saint.name}`,
            start: dayDate,
            end: dayDate,
            allDay: true,
            color: getSaintColor(saint.type),
            type: 'saint',
            data: saint,
            description: saint.biography,
            importance: saint.feastRank === 'great' ? 'high' :
              saint.feastRank === 'major' ? 'medium' : 'low',
          });
        });
      }

      // Add fasting periods
      if (includeFasting && day.fastingPeriods) {
        day.fastingPeriods.forEach(fasting => {
          calendarEvents.push({
            id: `fasting-${fasting.id}-${day.date}`,
            title: `🍽️ ${fasting.title}`,
            start: dayDate,
            end: dayDate,
            allDay: true,
            color: getFastingColor(fasting.type),
            type: 'fasting',
            data: fasting,
            description: fasting.description,
            importance: 'low',
          });
        });
      }

      // Add church events
      if (includeEvents && day.events) {
        day.events.forEach(event => {
          const startTime = event.time ?
            new Date(`${day.date}T${event.time}`) : dayDate;

          calendarEvents.push({
            id: `event-${event.id}-${day.date}`,
            title: event.title,
            start: startTime,
            end: startTime,
            allDay: !event.time,
            color: getEventColor(event.type),
            type: 'event',
            data: event,
            description: event.description,
            importance: 'medium',
          });
        });
      }
    });

    return calendarEvents;
  }, [days, includeFeasts, includeSaints, includeFasting, includeEvents]);

  return events;
};

// Helper functions for colors
const getLiturgicalColor = (color: string): string => {
  const colorMap: Record<string, string> = {
    gold: '#FFD700',
    red: '#DC143C',
    white: '#FFFFFF',
    green: '#228B22',
    purple: '#800080',
    blue: '#0000FF',
    black: '#000000',
    silver: '#C0C0C0',
  };
  return colorMap[color] || '#1976d2';
};

const getSaintColor = (type: string): string => {
  const typeColorMap: Record<string, string> = {
    martyr: '#DC143C',
    bishop: '#FFD700',
    monk: '#800080',
    virgin: '#0000FF',
    apostle: '#DC143C',
    prophet: '#228B22',
    unmercenary: '#C0C0C0',
    other: '#666666',
  };
  return typeColorMap[type] || '#666666';
};

const getFastingColor = (type: string): string => {
  const fastingColorMap: Record<string, string> = {
    strict: '#8B0000',
    wine_oil: '#FF6347',
    fish: '#4682B4',
    dairy: '#DDA0DD',
    none: '#90EE90',
  };
  return fastingColorMap[type] || '#666666';
};

const getEventColor = (type: string): string => {
  const eventColorMap: Record<string, string> = {
    service: '#1976d2',
    meeting: '#ff9800',
    special: '#e91e63',
    other: '#9c27b0',
  };
  return eventColorMap[type] || '#1976d2';
};

// Main hook that combines everything
export const useLiturgicalCalendarFull = (
  year: number,
  month: number,
  language: string = 'en',
  calendarType: string = 'revised_julian',
  options: {
    includeFeasts?: boolean;
    includeSaints?: boolean;
    includeFasting?: boolean;
    includeEvents?: boolean;
  } = {}
) => {
  const {
    includeFeasts = true,
    includeSaints = true,
    includeFasting = true,
    includeEvents = true,
  } = options;

  const { days, loading, error, refetch } = useLiturgicalCalendarByMonth(
    year, month, language, calendarType
  );

  const events = useLiturgicalCalendarEvents(
    days, includeFeasts, includeSaints, includeFasting, includeEvents
  );

  return {
    days,
    events,
    loading,
    error,
    refetch,
  };
};

// Hook for liturgical calendar data (simplified version for BigCalendar integration)
export const useLiturgicalCalendar = (
  date: Date,
  language: 'en' | 'el' | 'ro' | 'ru'
) => {
  const [events, setEvents] = useState<any[]>([]);
  const [saints, setSaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract stable values to prevent infinite re-renders
  const year = useMemo(() => date.getFullYear(), [date.getFullYear()]);
  const apiLanguage = useMemo(() => language === 'el' ? 'gr' : language, [language]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get calendar data for the year
      const calendarData = await liturgicalService.getCalendarByYear(year, apiLanguage);

      // Transform the data to match what the calendar component expects
      const transformedEvents = calendarData.map((day: any) => {
        const dayEvents: any[] = [];

        // Add feasts
        if (day.feasts && day.feasts.length > 0) {
          day.feasts.forEach((feast: any, feastIndex: number) => {
            dayEvents.push({
              id: `feast-${day.date}-${feastIndex}`,
              title: feast.name,
              date: day.date,
              description: feast.description || '',
              liturgical_color: feast.color || day.liturgicalColor,
              is_feast: true,
              is_major_feast: feast.rank === 'major' || feast.rank === 'great',
              is_fast: false,
              saints: []
            });
          });
        }

        // Add saints
        if (day.saints && day.saints.length > 0) {
          day.saints.forEach((saint: any, saintIndex: number) => {
            dayEvents.push({
              id: `saint-${day.date}-${saintIndex}`,
              title: saint.name,
              date: day.date,
              description: saint.description || saint.biography || '',
              liturgical_color: day.liturgicalColor,
              is_feast: false,
              is_major_feast: false,
              is_fast: false,
              saints: [saint]
            });
          });
        }

        // Add fasting periods
        if (day.fasting && day.fasting.length > 0) {
          day.fasting.forEach((fasting: any, fastingIndex: number) => {
            dayEvents.push({
              id: `fasting-${day.date}-${fastingIndex}`,
              title: `🍽️ ${fasting.name}`,
              date: day.date,
              description: fasting.description || '',
              liturgical_color: fasting.color || 'purple',
              is_feast: false,
              is_major_feast: false,
              is_fast: true,
              saints: []
            });
          });
        }

        return dayEvents;
      }).flat();

      setEvents(transformedEvents);

      // Extract all saints from the calendar data
      const allSaints = calendarData.reduce((acc: any[], day) => {
        if (day.saints) {
          acc.push(...day.saints);
        }
        return acc;
      }, []);

      setSaints(allSaints);
    } catch (err) {
      setError('Failed to load liturgical calendar data');
      console.error('Error loading liturgical calendar:', err);
    } finally {
      setIsLoading(false);
    }
  }, [year, apiLanguage]); // Use stable values instead of date object

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    events,
    saints,
    isLoading,
    error,
    refreshData,
  };
};
