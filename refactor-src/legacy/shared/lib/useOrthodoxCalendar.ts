import { useState, useEffect } from 'react';
import orthodoxCalendarService from '@/shared/lib/orthodoxCalendarService';
import { OrthodoxCalendarDay, CalendarLanguage, CalendarType } from '@/types/orthodox-calendar.types';

interface UseOrthodoxCalendarOptions {
  year: number;
  month: number;
  language?: CalendarLanguage;
  calendarType?: CalendarType;
}

interface UseOrthodoxCalendarReturn {
  data: OrthodoxCalendarDay[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching Orthodox calendar data
 */
export const useOrthodoxCalendar = ({
  year,
  month,
  language = 'en',
  calendarType = 'gregorian',
}: UseOrthodoxCalendarOptions): UseOrthodoxCalendarReturn => {
  const [data, setData] = useState<OrthodoxCalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const calendarData = await orthodoxCalendarService.getCalendarMonth(
        year,
        month,
        language,
        calendarType
      );
      setData(calendarData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar data';
      setError(errorMessage);
      console.error('Orthodox calendar fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month, language, calendarType]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
};

export default useOrthodoxCalendar;