// Church Records Management System API Client
import type {
  AuthResponse,
  BaptismRecord,
  MarriageRecord,
  FuneralRecord,
  OCRUploadResponse,
  OCRStatus,
  LiturgicalEvent,
  DashboardMetrics,
  CertificateGenerationRequest,
  CertificateResponse,
  DropdownOptions,
  SearchFilters,
  PaginatedResponse,
  HealthCheckResponse,
  User,
  FileUploadProgress
} from '@/types/church-records.types';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_TIMEOUT = 30000;

// HTTP client with credentials
class ApiClient {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: (event.loaded / event.total) * 100
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${this.baseURL}${endpoint}`);
      xhr.withCredentials = true;
      xhr.send(formData);
    });
  }

  // Authentication APIs
  auth = {
    signIn: (username: string, password: string): Promise<AuthResponse> =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, remember_me: false }),
      }),

    signOut: (): Promise<AuthResponse> =>
      this.request('/auth/logout', { method: 'POST' }),

    checkAuth: (): Promise<{ user: User | null; authenticated: boolean }> =>
      this.request('/auth/check'),

    getHealth: (): Promise<HealthCheckResponse> =>
      this.request('/health'),
  };

  // Baptism Records APIs
  baptism = {
    getRecords: (filters?: SearchFilters): Promise<PaginatedResponse<BaptismRecord>> =>
      this.request(`/baptism-records${this.buildQueryString(filters)}`),

    getRecord: (id: number): Promise<BaptismRecord> =>
      this.request(`/baptism-records/${id}`),

    createRecord: (record: Omit<BaptismRecord, 'id' | 'created_at' | 'updated_at'>): Promise<BaptismRecord> =>
      this.request('/baptism-records', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateRecord: (id: number, record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
      this.request(`/baptism-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteRecord: (id: number): Promise<{ success: boolean; message: string }> =>
      this.request(`/baptism-records/${id}`, { method: 'DELETE' }),

    importRecords: (
      file: File,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<{ success: boolean; imported: number; errors: string[] }> =>
      this.uploadFile('/baptism-records/import', file, {}, onProgress),

    getHistory: (id: number): Promise<any[]> =>
      this.request(`/baptism-records/${id}/history`),
  };

  // Marriage Records APIs
  marriage = {
    getRecords: (filters?: SearchFilters): Promise<PaginatedResponse<MarriageRecord>> =>
      this.request(`/marriage-records${this.buildQueryString(filters)}`),

    getRecord: (id: number): Promise<MarriageRecord> =>
      this.request(`/marriage-records/${id}`),

    createRecord: (record: Omit<MarriageRecord, 'id' | 'created_at' | 'updated_at'>): Promise<MarriageRecord> =>
      this.request('/marriage-records', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateRecord: (id: number, record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
      this.request(`/marriage-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteRecord: (id: number): Promise<{ success: boolean; message: string }> =>
      this.request(`/marriage-records/${id}`, { method: 'DELETE' }),

    importRecords: (
      file: File,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<{ success: boolean; imported: number; errors: string[] }> =>
      this.uploadFile('/marriage-records/import', file, {}, onProgress),
  };

  // Funeral Records APIs
  funeral = {
    getRecords: (filters?: SearchFilters): Promise<PaginatedResponse<FuneralRecord>> =>
      this.request(`/funeral-records${this.buildQueryString(filters)}`),

    getRecord: (id: number): Promise<FuneralRecord> =>
      this.request(`/funeral-records/${id}`),

    createRecord: (record: Omit<FuneralRecord, 'id' | 'created_at' | 'updated_at'>): Promise<FuneralRecord> =>
      this.request('/funeral-records', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateRecord: (id: number, record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
      this.request(`/funeral-records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteRecord: (id: number): Promise<{ success: boolean; message: string }> =>
      this.request(`/funeral-records/${id}`, { method: 'DELETE' }),

    importRecords: (
      file: File,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<{ success: boolean; imported: number; errors: string[] }> =>
      this.uploadFile('/funeral-records/import', file, {}, onProgress),
  };

  // OCR APIs
  ocr = {
    uploadFile: (
      file: File,
      language: string,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<OCRUploadResponse> =>
      this.uploadFile('/ocr/upload', file, { language }, onProgress),

    getStatus: (id: string): Promise<OCRStatus> =>
      this.request(`/ocr/status/${id}`),

    getHistory: (): Promise<OCRStatus[]> =>
      this.request('/ocr/history'),

    deleteFile: (id: string): Promise<{ success: boolean; message: string }> =>
      this.request(`/ocr/files/${id}`, { method: 'DELETE' }),
  };

  // Liturgical Calendar APIs
  calendar = {
    getEvents: (year: number, month?: number, language?: string): Promise<LiturgicalEvent[]> =>
      this.request(`/calendar/events?year=${year}${month ? `&month=${month}` : ''}${language ? `&language=${language}` : ''}`),

    getEvent: (id: number): Promise<LiturgicalEvent> =>
      this.request(`/calendar/events/${id}`),

    createEvent: (event: Omit<LiturgicalEvent, 'id'>): Promise<LiturgicalEvent> =>
      this.request('/calendar/events', {
        method: 'POST',
        body: JSON.stringify(event),
      }),

    updateEvent: (id: number, event: Partial<LiturgicalEvent>): Promise<LiturgicalEvent> =>
      this.request(`/calendar/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(event),
      }),

    deleteEvent: (id: number): Promise<{ success: boolean; message: string }> =>
      this.request(`/calendar/events/${id}`, { method: 'DELETE' }),

    exportCalendar: (year: number, format: 'ics' | 'csv' | 'pdf'): Promise<Blob> =>
      this.request(`/calendar/export?year=${year}&format=${format}`),
  };

  // Certificate Generation APIs
  certificates = {
    generateBaptismCertificate: (request: CertificateGenerationRequest): Promise<CertificateResponse> =>
      this.request('/certificate/baptism', {
        method: 'POST',
        body: JSON.stringify(request),
      }),

    generateMarriageCertificate: (request: CertificateGenerationRequest): Promise<CertificateResponse> =>
      this.request('/certificate/marriage', {
        method: 'POST',
        body: JSON.stringify(request),
      }),

    previewCertificate: (recordId: number, type: string): Promise<CertificateResponse> =>
      this.request(`/certificate/${type}/${recordId}/preview`, {
        method: 'POST',
      }),

    testCertificate: (type: string): Promise<CertificateResponse> =>
      this.request(`/certificate/${type}/test`),
  };

  // Dashboard APIs
  dashboard = {
    getMetrics: (): Promise<DashboardMetrics> =>
      this.request('/dashboard/metrics'),

    getActivity: (limit?: number): Promise<any[]> =>
      this.request(`/dashboard/activity${limit ? `?limit=${limit}` : ''}`),

    getStatistics: (dateRange?: { from: string; to: string }): Promise<any> =>
      this.request(`/dashboard/statistics${dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : ''}`),
  };

  // Utility APIs
  utils = {
    getDropdownOptions: (): Promise<DropdownOptions> =>
      this.request('/dropdown-options'),

    getLocations: (): Promise<string[]> =>
      this.request('/locations'),

    getClergy: (): Promise<string[]> =>
      this.request('/clergy'),

    getLanguages: (): Promise<string[]> =>
      this.request('/languages'),

    exportData: (
      type: 'baptism' | 'marriage' | 'funeral',
      format: 'csv' | 'pdf',
      filters?: SearchFilters
    ): Promise<Blob> =>
      this.request(`/${type}-records/export?format=${format}${this.buildQueryString(filters)}`),
  };

  // Helper method to build query strings
  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return '';
    
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });
    
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
  }
}

// Export singleton instance
export const churchRecordsApi = new ApiClient();
export default churchRecordsApi;
