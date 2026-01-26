import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, SortChangedEvent } from 'ag-grid-community';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { listRecords, type TableKey, type SortDir } from "@/shared/lib/dynamicRecordsApi";

// Import AG Grid styles
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface AdvancedGridProps {
  table: TableKey;
  churchId: number;
  search: string;
}

interface GridRow {
  id: number;
  [key: string]: any;
}

export default function AdvancedGrid({ table, churchId, search }: AdvancedGridProps) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gridApi, setGridApi] = useState<any>(null);

  // Define columns for each record type
  const columnDefs = useMemo((): ColDef[] => {
    if (table === 'baptism_records') {
      return [
        { 
          field: 'id', 
          headerName: 'ID', 
          width: 80, 
          sortable: true,
          sort: 'desc' // Default sort by ID descending
        },
        { 
          field: 'first_name', 
          headerName: 'Name', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'last_name', 
          headerName: 'Surname', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'birth_date', 
          headerName: 'Date of Birth', 
          width: 130, 
          sortable: true,
          filter: true,
          valueFormatter: (params) => formatDate(params.value)
        },
        { 
          field: 'reception_date', 
          headerName: 'Date of Orthodox Reception', 
          width: 180, 
          sortable: true,
          filter: true,
          valueFormatter: (params) => formatDate(params.value),
          sort: 'desc' // Default sort by reception_date descending
        },
        { 
          field: 'birthplace', 
          headerName: 'Birthplace', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'sponsors', 
          headerName: 'Sponsor(s)', 
          width: 200, 
          sortable: true,
          filter: true
        },
        { 
          field: 'clergy', 
          headerName: 'Clergy', 
          width: 150, 
          sortable: true,
          filter: true
        }
      ];
    }
    
    if (table === 'marriage_records') {
      return [
        { 
          field: 'id', 
          headerName: 'ID', 
          width: 80, 
          sortable: true,
          sort: 'desc'
        },
        { 
          field: 'mdate', 
          headerName: 'Date Married', 
          width: 140, 
          sortable: true,
          filter: true,
          valueFormatter: (params) => formatDate(params.value),
          sort: 'desc' // Default sort by mdate descending
        },
        { 
          field: 'fname_groom', 
          headerName: 'Groom Name', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'lname_groom', 
          headerName: 'Groom Surname', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'parentsg', 
          headerName: 'Groom Parents', 
          width: 200, 
          sortable: true,
          filter: true
        },
        { 
          field: 'fname_bride', 
          headerName: 'Bride Name', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'lname_bride', 
          headerName: 'Bride Surname', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'parentsb', 
          headerName: 'Brides Parents', 
          width: 200, 
          sortable: true,
          filter: true
        },
        { 
          field: 'witness', 
          headerName: 'Witnesses', 
          width: 200, 
          sortable: true,
          filter: true
        },
        { 
          field: 'mlicense', 
          headerName: 'Marriage License', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'clergy', 
          headerName: 'Clergy', 
          width: 150, 
          sortable: true,
          filter: true
        }
      ];
    }
    
    // Funeral records
    return [
      { 
        field: 'id', 
        headerName: 'ID', 
        width: 80, 
          sortable: true,
        sort: 'desc'
      },
              { 
          field: 'deceased_date', 
          headerName: 'Date Deceased', 
          width: 140, 
          sortable: true,
          filter: true,
          valueFormatter: (params) => formatDate(params.value)
        },
        { 
          field: 'burial_date', 
          headerName: 'Date Buried', 
          width: 140, 
          sortable: true,
          filter: true,
          valueFormatter: (params) => formatDate(params.value),
          sort: 'desc' // Default sort by burial_date descending
        },
        { 
          field: 'name', 
          headerName: 'Name', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'lastname', 
          headerName: 'Surname', 
          width: 150, 
          sortable: true,
          filter: true
        },
        { 
          field: 'age', 
          headerName: 'Age', 
          width: 80, 
          sortable: true,
          filter: true
        },
        { 
          field: 'burial_location', 
          headerName: 'Burial Place', 
          width: 200, 
          sortable: true,
          filter: true
        },
        { 
          field: 'clergy', 
          headerName: 'Clergy', 
          width: 150, 
          sortable: true,
          filter: true
        }
    ];
  }, [table]);

  // Load records when parameters change
  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Determine the default sort field based on table type
        let defaultSortField = 'id';
        let defaultSortDirection: SortDir = 'desc';
        
        if (table === 'baptism_records') {
          defaultSortField = 'reception_date';
        } else if (table === 'marriage_records') {
          defaultSortField = 'mdate';
        } else if (table === 'funeral_records') {
          defaultSortField = 'burial_date';
        }
        
        console.log('🔍 AdvancedGrid fetching records:', {
          table,
          churchId,
          page: 1,
          limit: 1000,
          search,
          sortField: defaultSortField,
          sortDirection: defaultSortDirection,
        });
        
        const { rows, count } = await listRecords({
          table,
          churchId,
          page: 1,
          limit: 1000, // Load all records for AG Grid
          search,
          sortField: defaultSortField,
          sortDirection: defaultSortDirection,
        });
        
        console.log('📊 AdvancedGrid API Response:', { rows, count });
        console.log('📋 AdvancedGrid Rows:', rows);
        
        setRows(rows);
      } catch (err: any) {
        setError(err.message || 'Failed to load records');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [table, churchId, search]);

  // Handle grid ready
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    
    // Apply default sorting after grid is ready
    if (table === 'baptism_records') {
      params.api.setSortModel([{ colId: 'reception_date', sort: 'desc' }]);
    } else if (table === 'marriage_records') {
      params.api.setSortModel([{ colId: 'marriageDate', sort: 'desc' }]);
    } else if (table === 'funeral_records') {
      params.api.setSortModel([{ colId: 'dateOfFuneral', sort: 'desc' }]);
    }
  }, [table]);

  // Handle sort changes
  const onSortChanged = useCallback((event: SortChangedEvent) => {
    const sortModel = event.api.getSortModel();
    if (sortModel.length > 0) {
      console.log('Sort changed:', sortModel);
    }
  }, []);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Grid options
  const gridOptions = {
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true,
      floatingFilter: true,
      minWidth: 100,
    },
    rowData: rows,
    columnDefs,
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50, 100],
    domLayout: 'autoHeight',
    animateRows: true,
    enableCellTextSelection: true,
    suppressRowClickSelection: true,
    suppressCellFocus: true,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {table === 'baptism_records' && 'Baptism Records - Advanced Grid View'}
        {table === 'marriage_records' && 'Marriage Records - Advanced Grid View'}
        {table === 'funeral_records' && 'Funeral Records - Advanced Grid View'}
      </Typography>
      
      <Box 
        className="ag-theme-alpine" 
        sx={{ 
          width: '100%', 
          height: '600px',
          '& .ag-header-cell': {
            backgroundColor: '#f5f5f5',
            fontWeight: 'bold'
          }
        }}
      >
        <AgGridReact
          {...gridOptions}
          onGridReady={onGridReady}
          onSortChanged={onSortChanged}
        />
      </Box>
    </Box>
  );
}
