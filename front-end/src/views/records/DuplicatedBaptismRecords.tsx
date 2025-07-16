import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const DuplicatedBaptismRecords = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
    { headerName: 'First Name', field: 'first_name', sortable: true, filter: true },
    { headerName: 'Last Name', field: 'last_name', sortable: true, filter: true },
    { headerName: 'Date of Baptism', field: 'date_of_baptism', sortable: true, filter: true },
    { headerName: 'Place of Baptism', field: 'place_of_baptism', sortable: true, filter: true },
    { headerName: 'Priest', field: 'priest_name', sortable: true, filter: true },
    { headerName: 'Godparent(s)', field: 'godparents', sortable: true, filter: true },
    { headerName: 'Date of Birth', field: 'date_of_birth', sortable: true, filter: true },
    { headerName: 'Place of Birth', field: 'place_of_birth', sortable: true, filter: true }
  ];

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 100
  };

  const gridOptions = {
    defaultColDef,
    enableRangeSelection: true,
    enableClipboard: true,
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    animateRows: true,
    pagination: true,
    paginationPageSize: 50
  };

  // TODO: Implement data loading from API
  useEffect(() => {
    // loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Implementation for loading data from your API
      // const response = await fetch('/api/duplicatedbaptismrecords');
      // const data = await response.json();
      // setRowData(data);
    } catch (error) {
      console.error('Error loading DuplicatedBaptismRecords data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-container" style={{ height: '100%', width: '100%' }}>
      <div className="template-header" style={{ marginBottom: '20px' }}>
        <h2>Duplicated Baptism Records</h2>
        <div className="template-actions">
          <button 
            onClick={loadData} 
            disabled={loading}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact 
          rowData={rowData} 
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default DuplicatedBaptismRecords;
