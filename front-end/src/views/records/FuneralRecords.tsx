import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const FuneralRecords = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
    { headerName: 'Deceased Name', field: 'deceased_name', sortable: true, filter: true },
    { headerName: 'Date of Death', field: 'death_date', sortable: true, filter: true },
    { headerName: 'Date of Funeral', field: 'funeral_date', sortable: true, filter: true },
    { headerName: 'Place of Death', field: 'place_of_death', sortable: true, filter: true },
    { headerName: 'Burial Location', field: 'burial_site', sortable: true, filter: true },
    { headerName: 'Priest', field: 'priest_name', sortable: true, filter: true },
    { headerName: 'Age at Death', field: 'age_at_death', sortable: true, filter: true },
    { headerName: 'Cause of Death', field: 'cause_of_death', sortable: true, filter: true },
    { headerName: 'Spouse Name', field: 'spouse_name', sortable: true, filter: true },
    { headerName: 'Father\'s Name', field: 'father_name', sortable: true, filter: true },
    { headerName: 'Mother\'s Name', field: 'mother_name', sortable: true, filter: true },
    { headerName: 'Cemetery', field: 'cemetery_name', sortable: true, filter: true }
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
      // const response = await fetch('/api/funeralrecords');
      // const data = await response.json();
      // setRowData(data);
    } catch (error) {
      console.error('Error loading FuneralRecords data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-container" style={{ height: '100%', width: '100%' }}>
      <div className="template-header" style={{ marginBottom: '20px' }}>
        <h2>Funeral Records</h2>
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

export default FuneralRecords;
