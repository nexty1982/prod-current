// Liturgical Calendar Types for OrthodoxMetrics
export interface LiturgicalDay {
  date: string;
  julianDate?: string;
  liturgicalColor?: LiturgicalColor;
  feasts?: Feast[];
  saints?: Saint[];
  fastingPeriods?: FastingPeriod[];
  events?: CalendarEvent[];
  readings?: DailyReadings;
  tone?: number;
  weekOfYear?: number;
  fastingRule?: FastingLevel;
  specialNotes?: string[];
  vigil?: boolean;
  allNightVigil?: boolean;
}

export interface LiturgicalColor {
  name: string;
  primary: string; // hex color
  secondary?: string;
  description?: string;
}

export interface FastingLevel {
  name: string;
  level: 'strict' | 'wine-oil' | 'fish' | 'dairy' | 'fast-free';
  description: string;
  restrictions: string[];
}

export interface DailyReadings {
  epistle?: Reading;
  gospel?: Reading;
  oldTestament?: Reading[];
  matins?: Reading;
  vespers?: Reading;
}

export interface Reading {
  reference: string;
  citation: string;
  text?: string;
  pericope?: number;
  forFeast?: string;
}

export interface Feast {
  id: string;
  name: string;
  date: string;
  type: 'great' | 'major' | 'minor' | 'local' | 'saint';
  rank: number; // 1-12, 1 being highest
  commemorationType: 'fixed' | 'moveable';
  color: 'red' | 'gold' | 'white' | 'green' | 'purple' | 'blue' | 'black' | 'silver';
  moveable: boolean;
  description?: string;
  icon?: string;
  importance: 'high' | 'medium' | 'low';
  liturgicalColor: LiturgicalColor;
  readings: DailyReadings;
  saints: Saint[];
  paschalOffset?: number; // days from Pascha if moveable
}

export interface Saint {
  id: string;
  name: string;
  title?: string;
  feastDay: string;
  feastRank: 'great' | 'major' | 'minor' | 'commemoration';
  commemorationDate: string;
  patronage?: string[];
  biography?: string;
  iconPath?: string;
  type: 'apostle' | 'martyr' | 'confessor' | 'hierarch' | 'monastic' | 'righteous' | 'fool-for-christ' | 'new-martyr' | 'unmercenary' | 'virgin' | 'bishop' | 'monk' | 'prophet' | 'other';
  troparion?: string;
  kontakion?: string;
  relatedSaints?: string[];
}

export interface FastingPeriod {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  type: 'strict' | 'wine_oil' | 'fish' | 'dairy' | 'none';
  description?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  description?: string;
  churchId?: number;
  type: 'service' | 'meeting' | 'special' | 'other';
}

export interface LiturgicalReading {
  id: number;
  date: string;
  type: 'epistle' | 'gospel' | 'old_testament';
  book: string;
  chapter: number;
  verses: string;
  text?: string;
  language: 'en' | 'gr' | 'ru' | 'ro';
}

export interface LiturgicalCalendarFilters {
  startDate: string;
  endDate: string;
  language?: 'en' | 'gr' | 'ru' | 'ro';
  churchId?: number;
  includeFeasts?: boolean;
  includeSaints?: boolean;
  includeFasting?: boolean;
  includeEvents?: boolean;
  calendarType?: 'julian' | 'revised_julian';
}

export interface LiturgicalCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  type: 'feast' | 'saint' | 'fasting' | 'event';
  data: Feast | Saint | FastingPeriod | CalendarEvent;
  description?: string;
  importance?: 'high' | 'medium' | 'low';
}

// Additional types for calendar component
export type CalendarType = 'gregorian' | 'julian' | 'both';
export type Language = 'en' | 'el' | 'ro' | 'ru';

// New enhanced types
export interface CalendarMonth {
  year: number;
  month: number; // 1-12
  days: LiturgicalDay[];
  majorFeasts: Feast[];
  fastingPeriods: FastingPeriod[];
}

export interface CalendarView {
  type: 'day' | 'week' | 'month' | 'year';
  date: Date;
  showFeasts: boolean;
  showSaints: boolean;
  showFasting: boolean;
  showReadings: boolean;
}

export interface CalendarFilters {
  feastTypes: string[];
  saintTypes: string[];
  fastingLevels: string[];
  searchQuery: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CalendarSettings {
  calendarSystem: 'gregorian' | 'julian' | 'revised-julian';
  timezone: string;
  language: 'en' | 'el' | 'ru' | 'ar' | 'ro' | 'sr';
  showJulianDates: boolean;
  showTones: boolean;
  showPaschalion: boolean;
  notifications: {
    dailyReadings: boolean;
    fastingReminders: boolean;
    majorFeasts: boolean;
  };
}

export interface ShareOptions {
  type: 'day' | 'feast' | 'reading';
  format: 'link' | 'text' | 'image' | 'pdf' | 'ical';
  includeReadings: boolean;
  includeFasting: boolean;
  includeSaints: boolean;
}

// API Response Types
export interface CalendarAPIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface CalendarDayResponse extends CalendarAPIResponse<LiturgicalDay> { }
export interface CalendarMonthResponse extends CalendarAPIResponse<CalendarMonth> { }
export interface FeastsResponse extends CalendarAPIResponse<Feast[]> { }
export interface SaintsResponse extends CalendarAPIResponse<Saint[]> { }
