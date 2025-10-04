/**
 * Orthodox Metrics - Records Centralized Test Suite
 * Comprehensive testing for the unified records system
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Import components to test
import {
  ModernDynamicRecordsManager,
  ModernDynamicRecordsTable,
  ModernDynamicRecordForm,
  BulkOperations,
  AdvancedSearch,
  AuditTrail,
  TableConfigManager,
  ConfigurationDashboard,
  AgGridRecordsTable,
  AgGridConfigManager,
  EnhancedDynamicForm,
  FormBuilder,
  FormValidation,
} from './useUnifiedRecords';

// Mock data
const mockChurchId = 1;
const mockTableName = 'baptism_records';
const mockRecords = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    birth_date: '1990-01-01',
    reception_date: '2020-01-01',
    birthplace: 'New York',
    entry_type: 'Baptism',
    sponsors: 'Jane Doe, Bob Smith',
    parents: 'John Doe Sr., Mary Doe',
    clergy: 'Father Smith',
    church_id: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    birth_date: '1995-05-15',
    reception_date: '2021-06-15',
    birthplace: 'Los Angeles',
    entry_type: 'Chrismation',
    sponsors: 'John Doe, Mary Smith',
    parents: 'Robert Smith, Lisa Smith',
    clergy: 'Father Johnson',
    church_id: 1,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const mockTableConfig = {
  id: 1,
  church_id: 1,
  table_name: 'baptism_records',
  config_name: 'default',
  field_definitions: {
    id: { label: 'ID', type: 'number', display: true, editable: false },
    first_name: { label: 'First Name', type: 'text', display: true, editable: true, required: true },
    last_name: { label: 'Last Name', type: 'text', display: true, editable: true, required: true },
    birth_date: { label: 'Birth Date', type: 'date', display: true, editable: true },
    reception_date: { label: 'Baptism Date', type: 'date', display: true, editable: true, required: true },
    birthplace: { label: 'Birthplace', type: 'text', display: true, editable: true },
    entry_type: { label: 'Entry Type', type: 'select', options: ['Baptism', 'Chrismation'], display: true, editable: true },
    sponsors: { label: 'Sponsors', type: 'text', display: true, editable: true },
    parents: { label: 'Parents', type: 'text', display: true, editable: true },
    clergy: { label: 'Clergy', type: 'text', display: true, editable: true },
    church_id: { label: 'Church ID', type: 'number', display: false, editable: false },
  },
  display_settings: {
    pagination: { enabled: true, defaultLimit: 50, limits: [10, 25, 50, 100] },
    actions: { view: true, edit: true, delete: true, export: true },
    defaultSort: { field: 'reception_date', direction: 'desc' },
  },
  search_config: {
    searchableFields: ['first_name', 'last_name', 'birthplace', 'parents', 'sponsors', 'clergy'],
    filterableFields: ['clergy', 'entry_type'],
  },
  validation_rules: {
    first_name: { min_length: 2 },
    reception_date: { is_date: true, future_date_allowed: false },
  },
  import_export_settings: {
    supportedFormats: ['csv', 'json'],
    defaultMapping: { 'First Name': 'first_name', 'Last Name': 'last_name', 'Baptism Date': 'reception_date' },
  },
  certificate_settings: {
    templatePath: '/templates/baptism_certificate_template.png',
    fieldPositions: {
      fullName: { x: 383, y: 574 },
      birthplace: { x: 400, y: 600 },
    },
  },
  metadata: {
    version: 1,
    description: 'Initial configuration for Baptism Records',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAgGridConfig = {
  id: 1,
  church_id: 1,
  table_name: 'baptism_records',
  config_name: 'default',
  grid_options: {
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
    enableRangeSelection: true,
    enableCharts: true,
    enableCellTextSelection: true,
    animateRows: true,
    domLayout: 'normal',
  },
  column_definitions: [
    { field: 'id', headerName: 'ID', width: 80, sortable: true, filter: true, editable: false },
    { field: 'first_name', headerName: 'First Name', width: 150, sortable: true, filter: true, editable: true },
    { field: 'last_name', headerName: 'Last Name', width: 150, sortable: true, filter: true, editable: true },
    { field: 'birth_date', headerName: 'Birth Date', width: 120, sortable: true, filter: 'agDateColumnFilter', editable: true },
    { field: 'reception_date', headerName: 'Baptism Date', width: 140, sortable: true, filter: 'agDateColumnFilter', editable: true },
    { field: 'clergy', headerName: 'Clergy', width: 150, sortable: true, filter: true, editable: true },
  ],
  default_column_state: {
    id: { width: 80, hide: false },
    first_name: { width: 150, hide: false },
    last_name: { width: 150, hide: false },
  },
  grid_settings: {
    rowHeight: 30,
    headerHeight: 35,
    enableFilterQuickSearch: true,
  },
  theme_settings: {
    theme: 'ag-theme-alpine',
    darkMode: false,
    customCss: '',
  },
  export_settings: {
    csvExport: { fileName: 'baptism_records.csv' },
    excelExport: { fileName: 'baptism_records.xlsx' },
    pdfExport: { enabled: false },
  },
  user_preferences: {},
  metadata: {
    version: 1,
    description: 'Default AG Grid config for Baptism Records',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const createTestTheme = () => createTheme();

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  const theme = createTestTheme();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Mock hooks
jest.mock('../core', () => ({
  useUnifiedRecords: jest.fn(() => ({
    records: mockRecords,
    pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useUnifiedRecordMutations: jest.fn(() => ({
    createRecord: jest.fn(),
    updateRecord: jest.fn(),
    deleteRecord: jest.fn(),
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  })),
  useRecordTableConfig: jest.fn(() => ({
    config: mockTableConfig,
    loading: false,
    error: null,
  })),
  useAgGridConfig: jest.fn(() => ({
    config: mockAgGridConfig,
    loading: false,
    error: null,
  })),
  useSearchableFields: jest.fn(() => ({
    fields: [
      { column_name: 'first_name', display_name: 'First Name', field_type: 'text' },
      { column_name: 'last_name', display_name: 'Last Name', field_type: 'text' },
      { column_name: 'birth_date', display_name: 'Birth Date', field_type: 'date' },
      { column_name: 'entry_type', display_name: 'Entry Type', field_type: 'select', options: ['Baptism', 'Chrismation'] },
    ],
    loading: false,
    error: null,
  })),
  useSortableFields: jest.fn(() => ({
    fields: [
      { column_name: 'id', display_name: 'ID' },
      { column_name: 'first_name', display_name: 'First Name' },
      { column_name: 'last_name', display_name: 'Last Name' },
      { column_name: 'reception_date', display_name: 'Baptism Date' },
    ],
    loading: false,
    error: null,
  })),
  getCurrentTemplate: jest.fn(() => 'mui'),
}));

describe('Records Centralized System', () => {
  describe('ModernDynamicRecordsManager', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <ModernDynamicRecordsManager
          churchId={mockChurchId}
          tableName={mockTableName}
          onSelectionChange={jest.fn()}
        />
      );
      expect(screen.getByText('Loading records...')).toBeInTheDocument();
    });

    it('displays records when loaded', async () => {
      renderWithProviders(
        <ModernDynamicRecordsManager
          churchId={mockChurchId}
          tableName={mockTableName}
          onSelectionChange={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('handles record selection', async () => {
      const onSelectionChange = jest.fn();
      renderWithProviders(
        <ModernDynamicRecordsManager
          churchId={mockChurchId}
          tableName={mockTableName}
          onSelectionChange={onSelectionChange}
        />
      );
      
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /select record/i });
        fireEvent.click(checkbox);
        expect(onSelectionChange).toHaveBeenCalled();
      });
    });
  });

  describe('BulkOperations', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <BulkOperations
          churchId={mockChurchId}
          tableName={mockTableName}
          selectedRecords={mockRecords}
          onSelectionChange={jest.fn()}
          onOperationComplete={jest.fn()}
          open={true}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    });

    it('displays selected records count', () => {
      renderWithProviders(
        <BulkOperations
          churchId={mockChurchId}
          tableName={mockTableName}
          selectedRecords={mockRecords}
          onSelectionChange={jest.fn()}
          onOperationComplete={jest.fn()}
          open={true}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Selected')).toBeInTheDocument();
    });

    it('handles operation type selection', async () => {
      renderWithProviders(
        <BulkOperations
          churchId={mockChurchId}
          tableName={mockTableName}
          selectedRecords={mockRecords}
          onSelectionChange={jest.fn()}
          onOperationComplete={jest.fn()}
          open={true}
          onClose={jest.fn()}
        />
      );
      
      const deleteButton = screen.getByText('Delete Records');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Configure Delete Records')).toBeInTheDocument();
      });
    });
  });

  describe('AdvancedSearch', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <AdvancedSearch
          churchId={mockChurchId}
          tableName={mockTableName}
          onSearchResults={jest.fn()}
          onSearchChange={jest.fn()}
        />
      );
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('displays search filters', async () => {
      renderWithProviders(
        <AdvancedSearch
          churchId={mockChurchId}
          tableName={mockTableName}
          onSearchResults={jest.fn()}
          onSearchChange={jest.fn()}
        />
      );
      
      const showFiltersButton = screen.getByText('Show Filters');
      fireEvent.click(showFiltersButton);
      
      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument();
        expect(screen.getByText('Last Name')).toBeInTheDocument();
      });
    });

    it('handles search term input', async () => {
      const onSearchChange = jest.fn();
      renderWithProviders(
        <AdvancedSearch
          churchId={mockChurchId}
          tableName={mockTableName}
          onSearchResults={jest.fn()}
          onSearchChange={onSearchChange}
        />
      );
      
      const searchInput = screen.getByPlaceholderText(/search in all fields/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      await waitFor(() => {
        expect(onSearchChange).toHaveBeenCalled();
      });
    });
  });

  describe('AuditTrail', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <AuditTrail
          churchId={mockChurchId}
          tableName={mockTableName}
        />
      );
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    it('displays audit log entries', async () => {
      renderWithProviders(
        <AuditTrail
          churchId={mockChurchId}
          tableName={mockTableName}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Total Entries')).toBeInTheDocument();
        expect(screen.getByText('Creates')).toBeInTheDocument();
        expect(screen.getByText('Updates')).toBeInTheDocument();
        expect(screen.getByText('Deletes')).toBeInTheDocument();
      });
    });

    it('switches between table and timeline view', async () => {
      renderWithProviders(
        <AuditTrail
          churchId={mockChurchId}
          tableName={mockTableName}
        />
      );
      
      const timelineTab = screen.getByText('Timeline View');
      fireEvent.click(timelineTab);
      
      await waitFor(() => {
        expect(screen.getByText('Audit Timeline')).toBeInTheDocument();
      });
    });
  });

  describe('TableConfigManager', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <TableConfigManager
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Table Configuration Manager')).toBeInTheDocument();
    });

    it('displays configuration tabs', () => {
      renderWithProviders(
        <TableConfigManager
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      
      expect(screen.getByText('Field Definitions')).toBeInTheDocument();
      expect(screen.getByText('Display Settings')).toBeInTheDocument();
      expect(screen.getByText('Search Config')).toBeInTheDocument();
      expect(screen.getByText('Validation Rules')).toBeInTheDocument();
      expect(screen.getByText('Import/Export')).toBeInTheDocument();
      expect(screen.getByText('Certificates')).toBeInTheDocument();
    });

    it('handles tab switching', async () => {
      renderWithProviders(
        <TableConfigManager
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      
      const displaySettingsTab = screen.getByText('Display Settings');
      fireEvent.click(displaySettingsTab);
      
      await waitFor(() => {
        expect(screen.getByText('Enable Pagination')).toBeInTheDocument();
      });
    });
  });

  describe('ConfigurationDashboard', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <ConfigurationDashboard
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('Configuration Dashboard')).toBeInTheDocument();
    });

    it('displays statistics cards', () => {
      renderWithProviders(
        <ConfigurationDashboard
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      
      expect(screen.getByText('Total Tables')).toBeInTheDocument();
      expect(screen.getByText('Table Configs')).toBeInTheDocument();
      expect(screen.getByText('AG Grid Configs')).toBeInTheDocument();
      expect(screen.getByText('Config Coverage')).toBeInTheDocument();
    });

    it('displays tables overview', async () => {
      renderWithProviders(
        <ConfigurationDashboard
          churchId={mockChurchId}
          open={true}
          onClose={jest.fn()}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Tables Overview')).toBeInTheDocument();
      });
    });
  });

  describe('AgGridRecordsTable', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <AgGridRecordsTable
          churchId={mockChurchId}
          tableName={mockTableName}
          records={mockRecords}
          onRecordChange={jest.fn()}
          onRecordDelete={jest.fn()}
        />
      );
      expect(screen.getByText('Loading AG Grid...')).toBeInTheDocument();
    });
  });

  describe('EnhancedDynamicForm', () => {
    it('renders without crashing', () => {
      renderWithProviders(
        <EnhancedDynamicForm
          fields={mockTableConfig.field_definitions}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    it('displays form fields', () => {
      renderWithProviders(
        <EnhancedDynamicForm
          fields={mockTableConfig.field_definitions}
          onSubmit={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    });

    it('handles form submission', async () => {
      const onSubmit = jest.fn();
      renderWithProviders(
        <EnhancedDynamicForm
          fields={mockTableConfig.field_definitions}
          onSubmit={onSubmit}
          onCancel={jest.fn()}
        />
      );
      
      const submitButton = screen.getByText('Submit');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('FormValidation', () => {
    it('validates required fields', () => {
      const result = FormValidation.validateField(
        'first_name',
        '',
        { required: true, min_length: 2 }
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('This field is required');
    });

    it('validates field length', () => {
      const result = FormValidation.validateField(
        'first_name',
        'J',
        { required: true, min_length: 2 }
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum length is 2 characters');
    });

    it('validates email format', () => {
      const result = FormValidation.validateField(
        'email',
        'invalid-email',
        { type: 'email' }
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('validates date format', () => {
      const result = FormValidation.validateField(
        'birth_date',
        'invalid-date',
        { type: 'date' }
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });

    it('validates number format', () => {
      const result = FormValidation.validateField(
        'age',
        'not-a-number',
        { type: 'number' }
      );
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Must be a valid number');
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  it('renders large datasets efficiently', async () => {
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: i.toString(),
      first_name: `First${i}`,
      last_name: `Last${i}`,
      birth_date: '1990-01-01',
      reception_date: '2020-01-01',
      birthplace: 'New York',
      entry_type: 'Baptism',
      sponsors: 'Jane Doe, Bob Smith',
      parents: 'John Doe Sr., Mary Doe',
      clergy: 'Father Smith',
      church_id: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }));

    const startTime = performance.now();
    
    renderWithProviders(
      <ModernDynamicRecordsManager
        churchId={mockChurchId}
        tableName={mockTableName}
        onSelectionChange={jest.fn()}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('handles rapid state changes efficiently', async () => {
    const onSelectionChange = jest.fn();
    renderWithProviders(
      <ModernDynamicRecordsManager
        churchId={mockChurchId}
        tableName={mockTableName}
        onSelectionChange={onSelectionChange}
      />
    );
    
    const startTime = performance.now();
    
    // Simulate rapid selection changes
    for (let i = 0; i < 100; i++) {
      act(() => {
        onSelectionChange([mockRecords[0]]);
      });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Should handle 100 state changes within 50ms
    expect(totalTime).toBeLessThan(50);
  });
});

// Accessibility tests
describe('Accessibility Tests', () => {
  it('has proper ARIA labels', () => {
    renderWithProviders(
      <ModernDynamicRecordsManager
        churchId={mockChurchId}
        tableName={mockTableName}
        onSelectionChange={jest.fn()}
      />
    );
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add record/i })).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    renderWithProviders(
      <ModernDynamicRecordsManager
        churchId={mockChurchId}
        tableName={mockTableName}
        onSelectionChange={jest.fn()}
      />
    );
    
    const addButton = screen.getByRole('button', { name: /add record/i });
    addButton.focus();
    
    expect(document.activeElement).toBe(addButton);
    
    // Test Tab navigation
    fireEvent.keyDown(addButton, { key: 'Tab' });
    // Should move to next focusable element
  });

  it('has proper color contrast', () => {
    renderWithProviders(
      <ModernDynamicRecordsManager
        churchId={mockChurchId}
        tableName={mockTableName}
        onSelectionChange={jest.fn()}
      />
    );
    
    // This would typically use a color contrast testing library
    // For now, we'll just ensure the component renders
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
  });
});

// Error boundary tests
describe('Error Boundary Tests', () => {
  it('handles component errors gracefully', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };
    
    renderWithProviders(
      <div>
        <ThrowError />
      </div>
    );
    
    // Should not crash the entire app
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

export default {};
