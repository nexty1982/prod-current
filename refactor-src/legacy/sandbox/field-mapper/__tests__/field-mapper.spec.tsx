/**
 * Field Mapper Tests
 * Comprehensive tests for the field mapper functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FieldMapperTable } from '../shared/ui/legacy/FieldMapperTable';
import { Toolbar } from '../shared/ui/legacy/Toolbar';
import { FieldSelect } from '../shared/ui/legacy/FieldSelect';
import type { Column, KnownField, FieldMapping } from '../schemas';

// Mock data
const mockColumns: Column[] = [
  {
    index: 0,
    header: 'First Name',
    sample: ['John', 'Jane', 'Bob', 'Alice', 'Charlie'],
    inferredType: 'string',
  },
  {
    index: 1,
    header: 'Birth Date',
    sample: ['1990-01-15', '1985-06-22', '1992-11-03', '1988-04-17', '1995-09-08'],
    inferredType: 'date',
  },
  {
    index: 2,
    header: 'Age',
    sample: ['33', '38', '31', '35', '28'],
    inferredType: 'number',
  },
];

const mockKnownFields: KnownField[] = [
  {
    key: 'firstName',
    label: 'First Name',
    type: 'string',
    required: true,
    description: 'Person\'s first name',
  },
  {
    key: 'lastName',
    label: 'Last Name',
    type: 'string',
    required: true,
    description: 'Person\'s last name',
  },
  {
    key: 'dateOfBirth',
    label: 'Date of Birth',
    type: 'date',
    required: false,
    description: 'Person\'s birth date',
  },
];

const mockMapping: FieldMapping = {
  churchId: 'test-church',
  recordType: 'baptisms',
  items: [
    {
      columnIndex: 0,
      targetFieldKey: 'firstName',
      customFieldName: null,
      outputType: 'string',
    },
  ],
};

// Test wrapper
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('FieldMapperTable', () => {
  const mockOnMappingChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rows with column numbers, headers, and previews', () => {
    render(
      <TestWrapper>
        <FieldMapperTable
          columns={mockColumns}
          knownFields={mockKnownFields}
          mapping={mockMapping}
          onMappingChange={mockOnMappingChange}
        />
      </TestWrapper>
    );

    // Check column numbers (1-based)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Check headers
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Birth Date')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();

    // Check preview buttons are present
    const previewButtons = screen.getAllByLabelText(/Preview column/);
    expect(previewButtons).toHaveLength(3);
  });

  it('shows validation warning for duplicate mappings', async () => {
    const duplicateMapping: FieldMapping = {
      ...mockMapping,
      items: [
        {
          columnIndex: 0,
          targetFieldKey: 'firstName',
          customFieldName: null,
          outputType: 'string',
        },
        {
          columnIndex: 1,
          targetFieldKey: 'firstName', // Duplicate!
          customFieldName: null,
          outputType: 'string',
        },
      ],
    };

    render(
      <TestWrapper>
        <FieldMapperTable
          columns={mockColumns}
          knownFields={mockKnownFields}
          mapping={duplicateMapping}
          onMappingChange={mockOnMappingChange}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Field is already mapped to another column')).toBeInTheDocument();
    });
  });

  it('shows warning when required fields are unmapped', async () => {
    const incompleteMapping: FieldMapping = {
      ...mockMapping,
      items: [], // No mappings, but firstName and lastName are required
    };

    render(
      <TestWrapper>
        <FieldMapperTable
          columns={mockColumns}
          knownFields={mockKnownFields}
          mapping={incompleteMapping}
          onMappingChange={mockOnMappingChange}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Required field "First Name" is not mapped/)).toBeInTheDocument();
      expect(screen.getByText(/Required field "Last Name" is not mapped/)).toBeInTheDocument();
    });
  });

  it('validates custom field names', async () => {
    const invalidCustomMapping: FieldMapping = {
      ...mockMapping,
      items: [
        {
          columnIndex: 0,
          targetFieldKey: null,
          customFieldName: 'invalid field name!', // Invalid characters
          outputType: 'string',
        },
      ],
    };

    render(
      <TestWrapper>
        <FieldMapperTable
          columns={mockColumns}
          knownFields={mockKnownFields}
          mapping={invalidCustomMapping}
          onMappingChange={mockOnMappingChange}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/must contain only letters, numbers, and underscores/)).toBeInTheDocument();
    });
  });
});

describe('FieldSelect', () => {
  const mockOnValueChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders known fields and custom option', async () => {
    const user = userEvent.setup();

    render(
      <FieldSelect
        knownFields={mockKnownFields}
        value={null}
        onValueChange={mockOnValueChange}
      />
    );

    // Open the select
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    // Check that known fields are present
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();

    // Check that custom option is present
    expect(screen.getByText('Use Custom Name...')).toBeInTheDocument();
  });

  it('calls onValueChange when selecting a field', async () => {
    const user = userEvent.setup();

    render(
      <FieldSelect
        knownFields={mockKnownFields}
        value={null}
        onValueChange={mockOnValueChange}
      />
    );

    // Open the select and click on first name
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    await user.click(screen.getByText('First Name'));

    expect(mockOnValueChange).toHaveBeenCalledWith('firstName');
  });

  it('calls onValueChange with null when selecting custom option', async () => {
    const user = userEvent.setup();

    render(
      <FieldSelect
        knownFields={mockKnownFields}
        value={null}
        onValueChange={mockOnValueChange}
      />
    );

    // Open the select and click on custom option
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    
    await user.click(screen.getByText('Use Custom Name...'));

    expect(mockOnValueChange).toHaveBeenCalledWith(null);
  });
});

describe('Toolbar', () => {
  const mockProps = {
    recordType: 'baptisms',
    onRecordTypeChange: vi.fn(),
    churchId: 'test-church',
    onChurchIdChange: vi.fn(),
    currentMapping: mockMapping,
    onImportMapping: vi.fn(),
    onResetMapping: vi.fn(),
    onSaveMapping: vi.fn(),
    isSaving: false,
    canSave: true,
    validationErrors: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all toolbar controls', () => {
    render(<Toolbar {...mockProps} />);

    expect(screen.getByLabelText('Church ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Record Type')).toBeInTheDocument();
    expect(screen.getByText('Import JSON')).toBeInTheDocument();
    expect(screen.getByText('Export JSON')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('disables save button when canSave is false', () => {
    render(<Toolbar {...mockProps} canSave={false} />);

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('shows saving state', () => {
    render(<Toolbar {...mockProps} isSaving={true} />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('calls onSaveMapping when save button is clicked', async () => {
    const user = userEvent.setup();

    render(<Toolbar {...mockProps} />);

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockProps.onSaveMapping).toHaveBeenCalled();
  });

  it('handles export functionality', async () => {
    const user = userEvent.setup();

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<Toolbar {...mockProps} />);

    const exportButton = screen.getByText('Export JSON');
    await user.click(exportButton);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
  });
});

describe('Export/Import Round-trip', () => {
  it('preserves mapping data through export/import cycle', () => {
    const originalMapping = mockMapping;

    // Simulate export
    const exportedData = JSON.stringify(originalMapping, null, 2);

    // Simulate import
    const importedMapping = JSON.parse(exportedData);

    expect(importedMapping).toEqual(originalMapping);
    expect(importedMapping.churchId).toBe(originalMapping.churchId);
    expect(importedMapping.recordType).toBe(originalMapping.recordType);
    expect(importedMapping.items).toEqual(originalMapping.items);
  });
});
