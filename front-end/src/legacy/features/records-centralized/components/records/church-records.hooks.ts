// React hooks for Church Records Management System
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { churchRecordsApi } from '@/church-records.api';
import type {
  BaptismRecord,
  MarriageRecord,
  FuneralRecord,
  SearchFilters,
  PaginatedResponse,
  DashboardMetrics,
  LiturgicalEvent,
  OCRStatus,
  DropdownOptions,
  User,
  HealthCheckResponse,
} from '@/types/church-records.types';

// Authentication hooks
export const useAuth = () => {
  const { data, error, isLoading, mutate } = useSWR('/auth/check', 
    () => churchRecordsApi.auth.checkAuth()
  );

  const signIn = useSWRMutation('/auth/sign-in', 
    (_, { arg }: { arg: { username: string; password: string } }) => 
      churchRecordsApi.auth.signIn(arg.username, arg.password)
  );

  const signOut = useSWRMutation('/auth/sign-out', 
    () => churchRecordsApi.auth.signOut()
  );

  return {
    user: data?.user || null,
    authenticated: data?.authenticated || false,
    loading: isLoading,
    error,
    signIn,
    signOut,
    mutate,
  };
};

// Health check hook
export const useHealthCheck = () => {
  const { data, error, isLoading } = useSWR('/health', 
    () => churchRecordsApi.auth.getHealth(),
    { refreshInterval: 30000 } // Check every 30 seconds
  );

  return {
    health: data,
    loading: isLoading,
    error,
  };
};

// Baptism records hooks
export const useBaptismRecords = (filters?: SearchFilters) => {
  const key = filters ? ['/baptism-records', filters] : '/baptism-records';
  const { data, error, isLoading, mutate } = useSWR(key, 
    () => churchRecordsApi.baptism.getRecords(filters)
  );

  const createRecord = useSWRMutation('/baptism-records', 
    (_, { arg }: { arg: Omit<BaptismRecord, 'id' | 'created_at' | 'updated_at'> }) => 
      churchRecordsApi.baptism.createRecord(arg)
  );

  const updateRecord = useSWRMutation('/baptism-records', 
    (_, { arg }: { arg: { id: number; record: Partial<BaptismRecord> } }) => 
      churchRecordsApi.baptism.updateRecord(arg.id, arg.record)
  );

  const deleteRecord = useSWRMutation('/baptism-records', 
    (_, { arg }: { arg: number }) => 
      churchRecordsApi.baptism.deleteRecord(arg)
  );

  return {
    records: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    mutate,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};

export const useBaptismRecord = (id: number) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/baptism-../features/records/records/${id}` : null,
    () => churchRecordsApi.baptism.getRecord(id)
  );

  const getHistory = useSWRMutation(`/baptism-../features/records/records/${id}/history`, 
    () => churchRecordsApi.baptism.getHistory(id)
  );

  return {
    record: data,
    loading: isLoading,
    error,
    mutate,
    getHistory,
  };
};

// Marriage records hooks
export const useMarriageRecords = (filters?: SearchFilters) => {
  const key = filters ? ['/marriage-records', filters] : '/marriage-records';
  const { data, error, isLoading, mutate } = useSWR(key, 
    () => churchRecordsApi.marriage.getRecords(filters)
  );

  const createRecord = useSWRMutation('/marriage-records', 
    (_, { arg }: { arg: Omit<MarriageRecord, 'id' | 'created_at' | 'updated_at'> }) => 
      churchRecordsApi.marriage.createRecord(arg)
  );

  const updateRecord = useSWRMutation('/marriage-records', 
    (_, { arg }: { arg: { id: number; record: Partial<MarriageRecord> } }) => 
      churchRecordsApi.marriage.updateRecord(arg.id, arg.record)
  );

  const deleteRecord = useSWRMutation('/marriage-records', 
    (_, { arg }: { arg: number }) => 
      churchRecordsApi.marriage.deleteRecord(arg)
  );

  return {
    records: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    mutate,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};

export const useMarriageRecord = (id: number) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/marriage-../features/records/records/${id}` : null,
    () => churchRecordsApi.marriage.getRecord(id)
  );

  return {
    record: data,
    loading: isLoading,
    error,
    mutate,
  };
};

// Funeral records hooks
export const useFuneralRecords = (filters?: SearchFilters) => {
  const key = filters ? ['/funeral-records', filters] : '/funeral-records';
  const { data, error, isLoading, mutate } = useSWR(key, 
    () => churchRecordsApi.funeral.getRecords(filters)
  );

  const createRecord = useSWRMutation('/funeral-records', 
    (_, { arg }: { arg: Omit<FuneralRecord, 'id' | 'created_at' | 'updated_at'> }) => 
      churchRecordsApi.funeral.createRecord(arg)
  );

  const updateRecord = useSWRMutation('/funeral-records', 
    (_, { arg }: { arg: { id: number; record: Partial<FuneralRecord> } }) => 
      churchRecordsApi.funeral.updateRecord(arg.id, arg.record)
  );

  const deleteRecord = useSWRMutation('/funeral-records', 
    (_, { arg }: { arg: number }) => 
      churchRecordsApi.funeral.deleteRecord(arg)
  );

  return {
    records: data?.data || [],
    pagination: data?.pagination,
    loading: isLoading,
    error,
    mutate,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};

export const useFuneralRecord = (id: number) => {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/funeral-../features/records/records/${id}` : null,
    () => churchRecordsApi.funeral.getRecord(id)
  );

  return {
    record: data,
    loading: isLoading,
    error,
    mutate,
  };
};

// OCR hooks
export const useOCRHistory = () => {
  const { data, error, isLoading, mutate } = useSWR('/ocr/history', 
    () => churchRecordsApi.ocr.getHistory()
  );

  const uploadFile = useSWRMutation('/ocr/upload', 
    (_, { arg }: { arg: { file: File; language: string; onProgress?: (progress: any) => void } }) => 
      churchRecordsApi.ocr.uploadFile(arg.file, arg.language, arg.onProgress)
  );

  const deleteFile = useSWRMutation('/ocr/files', 
    (_, { arg }: { arg: string }) => 
      churchRecordsApi.ocr.deleteFile(arg)
  );

  return {
    history: data || [],
    loading: isLoading,
    error,
    mutate,
    uploadFile,
    deleteFile,
  };
};

export const useOCRStatus = (id: string) => {
  const { data, error, isLoading } = useSWR(
    id ? `/ocr/status/${id}` : null,
    () => churchRecordsApi.ocr.getStatus(id),
    { refreshInterval: 1000 } // Poll every second for status updates
  );

  return {
    status: data,
    loading: isLoading,
    error,
  };
};

// Liturgical calendar hooks
export const useLiturgicalCalendar = (year: number, month?: number, language?: string) => {
  const { data, error, isLoading, mutate } = useSWR(
    `/calendar/events?year=${year}${month ? `&month=${month}` : ''}${language ? `&language=${language}` : ''}`,
    () => churchRecordsApi.calendar.getEvents(year, month, language)
  );

  const createEvent = useSWRMutation('/calendar/events', 
    (_, { arg }: { arg: Omit<LiturgicalEvent, 'id'> }) => 
      churchRecordsApi.calendar.createEvent(arg)
  );

  const updateEvent = useSWRMutation('/calendar/events', 
    (_, { arg }: { arg: { id: number; event: Partial<LiturgicalEvent> } }) => 
      churchRecordsApi.calendar.updateEvent(arg.id, arg.event)
  );

  const deleteEvent = useSWRMutation('/calendar/events', 
    (_, { arg }: { arg: number }) => 
      churchRecordsApi.calendar.deleteEvent(arg)
  );

  return {
    events: data || [],
    loading: isLoading,
    error,
    mutate,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};

// Dashboard hooks
export const useDashboardMetrics = () => {
  const { data, error, isLoading } = useSWR('/dashboard/metrics', 
    () => churchRecordsApi.dashboard.getMetrics(),
    { refreshInterval: 60000 } // Refresh every minute
  );

  return {
    metrics: data,
    loading: isLoading,
    error,
  };
};

export const useDashboardActivity = (limit?: number) => {
  const { data, error, isLoading } = useSWR(
    `/dashboard/activity${limit ? `?limit=${limit}` : ''}`,
    () => churchRecordsApi.dashboard.getActivity(limit)
  );

  return {
    activity: data || [],
    loading: isLoading,
    error,
  };
};

// Utility hooks
export const useDropdownOptions = () => {
  const { data, error, isLoading } = useSWR('/dropdown-options', 
    () => churchRecordsApi.utils.getDropdownOptions()
  );

  return {
    options: data || { locations: [], clergy: [], languages: [] },
    loading: isLoading,
    error,
  };
};

// Certificate generation hooks
export const useCertificateGeneration = () => {
  const generateBaptismCertificate = useSWRMutation('/certificate/baptism', 
    (_, { arg }: { arg: any }) => 
      churchRecordsApi.certificates.generateBaptismCertificate(arg)
  );

  const generateMarriageCertificate = useSWRMutation('/certificate/marriage', 
    (_, { arg }: { arg: any }) => 
      churchRecordsApi.certificates.generateMarriageCertificate(arg)
  );

  const previewCertificate = useSWRMutation('/certificate/preview', 
    (_, { arg }: { arg: { recordId: number; type: string } }) => 
      churchRecordsApi.certificates.previewCertificate(arg.recordId, arg.type)
  );

  return {
    generateBaptismCertificate,
    generateMarriageCertificate,
    previewCertificate,
  };
};

// Custom hook for handling file uploads with progress
export const useFileUpload = () => {
  const uploadBaptismRecords = useSWRMutation('/baptism-../features/records/records/import', 
    (_, { arg }: { arg: { file: File; onProgress?: (progress: any) => void } }) => 
      churchRecordsApi.baptism.importRecords(arg.file, arg.onProgress)
  );

  const uploadMarriageRecords = useSWRMutation('/marriage-../features/records/records/import', 
    (_, { arg }: { arg: { file: File; onProgress?: (progress: any) => void } }) => 
      churchRecordsApi.marriage.importRecords(arg.file, arg.onProgress)
  );

  const uploadFuneralRecords = useSWRMutation('/funeral-../features/records/records/import', 
    (_, { arg }: { arg: { file: File; onProgress?: (progress: any) => void } }) => 
      churchRecordsApi.funeral.importRecords(arg.file, arg.onProgress)
  );

  return {
    uploadBaptismRecords,
    uploadMarriageRecords,
    uploadFuneralRecords,
  };
};
