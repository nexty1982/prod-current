/**
 * Tests for DynamicRecordsTable component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DynamicRecordsTable, DynamicRecordsTableSkeleton } from '@/components/DynamicRecordsTable';

// Mock data
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
  },
  {
    key: 'col_3',
    label: 'Birth Date',
    position: 3,
    type: 'date',
    width: 120,
    sortable: true
  }
];

const mockRecords = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    birth_date: '1990-01-01',
    _columnPositions: { 0: '1', 1: 'John', 2: 'Doe', 3: '1990-01-01' },
    _displayData: { 0: '1', 1: 'John', 2: 'Doe', 3: '1/1/1990' }
  },
  {
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    birth_date: '1985-05-15',
    _columnPositions: { 0: '2', 1: 'Jane', 2: 'Smith', 3: '1985-05-15' },
    _displayData: { 0: '2', 1: 'Jane', 2: 'Smith', 3: '5/15/1985' }
  }
];

const mockActions = [
  {
    key: 'view',
    label: 'View',
    icon: <span>👁️</span>,
    color: 'primary' as const
  },
  {
    key: 'edit',
    label: 'Edit', 
    icon: <span>✏️</span>,
    color: 'primary' as const
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <span>🗑️</span>,
    color: 'error' as const
  }
];

describe('DynamicRecordsTable', () => {
  it('renders table with records', () => {
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Birth Date')).toBeInTheDocument();
    
    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('1/1/1990')).toBeInTheDocument();
    
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Smith')).toBeInTheDocument();
    expect(screen.getByText('5/15/1985')).toBeInTheDocument();
  });

  it('renders loading skeleton', () => {
    render(
      <DynamicRecordsTable
        records={[]}
        columns={[]}
        loading={true}
      />
    );

    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
  });

  it('renders error state', () => {
    const errorMessage = 'Failed to load records';
    
    render(
      <DynamicRecordsTable
        records={[]}
        columns={[]}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    const emptyMessage = 'No records found';
    
    render(
      <DynamicRecordsTable
        records={[]}
        columns={mockColumns}
        emptyMessage={emptyMessage}
      />
    );

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it('handles sorting', () => {
    const onSort = jest.fn();
    
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        onSort={onSort}
      />
    );

    // Click on sortable column header
    fireEvent.click(screen.getByText('First Name'));
    
    expect(onSort).toHaveBeenCalledWith('col_1', 'asc');
  });

  it('handles record actions', () => {
    const onRecordAction = jest.fn();
    
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        actions={mockActions}
        onRecordAction={onRecordAction}
      />
    );

    // Click on action button
    const actionButtons = screen.getAllByRole('button');
    const moreButton = actionButtons.find(button => 
      button.querySelector('[data-testid="MoreVertIcon"]')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);
      
      // Click on edit action
      fireEvent.click(screen.getByText('Edit'));
      
      expect(onRecordAction).toHaveBeenCalledWith('edit', mockRecords[0]);
    }
  });

  it('handles record selection', () => {
    const onRecordSelect = jest.fn();
    const onSelectAll = jest.fn();
    
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        showCheckboxes={true}
        onRecordSelect={onRecordSelect}
        onSelectAll={onSelectAll}
      />
    );

    // Click on record checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // First record checkbox
    
    expect(onRecordSelect).toHaveBeenCalledWith('1', true);
  });

  it('handles select all', () => {
    const onSelectAll = jest.fn();
    
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        showCheckboxes={true}
        onSelectAll={onSelectAll}
      />
    );

    // Click on select all checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select all checkbox
    
    expect(onSelectAll).toHaveBeenCalledWith(true);
  });

  it('displays column positions correctly', () => {
    const recordsWithPositions = [
      {
        id: '1',
        _columnPositions: { 1: 'John', 2: 'Doe', 3: '1990-01-01' },
        _displayData: { 1: 'John', 2: 'Doe', 3: '1/1/1990' }
      }
    ];

    render(
      <DynamicRecordsTable
        records={recordsWithPositions}
        columns={mockColumns}
      />
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('1/1/1990')).toBeInTheDocument();
  });

  it('formats different data types correctly', () => {
    const recordsWithDifferentTypes = [
      {
        id: '1',
        _columnPositions: { 1: 'John', 2: 25, 3: true },
        _displayData: { 1: 'John', 2: '25', 3: 'Yes' }
      }
    ];

    const columnsWithTypes = [
      { key: 'col_1', label: 'Name', position: 1, type: 'text' },
      { key: 'col_2', label: 'Age', position: 2, type: 'number' },
      { key: 'col_3', label: 'Active', position: 3, type: 'boolean' }
    ];

    render(
      <DynamicRecordsTable
        records={recordsWithDifferentTypes}
        columns={columnsWithTypes}
      />
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('handles disabled actions', () => {
    const actionsWithDisabled = [
      {
        key: 'edit',
        label: 'Edit',
        icon: <span>✏️</span>,
        color: 'primary' as const,
        disabled: (record: any) => record.id === '1'
      }
    ];

    const onRecordAction = jest.fn();
    
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        actions={actionsWithDisabled}
        onRecordAction={onRecordAction}
      />
    );

    // Click on action button for first record (should be disabled)
    const actionButtons = screen.getAllByRole('button');
    const moreButton = actionButtons.find(button => 
      button.querySelector('[data-testid="MoreVertIcon"]')
    );
    
    if (moreButton) {
      fireEvent.click(moreButton);
      
      // The edit action should be disabled for the first record
      const editMenuItem = screen.getByText('Edit');
      expect(editMenuItem.closest('li')).toHaveAttribute('aria-disabled', 'true');
    }
  });

  it('shows sort indicators', () => {
    render(
      <DynamicRecordsTable
        records={mockRecords}
        columns={mockColumns}
        sortField="col_1"
        sortDirection="asc"
      />
    );

    expect(screen.getByText('↑')).toBeInTheDocument();
  });

  it('handles custom primary key field', () => {
    const recordsWithCustomId = [
      {
        custom_id: 'abc123',
        first_name: 'John',
        _columnPositions: { 1: 'John' },
        _displayData: { 1: 'John' }
      }
    ];

    render(
      <DynamicRecordsTable
        records={recordsWithCustomId}
        columns={mockColumns}
        primaryKeyField="custom_id"
        showCheckboxes={true}
      />
    );

    // Should be able to find the record by custom ID
    expect(screen.getByText('John')).toBeInTheDocument();
  });
});

describe('DynamicRecordsTableSkeleton', () => {
  it('renders skeleton with correct number of columns and rows', () => {
    render(
      <DynamicRecordsTableSkeleton 
        columns={3} 
        rows={5} 
      />
    );

    // Should render 3 column headers
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(3);

    // Should render 5 data rows
    const dataRows = screen.getAllByRole('row').slice(1); // Exclude header row
    expect(dataRows).toHaveLength(5);
  });

  it('renders with default values', () => {
    render(<DynamicRecordsTableSkeleton />);

    // Should render default 5 columns and 10 rows
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders).toHaveLength(5);

    const dataRows = screen.getAllByRole('row').slice(1);
    expect(dataRows).toHaveLength(10);
  });
});
