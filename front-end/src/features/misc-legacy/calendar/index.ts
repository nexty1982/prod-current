/**
 * Calendar Components Index
 * Exports for liturgical calendar and AI task management calendar components
 */

// Liturgical Calendar Components
export { default as LiturgicalCalendar } from './LiturgicalCalendar';
export { default as CalendarDayDetail } from './CalendarDayDetail';

// AI Task Calendar Component (existing) - Temporarily disabled due to build issues
// export { default as OMCalendar } from './OMCalendar';

// Re-export types for convenience
export type {
  LiturgicalDay,
  CalendarMonth,
  Feast,
  Saint,
  FastingPeriod,
  CalendarView,
  CalendarFilters,
  CalendarSettings,
  ShareOptions
} from '@/types/liturgical.types';
