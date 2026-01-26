// Church Records Management System API Types

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'priest' | 'volunteer' | 'supervisor';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

export interface BaptismRecord {
  id: number;
  child_name: string;
  child_birth_date: string;
  baptism_date: string;
  father_name: string;
  mother_name: string;
  godfather_name: string;
  godmother_name: string;
  priest_name: string;
  location: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MarriageRecord {
  id: number;
  groom_name: string;
  bride_name: string;
  marriage_date: string;
  groom_birth_date: string;
  bride_birth_date: string;
  groom_father_name: string;
  groom_mother_name: string;
  bride_father_name: string;
  bride_mother_name: string;
  witness1_name: string;
  witness2_name: string;
  priest_name: string;
  location: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FuneralRecord {
  id: number;
  deceased_name: string;
  death_date: string;
  funeral_date: string;
  birth_date: string;
  father_name: string;
  mother_name: string;
  spouse_name?: string;
  priest_name: string;
  location: string;
  cause_of_death?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OCRUploadResponse {
  success: boolean;
  message: string;
  processedText?: string;
  confidence?: number;
  language?: string;
  fileId?: string;
}

export interface OCRStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  filename: string;
  language: string;
  error?: string;
  result?: string;
  confidence?: number;
}

export interface LiturgicalEvent {
  id: number;
  date: string;
  title: string;
  description: string;
  type: 'feast' | 'saint' | 'fast' | 'memorial';
  language: string;
  importance: 'high' | 'medium' | 'low';
}

export interface DashboardMetrics {
  totalRecords: {
    baptisms: number;
    marriages: number;
    funerals: number;
  };
  recentActivity: {
    date: string;
    type: string;
    description: string;
    user: string;
  }[];
  ocrStats: {
    processed: number;
    pending: number;
    failed: number;
  };
  userActivity: {
    activeUsers: number;
    totalSessions: number;
  };
}

export interface CertificateGenerationRequest {
  recordId: number;
  type: 'baptism' | 'marriage' | 'funeral';
  language: string;
  template?: string;
}

export interface CertificateResponse {
  success: boolean;
  message: string;
  pdfUrl?: string;
  certificateId?: string;
}

export interface DropdownOptions {
  locations: string[];
  clergy: string[];
  languages: string[];
}

export interface SearchFilters {
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  priest?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  user: User | null;
  database: {
    success: boolean;
    message: string;
  };
}
