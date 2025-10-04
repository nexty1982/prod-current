/**
 * Church Records API Service for OrthodMetrics
 * Handles church records CRUD operations and related functionality
 */

import { apiJson } from '@/shared/lib/apiClient';

// Types
export interface ChurchRecord {
  id: number;
  churchId: number;
  recordType: 'baptism' | 'marriage' | 'funeral' | 'confirmation' | 'other';
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  dateOfEvent: string;
  placeOfEvent?: string;
  parents?: {
    father?: string;
    mother?: string;
  };
  spouse?: string;
  witnesses?: string[];
  priest?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChurchRecordFilters {
  churchId?: number;
  recordType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ChurchRecordResponse {
  records: ChurchRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChurchRecordStats {
  totalRecords: number;
  recordsByType: Record<string, number>;
  recordsThisMonth: number;
  recordsThisYear: number;
  recentRecords: ChurchRecord[];
}

export interface ImportResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// Church Records API class
export class ChurchRecordsAPI {
  private baseUrl = '/api/church-records';

  /**
   * Get church records with filters
   */
  async getRecords(filters: ChurchRecordFilters = {}): Promise<ChurchRecordResponse> {
    const params = new URLSearchParams();
    
    if (filters.churchId) params.append('churchId', filters.churchId.toString());
    if (filters.recordType) params.append('recordType', filters.recordType);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;
    
    return apiJson<ChurchRecordResponse>(url);
  }

  /**
   * Get church record by ID
   */
  async getRecord(id: number): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new church record
   */
  async createRecord(record: Omit<ChurchRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
  }

  /**
   * Update church record
   */
  async updateRecord(id: number, record: Partial<ChurchRecord>): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record)
    });
  }

  /**
   * Delete church record
   */
  async deleteRecord(id: number): Promise<void> {
    return apiJson<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Search church records
   */
  async searchRecords(filters: ChurchRecordFilters = {}): Promise<ChurchRecordResponse> {
    const params = new URLSearchParams();
    
    if (filters.churchId) params.append('churchId', filters.churchId.toString());
    if (filters.recordType) params.append('recordType', filters.recordType);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/search?${queryString}` : `${this.baseUrl}/search`;
    
    return apiJson<ChurchRecordResponse>(url);
  }

  /**
   * Get church records statistics
   */
  async getStats(churchId: number): Promise<ChurchRecordStats> {
    return apiJson<ChurchRecordStats>(`${this.baseUrl}/stats/${churchId}`);
  }

  /**
   * Export church records
   */
  async exportRecords(
    churchId: number, 
    format: 'csv' | 'excel' | 'pdf' = 'csv',
    filters: ChurchRecordFilters = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    
    if (filters.recordType) params.append('recordType', filters.recordType);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/export/${churchId}?${queryString}` : `${this.baseUrl}/export/${churchId}`;
    
    return apiJson<Blob>(url);
  }

  /**
   * Import church records
   */
  async importRecords(
    churchId: number,
    file: File,
    options: {
      skipDuplicates?: boolean;
      updateExisting?: boolean;
      onProgress?: (progress: number) => void;
    } = {}
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('churchId', churchId.toString());
    formData.append('skipDuplicates', (options.skipDuplicates || false).toString());
    formData.append('updateExisting', (options.updateExisting || false).toString());

    return apiJson<ImportResult>(`${this.baseUrl}/import`, {
      method: 'POST',
      body: formData
    });
  }

  /**
   * Get record types
   */
  async getRecordTypes(): Promise<Array<{ value: string; label: string; description: string }>> {
    return apiJson(`${this.baseUrl}/types`);
  }

  /**
   * Validate record data
   */
  async validateRecord(record: Partial<ChurchRecord>): Promise<{
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
  }> {
    return apiJson(`${this.baseUrl}/validate`, {
      method: 'POST',
      body: JSON.stringify(record)
    });
  }

  /**
   * Get duplicate records
   */
  async getDuplicateRecords(churchId: number): Promise<Array<{
    records: ChurchRecord[];
    similarity: number;
  }>> {
    return apiJson(`${this.baseUrl}/duplicates/${churchId}`);
  }

  /**
   * Merge duplicate records
   */
  async mergeDuplicateRecords(recordIds: number[], keepRecordId: number): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}/merge`, {
      method: 'POST',
      body: JSON.stringify({ recordIds, keepRecordId })
    });
  }

  /**
   * Get record templates
   */
  async getRecordTemplates(): Promise<Array<{
    id: string;
    name: string;
    recordType: string;
    template: Partial<ChurchRecord>;
  }>> {
    return apiJson(`${this.baseUrl}/templates`);
  }

  /**
   * Create record from template
   */
  async createFromTemplate(templateId: string, churchId: number, data: Partial<ChurchRecord>): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}/templates/${templateId}/create`, {
      method: 'POST',
      body: JSON.stringify({ churchId, data })
    });
  }

  /**
   * Get record history
   */
  async getRecordHistory(id: number): Promise<Array<{
    id: number;
    action: string;
    changes: Record<string, any>;
    userId: number;
    userName: string;
    timestamp: string;
  }>> {
    return apiJson(`${this.baseUrl}/${id}/history`);
  }

  /**
   * Restore record from history
   */
  async restoreFromHistory(recordId: number, historyId: number): Promise<ChurchRecord> {
    return apiJson<ChurchRecord>(`${this.baseUrl}/${recordId}/restore/${historyId}`, {
      method: 'POST'
    });
  }

  /**
   * Bulk update records
   */
  async bulkUpdateRecords(recordIds: number[], updates: Partial<ChurchRecord>): Promise<{
    updated: number;
    failed: number;
    errors: Array<{ recordId: number; error: string }>;
  }> {
    return apiJson(`${this.baseUrl}/bulk-update`, {
      method: 'POST',
      body: JSON.stringify({ recordIds, updates })
    });
  }

  /**
   * Bulk delete records
   */
  async bulkDeleteRecords(recordIds: number[]): Promise<{
    deleted: number;
    failed: number;
    errors: Array<{ recordId: number; error: string }>;
  }> {
    return apiJson(`${this.baseUrl}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ recordIds })
    });
  }
}

// Export singleton instance
export const churchRecordsAPI = new ChurchRecordsAPI();
