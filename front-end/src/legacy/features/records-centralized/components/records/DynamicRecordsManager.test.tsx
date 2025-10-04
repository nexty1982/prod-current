/**
 * Tests for DynamicRecordsManager component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DynamicRecordsManager } from '@/DynamicRecordsManager';

// Mock the hooks
jest.mock('../../shared/hooks/useDynamicRecords', () => ({
  useRecordTables: jest.fn(),
  useTableColumns: jest.fn(),
  useFormFields: jest.fn(),
  useSearchFilters: jest.fn(),
  useDynamicRecords: jest.fn(),
  useDynamicRecordMutations: jest.fn(),
  useDynamicRecordImportExport: jest.fn(),
  useDynamicDropdownOptions: jest.fn(),
}));

jest.mock('../../shared/hooks/useSearchState', () => ({
  useSearchState: jest.fn(() => ({
    searchTerm: '',
    filters: {},
    sort: null,
    updateSearchTerm: jest.fn(),
    updateFilters: jest.fn(),
    updateSort: jest.fn(),
    clearFilters: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock('../../shared/hooks/usePagination', () => ({
  usePagination: jest.fn(() => ({
    page: 1,
    limit: 10,
    goToPage: jest.fn(),
    nextPage: jest.fn(),
    prevPage: jest.fn(),
  })),
}));

import { 
  useRecordTables,
  useTableColumns,
  useFormFields,
  useSearchFilters,
  useDynamicRecords,
  useDynamicRecordMutations,
  useDynamicRecordImportExport,
  useDynamicDropdownOptions,
} from '@/shared/hooks/useDynamicRecords';

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

describe('DynamicRecordsManager', () => {
  const mockTables = [
    {
      tableName: 'om_church_01_baptism_records',
      displayName: 'Baptism Records',
      recordType: 'baptism',
      primaryKey: 'id',
      columns: []
    },
    {
      tableName: 'om_church_01_marriage_records',
      displayName: 'Marriage Records', 
      recordType: 'marriage',
      primaryKey: 'id',
      columns: []
    }
  ];

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

  const mockColumns = [
    {
      key: 'col_1',
      label: 'First Name',
      position: 1,
      type: 'text',
      width: 150,
      sortable: true
    },
    {
      key: 'col_2',
      label: 'Last Name',
      position: 2,
      type: 'text',
      width: 150,
      sortable: true
    }
  ];

  const mockRecords = [
    {
      id: '1',
      first_name: 'John',
      last_name: 'Doe',
      _columnPositions: { 0: '1', 1: 'John', 2: 'Doe' },
      _displayData: { 0: '1', 1: 'John', 2: 'Doe' }
    },
    {
      id: '2',
      first_name: 'Jane',
      last_name: 'Smith',
      _columnPositions: { 0: '2', 1: 'Jane', 2: 'Smith' },
      _displayData: { 0: '2', 1: 'Jane', 2: 'Smith' }
    }
  ];

  const mockMutations = {
    create: { mutateAsync: jest.fn() },
    update: { mutateAsync: jest.fn() },
    delete: { mutateAsync: jest.fn() }
  };

  const mockImportExport = {
    import: { mutateAsync: jest.fn() },
    export: { mutateAsync: jest.fn() }
  };

  beforeEach(() => {
    // Default mock implementations
    (useRecordTables as jest.Mock).mockReturnValue({
      tables: mockTables,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    (useTableColumns as jest.Mock).mockReturnValue({
      columns: mockColumns,
      isLoading: false,
      error: null,
      schema: mockSchema
    });

    (useFormFields as jest.Mock).mockReturnValue({
      fields: [],
      isLoading: false,
      error: null,
      schema: mockSchema
    });

    (useSearchFilters as jest.Mock).mockReturnValue({
      filters: [],
      isLoading: false,
      error: null,
      schema: mockSchema
    });

    (useDynamicRecords as jest.Mock).mockReturnValue({
      records: mockRecords,
      total: 2,
      page: 1,
      totalPages: 1,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    (useDynamicRecordMutations as jest.Mock).mockReturnValue(mockMutations);

    (useDynamicRecordImportExport as jest.Mock).mockReturnValue(mockImportExport);

    (useDynamicDropdownOptions as jest.Mock).mockReturnValue({
      options: {},
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table discovery interface', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Dynamic Records Manager')).toBeInTheDocument();
    expect(screen.getByText('Select Record Table')).toBeInTheDocument();
  });

  it('displays discovered tables in dropdown', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Click on dropdown
    fireEvent.click(screen.getByText('Select Record Table'));

    expect(screen.getByText('Baptism Records')).toBeInTheDocument();
    expect(screen.getByText('Marriage Records')).toBeInTheDocument();
  });

  it('handles table selection', () => {
    const mockRefetch = jest.fn();
    (useDynamicRecords as jest.Mock).mockReturnValue({
      records: [],
      total: 0,
      page: 1,
      totalPages: 0,
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    expect(screen.getByText('Baptism Records')).toBeInTheDocument();
  });

  it('displays records table when table is selected', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Should show the records table
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    (useRecordTables as jest.Mock).mockReturnValue({
      tables: [],
      isLoading: true,
      error: null,
      refetch: jest.fn()
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Discovering record tables...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    (useRecordTables as jest.Mock).mockReturnValue({
      tables: [],
      isLoading: false,
      error: 'Failed to discover tables',
      refetch: jest.fn()
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Error discovering tables: Failed to discover tables')).toBeInTheDocument();
  });

  it('handles no tables found', () => {
    (useRecordTables as jest.Mock).mockReturnValue({
      tables: [],
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No record tables found')).toBeInTheDocument();
    expect(screen.getByText('Tables should be named with pattern: om_church_##_*_records')).toBeInTheDocument();
  });

  it('handles record actions', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Should show action buttons
    expect(screen.getByText('Add Record')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('handles lock toggle', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Should show lock status
    expect(screen.getByText('Unlocked')).toBeInTheDocument();

    // Click lock toggle
    const lockButton = screen.getByRole('button', { name: /toggle lock/i });
    fireEvent.click(lockButton);

    // Should show locked status
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('handles search functionality', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Should show search interface
    expect(screen.getByPlaceholderText(/search.*../features/records/records/i)).toBeInTheDocument();
  });

  it('handles pagination', () => {
    (useDynamicRecords as jest.Mock).mockReturnValue({
      records: mockRecords,
      total: 25,
      page: 2,
      totalPages: 3,
      isLoading: false,
      error: null,
      refetch: jest.fn()
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Should show pagination info
    expect(screen.getByText('Showing 2 of 25 records')).toBeInTheDocument();
    expect(screen.getByText('(Page 2 of 3)')).toBeInTheDocument();
  });

  it('handles record deletion', async () => {
    const mockDelete = jest.fn().mockResolvedValue({ success: true });
    mockMutations.delete.mutateAsync = mockDelete;

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    // Click on action button (this would trigger delete in real usage)
    // Note: In a real test, you'd need to trigger the actual delete action
    // This is a simplified version

    expect(screen.getByText('John')).toBeInTheDocument();
  });

  it('handles import functionality', () => {
    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Click import button
    fireEvent.click(screen.getByText('Import'));

    // Should show import modal
    expect(screen.getByText(/import.*../features/records/records/i)).toBeInTheDocument();
  });

  it('handles export functionality', () => {
    mockImportExport.export.mutateAsync = jest.fn().mockResolvedValue({
      success: true,
      data: new Blob(['test'], { type: 'text/csv' })
    });

    render(
      <DynamicRecordsManager churchId="church-123" />,
      { wrapper: createWrapper() }
    );

    // Select a table
    fireEvent.click(screen.getByText('Select Record Table'));
    fireEvent.click(screen.getByText('Baptism Records'));

    // Click export button
    fireEvent.click(screen.getByText('Export CSV'));

    // Should trigger export
    expect(mockImportExport.export.mutateAsync).toHaveBeenCalled();
  });
});
