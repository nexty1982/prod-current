/**
 * Tests for RecordsApiService
 */

import { RecordsApiService, createRecordsApiService } from '@/api/RecordsApiService';

// Mock the apiJson function
jest.mock('../../../../sandbox/field-mapper/api/client', () => ({
  apiJson: jest.fn(),
  FieldMapperApiError: class extends Error {
    constructor(public apiError: any) {
      super(apiError.message);
      this.name = 'FieldMapperApiError';
    }
  }
}));

import { apiJson } from '@/../sandbox/field-mapper/api/client';

const mockApiJson = apiJson as jest.MockedFunction<typeof apiJson>;

describe('RecordsApiService', () => {
  let apiService: RecordsApiService;
  const mockChurchId = 'test-church-123';

  beforeEach(() => {
    apiService = createRecordsApiService(mockChurchId);
    jest.clearAllMocks();
  });

  describe('getRecords', () => {
    it('should fetch records with default parameters', async () => {
      const mockRecords = {
        data: [{ id: '1', name: 'Test Record' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockApiJson.mockResolvedValueOnce(mockRecords);

      const result = await apiService.getRecords('baptisms');

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms?`
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecords);
    });

    it('should fetch records with filters and pagination', async () => {
      const mockRecords = {
        data: [{ id: '1', name: 'Test Record' }],
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1
      };

      mockApiJson.mockResolvedValueOnce(mockRecords);

      const filters = { status: 'active', search: 'test' };
      const sort = { field: 'name', direction: 'asc' as const };
      const pagination = { page: 2, limit: 5 };

      const result = await apiService.getRecords('baptisms', filters, sort, pagination);

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms?status=active&search=test&sortBy=name&sortOrder=asc&page=2&limit=5`
      );
      expect(result.success).toBe(true);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockApiJson.mockRejectedValueOnce(mockError);

      const result = await apiService.getRecords('baptisms');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });
  });

  describe('createRecord', () => {
    it('should create a new record', async () => {
      const mockRecord = { id: '1', name: 'New Record' };
      const recordData = { name: 'New Record' };

      mockApiJson.mockResolvedValueOnce(mockRecord);

      const result = await apiService.createRecord('baptisms', recordData);

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms`,
        {
          method: 'POST',
          body: JSON.stringify(recordData)
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
    });
  });

  describe('updateRecord', () => {
    it('should update an existing record', async () => {
      const mockRecord = { id: '1', name: 'Updated Record' };
      const recordData = { name: 'Updated Record' };

      mockApiJson.mockResolvedValueOnce(mockRecord);

      const result = await apiService.updateRecord('baptisms', '1', recordData);

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms/1`,
        {
          method: 'PUT',
          body: JSON.stringify(recordData)
        }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecord);
    });
  });

  describe('deleteRecord', () => {
    it('should delete a record', async () => {
      mockApiJson.mockResolvedValueOnce(undefined);

      const result = await apiService.deleteRecord('baptisms', '1');

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms/1`,
        { method: 'DELETE' }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('searchRecords', () => {
    it('should search records with term and filters', async () => {
      const mockResults = {
        data: [{ id: '1', name: 'Search Result' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockApiJson.mockResolvedValueOnce(mockResults);

      const result = await apiService.searchRecords('baptisms', 'test search', { status: 'active' });

      expect(mockApiJson).toHaveBeenCalledWith(
        `/api/churches/${mockChurchId}/records/baptisms/search?q=test%20search&status=active`
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResults);
    });
  });

  describe('importRecords', () => {
    it('should import records from file', async () => {
      const mockResult = { imported: 5, errors: [] };
      const mockFile = new File(['test'], 'test.csv', { type: 'text/csv' });

      mockApiJson.mockResolvedValueOnce(mockResult);

      const result = await apiService.importRecords('baptisms', mockFile);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('exportRecords', () => {
    it('should export records as CSV', async () => {
      const mockBlob = new Blob(['test,data'], { type: 'text/csv' });
      
      // Mock fetch for file download
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      });

      const result = await apiService.exportRecords('baptisms', 'csv');

      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Blob);
    });
  });

  describe('getKnownFields', () => {
    it('should fetch known fields for record type', async () => {
      const mockFields = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'date', label: 'Date', type: 'date' }
      ];

      mockApiJson.mockResolvedValueOnce(mockFields);

      const result = await apiService.getKnownFields('baptisms');

      expect(mockApiJson).toHaveBeenCalledWith('/api/records/baptisms/known-fields');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFields);
    });
  });

  describe('healthCheck', () => {
    it('should perform health check', async () => {
      const mockHealth = { status: 'ok', timestamp: '2023-01-01T00:00:00Z' };

      mockApiJson.mockResolvedValueOnce(mockHealth);

      const result = await apiService.healthCheck();

      expect(mockApiJson).toHaveBeenCalledWith('/api/health');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHealth);
    });
  });
});
