#!/bin/bash

echo "🚨 FIXING BLANK PAGE ISSUE"
echo "=========================="
echo ""

# Check if running in correct directory
if [ ! -f "config/db.js" ]; then
    echo "❌ Please run this script from the server directory:"
    echo "   cd server"
    echo "   ./debug/fix-blank-page.sh"
    exit 1
fi

echo "🔧 STEP 1: REVERT PROBLEMATIC CHANGES"
echo "====================================="

# Revert the API client changes that might be causing issues
cat > ../front-end/src/api/orthodox-metrics.api.ts << 'EOF'
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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '' : '');
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
      this.request(`/admin/churches${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<Church> =>
      this.request<{ success: boolean; church: Church }>(`/admin/churches/${id}`)
        .then(response => response.church),

    create: (church: CreateChurchData): Promise<Church> =>
      this.request('/admin/churches', {
        method: 'POST',
        body: JSON.stringify(church),
      }),

    update: (id: number, church: Partial<Church>): Promise<Church> =>
      this.request(`/admin/churches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(church),
      }),

    delete: (id: number, deleteDatabase?: boolean): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}`, { 
        method: 'DELETE',
        body: JSON.stringify({ delete_database: deleteDatabase || false }),
      }),

    approve: (id: number, notes?: string): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),

    suspend: (id: number, reason?: string): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    activate: (id: number): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}/activate`, { method: 'POST' }),

    updateStatus: (id: number, active: boolean): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      }),

    removeAllUsers: (id: number): Promise<ApiResponse> =>
      this.request(`/admin/churches/${id}/remove-all-users`, { method: 'POST' }),
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
  };

  // ===== RECORDS MANAGEMENT APIs =====
  records = {
    // Baptism Records
    getBaptismRecords: (filters?: any): Promise<PaginatedResponse<BaptismRecord>> =>
      this.request(`/records/baptism${this.buildQueryString(filters)}`),

    getBaptismRecord: (id: number): Promise<BaptismRecord> =>
      this.request(`/records/baptism/${id}`),

    createBaptismRecord: (record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
      this.request('/records/baptism', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateBaptismRecord: (id: number, record: Partial<BaptismRecord>): Promise<BaptismRecord> =>
      this.request(`/records/baptism/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteBaptismRecord: (id: number): Promise<ApiResponse> =>
      this.request(`/records/baptism/${id}`, { method: 'DELETE' }),

    // Marriage Records
    getMarriageRecords: (filters?: any): Promise<PaginatedResponse<MarriageRecord>> =>
      this.request(`/records/marriage${this.buildQueryString(filters)}`),

    getMarriageRecord: (id: number): Promise<MarriageRecord> =>
      this.request(`/records/marriage/${id}`),

    createMarriageRecord: (record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
      this.request('/records/marriage', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateMarriageRecord: (id: number, record: Partial<MarriageRecord>): Promise<MarriageRecord> =>
      this.request(`/records/marriage/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteMarriageRecord: (id: number): Promise<ApiResponse> =>
      this.request(`/records/marriage/${id}`, { method: 'DELETE' }),

    // Funeral Records
    getFuneralRecords: (filters?: any): Promise<PaginatedResponse<FuneralRecord>> =>
      this.request(`/records/funeral${this.buildQueryString(filters)}`),

    getFuneralRecord: (id: number): Promise<FuneralRecord> =>
      this.request(`/records/funeral/${id}`),

    createFuneralRecord: (record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
      this.request('/records/funeral', {
        method: 'POST',
        body: JSON.stringify(record),
      }),

    updateFuneralRecord: (id: number, record: Partial<FuneralRecord>): Promise<FuneralRecord> =>
      this.request(`/records/funeral/${id}`, {
        method: 'PUT',
        body: JSON.stringify(record),
      }),

    deleteFuneralRecord: (id: number): Promise<ApiResponse> =>
      this.request(`/records/funeral/${id}`, { method: 'DELETE' }),
  };

  // ===== INVOICE MANAGEMENT APIs =====
  invoices = {
    getAll: (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> =>
      this.request(`/invoices${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<Invoice> =>
      this.request(`/invoices/${id}`),

    create: (invoice: CreateInvoiceData): Promise<Invoice> =>
      this.request('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      }),

    update: (id: number, invoice: Partial<Invoice>): Promise<Invoice> =>
      this.request(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(invoice),
      }),

    delete: (id: number): Promise<ApiResponse> =>
      this.request(`/invoices/${id}`, { method: 'DELETE' }),

    generatePDF: (id: number, language?: SupportedLanguage): Promise<{ url: string }> =>
      this.request(`/invoices/${id}/pdf?lang=${language || 'en'}`, { method: 'POST' }),

    sendEmail: (id: number, emailData: { to: string; subject?: string; message?: string }): Promise<ApiResponse> =>
      this.request(`/invoices/${id}/send-email`, {
        method: 'POST',
        body: JSON.stringify(emailData),
      }),

    getTemplates: (): Promise<{ templates: any[] }> =>
      this.request('/invoices/templates'),

    createTemplate: (template: any): Promise<any> =>
      this.request('/invoices/templates', {
        method: 'POST',
        body: JSON.stringify(template),
      }),

    updateTemplate: (id: number, template: any): Promise<any> =>
      this.request(`/invoices/templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(template),
      }),

    deleteTemplate: (id: number): Promise<ApiResponse> =>
      this.request(`/invoices/templates/${id}`, { method: 'DELETE' }),
  };

  // ===== OCR APIs =====
  ocr = {
    upload: (file: File, onProgress?: (progress: FileUploadProgress) => void): Promise<OCRResult> =>
      this.uploadFile('/ocr/upload', file, {}, onProgress),

    process: (uploadId: string, options?: any): Promise<OCRResult> =>
      this.request(`/ocr/process/${uploadId}`, {
        method: 'POST',
        body: JSON.stringify(options || {}),
      }),

    getResults: (filters?: OCRFilters): Promise<PaginatedResponse<OCRResult>> =>
      this.request(`/ocr/results${this.buildQueryString(filters)}`),

    getResult: (id: number): Promise<OCRResult> =>
      this.request(`/ocr/results/${id}`),

    deleteResult: (id: number): Promise<ApiResponse> =>
      this.request(`/ocr/results/${id}`, { method: 'DELETE' }),

    retry: (id: number): Promise<OCRResult> =>
      this.request(`/ocr/results/${id}/retry`, { method: 'POST' }),
  };

  // ===== PROVISIONING APIs =====
  provisioning = {
    requestProvision: (request: ProvisionRequest): Promise<ProvisionRequest> =>
      this.request('/provision/request', {
        method: 'POST',
        body: JSON.stringify(request),
      }),

    getRequests: (filters?: ProvisionFilters): Promise<PaginatedResponse<ProvisionRequest>> =>
      this.request(`/provision/requests${this.buildQueryString(filters)}`),

    getRequest: (id: number): Promise<ProvisionRequest> =>
      this.request(`/provision/requests/${id}`),

    approveRequest: (id: number, notes?: string): Promise<ApiResponse> =>
      this.request(`/provision/requests/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),

    rejectRequest: (id: number, reason: string): Promise<ApiResponse> =>
      this.request(`/provision/requests/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    getLogs: (filters?: ProvisionFilters): Promise<PaginatedResponse<ProvisionLog>> =>
      this.request(`/provision/logs${this.buildQueryString(filters)}`),
  };

  // ===== DASHBOARD APIs =====
  dashboard = {
    getMetrics: (): Promise<DashboardMetrics> =>
      this.request('/dashboard/metrics'),

    getActivityLogs: (filters?: any): Promise<PaginatedResponse<ActivityLog>> =>
      this.request(`/dashboard/activity-logs${this.buildQueryString(filters)}`),
  };

  // ===== UTILITY APIs =====
  utils = {
    getDropdownOptions: (type: string): Promise<DropdownOptions> =>
      this.request(`/utils/dropdown-options/${type}`),

    getAppConfig: (): Promise<AppConfig> =>
      this.request('/utils/app-config'),

    exportData: (type: string, filters?: any, options?: ExportOptions): Promise<{ url: string }> =>
      this.request(`/utils/export/${type}`, {
        method: 'POST',
        body: JSON.stringify({ filters, options }),
      }),
  };

  // ===== CERTIFICATE APIs =====
  certificates = {
    generateBaptismCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      this.request(`/certificates/baptism/${recordId}`, {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId }),
      }),

    generateMarriageCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      this.request(`/certificates/marriage/${recordId}`, {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId }),
      }),

    generateFuneralCertificate: (recordId: number, templateId?: number): Promise<{ url: string }> =>
      this.request(`/certificates/funeral/${recordId}`, {
        method: 'POST',
        body: JSON.stringify({ template_id: templateId }),
      }),
  };

  // ===== SESSION MANAGEMENT APIs =====
  sessions = {
    getCurrentSession: (): Promise<any> =>
      this.request('/sessions/current'),

    getAllSessions: (): Promise<any[]> =>
      this.request('/sessions'),

    revokeSession: (sessionId: string): Promise<ApiResponse> =>
      this.request(`/sessions/${sessionId}`, { method: 'DELETE' }),

    revokeAllSessions: (): Promise<ApiResponse> =>
      this.request('/sessions', { method: 'DELETE' }),
  };

  // ===== USER MANAGEMENT APIs =====
  users = {
    getAll: (filters?: any): Promise<PaginatedResponse<User>> =>
      this.request(`/admin/users${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<User> =>
      this.request(`/admin/users/${id}`),

    create: (user: Partial<User>): Promise<User> =>
      this.request('/admin/users', {
        method: 'POST',
        body: JSON.stringify(user),
      }),

    update: (id: number, user: Partial<User>): Promise<User> =>
      this.request(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(user),
      }),

    delete: (id: number): Promise<ApiResponse> =>
      this.request(`/admin/users/${id}`, { method: 'DELETE' }),

    toggleStatus: (id: number): Promise<ApiResponse> =>
      this.request(`/admin/users/${id}/toggle-status`, { method: 'PUT' }),
  };

  // ===== ACTIVITY LOGS APIs =====
  activityLogs = {
    getAll: (filters?: any): Promise<PaginatedResponse<ActivityLog>> =>
      this.request(`/admin/activity-logs${this.buildQueryString(filters)}`),

    getById: (id: number): Promise<ActivityLog> =>
      this.request(`/admin/activity-logs/${id}`),

    getStats: (): Promise<any> =>
      this.request('/admin/activity-logs/stats'),
  };

  // ===== EMAIL APIs =====
  email = {
    sendTestEmail: (emailData: { to: string; subject: string; message: string }): Promise<ApiResponse> =>
      this.request('/email/test', {
        method: 'POST',
        body: JSON.stringify(emailData),
      }),

    sendBulkEmail: (emailData: { recipients: string[]; subject: string; message: string }): Promise<ApiResponse> =>
      this.request('/email/bulk', {
        method: 'POST',
        body: JSON.stringify(emailData),
      }),
  };
}

// Create and export the API instance
export const orthodoxMetricsAPI = new OrthodoxMetricsAPI();

export default orthodoxMetricsAPI;
EOF

echo "✅ Reverted API client to stable version"

echo ""
echo "🔧 STEP 2: SIMPLIFY AUTH CONTEXT"
echo "================================"

# Create a simplified AuthContext
cat > ../front-end/src/context/AuthContext.tsx << 'EOF'
/**
 * OrthodoxMetrics Authentication Context & Provider
 * Session-based authentication with role-based access control
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AuthService from '../services/authService';
import type { User, UserRole } from '../types/orthodox-metrics.types';

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  canManageChurches: () => boolean;
  canViewDashboard: () => boolean;
  canManageProvisioning: () => boolean;
  canAccessOCR: () => boolean;
  canManageInvoices: () => boolean;
  canViewCalendar: () => boolean;
  isSuperAdmin: () => boolean;
  canCreateAdmins: () => boolean;
  canManageAllUsers: () => boolean;
  canManageChurchesFullAccess: () => boolean;
  isRootSuperAdmin: () => boolean;
  canManageUser: (targetUser: User) => boolean;
  canPerformDestructiveOperation: (targetUser: User) => boolean;
  canChangeRole: (targetUser: User, newRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from localStorage ONLY
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = AuthService.getStoredUser();

        if (storedUser) {
          console.log('🔍 AuthContext: Found stored user data:', storedUser.email);
          setUser(storedUser);
        } else {
          console.log('🔍 AuthContext: No stored user data found');
        }
      } catch (err) {
        console.error('❌ AuthContext: Error initializing auth:', err);
        setUser(null);
        localStorage.removeItem('auth_user');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await AuthService.login({
        username: username,
        password,
        remember_me: rememberMe,
      });

      if (response.user) {
        console.log('🔑 AuthContext: Setting user data after successful login');
        setUser(response.user);
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      try {
        await AuthService.logout();
      } catch (err) {
        console.warn('Logout API call failed:', err);
      }

      setUser(null);
      setError(null);

    } catch (err) {
      console.error('Error during logout:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const authCheck = await AuthService.checkAuth();

      if (authCheck.authenticated && authCheck.user) {
        setUser(authCheck.user);
        localStorage.setItem('auth_user', JSON.stringify(authCheck.user));
      } else {
        await logout();
      }
    } catch (err) {
      console.error('Error refreshing auth:', err);
      await logout();
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Role and permission checking functions
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;

    if (Array.isArray(role)) {
      return role.includes(user.role);
    }

    return user.role === role;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions: Record<UserRole, string[]> = {
      super_admin: ['*'],
      admin: ['*'],
      manager: [
        'manage_records',
        'view_dashboard',
        'manage_calendar',
        'generate_certificates',
        'access_ocr',
        'view_invoices',
        'manage_invoices',
        'manage_church_data',
      ],
      user: [
        'manage_records',
        'view_dashboard',
        'view_calendar',
        'manage_calendar',
        'access_ocr',
        'view_invoices',
        'manage_church_data',
      ],
      viewer: [
        'view_dashboard',
        'view_invoices',
      ],
    };

    const userPermissions = rolePermissions[user.role] || [];

    if (userPermissions.includes('*')) {
      return true;
    }

    return userPermissions.includes(permission);
  };

  const canManageChurches = (): boolean => {
    return hasRole(['admin', 'super_admin', 'manager']) || hasPermission('manage_churches');
  };

  const canViewDashboard = (): boolean => {
    return hasPermission('view_dashboard');
  };

  const canManageProvisioning = (): boolean => {
    return hasRole(['admin', 'super_admin']);
  };

  const canAccessOCR = (): boolean => {
    return hasPermission('access_ocr');
  };

  const canManageInvoices = (): boolean => {
    return hasRole(['admin', 'super_admin', 'manager']);
  };

  const canViewCalendar = (): boolean => {
    return hasPermission('view_calendar');
  };

  const isSuperAdmin = (): boolean => {
    return hasRole('super_admin');
  };

  const canCreateAdmins = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageAllUsers = (): boolean => {
    return hasRole('super_admin');
  };

  const canManageChurchesFullAccess = (): boolean => {
    return hasRole('super_admin');
  };

  const ROOT_SUPERADMIN_EMAIL = 'superadmin@orthodoxmetrics.com';

  const isRootSuperAdmin = (): boolean => {
    return user?.email === ROOT_SUPERADMIN_EMAIL;
  };

  const canManageUser = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (isManagingSelf) return true;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

    if (user.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
      return true;
    }

    return false;
  };

  const canPerformDestructiveOperation = (targetUser: User): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isManagingSelf = user.id === targetUser.id;
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (isManagingSelf) return false;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    if (user.role === 'super_admin' && targetUser.role !== 'super_admin') {
      return true;
    }

    if (user.role === 'admin' && !['admin', 'super_admin'].includes(targetUser.role)) {
      return true;
    }

    return false;
  };

  const canChangeRole = (targetUser: User, newRole: UserRole): boolean => {
    if (!user || !targetUser) return false;

    const isRoot = isRootSuperAdmin();
    const isTargetRoot = targetUser.email === ROOT_SUPERADMIN_EMAIL;

    if (isRoot) return true;
    if (isTargetRoot) return false;
    if (newRole === 'super_admin' && !isRoot) return false;

    if (user.role === 'super_admin' && targetUser.role === 'super_admin') {
      return false;
    }

    return canManageUser(targetUser);
  };

  const contextValue: AuthContextType = {
    user,
    authenticated: !!user,
    loading,
    error,
    login,
    logout,
    refreshAuth,
    clearError,
    hasRole,
    hasPermission,
    canManageChurches,
    canViewDashboard,
    canManageProvisioning,
    canAccessOCR,
    canManageInvoices,
    canViewCalendar,
    isSuperAdmin,
    canCreateAdmins,
    canManageAllUsers,
    canManageChurchesFullAccess,
    isRootSuperAdmin,
    canManageUser,
    canPerformDestructiveOperation,
    canChangeRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
EOF

echo "✅ Simplified AuthContext to basic functionality"

echo ""
echo "🔧 STEP 3: REBUILD FRONTEND"
echo "==========================="

# Navigate to frontend directory
cd ../front-end

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building frontend..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Frontend build failed"
    exit 1
fi

echo ""
echo "🔧 STEP 4: TEST SERVER RESPONSE"
echo "==============================="

# Go back to server directory
cd ../server

# Test server health
echo "📡 Testing server health..."
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" http://127.0.0.1:3001/api/health)
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -1)

echo "   Health Status: $HEALTH_STATUS"
echo "   Health Response: $HEALTH_BODY"

echo ""
echo "🎯 TESTING INSTRUCTIONS:"
echo "========================"
echo "1. Clear your browser cache completely"
echo "2. Visit https://orthodoxmetrics.com"
echo "3. The page should load properly now"
echo "4. Check browser console for any remaining errors"
echo ""
echo "🔍 IF STILL BLANK:"
echo "=================="
echo "1. Open browser dev tools (F12)"
echo "2. Check Console tab for JavaScript errors"
echo "3. Check Network tab for failed requests"
echo "4. Share any error messages you see"
echo ""
echo "🏁 BLANK PAGE FIX COMPLETE!" 