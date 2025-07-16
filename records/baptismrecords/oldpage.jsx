import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Form, Button, Table, Dropdown, Card, Modal, Alert, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaPalette, FaFilePdf, FaFileExcel, FaPrint, FaFilter, FaSortAmountDown, FaSortAmountUp, FaEye, FaDownload, FaCloudUploadAlt, FaHistory, FaUndo, FaLock, FaUnlock, FaSignOutAlt } from 'react-icons/fa';
import { useAuthContext } from '@/context/useAuthContext';
import axios from 'axios';
import Pagination from './pagination';
import ReadOnlyView from './view';
import { CSVLink } from 'react-csv';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useReactToPrint } from 'react-to-print';

import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { FaFileAlt } from 'react-icons/fa';
import { saveAs } from 'file-saver';

// PDF styles for export
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#bfbfbf',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    borderWidth: 1,
    borderColor: '#bfbfbf',
    flex: 1,
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: 'grey',
  },
});

// PDF Document component
const BaptismRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Baptism Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Name</Text>
          <Text style={pdfStyles.tableCell}>Birth Date</Text>
          <Text style={pdfStyles.tableCell}>Reception Date</Text>
          <Text style={pdfStyles.tableCell}>Birthplace</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.first_name} ${record.last_name}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.birth_date ? new Date(record.birth_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{new Date(record.reception_date).toLocaleDateString()}</Text>
            <Text style={pdfStyles.tableCell}>{record.birthplace || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);

// Validation schema for record form
const baptismRecordSchema = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  birth_date: Yup.string().nullable(),
  reception_date: Yup.string().required('Reception date is required'),
  birthplace: Yup.string(),
  entry_type: Yup.string(),
  sponsors: Yup.string(),
  parents: Yup.string().required('Parents information is required'),
  clergy: Yup.string().required('Clergy is required'),
});

const BaptismRecords = () => {
  const { removeSession } = useAuthContext();
  
  // Lock state - default to unlocked (false) for better usability
  const [isLocked, setIsLocked] = useState(false);
  
  // Debug: Log the current lock state
  console.log('Baptism page - isLocked:', isLocked);
  
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [sortField, setSortField] = useState('reception_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    birthplace: '',
    clergy: '',
    entry_type: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState([]);
  const [clergyList, setClergyList] = useState([]);
  const [entryTypes, setEntryTypes] = useState(['Baptism', 'Chrismation', 'Transfer']);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recordHistory, setRecordHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [certificateZoom, setCertificateZoom] = useState(70); // Default zoom level
  // Advanced mode for individual field positioning
  const [showAdvancedPositioning, setShowAdvancedPositioning] = useState(false);
  
  // Default field offsets for optimal positioning (800x600 coordinate system)
  // Only the fields that need to be positioned on blank lines
  const DEFAULT_FIELD_OFFSETS = {
    name: { x: 400, y: 335 }, // first_name last_name
    birthplace: { x: 420, y: 350 }, // birthplace
    birthDateMD: { x: 350, y: 605 }, // birth_date MM/DD
    birthDateY: { x: 550, y: 605 }, // birth_date YYYY
    clergyBy: { x: 400, y: 425 }, // clergy after "BY"
    churchName: { x: 430, y: 440 }, // Saints Peter & Paul Orthodox Church
    receptionDateMD: { x: 350, y: 460 }, // reception_date MM/DD
    receptionDateY: { x: 485, y: 460 }, // reception_date YYYY
    sponsors: { x: 400, y: 475 }, // sponsors
    rector: { x: 465, y: 505 } // clergy on "Rector" line
  };

  // Default font sizes for each field
  const DEFAULT_FONT_SIZES = {
    name: 18,
    birthplace: 16,
    birthDateMD: 16,
    birthDateY: 16,
    clergyBy: 16,
    churchName: 16,
    receptionDateMD: 16,
    receptionDateY: 16,
    sponsors: 16,
    rector: 14
  };
  
  // Individual field offsets for precise positioning
  const [fieldOffsets, setFieldOffsets] = useState(DEFAULT_FIELD_OFFSETS);
  // Font sizes for each field
  const [fontSizes, setFontSizes] = useState(DEFAULT_FONT_SIZES);
  // Quick positioning mode for easier adjustments
  const [quickPositionMode, setQuickPositionMode] = useState(false);
  // Hidden fields for cleaner preview
  const [hiddenFields, setHiddenFields] = useState(new Set());
  
  const navigate = useNavigate();
  const printRef = useRef();
  
  // Helper function to reset field offsets to defaults
  const resetFieldOffsetsToDefaults = () => {
    setFieldOffsets({ ...DEFAULT_FIELD_OFFSETS });
    setFontSizes({ ...DEFAULT_FONT_SIZES });
    setHiddenFields(new Set()); // Also show all fields
  };
  
  // Helper function to reset individual field to default
  const resetIndividualFieldToDefault = (fieldName) => {
    setFieldOffsets(prev => ({
      ...prev,
      [fieldName]: { ...DEFAULT_FIELD_OFFSETS[fieldName] }
    }));
    setFontSizes(prev => ({
      ...prev,
      [fieldName]: DEFAULT_FONT_SIZES[fieldName]
    }));
  };
  
  // Helper function to toggle field visibility
  const toggleFieldVisibility = (fieldName) => {
    setHiddenFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fieldName)) {
        newSet.delete(fieldName);
      } else {
        newSet.add(fieldName);
      }
      return newSet;
    });
  };
  
  // Helper function to close preview modal and reset offsets
  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setCurrentRecord(null);
    setPreviewLoading(false);
    setQuickPositionMode(false);
    setShowAdvancedPositioning(false);
    setHiddenFields(new Set()); // Reset hidden fields
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
  
  // CSV headers for export
  const csvHeaders = [
    { label: 'First Name', key: 'first_name' },
    { label: 'Last Name', key: 'last_name' },
    { label: 'Birth Date', key: 'birth_date' },
    { label: 'Reception Date', key: 'reception_date' },
    { label: 'Birthplace', key: 'birthplace' },
    { label: 'Entry Type', key: 'entry_type' },
    { label: 'Sponsors', key: 'sponsors' },
    { label: 'Parents', key: 'parents' },
    { label: 'Clergy', key: 'clergy' },
  ];

  useEffect(() => {
    console.log('useEffect triggered - fetchRecords + fetchLocationsAndClergy');
    fetchRecords();
    fetchLocationsAndClergy();
  }, [currentPage, recordsPerPage, sortField, sortDirection]);

  useEffect(() => {
    console.log('useEffect triggered - search/filter change');
    if (searchTerm || filters.startDate || filters.endDate || filters.birthplace || filters.clergy || filters.entry_type) {
      const delaySearch = setTimeout(() => {
        console.log('Delayed search executing');
        setCurrentPage(1);
        fetchRecords();
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, filters]);

  const fetchLocationsAndClergy = async () => {
    try {
      const [locationsResponse, clergyResponse] = await Promise.all([
        axios.get('/api/locations'),
        axios.get('/api/clergy')
      ]);
      
      setLocations(locationsResponse.data);
      setClergyList(clergyResponse.data);
      console.log('clergyList:', clergyResponse.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchRecords = useCallback(async () => {
    console.log('fetchRecords called');
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`/api/baptism-records`, {
        params: {
          page: currentPage,
          limit: recordsPerPage,
          search: searchTerm,
          sortField,
          sortDirection,
          startDate: filters.startDate ? filters.startDate.toISOString() : null,
          endDate: filters.endDate ? filters.endDate.toISOString() : null,
          birthplace: filters.birthplace,
          clergy: filters.clergy,
          entry_type: filters.entry_type,
        },
      });
      
      console.log('fetchRecords response:', response.data);
      setRecords(response.data.records);
      setTotalRecords(response.data.totalRecords);
    } catch (error) {
      console.error('Error fetching baptism records:', error);
      setError('Failed to load records. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, recordsPerPage, searchTerm, sortField, sortDirection, filters]);

  const handleSearch = (e) => {
    console.log('handleSearch called');
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords();
  };

  const handleEdit = (record) => {
    console.log('handleEdit called with record:', record);
    setCurrentRecord(record);
    setViewMode(false);
    setShowModal(true);
  };

  const handleView = (record) => {
    setCurrentRecord(record);
    setViewMode(true);
    setShowModal(true);
  };

  const handleLogout = async () => {
    try {
      removeSession();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const handleDeleteClick = (record) => {
    console.log('handleDeleteClick called with record:', record);
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await axios.delete(`/api/baptism-records/${recordToDelete.id}`);
      fetchRecords();
      toast.success('Record deleted successfully');
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handlePageChange = (pageNumber) => {
    console.log('handlePageChange called with pageNumber:', pageNumber);
    setCurrentPage(pageNumber);
  };

  const handleSort = (field) => {
    console.log('handleSort called with field:', field);
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      birthplace: '',
      clergy: '',
      entry_type: '',
    });
    setSearchTerm('');
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    
    setIsImporting(true);
    setImportErrors([]);
    
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      const response = await axios.post('/api/baptism-records/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.errors && response.data.errors.length > 0) {
        setImportErrors(response.data.errors);
      } else {
        toast.success(`Successfully imported ${response.data.imported} records`);
        setShowImportModal(false);
        fetchRecords();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import records');
    } finally {
      setIsImporting(false);
    }
  };

  const handleViewHistory = async (record) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    
    try {
      const response = await axios.get(`/api/baptism-records/${record.id}/history`);
      setRecordHistory(response.data);
    } catch (error) {
      console.error('Error fetching record history:', error);
      toast.error('Failed to load record history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Format the date values properly for the API
      const formattedValues = {
        ...values,
        birth_date: values.birth_date ? (
          values.birth_date instanceof Date 
            ? values.birth_date.toISOString().split('T')[0] 
            : values.birth_date
        ) : null,
        reception_date: values.reception_date ? (
          values.reception_date instanceof Date 
            ? values.reception_date.toISOString().split('T')[0] 
            : values.reception_date
        ) : null,
      };

      if (currentRecord) {
        await axios.put(`/api/baptism-records/${currentRecord.id}`, formattedValues);
        toast.success('Record updated successfully');
      } else {
        await axios.post('/api/baptism-records', formattedValues);
        toast.success('Record created successfully');
      }
      
      setShowModal(false);
      fetchRecords();
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const generateCertificate = async (record) => {
    try {
      toast.info("Generating certificate...");
      
      // Create download URL with field offsets, font sizes and hidden fields as query parameters
      const offsetsParam = encodeURIComponent(JSON.stringify(fieldOffsets));
      const fontSizesParam = encodeURIComponent(JSON.stringify(fontSizes));
      const hiddenFieldsParam = encodeURIComponent(JSON.stringify(Array.from(hiddenFields)));
      const downloadUrl = `/api/certificate/baptism/${record.id}/download?offsets=${offsetsParam}&fontSizes=${fontSizesParam}&hiddenFields=${hiddenFieldsParam}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `baptism_certificate_${record.first_name}_${record.last_name}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Certificate generated successfully");
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error("Failed to generate certificate");
    }
  };

  const previewCertificate = async (record) => {
    if (!record || previewLoading) return; // Prevent multiple simultaneous requests
    
    try {
      setPreviewLoading(true);
      toast.info("Generating preview...");
      
      // Only set the current record if it's different to avoid triggering useEffect loop
      if (currentRecord?.id !== record.id) {
        setCurrentRecord(record);
      }
      
      // Send the complete record with field offsets and font sizes for fine-tuning
      const response = await axios.post(`/api/certificate/baptism/${record.id}/preview`, {
        fieldOffsets: fieldOffsets,
        fontSizes: fontSizes,
        hiddenFields: Array.from(hiddenFields)
      });

      console.log('Preview response:', response.data);

      if (response.data.success) {
        setPreviewUrl(response.data.preview);
        setShowPreviewModal(true);
        toast.dismiss();
      } else {
        throw new Error(response.data.error || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error("Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };


  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Auto-update preview when field offsets or hidden fields change
  useEffect(() => {
    if (showPreviewModal && currentRecord && !previewLoading) {
      const timeoutId = setTimeout(() => {
        previewCertificate(currentRecord);
      }, 300); // Debounce for smoother slider experience
      
      return () => clearTimeout(timeoutId);
    }
  }, [fieldOffsets, fontSizes, hiddenFields, showPreviewModal, previewLoading]); // Added fontSizes and previewLoading dependency

  // Keyboard shortcuts for positioning (when preview modal is open)
  useEffect(() => {
    if (!showPreviewModal) return;
    
    const handleKeyDown = (e) => {
      // Only handle if no input is focused
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const step = e.shiftKey ? 10 : (quickPositionMode ? 5 : 1);
      
      switch(e.key) {
        case 'r':
        case 'R':
          if (e.ctrlKey) {
            e.preventDefault();
            resetFieldOffsetsToDefaults();
          }
          break;
        case 'q':
        case 'Q':
          e.preventDefault();
          setQuickPositionMode(!quickPositionMode);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPreviewModal, quickPositionMode]);

  const testAPI = async () => {
    try {
      console.log('Testing API connectivity...');
      
      // Test the main baptism records endpoint with limit=1 to verify connectivity
      const response = await axios.get('/api/baptism-records', {
        params: {
          page: 1,
          limit: 1
        }
      });
      console.log('API Test Result:', response.data);
      console.log('Response status:', response.status);
      
      // Test certificate generation endpoint
      const certTestResponse = await axios.get('/api/certificate/baptism/test');
      console.log('Certificate Test Result:', certTestResponse.data);
      
      toast.success(`API test successful - Connected to baptism records API (Status: ${response.status}) and certificate generation is ready`);
    } catch (error) {
      console.error('API Test Failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request URL:', error.config?.url);
      toast.error(`API test failed: ${error.message} (Status: ${error.response?.status || 'No Response'})`);
    }
  };

    return (
	    <div className="fullscreen-page" style={{ 
        width: '100%', 
        height: '100%', 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh'
      }}>
	    <div className="baptism-records-container w-100 px-2 px-md-3 px-lg-4" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        margin: '20px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Header Section */}
      {/* Compact Header Row */}
      <div className="d-flex justify-content-between align-items-center mb-4" style={{
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        borderRadius: '15px',
        padding: '25px',
        color: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
      }}>
        <div>
          <h2 className="h3 mb-2" style={{ fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            Baptism Records
          </h2>
          <p className="mb-0" style={{ fontSize: '1.1rem', opacity: '0.9' }}>
            {isLocked ? '🔒 Read-only view' : '✏️ Manage records'}
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>{isLocked ? 'Unlock editing' : 'Lock view'}</Tooltip>}
          >
            <Button 
              variant={isLocked ? "light" : "warning"}
              size="sm"
              onClick={() => setIsLocked(!isLocked)}
              style={{
                borderRadius: '50px',
                padding: '10px 15px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                border: 'none'
              }}
            >
              {isLocked ? <FaLock /> : <FaUnlock />}
            </Button>
          </OverlayTrigger>
          
          <Dropdown>
            <Dropdown.Toggle 
              variant="light" 
              size="sm"
              style={{
                borderRadius: '50px',
                padding: '10px 15px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                border: 'none'
              }}
            >
              <FaDownload />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {records.length > 0 ? (
                <>
                  <Dropdown.Item as={CSVLink} data={records} headers={csvHeaders} filename="baptism_records.csv">
                    <FaFileExcel className="me-1" /> CSV
                  </Dropdown.Item>
                  <Dropdown.Item as={PDFDownloadLink} document={<BaptismRecordsPDF records={records} />} fileName="baptism_records.pdf">
                    {({ loading }) => (loading ? 'Loading...' : <><FaFilePdf className="me-1" /> PDF</>)}
                  </Dropdown.Item>
                </>
              ) : (
                <>
                  <Dropdown.Item disabled><FaFileExcel className="me-1" /> CSV (No records)</Dropdown.Item>
                  <Dropdown.Item disabled><FaFilePdf className="me-1" /> PDF (No records)</Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
          
          <Button 
            variant="light" 
            onClick={() => setShowImportModal(true)} 
            size="sm"
            style={{
              borderRadius: '50px',
              padding: '10px 15px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              border: 'none'
            }}
          >
            <FaCloudUploadAlt />
          </Button>
          
          <Button 
            variant="light" 
            onClick={testAPI} 
            size="sm"
            style={{
              borderRadius: '50px',
              padding: '10px 15px',
              fontWeight: '600',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              border: 'none'
            }}
          >
            Test API
          </Button>
          
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Logout</Tooltip>}
          >
            <Button 
              variant="outline-light" 
              onClick={handleLogout} 
              size="sm"
              style={{
                borderRadius: '50px',
                padding: '10px 15px',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.5)',
                backgroundColor: 'rgba(255,255,255,0.1)'
              }}
            >
              <FaSignOutAlt />
            </Button>
          </OverlayTrigger>
        </div>
      </div>
      
      {/* Conditional rendering based on lock state */}
      {isLocked ? (
        <ReadOnlyView />
      ) : (
        <>
      {/* Search and Controls Section */}
      <Card className="mb-4 shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-3 p-md-4">
          <Row className="mb-3 g-3">
            <Col xs={12} md={8} lg={9}>
              <Form onSubmit={handleSearch}>
                <div className="d-flex flex-column flex-sm-row gap-2">
                  <Form.Control
                    type="text"
                    placeholder="Search by name, birthplace, clergy..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow-1"
                    style={{ 
                      minHeight: '44px',
                      borderRadius: '25px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                      fontSize: '16px',
                      paddingLeft: '20px'
                    }}
                  />
                  <div className="d-flex gap-2 flex-nowrap">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="flex-shrink-0" 
                      style={{ 
                        minHeight: '44px', 
                        minWidth: '48px',
                        borderRadius: '25px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                        fontWeight: '600'
                      }}
                    >
                      <FaSearch className="d-sm-none" />
                      <span className="d-none d-sm-inline"><FaSearch className="me-1" /> Search</span>
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      className="flex-shrink-0"
                      onClick={() => setShowFilters(!showFilters)}
                      style={{ 
                        minHeight: '44px', 
                        minWidth: '48px',
                        borderRadius: '25px',
                        border: '2px solid rgba(255,255,255,0.5)',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                        fontWeight: '600'
                      }}
                    >
                      <FaFilter className="d-sm-none" />
                      <span className="d-none d-sm-inline"><FaFilter className="me-1" /> {showFilters ? 'Hide' : 'Filters'}</span>
                    </Button>
                  </div>
                </div>
              </Form>
            </Col>
            <Col xs={12} md={4} lg={3}>
              <div className="d-flex gap-2 w-100">
                <Form.Select
                  value={recordsPerPage}
                  onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                  className="flex-shrink-0"
                  style={{ 
                    minWidth: '90px', 
                    maxWidth: '130px', 
                    minHeight: '44px',
                    borderRadius: '25px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                    fontWeight: '600'
                  }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </Form.Select>
                <Button 
                  variant="success" 
                  onClick={() => {
                    console.log('Add button clicked');
                    setCurrentRecord(null);
                    setViewMode(false);
                    setShowModal(true);
                  }}
                  className="flex-grow-1"
                  disabled={isLocked}
                  style={{ 
                    minHeight: '44px',
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    border: 'none',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                    fontWeight: '600',
                    opacity: isLocked ? 0.6 : 1
                  }}
                >
                  <FaPlus className="d-sm-none" />
                  <span className="d-none d-sm-inline"><FaPlus className="me-1" /> Add New</span>
                </Button>
              </div>
            </Col>
          </Row>
          
          {showFilters && (
            <Card className="mb-3 border-0" style={{
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
            }}>
              <Card.Body className="p-2 p-md-3">
                <h6 className="mb-3" style={{ color: '#8B4513', fontWeight: '700' }}>
                  🔍 Filter Records
                </h6>
                <Row className="g-2 g-md-3">
                  <Col xs={12} sm={6} md={4} lg={3}>
                    <Form.Group className="mb-2 mb-md-3">
                      <Form.Label className="small fw-semibold">Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                        size="sm"
                        style={{ minHeight: '38px' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={3}>
                    <Form.Group className="mb-2 mb-md-3">
                      <Form.Label className="small fw-semibold">End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                        size="sm"
                        style={{ minHeight: '38px' }}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={2}>
                    <Form.Group className="mb-2 mb-md-3">
                      <Form.Label className="small fw-semibold">Birthplace</Form.Label>
                      <Form.Select
                        value={filters.birthplace}
                        onChange={(e) => handleFilterChange('birthplace', e.target.value)}
                        size="sm"
                      >
                        <option value="">All Locations</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={2}>
                    <Form.Group className="mb-2 mb-md-3">
                      <Form.Label className="small fw-semibold">Clergy</Form.Label>
                      <Form.Select
                        value={filters.clergy}
                        onChange={(e) => handleFilterChange('clergy', e.target.value)}
                        size="sm"
                      >
                        <option value="">All Clergy</option>
                        {clergyList.map((clergy, idx) => (
                          <option key={idx} value={clergy}>
                            {clergy}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={4} lg={2}>
                    <Form.Group className="mb-2 mb-md-3">
                      <Form.Label className="small fw-semibold">Entry Type</Form.Label>
                      <Form.Select
                        value={filters.entry_type}
                        onChange={(e) => handleFilterChange('entry_type', e.target.value)}
                        size="sm"
                      >
                        <option value="">All Types</option>
                        {entryTypes.map((type, index) => (
                          <option key={index} value={type}>
                            {type}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <div className="text-center text-md-end mt-3">
                  <Button variant="secondary" onClick={resetFilters}>
                    <FaUndo className="me-1" /> Reset Filters
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
          
          {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
        </Card.Body>
      </Card>
      
      {/* Records Table Card */}
      <Card className="shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-0">
          {/* Records Table */}
          <div ref={printRef} className="table-responsive">
            <Table striped bordered hover className="records-table mb-0" style={{
              borderRadius: '15px',
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.95)'
            }}>
              <thead className="table-header" style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <tr>
                  <th onClick={() => handleSort('last_name')} className="sortable-header" style={{ minWidth: '150px' }}>
                    <div className="d-flex align-items-center">
                      <span>Name</span>
                      {sortField === 'last_name' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('birth_date')} className="sortable-header d-none d-md-table-cell" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center">
                      <span>Birth Date</span>
                      {sortField === 'birth_date' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('reception_date')} className="sortable-header" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center">
                      <span className="d-none d-sm-inline">Reception Date</span>
                      <span className="d-sm-none">Reception</span>
                      {sortField === 'reception_date' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('birthplace')} className="sortable-header d-none d-lg-table-cell" style={{ minWidth: '140px' }}>
                    <div className="d-flex align-items-center">
                      <span>Birthplace</span>
                      {sortField === 'birthplace' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clergy')} className="sortable-header d-none d-md-table-cell" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center">
                      <span>Clergy</span>
                      {sortField === 'clergy' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-center" style={{ minWidth: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <Spinner animation="border" role="status" size="sm">
                        <span className="visually-hidden">Loading...</span>
                      </Spinner>
                      <div className="mt-2 text-muted">Loading records...</div>
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td className="text-nowrap">
                        <div className="fw-semibold">{`${record.first_name} ${record.last_name}`}</div>
                        <div className="d-md-none small text-muted">
                          {record.birth_date ? new Date(record.birth_date).toLocaleDateString() : 'Birth: N/A'}
                          {record.birthplace && ` • ${record.birthplace}`}
                        </div>
                      </td>
                      <td className="d-none d-md-table-cell">{record.birth_date ? new Date(record.birth_date).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <div>{new Date(record.reception_date).toLocaleDateString()}</div>
                        <div className="d-lg-none small text-muted">
                          {record.birthplace && `${record.birthplace}`}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">{record.birthplace || 'N/A'}</td>
                      <td className="d-none d-md-table-cell">{record.clergy}</td>
                      <td className="text-center">
                        <div className="d-flex flex-wrap gap-1 justify-content-center">
                          <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                            <Button variant="info" size="sm" onClick={() => handleView(record)} style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: 'none',
                              margin: '1px'
                            }}>
                              <FaEye />
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Edit Record</Tooltip>}>
                            <Button variant="primary" size="sm" onClick={() => handleEdit(record)} disabled={isLocked} style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: 'none',
                              margin: '1px',
                              opacity: isLocked ? 0.5 : 1
                            }}>
                              <FaEdit />
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Delete Record</Tooltip>}>
                            <Button variant="danger" size="sm" onClick={() => handleDeleteClick(record)} disabled={isLocked} style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: 'none',
                              margin: '1px',
                              opacity: isLocked ? 0.5 : 1
                            }}>
                              <FaTrash />
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>View History</Tooltip>}>
                            <Button variant="secondary" size="sm" onClick={() => handleViewHistory(record)} style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: 'none',
                              margin: '1px'
                            }}>
                              <FaHistory />
                            </Button>
                          </OverlayTrigger>
                          <OverlayTrigger placement="top" overlay={<Tooltip>Generate Certificate</Tooltip>}>
                            <Button
                              variant="success"
                              size="sm"
                              onClick={e => {
                              e.stopPropagation();
                              generateCertificate(record);
                            }}
                            style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: 'none',
                              margin: '1px'
                            }}
                          >
                            <FaFileAlt />
                          </Button>
                        </OverlayTrigger>
                        <OverlayTrigger placement="top" overlay={<Tooltip>Preview Certificate</Tooltip>}>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              previewCertificate(record);
                            }}
                            style={{ 
                              minWidth: '32px', 
                              minHeight: '32px',
                              borderRadius: '8px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              border: '1px solid #dee2e6',
                              margin: '1px'
                            }}
                          >
                            <FaEye />
                          </Button>
                        </OverlayTrigger>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <div className="text-muted">
                        <FaSearch className="mb-2" size={24} />
                        <div>No records found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {/* Pagination and Record Count */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-3 pt-3 px-3 border-top">
            <div className="text-muted small">
              Showing {records.length} of {totalRecords} records
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalRecords / recordsPerPage)}
              onPageChange={handlePageChange}
            />
          </div>
        </Card.Body>
      </Card>
      
      {/* Record Form Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" className="responsive-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h5">
            {viewMode ? 'Baptism Record Details' : currentRecord ? 'Edit Baptism Record' : 'Add New Baptism Record'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-3 px-md-4">
          {viewMode ? (
            currentRecord && (
              <div className="record-details">
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <div className="mb-3">
                      <strong className="text-muted small">Name:</strong>
                      <div>{`${currentRecord.first_name} ${currentRecord.last_name}`}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Birth Date:</strong>
                      <div>{currentRecord.birth_date ? new Date(currentRecord.birth_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Reception Date:</strong>
                      <div>{new Date(currentRecord.reception_date).toLocaleDateString()}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Birthplace:</strong>
                      <div>{currentRecord.birthplace || 'N/A'}</div>
                    </div>
                  </Col>
                  <Col xs={12} md={6}>
                    <div className="mb-3">
                      <strong className="text-muted small">Entry Type:</strong>
                      <div>{currentRecord.entry_type || 'N/A'}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Parents:</strong>
                      <div>{currentRecord.parents || 'N/A'}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Sponsors:</strong>
                      <div>{currentRecord.sponsors || 'N/A'}</div>
                    </div>
                    <div className="mb-3">
                      <strong className="text-muted small">Clergy:</strong>
                      <div>{currentRecord.clergy}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            )
          ) : (
            <Formik
              initialValues={{
                first_name: currentRecord?.first_name || '',
                last_name: currentRecord?.last_name || '',
                birth_date: currentRecord?.birth_date ? currentRecord.birth_date.split('T')[0] : '',
                reception_date: currentRecord?.reception_date ? currentRecord.reception_date.split('T')[0] : '',
                birthplace: currentRecord?.birthplace || '',
                entry_type: currentRecord?.entry_type || 'Baptism',
                sponsors: currentRecord?.sponsors || '',
                parents: currentRecord?.parents || '',
                clergy: currentRecord?.clergy || '',
              }}
              validationSchema={baptismRecordSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="first_name"
                          value={values.first_name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.first_name && errors.first_name}
                        />
                        <Form.Control.Feedback type="invalid">{errors.first_name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="last_name"
                          value={values.last_name}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.last_name && errors.last_name}
                        />
                        <Form.Control.Feedback type="invalid">{errors.last_name}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
		      <Row>
  <Col md={6}>
    <Form.Group className="mb-3">
      <Form.Label className="small fw-semibold">Birth Date</Form.Label>
      <Form.Control
        type="date"
        name="birth_date"
        size="sm"
        value={values.birth_date || ''}
        onChange={(e) => setFieldValue('birth_date', e.target.value)}
        onBlur={handleBlur}
        isInvalid={touched.birth_date && errors.birth_date}
        style={{ minHeight: '38px' }}
      />
      {touched.birth_date && errors.birth_date && (
        <div className="invalid-feedback d-block small">{errors.birth_date}</div>
      )}
    	</Form.Group>
  		</Col>
  		<Col md={6}>
    		<Form.Group className="mb-3">
      		<Form.Label className="small fw-semibold">Reception Date</Form.Label>
      		<Form.Control
        type="date"
        name="reception_date"
        size="sm"
        value={values.reception_date || ''}
        onChange={(e) => setFieldValue('reception_date', e.target.value)}
        onBlur={handleBlur}
        isInvalid={touched.reception_date && errors.reception_date}
        style={{ minHeight: '38px' }}
      />
      		{touched.reception_date && errors.reception_date && (
        	<div className="invalid-feedback d-block small">{errors.reception_date}</div>
      		)}
    		</Form.Group>
  		</Col>
		</Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Birthplace</Form.Label>
                        <Form.Control
                          type="text"
                          name="birthplace"
                          value={values.birthplace}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.birthplace && errors.birthplace}
                        />
                        <Form.Control.Feedback type="invalid">{errors.birthplace}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Entry Type</Form.Label>
                        <Form.Select
                          name="entry_type"
                          value={values.entry_type}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.entry_type && errors.entry_type}
                        >
                          <option value="">Select Entry Type</option>
                          {entryTypes.map((type, index) => (
                            <option key={index} value={type}>
                              {type}
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">{errors.entry_type}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Parents</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="parents"
                      value={values.parents}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.parents && errors.parents}
                    />
                    <Form.Control.Feedback type="invalid">{errors.parents}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Sponsors</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="sponsors"
                      value={values.sponsors}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.sponsors && errors.sponsors}
                    />
                    <Form.Control.Feedback type="invalid">{errors.sponsors}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Clergy</Form.Label>
                    <Form.Select
                      name="clergy"
                      value={values.clergy}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.clergy && errors.clergy}
                    >
                      <option value="">Select Clergy</option>
                      {clergyList.map((clergy, idx) => (
                        <option key={idx} value={clergy}>
                          {clergy}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.clergy}</Form.Control.Feedback>
                  </Form.Group>
                  <div className="d-flex justify-content-end">
                    <Button variant="secondary" className="me-2" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                          <span className="ms-2">Saving...</span>
                        </>
                      ) : (
                        'Save Record'
                      )}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}
        </Modal.Body>
        {viewMode && (
          <Modal.Footer>
            <Button variant="success" onClick={() => generateCertificate(currentRecord)}>
              <FaFileAlt /> Generate Certificate
            </Button>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => {
              setViewMode(false);
              setCurrentRecord(currentRecord);
            }}>
              Edit Record
            </Button>
          </Modal.Footer>
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the baptism record for <strong>{recordToDelete ? `${recordToDelete.first_name} ${recordToDelete.last_name}` : ''}</strong>? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Record
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Baptism Records</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleImportSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Upload CSV or Excel File</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                required
              />
              <Form.Text className="text-muted">
                File should contain columns for first_name, last_name, birth_date, reception_date, birthplace, entry_type, sponsors, parents, and clergy.
              </Form.Text>
            </Form.Group>
            
            {importErrors.length > 0 && (
              <Alert variant="warning">
                <Alert.Heading>Import Warnings</Alert.Heading>
                <ul>
                  {importErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}
            
            <div className="d-flex justify-content-end">
              <Button variant="secondary" className="me-2" onClick={() => setShowImportModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isImporting || !importFile}>
                {isImporting ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Importing...</span>
                  </>
                ) : (
                  'Import Records'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Record History Modal */}
      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Record History</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {historyLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading history...</span>
              </Spinner>
            </div>
          ) : recordHistory.length > 0 ? (
            <div className="history-timeline">
              {recordHistory.map((entry, index) => (
                <div key={index} className="history-item">
                  <div className="history-date">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="history-content">
                    <h6>{entry.action}</h6>
                    <p><strong>By:</strong> {entry.user}</p>
                    {entry.changes && (
                      <div className="changes-list">
                        <h6>Changes:</h6>
                        <ul>
                          {Object.entries(entry.changes).map(([field, values]) => (
                            <li key={field}>
                              <strong>{field}:</strong> {values.from} → {values.to}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center">No history available for this record.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Preview Modal */}
      <Modal 
        show={showPreviewModal} 
        onHide={closePreviewModal} 
        size="xl" 
        backdrop="static" 
        className="certificate-preview-modal"
        style={{ 
          '--bs-modal-width': '95vw',
          '--bs-modal-height': '90vh'
        }}
      >
        <Modal.Header closeButton className="py-2">
          <Modal.Title className="d-flex align-items-center justify-content-between w-100">
            <span>Certificate Preview & Field Positioning</span>
            <div className="d-flex gap-2 align-items-center">
              {/* Zoom Control */}
              <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.85rem' }}>
                <span className="text-muted">Zoom:</span>
                <input
                  type="range"
                  className="form-range"
                  min="20"
                  max="150"
                  step="10"
                  value={certificateZoom}
                  onChange={(e) => setCertificateZoom(parseInt(e.target.value))}
                  style={{ width: '80px' }}
                />
                <span className="text-muted" style={{ minWidth: '35px' }}>{certificateZoom}%</span>
              </div>
              <Button 
                size="sm" 
                variant="outline-secondary" 
                onClick={() => setCertificateZoom(30)}
                style={{ fontSize: '0.7rem' }}
              >
                Fit Window
              </Button>
              <Button 
                size="sm" 
                variant={showAdvancedPositioning ? "primary" : "outline-primary"}
                onClick={() => setShowAdvancedPositioning(!showAdvancedPositioning)}
                style={{ fontSize: '0.75rem' }}
              >
                {showAdvancedPositioning ? "🔧 Hide" : "🔧 Show"}
              </Button>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0" style={{ height: 'calc(90vh - 120px)', overflow: 'hidden' }}>
          <div className="d-flex flex-column h-100">
            {/* Collapsible Controls Panel */}
            {showAdvancedPositioning && (
              <div className="border-bottom bg-light" style={{ 
                overflowY: 'auto', 
                maxHeight: '120px', // Reduced from 200px
                flexShrink: 0,
                padding: '8px' // Reduced padding
              }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <Alert variant="success" className="py-1 mb-0" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                    <small><strong>✅ Smart Mapping</strong></small>
                  </Alert>
                  <div className="d-flex gap-1">
                    <Button 
                      size="sm" 
                      variant={quickPositionMode ? "info" : "outline-info"}
                      onClick={() => setQuickPositionMode(!quickPositionMode)}
                      style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                    >
                      {quickPositionMode ? "⚡ Quick" : "🎯 Precise"}
                    </Button>
                    <Badge 
                      bg={quickPositionMode ? "info" : "secondary"}
                      style={{ fontSize: '0.6rem' }}
                    >
                      ±{quickPositionMode ? "1200" : "600"}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline-warning" 
                      onClick={resetFieldOffsetsToDefaults}
                      style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                    >
                      🔄 Reset
                    </Button>
                  </div>
                </div>
                
                {/* Ultra-compact horizontal field controls */}
                <div className="d-flex gap-1" style={{ 
                  overflowX: 'auto', 
                  paddingBottom: '4px',
                  flexWrap: 'nowrap'
                }}>
                  {Object.entries(fieldOffsets).map(([fieldName, offset]) => {
                    const fieldLabels = {
                      name: 'Name',
                      birthplace: 'Birthplace', 
                      birthDateMD: 'Birth Date (MM/DD)',
                      birthDateY: 'Birth Year (YYYY)',
                      clergyBy: 'Clergy (BY)',
                      churchName: 'Church Name',
                      receptionDateMD: 'Reception Date (MM/DD)',
                      receptionDateY: 'Reception Year (YYYY)',
                      sponsors: 'Sponsors',
                      rector: 'Rector'
                    };
                    
                    const stepSize = quickPositionMode ? 20 : 5;
                    const maxX = 800;
                    const maxY = 600;
                    
                    // Don't render this field control if it's hidden
                    if (hiddenFields.has(fieldName)) {
                      return null;
                    }
                    
                    return (
                      <div 
                        key={fieldName}
                        className="border rounded bg-white flex-shrink-0"
                        style={{ 
                          minWidth: '120px',
                          maxWidth: '120px',
                          padding: '4px 6px'
                        }}
                      >
                        {/* Header with field name and hide button */}
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="text-truncate fw-bold" style={{ fontSize: '0.65rem' }}>
                            {fieldLabels[fieldName]}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline-danger"
                            onClick={() => toggleFieldVisibility(fieldName)}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 4px', 
                              lineHeight: '1',
                              minWidth: '16px',
                              height: '16px'
                            }}
                            title="Hide this field control"
                          >
                            ✕
                          </Button>
                        </div>
                        
                        {/* Coordinates display */}
                        <div className="text-center mb-1" style={{ fontSize: '0.55rem', color: '#666' }}>
                          {offset.x}, {offset.y}
                        </div>
                        
                        {/* Ultra-compact X controls */}
                        <div className="d-flex align-items-center gap-1 mb-1">
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], x: Math.max(0, prev[fieldName].x - stepSize) }
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            ◀
                          </Button>
                          <input
                            type="range"
                            className="form-range"
                            min={0}
                            max={maxX}
                            step={stepSize}
                            value={offset.x}
                            onChange={e => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], x: parseInt(e.target.value) }
                            }))}
                            style={{ 
                              height: '6px', 
                              flex: '1',
                              margin: '0 2px'
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], x: Math.min(maxX, prev[fieldName].x + stepSize) }
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            ▶
                          </Button>
                        </div>
                        
                        {/* Ultra-compact Y controls */}
                        <div className="d-flex align-items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], y: Math.max(0, prev[fieldName].y - stepSize) }
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            ▲
                          </Button>
                          <input
                            type="range"
                            className="form-range"
                            min={0}
                            max={maxY}
                            step={stepSize}
                            value={offset.y}
                            onChange={e => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], y: parseInt(e.target.value) }
                            }))}
                            style={{ 
                              height: '6px', 
                              flex: '1',
                              margin: '0 2px'
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFieldOffsets(prev => ({
                              ...prev,
                              [fieldName]: { ...prev[fieldName], y: Math.min(maxY, prev[fieldName].y + stepSize) }
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            ▼
                          </Button>
                        </div>
                        
                        {/* Ultra-compact font size controls */}
                        <div className="d-flex align-items-center gap-1 mt-1">
                          <span className="text-muted" style={{ fontSize: '0.55rem' }}>
                            {fontSizes[fieldName]}px
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFontSizes(prev => ({
                              ...prev,
                              [fieldName]: Math.max(8, prev[fieldName] - 1)
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            −
                          </Button>
                          <input
                            type="range"
                            className="form-range"
                            min={8}
                            max={24}
                            step={1}
                            value={fontSizes[fieldName]}
                            onChange={e => setFontSizes(prev => ({
                              ...prev,
                              [fieldName]: parseInt(e.target.value)
                            }))}
                            style={{ 
                              height: '6px', 
                              flex: '1',
                              margin: '0 2px'
                            }}
                          />
                          <Button 
                            size="sm" 
                            variant="outline-secondary"
                            onClick={() => setFontSizes(prev => ({
                              ...prev,
                              [fieldName]: Math.min(24, prev[fieldName] + 1)
                            }))}
                            style={{ 
                              fontSize: '0.5rem', 
                              padding: '1px 3px', 
                              lineHeight: '1',
                              minWidth: '18px',
                              height: '16px'
                            }}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show hidden fields as ultra-compact items */}
                  {hiddenFields.size > 0 && (
                    <div className="border rounded bg-light flex-shrink-0 d-flex align-items-center gap-1" 
                         style={{ 
                           minWidth: '80px',
                           padding: '4px 6px'
                         }}>
                      <small className="text-muted" style={{ fontSize: '0.6rem' }}>
                        Hidden ({hiddenFields.size})
                      </small>
                      {Array.from(hiddenFields).slice(0, 3).map(fieldName => (
                        <Button 
                          key={fieldName}
                          size="sm" 
                          variant="outline-success"
                          onClick={() => toggleFieldVisibility(fieldName)}
                          style={{ 
                            fontSize: '0.5rem', 
                            padding: '1px 3px', 
                            lineHeight: '1',
                            minWidth: '16px',
                            height: '16px'
                          }}
                          title={`Show ${fieldName}`}
                        >
                          {fieldName.charAt(0).toUpperCase()}
                        </Button>
                      ))}
                      {hiddenFields.size > 3 && (
                        <span style={{ fontSize: '0.5rem' }}>+{hiddenFields.size - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Preview Area - Always fills remaining space */}
            <div className="flex-grow-1 d-flex align-items-center justify-content-center position-relative" style={{ 
              minHeight: '400px', 
              overflow: 'hidden',
              backgroundColor: '#f8f9fa'
            }}>
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    className="certificate-image"
                    style={{ 
                      maxWidth: `${certificateZoom}%`,
                      maxHeight: `${certificateZoom}%`,
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      backgroundColor: 'white',
                      border: '1px solid #dee2e6',
                      transition: 'all 0.3s ease'
                    }}
                    alt="Certificate Preview"
                  />
                  
                  {/* Zoom indicator */}
                  <div 
                    className="position-absolute top-0 end-0 m-2 badge bg-secondary"
                    style={{ fontSize: '0.7rem', opacity: 0.8 }}
                  >
                    {certificateZoom}%
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading preview...</span>
                  </Spinner>
                  <div className="mt-2 text-muted">Generating certificate preview...</div>
                </div>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="py-2">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setCertificateZoom(30)}
              >
                Fit Window
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setCertificateZoom(70)}
              >
                Fit Preview
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setCertificateZoom(100)}
              >
                Actual Size
              </Button>
            </div>
            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={closePreviewModal}>
                Close
              </Button>
              {currentRecord && (
                <Button 
                  variant="success" 
                  onClick={() => {
                    generateCertificate(currentRecord);
                    closePreviewModal();
                  }}
                >
                  Generate Certificate
                </Button>
              )}
            </div>
          </div>
        </Modal.Footer>
      </Modal>
      
        <style jsx="true">{`
  	.baptism-records-container {
    	padding: 20px;
    	transition: all 0.3s ease;
    	width: 100% !important;
    	max-width: none !important;
    	margin: 0 !important;
 	 }
        
        
        /* Responsive table improvements */
        .records-table {
          font-size: 0.875rem;
        }
        
          .records-table td {
            padding: 0.5rem 0.25rem;
            vertical-align: middle;
          }
          
          .records-table th {
            padding: 0.5rem 0.25rem;
            font-size: 0.75rem;
            font-weight: 600;
          }
        }
        
        /* Table header styling */
        .table-header th {
          background-color: var(--bs-gray-100);
          border-bottom: 2px solid var(--bs-gray-300);
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        /* Touch-friendly button sizes */
        .btn-sm {
          min-height: 32px;
          min-width: 32px;
        }
        
        /* Dropdown improvements */
        .dropdown-menu {
          min-width: 200px;
        }
        
        /* Form control improvements */
        .form-control:focus,
        .form-select:focus {
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
          border-color: #86b7fe;
        }
        
        /* Responsive modal improvements */
        .responsive-modal .modal-dialog {
          margin: 0.5rem;
        }
        
        /* Certificate Preview Modal */
        .certificate-preview-modal .modal-dialog {
          max-width: 95vw;
          width: 95vw;
          height: 90vh;
          margin: 2.5vh auto;
        }
        
        .certificate-preview-modal .modal-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .certificate-preview-modal .modal-body {
          flex: 1;
          overflow: hidden;
        }
        
        /* Certificate image transitions */
        .certificate-image {
          transition: all 0.3s ease;
        }
        
        .certificate-image:hover {
          transform: scale(1.02);
        }
        
        /* Print styles */
        @media print {
          .baptism-records-container {
            background: white !important;
            color: black !important;
          }
          
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          
          .btn, .dropdown, .pagination {
            display: none !important;
          }
          
          .table {
            font-size: 0.75rem;
          }
        }
        
        .history-timeline {
          color: #6c757d;
          margin-bottom: 5px;
        }
        
        .history-content {
          padding: 15px;
          background: #f8f9fa;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .resizable-modal .modal-dialog {
          max-width: 95vw;
          width: 95vw;
          resize: both;
          overflow: auto;
        }
        
        .resizable-modal .modal-content {
          height: 100%;
          resize: both;
          overflow: auto;
        }
        
        /* Certificate preview enhancements */
        .certificate-preview-container {
          background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
                      linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        
        .certificate-image {
          transition: transform 0.2s ease;
        }
        
        .certificate-image:hover {
          transform: scale(1.02);
        }
        
        /* Field positioning controls styling */
        .field-controls {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(5px);
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        /* Controls panel styling */
        .controls-panel {
          background: rgba(248, 249, 250, 0.98);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          max-height: 200px;
          overflow-y: auto;
        }
        
        .controls-panel.collapsed {
          max-height: 40px;
          overflow: hidden;
        }
        
        .controls-panel h6 {
          margin: 0;
          padding: 10px 15px;
          background: rgba(13, 110, 253, 0.1);
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(13, 110, 253, 0.2);
          font-size: 0.9rem;
          font-weight: 600;
          color: #0d6efd;
        }
        
        /* Horizontal field controls */
        .field-controls-horizontal {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 10px;
          background: white;
          border-radius: 0 0 8px 8px;
          scrollbar-width: thin;
        }
        
        .field-controls-horizontal::-webkit-scrollbar {
          height: 6px;
        }
        
        .field-controls-horizontal::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .field-controls-horizontal::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .field-controls-horizontal::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Individual field control styling */
        .field-control {
          min-width: 120px;
          width: 120px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e9ecef;
          border-radius: 6px;
          padding: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        
        .field-control:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .field-control-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 4px;
          text-align: center;
          line-height: 1.2;
        }
        
        .field-control-coords {
          display: flex;
          gap: 4px;
          margin-bottom: 4px;
        }
        
        .field-control-coords .form-control {
          height: 24px;
          font-size: 0.7rem;
          padding: 2px 4px;
          border-radius: 3px;
          text-align: center;
        }
        
        .field-control-sliders {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-bottom: 4px;
        }
        
        .field-control-slider {
          height: 16px;
          border-radius: 8px;
          background: #e9ecef;
          outline: none;
          transition: background 0.2s ease;
        }
        
        .field-control-slider:hover {
          background: #dee2e6;
        }
        
        .field-control-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        .field-control-slider::-webkit-slider-thumb:hover {
          background: #0b5ed7;
          transform: scale(1.1);
        }
        
        .field-control-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        .field-control-slider::-moz-range-thumb:hover {
          background: #0b5ed7;
          transform: scale(1.1);
        }
        
        .field-control-buttons {
          display: flex;
          gap: 2px;
        }
        
        .field-control-buttons .btn {
          padding: 2px 6px;
          font-size: 0.65rem;
          border-radius: 3px;
          flex: 1;
          min-height: 20px;
        }
        
        .field-control-coordinate-display {
          font-size: 0.65rem;
          color: #6c757d;
          text-align: center;
          margin-top: 2px;
          font-family: monospace;
        }
        
        /* Hidden fields section */
        .hidden-fields-section {
          background: rgba(255, 193, 7, 0.1);
          border-radius: 6px;
          padding: 8px;
          margin-top: 8px;
          border: 1px solid rgba(255, 193, 7, 0.3);
        }
        
        .hidden-fields-section h6 {
          font-size: 0.75rem;
          color: #856404;
          margin-bottom: 6px;
          font-weight: 600;
        }
        
        .hidden-fields-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .hidden-field-item {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.8);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          border: 1px solid rgba(255, 193, 7, 0.4);
        }
        
        .hidden-field-item .btn {
          padding: 1px 4px;
          font-size: 0.6rem;
          border-radius: 2px;
          min-height: 16px;
          line-height: 1;
        }
        
        /* Zoom controls */
        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(248, 249, 250, 0.9);
          border-radius: 6px;
          margin-bottom: 10px;
        }
        
        .zoom-controls .form-range {
          flex: 1;
          max-width: 200px;
        }
        
        .zoom-controls .btn {
          padding: 4px 8px;
          font-size: 0.75rem;
        }
        
        /* Certificate preview positioning */
        .certificate-preview-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
                      linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          border-radius: 8px;
          overflow: auto;
          padding: 20px;
        }
        
        .certificate-image {
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          border-radius: 8px;
          transition: all 0.3s ease;
          max-width: 100%;
          height: auto;
        }
        
        .certificate-image:hover {
          transform: scale(1.01);
          box-shadow: 0 6px 25px rgba(0,0,0,0.2);
        }
        
        /* Modal responsive adjustments */
        @media (max-width: 768px) {
          .certificate-preview-modal .modal-dialog {
            width: 98vw;
            max-width: 98vw;
            margin: 1vh auto;
            height: 95vh;
          }
          
          .field-control {
            min-width: 100px;
            width: 100px;
          }
          
          .controls-panel {
            max-height: 150px;
          }
        }
      `}</style>
        </>
      )}
	    </div>
    </div>
  );
};

export default BaptismRecords;
