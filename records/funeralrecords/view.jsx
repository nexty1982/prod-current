// view.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import useFuneralRecords from "@/hooks/useFuneralRecords";
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

const ReadOnlyView = ({ onToggleLock }) => {
  const gridRef = useRef(null);

  // Use the funeral records hook
  const { records, loading: isLoading, error } = useFuneralRecords();

  // State management
  const [rowData, setRowData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState([]);

  // Helper: show a toast message
  const showToast = (message, bg = "info") => {
    const id = Date.now();
    setToasts((ts) => [...ts, { id, message, bg }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3000);
  };

  // When records change, update grid
  useEffect(() => {
    if (records?.length) setRowData(records);
  }, [records]);

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setRowData(records);
      return;
    }

    const filtered = records.filter(record =>
      Object.values(record).some(value =>
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    setRowData(filtered);
    showToast(`Found ${filtered.length} records matching "${searchTerm}"`);
  };

  // Read-only column definitions based on funeral records schema
  const baseCols = [
    {
      headerName: 'Name',
      field: 'name',
      flex: 1,
      editable: false,
      valueFormatter: p => `${p.data.name || ''} ${p.data.lastname || ''}`.trim(),
    },
    {
      headerName: 'Age',
      field: 'age',
      width: 80,
      editable: false,
    },
    {
      headerName: 'Date of Death',
      field: 'deceased_date',
      valueFormatter: p => formatDate(p.value),
      editable: false,
      width: 130,
    },
    {
      headerName: 'Burial Date',
      field: 'burial_date',
      valueFormatter: p => formatDate(p.value),
      editable: false,
      width: 130,
    },
    {
      headerName: 'Burial Location',
      field: 'burial_location',
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
        c => ['name', 'deceased_date', 'age'].includes(c.field)
      );
    }
    if (w < 1024) {
      return baseCols.filter(
        c => ['name', 'deceased_date', 'burial_date', 'age', 'clergy'].includes(c.field)
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

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div className="mt-2">Loading funeral records...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h5>Error Loading Records</h5>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="read-only-view" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '15px',
      padding: '20px',
      margin: '10px 0'
    }}>
      <RecordsHeader />

      <Alert variant="info" className="mb-3" style={{
        borderRadius: '15px',
        border: 'none',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
      }}>
        <strong>🔒 Read-Only Mode:</strong> You are viewing funeral records in read-only mode.
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
                placeholder="Search by name, burial location, or clergy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="sm"
                style={{
                  borderRadius: '25px',
                  border: '2px solid rgba(102, 126, 234, 0.3)',
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
                  border: '2px solid #667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  color: '#764ba2',
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
              suppressClickEdit={true}
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
};

export default ReadOnlyView;
