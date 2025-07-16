/**
 * OrthodoxMetrics API Service Layer
 * Comprehensive API client for all backend endpoints
 */

import type {
  User,
  AuthResponse,
  LoginCredentials,
  Church,
  ChurchFilters,
  CreateChurchData,
  LiturgicalDay,
  CalendarFilters,
  BaptismRecord,
  MarriageRecord,
  FuneralRecord,
  Invoice,
  InvoiceFilters,
  CreateInvoiceData,
  OCRUpload,
  OCRResult,
  OCRFilters,
  ProvisionRequest,
  ProvisionLog,
  ProvisionFilters,
  PaginatedResponse,
  ApiResponse,
  DashboardMetrics,
  ActivityLog,
  DropdownOptions,
  AppConfig,
  SupportedLanguage,
  ExportOptions,
  FileUploadProgress,
} from '../types/orthodox-metrics.types';

// ===== API CLIENT CONFIGURATION =====
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_TIMEOUT = 30000;

class OrthodoxMetricsAPI {
  private baseURL: string;
  private timeout: number;

  constructor(baseURL: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  // ===== CORE HTTP METHODS =====
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // If baseURL is empty, use relative path (for Vite proxy)
    const url = this.baseURL ? `${this.baseURL}/api${endpoint}` : `/api${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include', // Session-based authentication
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
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
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', this.baseURL ? `${this.baseURL}/api${endpoint}` : `/api${endpoint}`);
      xhr.withCredentials = true; // Session-based authentication
      xhr.send(formData);
    });
  }

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

  // ===== AUTHENTICATION APIs =====
  auth = {
    login: (credentials: LoginCredentials): Promise<AuthResponse> =>
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    logout: (): Promise<ApiResponse> =>
      this.request('/auth/logout', { method: 'POST' }),

    checkAuth: (): Promise<{ user: User | null; authenticated: boolean }> =>
      this.request('/auth/check'),

    forgotPassword: (email: string): Promise<ApiResponse> =>
      this.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, password: string): Promise<ApiResponse> =>
      this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),
  };

  // ===== CHURCH MANAGEMENT APIs =====
  churches = {
    getAll: (filters?: ChurchFilters): Promise<{ churches: Church[] }> =>
      this.request(`/churches${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<Church> =>
      this.request(`/churches/${id}`),

    create: (church: CreateChurchData): Promise<Church> =>
      this.request('/churches', {
        method: 'POST',
        body: JSON.stringify(church),
      }),

    update: (id: number, church: Partial<Church>): Promise<Church> =>
      this.request(`/churches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(church),
      }),

    delete: (id: number): Promise<ApiResponse> =>
      this.request(`/churches/${id}`, { method: 'DELETE' }),

    approve: (id: number, notes?: string): Promise<ApiResponse> =>
      this.request(`/churches/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),

    suspend: (id: number, reason?: string): Promise<ApiResponse> =>
      this.request(`/churches/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    activate: (id: number): Promise<ApiResponse> =>
      this.request(`/churches/${id}/activate`, { method: 'POST' }),
  };

  // ===== LITURGICAL CALENDAR APIs =====
  calendar = {
    getCalendar: (filters: CalendarFilters): Promise<LiturgicalDay[]> =>
      this.request(`/calendar${this.buildQueryString(filters)}`),

    getDayData: (date: string, language: SupportedLanguage = 'en'): Promise<LiturgicalDay> =>
      this.request(`/calendar/day/${date}?lang=${language}`),

    getCurrentSeason: (language: SupportedLanguage = 'en'): Promise<{ season: string; description: string }> =>
      this.request(`/calendar/season/current?lang=${language}`),

    getPaschaDate: (year: number): Promise<{ date: string; julian_date: string }> =>
      this.request(`/calendar/pascha/${year}`),

    getFeasts: (year: number, language: SupportedLanguage = 'en'): Promise<any[]> =>
      this.request(`/calendar/feasts/${year}?lang=${language}`),

    getSaints: (date: string, language: SupportedLanguage = 'en'): Promise<any[]> =>
      this.request(`/calendar/saints/${date}?lang=${language}`),

    getFastingStatus: (date: string, language: SupportedLanguage = 'en'): Promise<any> =>
      this.request(`/calendar/fasting/${date}?lang=${language}`),

    export: (filters: CalendarFilters, format: 'ical' | 'csv' | 'pdf'): Promise<Blob> =>
      this.request(`/calendar/export?format=${format}&${this.buildQueryString(filters)}`),
  };

  // ===== CHURCH RECORDS APIs =====
  records = {
    // Baptism Records
    baptism: {
      getAll: (filters?: any): Promise<PaginatedResponse<BaptismRecord>> =>
        this.request(`/baptism-records${this.buildQueryString(filters)}`),

      getById: (id: number): Promise<BaptismRecord> =>
        this.request(`/baptism-records/${id}`),

      create: (record: Omit<BaptismRecord, 'id' | 'created_at' | 'updated_at'>): Promise<BaptismRecord> =>
        this.request('/baptism-records', {
          method: 'POST',
          body: JSON.stringify(record),
        }),

      update: (id: number, record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
        this.request(`/baptism-records/${id}`, {
          method: 'PUT',
          body: JSON.stringify(record),
        }),

      delete: (id: number): Promise<ApiResponse> =>
        this.request(`/baptism-records/${id}`, { method: 'DELETE' }),

      import: (file: File, onProgress?: (progress: FileUploadProgress) => void): Promise<any> =>
        this.uploadFile('/baptism-records/import', file, {}, onProgress),

      export: (filters?: any, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> =>
        this.request(`/baptism-records/export?format=${format}&${this.buildQueryString(filters)}`),
    },

    // Marriage Records
    marriage: {
      getAll: (filters?: any): Promise<PaginatedResponse<MarriageRecord>> =>
        this.request(`/marriage-records${this.buildQueryString(filters)}`),

      getById: (id: number): Promise<MarriageRecord> =>
        this.request(`/marriage-records/${id}`),

      create: (record: Omit<MarriageRecord, 'id' | 'created_at' | 'updated_at'>): Promise<MarriageRecord> =>
        this.request('/marriage-records', {
          method: 'POST',
          body: JSON.stringify(record),
        }),

      update: (id: number, record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
        this.request(`/marriage-records/${id}`, {
          method: 'PUT',
          body: JSON.stringify(record),
        }),

      delete: (id: number): Promise<ApiResponse> =>
        this.request(`/marriage-records/${id}`, { method: 'DELETE' }),

      import: (file: File, onProgress?: (progress: FileUploadProgress) => void): Promise<any> =>
        this.uploadFile('/marriage-records/import', file, {}, onProgress),

      export: (filters?: any, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> =>
        this.request(`/marriage-records/export?format=${format}&${this.buildQueryString(filters)}`),
    },

    // Funeral Records
    funeral: {
      getAll: (filters?: any): Promise<PaginatedResponse<FuneralRecord>> =>
        this.request(`/funeral-records${this.buildQueryString(filters)}`),

      getById: (id: number): Promise<FuneralRecord> =>
        this.request(`/funeral-records/${id}`),

      create: (record: Omit<FuneralRecord, 'id' | 'created_at' | 'updated_at'>): Promise<FuneralRecord> =>
        this.request('/funeral-records', {
          method: 'POST',
          body: JSON.stringify(record),
        }),

      update: (id: number, record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
        this.request(`/funeral-records/${id}`, {
          method: 'PUT',
          body: JSON.stringify(record),
        }),

      delete: (id: number): Promise<ApiResponse> =>
        this.request(`/funeral-records/${id}`, { method: 'DELETE' }),

      import: (file: File, onProgress?: (progress: FileUploadProgress) => void): Promise<any> =>
        this.uploadFile('/funeral-records/import', file, {}, onProgress),

      export: (filters?: any, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> =>
        this.request(`/funeral-records/export?format=${format}&${this.buildQueryString(filters)}`),
    },
  };

  // ===== INVOICES APIs =====
  invoices = {
    getAll: (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> =>
      this.request(`/invoices${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<Invoice> => {
      console.log('API: Fetching invoice by ID:', id);
      return this.request(`/invoices/${id}`).then((response: any) => {
        // Handle server response format { success: true, data: invoice }
        if (response.success && response.data) {
          return response.data;
        }
        return response;
      });
    },

    getByInvoiceNumber: (invoiceNumber: string): Promise<Invoice> => {
      console.log('API: Fetching invoice by number:', invoiceNumber);
      return this.request(`/v1/invoices/${invoiceNumber}`);
    },

    create: (invoice: CreateInvoiceData): Promise<Invoice> =>
      this.request('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      }),

    update: (id: number, updates: Partial<Invoice>): Promise<Invoice> =>
      this.request(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    updateByInvoiceNumber: (invoiceNumber: string, updates: Partial<Invoice>): Promise<Invoice> =>
      this.request(`/v1/invoices/${invoiceNumber}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),

    delete: (id: number): Promise<ApiResponse> =>
      this.request(`/invoices/${id}`, { method: 'DELETE' }),

    markPaid: (id: number, paidDate?: string): Promise<Invoice> =>
      this.request(`/invoices/${id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({ paid_date: paidDate }),
      }),

    generatePDF: (id: number): Promise<Blob> => {
      console.log('API: Generating PDF for invoice:', id);
      return this.request(`/invoices/${id}/pdf`, {
        headers: { 'Accept': 'application/pdf' },
      }).then((response: any) => {
        // If server returns JSON with error message, throw error
        if (response.success === false) {
          throw new Error(response.message || 'PDF generation failed');
        }
        // If server doesn't support PDF generation, return null
        if (response.message && response.message.includes('not implemented')) {
          console.log('Server-side PDF generation not implemented');
          return null;
        }
        return response;
      }).catch((error) => {
        console.error('Server-side PDF generation error:', error);
        throw error;
      });
    },

    sendEmail: (id: number, email: string): Promise<ApiResponse> =>
      this.request(`/invoices/${id}/send-email`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    export: (filters?: InvoiceFilters, format: 'csv' | 'xlsx' | 'pdf' = 'xlsx'): Promise<Blob> =>
      this.request(`/invoices/export/${format}${this.buildQueryString(filters)}`, {
        headers: { 'Accept': 'application/octet-stream' },
      }),
  };

  // ===== OCR APIs =====
  ocr = {
    upload: (
      file: File,
      language: SupportedLanguage,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<OCRUpload> =>
      this.uploadFile(`/ocr-${language}`, file, { language }, onProgress),

    getStatus: (id: string): Promise<OCRResult> =>
      this.request(`/ocr/status/${id}`),

    getHistory: (filters?: OCRFilters): Promise<PaginatedResponse<OCRUpload>> =>
      this.request(`/ocr/history${this.buildQueryString(filters)}`),

    retry: (id: string): Promise<OCRResult> =>
      this.request(`/ocr/${id}/retry`, { method: 'POST' }),

    delete: (id: string): Promise<ApiResponse> =>
      this.request(`/ocr/${id}`, { method: 'DELETE' }),

    export: (id: string, format: 'xlsx' | 'pdf'): Promise<Blob> =>
      this.request(`/ocr/${id}/export?format=${format}`),

    sendEmail: (id: string, email: string): Promise<ApiResponse> =>
      this.request(`/ocr/${id}/send-email`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    generateBarcode: (): Promise<{ barcode: string }> =>
      this.request('/ocr/generate-barcode', { method: 'POST' }),

    health: (): Promise<{ status: string; languages: SupportedLanguage[] }> =>
      this.request('/ocr-health'),
  };

  // ===== PROVISIONING APIs =====
  provisioning = {
    getQueue: (filters?: ProvisionFilters): Promise<PaginatedResponse<ProvisionRequest>> =>
      this.request(`/provision/queue${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<ProvisionRequest> =>
      this.request(`/provision/${id}`),

    submit: (request: Omit<ProvisionRequest, 'id' | 'status' | 'submitted_at'>): Promise<ProvisionRequest> =>
      this.request('/provision/submit', {
        method: 'POST',
        body: JSON.stringify(request),
      }),

    review: (id: number, action: 'approve' | 'reject', notes?: string): Promise<ApiResponse> =>
      this.request(`/provision/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ action, notes }),
      }),

    start: (id: number): Promise<ApiResponse> =>
      this.request(`/provision/${id}/start`, { method: 'POST' }),

    cancel: (id: number, reason?: string): Promise<ApiResponse> =>
      this.request(`/provision/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    retry: (id: number, stage?: string): Promise<ApiResponse> =>
      this.request(`/provision/${id}/retry`, {
        method: 'POST',
        body: JSON.stringify({ stage }),
      }),

    getLogs: (id: number): Promise<ProvisionLog[]> =>
      this.request(`/provision/${id}/logs`),

    getStats: (): Promise<any> =>
      this.request('/provision/stats'),

    export: (filters?: ProvisionFilters, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> =>
      this.request(`/provision/export?format=${format}&${this.buildQueryString(filters)}`),
  };

  // ===== DASHBOARD & ANALYTICS APIs =====
  dashboard = {
    getMetrics: (): Promise<DashboardMetrics> =>
      this.request('/dashboard/metrics'),

    getActivity: (limit?: number): Promise<ActivityLog[]> =>
      this.request(`/dashboard/activity${limit ? `?limit=${limit}` : ''}`),

    getStats: (dateRange?: { from: string; to: string }): Promise<any> =>
      this.request(`/dashboard/stats${dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : ''}`),

    export: (type: string, format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> =>
      this.request(`/dashboard/export/${type}?format=${format}`),
  };

  // ===== UTILITY APIs =====
  utils = {
    getDropdownOptions: (): Promise<DropdownOptions> =>
      this.request('/dropdown-options'),

    getConfig: (): Promise<AppConfig> =>
      this.request('/config'),

    health: (): Promise<{ status: string; version: string; uptime: number }> =>
      this.request('/health'),

    upload: (
      file: File,
      type: string,
      onProgress?: (progress: FileUploadProgress) => void
    ): Promise<{ url: string; filename: string }> =>
      this.uploadFile(`/upload/${type}`, file, {}, onProgress),

    search: (query: string, type?: string): Promise<any[]> =>
      this.request(`/search?q=${encodeURIComponent(query)}${type ? `&type=${type}` : ''}`),
  };

  // ===== CERTIFICATES APIs =====
  certificates = {
    generate: (type: 'baptism' | 'marriage' | 'funeral', recordId: number, language: SupportedLanguage): Promise<Blob> =>
      this.request(`/certificate/${type}/${recordId}?lang=${language}`),

    preview: (type: 'baptism' | 'marriage' | 'funeral', recordId: number, language: SupportedLanguage): Promise<Blob> =>
      this.request(`/certificate/${type}/${recordId}/preview?lang=${language}`),

    templates: (): Promise<any[]> =>
      this.request('/certificate/templates'),
  };

  // ===== EMAIL APIs =====
  email = {
    send: (to: string, subject: string, body: string, attachments?: string[]): Promise<ApiResponse> =>
      this.request('/email/send', {
        method: 'POST',
        body: JSON.stringify({ to, subject, body, attachments }),
      }),

    sendCredentials: (churchId: number, email: string): Promise<ApiResponse> =>
      this.request('/email/send-credentials', {
        method: 'POST',
        body: JSON.stringify({ church_id: churchId, email }),
      }),

    templates: (): Promise<any[]> =>
      this.request('/email/templates'),
  };
}

// Export singleton instance
export const orthodoxMetricsAPI = new OrthodoxMetricsAPI();
export default orthodoxMetricsAPI;
