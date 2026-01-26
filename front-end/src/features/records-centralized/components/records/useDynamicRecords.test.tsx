/**
 * Tests for useDynamicRecords hooks
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useRecordTables,
  useTableSchema,
  useDynamicRecords,
  useTableColumns,
  useFormFields,
  useSearchFilters 
} from '@/hooks/useDynamicRecords';

// Mock the API service
jest.mock('../api/DynamicRecordsApiService', () => ({
  createDynamicRecordsApiService: jest.fn(() => ({
    discoverRecordTables: jest.fn(),
    getTableSchema: jest.fn(),
    getRecords: jest.fn(),
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    deleteRecord: jest.fn(),
  })),
}));

import { createDynamicRecordsApiService } from '@/api/DynamicRecordsApiService';

const mockCreateDynamicRecordsApiService = createDynamicRecordsApiService as jest.MockedFunction<typeof createDynamicRecordsApiService>;

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDynamicRecords hooks', () => {
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      discoverRecordTables: jest.fn(),
      getTableSchema: jest.fn(),
      getRecords: jest.fn(),
      createRecord: jest.fn(),
      updateRecord: jest.fn(),
      deleteRecord: jest.fn(),
    };
    
    mockCreateDynamicRecordsApiService.mockReturnValue(mockApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useRecordTables', () => {
    it('should fetch record tables successfully', async () => {
      const mockTables = [
        {
          tableName: 'om_church_01_baptism_records',
          displayName: 'Baptism Records',
          recordType: 'baptism',
          primaryKey: 'id',
          columns: []
        }
      ];

      mockApiService.discoverRecordTables.mockResolvedValue({
        success: true,
        data: mockTables,
        message: 'Tables discovered successfully'
      });

      const { result } = renderHook(() => useRecordTables('church-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tables).toEqual(mockTables);
      expect(result.current.success).toBe(true);
      expect(mockApiService.discoverRecordTables).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockApiService.discoverRecordTables.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRecordTables('church-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.success).toBe(false);
    });
  });

  describe('useTableSchema', () => {
    it('should fetch table schema successfully', async () => {
      const mockSchema = {
        tableName: 'om_church_01_baptism_records',
        displayName: 'Baptism Records',
        recordType: 'baptism',
        primaryKey: 'id',
        columns: [
          {
            position: 0,
            name: 'id',
            type: 'number',
            nullable: false,
            isPrimaryKey: true,
            displayName: 'ID'
          },
          {
            position: 1,
            name: 'first_name',
            type: 'text',
            nullable: false,
            displayName: 'First Name'
          }
        ]
      };

      mockApiService.getTableSchema.mockResolvedValue({
        success: true,
        data: mockSchema,
        message: 'Schema retrieved successfully'
      });

      const { result } = renderHook(() => useTableSchema('church-123', 'baptism_records'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.schema).toEqual(mockSchema);
      expect(result.current.success).toBe(true);
      expect(mockApiService.getTableSchema).toHaveBeenCalledWith('baptism_records');
    });
  });

  describe('useDynamicRecords', () => {
    it('should fetch records successfully', async () => {
      const mockRecords = {
        data: [
          {
            id: '1',
            first_name: 'John',
            last_name: 'Doe',
            _columnPositions: { 0: '1', 1: 'John', 2: 'Doe' },
            _displayData: { 0: '1', 1: 'John', 2: 'Doe' }
          }
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      mockApiService.getRecords.mockResolvedValue({
        success: true,
        data: mockRecords,
        message: 'Records retrieved successfully'
      });

      const { result } = renderHook(() => useDynamicRecords('church-123', 'baptism_records'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.records).toEqual(mockRecords.data);
      expect(result.current.total).toBe(1);
      expect(result.current.success).toBe(true);
    });

    it('should handle filters and pagination', async () => {
      const filters = { status: 'active' };
      const pagination = { page: 2, limit: 5 };

      mockApiService.getRecords.mockResolvedValue({
        success: true,
        data: { data: [], total: 0, page: 2, limit: 5, totalPages: 0 },
        message: 'Records retrieved successfully'
      });

      const { result } = renderHook(() => 
        useDynamicRecords('church-123', 'baptism_records', {
          filters,
          pagination
        }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockApiService.getRecords).toHaveBeenCalledWith(
        'baptism_records',
        filters,
        undefined,
        pagination
      );
    });
  });

  describe('useTableColumns', () => {
    it('should generate columns from schema', async () => {
      const mockSchema = {
        tableName: 'om_church_01_baptism_records',
        displayName: 'Baptism Records',
        recordType: 'baptism',
        primaryKey: 'id',
        columns: [
          {
            position: 0,
            name: 'id',
            type: 'number',
            nullable: false,
            isPrimaryKey: true,
            displayName: 'ID'
          },
          {
            position: 1,
            name: 'first_name',
            type: 'text',
            nullable: false,
            displayName: 'First Name',
            width: 150,
            sortable: true
          },
          {
            position: 2,
            name: 'last_name',
            type: 'text',
            nullable: false,
            displayName: 'Last Name',
            width: 150,
            sortable: true
          }
        ]
      };

      mockApiService.getTableSchema.mockResolvedValue({
        success: true,
        data: mockSchema,
        message: 'Schema retrieved successfully'
      });

      const { result } = renderHook(() => useTableColumns('church-123', 'baptism_records'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.columns).toHaveLength(2); // Excludes primary key
      expect(result.current.columns[0]).toMatchObject({
        key: 'col_1',
        label: 'First Name',
        position: 1,
        type: 'text',
        width: 150,
        sortable: true
      });
    });
  });

  describe('useFormFields', () => {
    it('should generate form fields from schema', async () => {
      const mockSchema = {
        tableName: 'om_church_01_baptism_records',
        displayName: 'Baptism Records',
        recordType: 'baptism',
        primaryKey: 'id',
        columns: [
          {
            position: 0,
            name: 'id',
            type: 'number',
            nullable: false,
            isPrimaryKey: true,
            displayName: 'ID'
          },
          {
            position: 1,
            name: 'first_name',
            type: 'text',
            nullable: false,
            displayName: 'First Name'
          },
          {
            position: 2,
            name: 'birth_date',
            type: 'date',
            nullable: true,
            displayName: 'Birth Date'
          }
        ]
      };

      mockApiService.getTableSchema.mockResolvedValue({
        success: true,
        data: mockSchema,
        message: 'Schema retrieved successfully'
      });

      const { result } = renderHook(() => useFormFields('church-123', 'baptism_records'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.fields).toHaveLength(2); // Excludes primary key
      expect(result.current.fields[0]).toMatchObject({
        key: 'first_name',
        label: 'First Name',
        type: 'text',
        required: true,
        position: 1
      });
      expect(result.current.fields[1]).toMatchObject({
        key: 'birth_date',
        label: 'Birth Date',
        type: 'date',
        required: false,
        position: 2
      });
    });
  });

  describe('useSearchFilters', () => {
    it('should generate search filters from schema', async () => {
      const mockSchema = {
        tableName: 'om_church_01_baptism_records',
        displayName: 'Baptism Records',
        recordType: 'baptism',
        primaryKey: 'id',
        columns: [
          {
            position: 0,
            name: 'id',
            type: 'number',
            nullable: false,
            isPrimaryKey: true,
            displayName: 'ID'
          },
          {
            position: 1,
            name: 'first_name',
            type: 'text',
            nullable: false,
            displayName: 'First Name'
          },
          {
            position: 2,
            name: 'birth_date',
            type: 'date',
            nullable: true,
            displayName: 'Birth Date'
          }
        ]
      };

      mockApiService.getTableSchema.mockResolvedValue({
        success: true,
        data: mockSchema,
        message: 'Schema retrieved successfully'
      });

      const { result } = renderHook(() => useSearchFilters('church-123', 'baptism_records'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.filters).toHaveLength(2); // Excludes primary key
      expect(result.current.filters[0]).toMatchObject({
        key: 'first_name',
        label: 'First Name',
        type: 'text',
        position: 1
      });
      expect(result.current.filters[1]).toMatchObject({
        key: 'birth_date',
        label: 'Birth Date',
        type: 'date',
        position: 2
      });
    });
  });
});
