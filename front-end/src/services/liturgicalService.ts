// Liturgical Calendar API Service for OrthodoxMetrics
import type {
  LiturgicalDay,
  LiturgicalCalendarFilters,
  Feast,
  Saint,
  FastingPeriod,
  CalendarEvent,
  LiturgicalReading
} from '../types/liturgical.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Base fetch wrapper with error handling
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include', // Include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('auth_user');
      window.location.href = '/auth/sign-in';
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export class LiturgicalService {
  // Get liturgical calendar data for a specific year and language
  async getCalendarByYear(year: number, language: string = 'en', calendarType: string = 'revised_julian'): Promise<LiturgicalDay[]> {
    const url = `/api/calendar/${language}/${year}?type=${calendarType}`;
    return apiRequest<LiturgicalDay[]>(url);
  }

  // Get liturgical calendar data for a date range
  async getCalendar(filters: LiturgicalCalendarFilters): Promise<LiturgicalDay[]> {
    const { startDate, endDate, language = 'en' } = filters;
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();

    // If the date range spans multiple years, we need to fetch data for each year
    const allData: LiturgicalDay[] = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearData = await this.getCalendarByYear(year, language);
      allData.push(...yearData);
    }

    // Filter the data to the requested date range
    return allData.filter(day => {
      const dayDate = new Date(day.date);
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      return dayDate >= startDateObj && dayDate <= endDateObj;
    });
  }

  // Get liturgical calendar data for a specific month
  async getCalendarByMonth(
    year: number,
    month: number,
    language: string = 'en',
    calendarType: string = 'revised_julian'
  ): Promise<LiturgicalDay[]> {
    const monthStr = month.toString().padStart(2, '0');
    const url = `/api/calendar/${language}/${year}?type=${calendarType}&month=${monthStr}`;
    return apiRequest<LiturgicalDay[]>(url);
  }

  // Get specific feast details
  async getFeast(feastId: number, language: string = 'en'): Promise<Feast> {
    const url = `/api/calendar/feasts/${feastId}?lang=${language}`;
    return apiRequest<Feast>(url);
  }

  // Get specific saint details
  async getSaint(saintId: number, language: string = 'en'): Promise<Saint> {
    const url = `/api/calendar/saints/${saintId}?lang=${language}`;
    return apiRequest<Saint>(url);
  }

  // Get saints for a specific date
  async getSaintsByDate(date: string, language: string = 'en'): Promise<Saint[]> {
    const url = `/api/calendar/saints?date=${date}&lang=${language}`;
    return apiRequest<Saint[]>(url);
  }

  // Get feasts for a specific date
  async getFeastsByDate(date: string, language: string = 'en'): Promise<Feast[]> {
    const url = `/api/calendar/feasts?date=${date}&lang=${language}`;
    return apiRequest<Feast[]>(url);
  }

  // Get fasting status for a date
  async getFastingStatus(date: string): Promise<FastingPeriod[]> {
    const url = `/api/calendar/fasting?date=${date}`;
    return apiRequest<FastingPeriod[]>(url);
  }

  // Get current liturgical season
  async getCurrentSeason(language: string = 'en'): Promise<any> {
    const url = `/api/calendar/season?lang=${language}`;
    return apiRequest<any>(url);
  }

  // Get Paschal calculations for a year
  async getPaschalDate(year: number): Promise<any> {
    const url = `/api/calendar/pascha/${year}`;
    return apiRequest<any>(url);
  }

  // Get liturgical readings for a date
  async getReadings(date: string, language: string = 'en'): Promise<LiturgicalReading[]> {
    const url = `/api/calendar/readings?date=${date}&lang=${language}`;
    return apiRequest<LiturgicalReading[]>(url);
  }

  // Get church-specific events
  async getChurchEvents(
    churchId: number,
    startDate: string,
    endDate: string
  ): Promise<CalendarEvent[]> {
    const url = `/api/calendar/events/${churchId}?start_date=${startDate}&end_date=${endDate}`;
    return apiRequest<CalendarEvent[]>(url);
  }

  // Create church event
  async createChurchEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const url = '/api/calendar/events';
    return apiRequest<CalendarEvent>(url, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Update church event
  async updateChurchEvent(eventId: number, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const url = `/api/calendar/events/${eventId}`;
    return apiRequest<CalendarEvent>(url, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  // Delete church event
  async deleteChurchEvent(eventId: number): Promise<void> {
    const url = `/api/calendar/events/${eventId}`;
    await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Export calendar data
  async exportCalendar(
    filters: LiturgicalCalendarFilters,
    format: 'ical' | 'csv' | 'pdf' | 'json'
  ): Promise<Blob> {
    const params = new URLSearchParams({
      ...filters,
      format,
    } as any);
    const url = `/api/calendar/export?${params}`;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  // Search saints by name
  async searchSaints(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<Saint[]> {
    const url = `/api/calendar/saints/search?q=${encodeURIComponent(query)}&lang=${language}&limit=${limit}`;
    return apiRequest<Saint[]>(url);
  }

  // Search feasts by name
  async searchFeasts(
    query: string,
    language: string = 'en',
    limit: number = 10
  ): Promise<Feast[]> {
    const url = `/api/calendar/feasts/search?q=${encodeURIComponent(query)}&lang=${language}&limit=${limit}`;
    return apiRequest<Feast[]>(url);
  }

  // Get commemorations for a church
  async getChurchCommemorations(churchId: number): Promise<any[]> {
    const url = `/api/calendar/commemorations/${churchId}`;
    return apiRequest<any[]>(url);
  }

  // Create local commemoration
  async createCommemoration(commemoration: any): Promise<any> {
    const url = '/api/calendar/commemorations';
    return apiRequest<any>(url, {
      method: 'POST',
      body: JSON.stringify(commemoration),
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    const url = '/api/calendar/health';
    return apiRequest<any>(url);
  }
}

// Export singleton instance
export const liturgicalService = new LiturgicalService();
export default liturgicalService;
