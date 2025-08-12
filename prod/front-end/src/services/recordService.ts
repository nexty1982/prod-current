/**
 * Orthodox Metrics - Record Service
 * Frontend service layer for church records CRUD operations
 */

import axios from 'axios';
import { ChurchRecord, RecordType } from '../types/church-records-advanced.types';

// API base configuration
const API_BASE = '/api/records';

// Configure axios defaults
axios.defaults.withCredentials = true;

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  records: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RecordStats {
  baptism: { total: number; recent: number };
  marriage: { total: number; recent: number };
  funeral: { total: number; recent: number };
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

interface AuditLogEntry {
  id: string;
  action: string;
  user_id: number;
  username: string;
  role: string;
  changes: any;
  created_at: string;
  ip_address?: string;
}

// Query parameters for listing records
interface ListRecordsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'draft' | 'deleted';
}

/**
 * Record Service Class
 */
class RecordService {
  /**
   * Fetch all records of a specific type
   */
  async fetchRecords(
    recordType: RecordType, 
    params: ListRecordsParams = {}
  ): Promise<PaginatedResponse<ChurchRecord>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      
      const url = `${API_BASE}/${recordType}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await axios.get<ApiResponse<PaginatedResponse<ChurchRecord>>>(url);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch records');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error(`Error fetching ${recordType} records:`, error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch ${recordType} records: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Fetch a single record by ID
   */
  async fetchRecordById(recordType: RecordType, id: string): Promise<ChurchRecord> {
    try {
      const response = await axios.get<ApiResponse<ChurchRecord>>(`${API_BASE}/${recordType}/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch record');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error(`Error fetching ${recordType} record ${id}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`${recordType} record not found`);
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch ${recordType} record: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Create a new record
   */
  async createRecord(recordType: RecordType, payload: Partial<ChurchRecord>): Promise<{ id: string; message: string }> {
    try {
      const response = await axios.post<ApiResponse<{ id: string; recordType: string; message: string }>>(
        `${API_BASE}/${recordType}`,
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create record');
      }
      
      return {
        id: response.data.data.id,
        message: response.data.data.message
      };
      
    } catch (error) {
      console.error(`Error creating ${recordType} record:`, error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to create ${recordType} record: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Update an existing record
   */
  async updateRecord(
    recordType: RecordType, 
    id: string, 
    payload: Partial<ChurchRecord>
  ): Promise<{ id: string; message: string; version: number }> {
    try {
      const response = await axios.put<ApiResponse<{ id: string; recordType: string; message: string; version: number }>>(
        `${API_BASE}/${recordType}/${id}`,
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update record');
      }
      
      return {
        id: response.data.data.id,
        message: response.data.data.message,
        version: response.data.data.version
      };
      
    } catch (error) {
      console.error(`Error updating ${recordType} record ${id}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`${recordType} record not found`);
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to update ${recordType} record: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Delete a record (soft delete)
   */
  async deleteRecord(recordType: RecordType, id: string): Promise<{ message: string }> {
    try {
      const response = await axios.delete<ApiResponse<{ id: string; recordType: string; message: string }>>(
        `${API_BASE}/${recordType}/${id}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to delete record');
      }
      
      return {
        message: response.data.data.message
      };
      
    } catch (error) {
      console.error(`Error deleting ${recordType} record ${id}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`${recordType} record not found`);
        }
        
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to delete ${recordType} record: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Validate record data
   */
  async validateRecord(recordType: RecordType, payload: Partial<ChurchRecord>): Promise<ValidationResult> {
    try {
      const response = await axios.post<ApiResponse<ValidationResult>>(
        `${API_BASE}/${recordType}/validate`,
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to validate record');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error(`Error validating ${recordType} record:`, error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to validate ${recordType} record: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Get record audit history
   */
  async getRecordHistory(recordType: RecordType, id: string): Promise<AuditLogEntry[]> {
    try {
      const response = await axios.get<ApiResponse<AuditLogEntry[]>>(
        `${API_BASE}/${recordType}/${id}/history`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch record history');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error(`Error fetching ${recordType} record ${id} history:`, error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch record history: ${message}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Get records statistics
   */
  async getRecordStats(): Promise<RecordStats> {
    try {
      const response = await axios.get<ApiResponse<RecordStats>>(`${API_BASE}/stats/summary`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch record statistics');
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('Error fetching record statistics:', error);
      
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch record statistics: ${message}`);
      }
      
      throw error;
    }
  }
}

// Create and export singleton instance
const recordService = new RecordService();

export default recordService;

// Export types for use in components
export type {
  ApiResponse,
  PaginatedResponse,
  RecordStats,
  ValidationResult,
  AuditLogEntry,
  ListRecordsParams
};
