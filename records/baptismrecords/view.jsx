import React, { useState, useEffect, useRef, useMemo } from "react";
import useBaptismRecords from "@/hooks/useBaptismRecords";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  Toast,
  ToastContainer,
  Button,
  Card,
  Alert,
  Spinner,
  Form
} from "react-bootstrap";
import { FaSearch } from "react-icons/fa";
import { formatDate } from "@/utils/formatters";
import bmfImage from "@/assets/images/bmf.png";

ModuleRegistry.registerModules([AllCommunityModule]);

function RecordsHeader() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAreaClick = (e, pageName) => {
    e.preventDefault();
    setToastMessage(`Navigating to ${pageName}...`);
    setShowToast(true);
    setTimeout(() => {
      window.location.href = e.currentTarget.href;
    }, 1000);
  };

  return (
    <div className="text-center my-4">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <img
          src={bmfImage}
          alt="Baptisms, Marriages, Funerals"
          style={{
            width: "100%",
            maxWidth: "300px",
            height: "150px",
            marginBottom: "1.5rem",
          }}
          useMap="#bmf-map"
        />
        <map name="bmf-map">
          {/* Left third - Baptism */}
          <area 
            shape="rect" 
            coords="0,0,100,150" 
            href="/pages/baptismrecords" 
            alt="Baptism Records"
            onClick={(e) => handleAreaClick(e, 'Baptism Records')}
          />
          {/* Middle third - Marriage */}
          <area 
            shape="rect" 
            coords="100,0,200,150" 
            href="/pages/marriagerecords" 
            alt="Marriage Records"
            onClick={(e) => handleAreaClick(e, 'Marriage Records')}
          />
          {/* Right third - Funeral */}
          <area 
            shape="rect" 
            coords="200,0,300,150" 
            href="/pages/funeralrecords" 
            alt="Funeral Records"
            onClick={(e) => handleAreaClick(e, 'Funeral Records')}
          />
        </map>
      </div>
      
      {/* Toast notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={1000} autohide>
          <Toast.Header>
            <strong className="me-auto">Navigation</strong>
          </Toast.Header>
          <Toast.Body>{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}

export default function ReadOnlyView() {
  const gridRef = useRef(null);

  // Custom hook for initial data only (no editing functions needed)
  const {
    records: baptismRecords,
    loading,
    error,
  } = useBaptismRecords();

  // Simplified state for read-only view
  const [rowData, setRowData] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper: show a toast message
  const showToast = (message, bg = "info") => {
    const id = Date.now();
    setToasts((ts) => [...ts, { id, message, bg }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3000);
  };

  // When records change, update grid
  useEffect(() => {
    if (baptismRecords?.length) setRowData(baptismRecords);
  }, [baptismRecords]);

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setRowData(baptismRecords);
      return;
    }
    
    const filtered = baptismRecords.filter(record =>
      Object.values(record).some(value =>
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    
    setRowData(filtered);
    showToast(`Found ${filtered.length} records matching "${searchTerm}"`);
  };

  // Read-only column definitions (no editing, no actions)
  const baseCols = [
    {
      headerName: 'First Name',
      field: 'first_name',
      flex: 1,
      editable: false,
    },
    {
      headerName: 'Last Name',
      field: 'last_name',
      flex: 1,
      editable: false,
    },
    {
      headerName: 'Birth Date',
      field: 'birth_date',
      valueFormatter: p => formatDate(p.value),
      editable: false,
    },
    {
      headerName: 'Reception Date',
      field: 'reception_date',
      valueFormatter: p => formatDate(p.value),
      editable: false,
    },
    {
      headerName: 'Birthplace',
      field: 'birthplace',
      flex: 1,
      editable: false,
    },
    {
      headerName: 'Entry Type',
      field: 'entry_type',
      editable: false,
    },
    {
      headerName: 'Sponsors',
      field: 'sponsors',
      flex: 1,
      editable: false,
    },
    {
      headerName: 'Parents',
      field: 'parents',
      flex: 1,
      editable: false,
    },
    {
      headerName: 'Clergy',
      field: 'clergy',
      flex: 1,
      editable: false,
      valueFormatter: p =>
        (p.value || '').replace(/\b\w/g, c => c.toUpperCase()),
    },
  ];

  // Default column definition for read-only grid
  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    suppressHeaderMenuButton: false,
    flex: 1,
    minWidth: 100,
    editable: false, // Ensure all columns are read-only
  }), []);

  // Responsive columns for different screen sizes (read-only)
  function getResponsiveColumnDefs() {
    const w = window.innerWidth;
    if (w < 768) {
      return baseCols.filter(
        c => ['first_name', 'last_name', 'birth_date'].includes(c.field)
      );
    }
    if (w < 1024) {
      return baseCols.filter(
        c => ['first_name', 'last_name', 'birth_date', 'reception_date', 'clergy'].includes(c.field)
      );
    }
    return baseCols;
  }

  const responsiveColumnDefs = useMemo(() => getResponsiveColumnDefs(), []);

  // Update grid on resize
  useEffect(() => {
    const onResize = () => {
      gridRef.current?.api?.setColumnDefs(getResponsiveColumnDefs());
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="mt-2">Loading baptism records...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mt-3">
        {error}
      </Alert>
    );
  }

  return (
    <div className="read-only-view" style={{
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      borderRadius: '15px',
      padding: '20px',
      margin: '10px 0'
    }}>
      <RecordsHeader />
      
      <Alert variant="info" className="mb-3" style={{
        borderRadius: '15px',
        border: 'none',
        background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
        color: 'white',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <strong>🔒 Read-Only Mode:</strong> You are viewing baptism records in read-only mode. 
        Click the unlock button above to enable editing.
      </Alert>

      {/* Search Bar */}
      <Card className="mb-3 shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'rgba(255,255,255,0.8)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-2">
          <Form onSubmit={handleSearch}>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Search by name, birthplace, or clergy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
                style={{
                  borderRadius: '25px',
                  border: '2px solid rgba(116, 185, 255, 0.3)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.1)',
                  paddingLeft: '15px'
                }}
              />
              <Button 
                variant="outline-primary" 
                type="submit" 
                size="sm"
                style={{
                  borderRadius: '25px',
                  border: '2px solid #74b9ff',
                  backgroundColor: 'rgba(116, 185, 255, 0.1)',
                  color: '#0984e3',
                  fontWeight: '600'
                }}
              >
                <FaSearch />
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Records Table */}
      <Card className="shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-1">
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              columnDefs={responsiveColumnDefs}
              defaultColDef={defaultColDef}
              domLayout='normal'
              animateRows={true}
              pagination={true}
              paginationPageSize={10}
              onGridReady={params => params.api.sizeColumnsToFit()}
              overlayLoadingTemplate={
                `<span class="ag-overlay-loading-center">Loading...</span>`
              }
              overlayNoRowsTemplate={
                `<span class="ag-overlay-loading-center">No records found</span>`
              }
            />
          </div>
        </Card.Body>
      </Card>

      <div className="text-center mt-3">
        <small className="text-muted">
          Showing {rowData.length} records
        </small>
      </div>

      {/* Toasts Container */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} bg={toast.bg} className="mb-2" onClose={() => setToasts(ts => ts.filter(t => t.id !== toast.id))}>
            <Toast.Body className="text-white">{toast.message}</Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
}
