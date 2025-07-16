import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Table, Dropdown, Card, Modal, Alert, Badge, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaPalette, FaFilePdf, FaFileExcel, FaPrint, FaFilter, FaSortAmountDown, FaSortAmountUp, FaEye, FaDownload, FaCloudUploadAlt, FaHistory, FaUndo, FaLock, FaUnlock, FaSignOutAlt } from 'react-icons/fa';
import { useAuthContext } from '@/context/useAuthContext';
import axios from 'axios';
import Pagination from './pagination';
import { CSVLink } from 'react-csv';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { useReactToPrint } from 'react-to-print';
import ReadOnlyView from './view';

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
const MarriageRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Marriage Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Groom</Text>
          <Text style={pdfStyles.tableCell}>Bride</Text>
          <Text style={pdfStyles.tableCell}>Marriage Date</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
          <Text style={pdfStyles.tableCell}>Witness</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.fname_groom || ''} ${record.lname_groom || ''}`}</Text>
            <Text style={pdfStyles.tableCell}>{`${record.fname_bride || ''} ${record.lname_bride || ''}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.mdate ? new Date(record.mdate).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy || ''}</Text>
            <Text style={pdfStyles.tableCell}>{record.witness || ''}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);

// Validation schema for record form
const marriageRecordSchema = Yup.object().shape({
  fname_groom: Yup.string().required('Groom first name is required'),
  lname_groom: Yup.string().required('Groom last name is required'),
  fname_bride: Yup.string().required('Bride first name is required'),
  lname_bride: Yup.string().required('Bride last name is required'),
  mdate: Yup.string().required('Marriage date is required'),
  parentsg: Yup.string(),
  parentsb: Yup.string(),
  witness: Yup.string(),
  mlicense: Yup.string(),
  clergy: Yup.string().required('Clergy is required'),
});

const MarriageRecords = () => {
  const { removeSession } = useAuthContext();
  
  // State declarations
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
  const [sortField, setSortField] = useState('mdate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isLocked, setIsLocked] = useState(false);
  
  // Debug: Log the current lock state
  console.log('Marriage page - isLocked:', isLocked);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    clergy: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [clergyList, setClergyList] = useState([]);
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
  const [certificateZoom, setCertificateZoom] = useState(70); // Default zoom level
  const [previewLoading, setPreviewLoading] = useState(false); // Added to prevent multiple simultaneous requests
  
  // Advanced mode for individual field positioning
  const [showAdvancedPositioning, setShowAdvancedPositioning] = useState(false);
  
  // Default field offsets for optimal positioning (800x600 coordinate system)
  // Only the fields that need to be positioned on blank lines
  const DEFAULT_FIELD_OFFSETS = {
    groomName: { x: 397, y: 263 }, // fname_groom lname_groom
    brideName: { x: 397, y: 299 }, // fname_bride lname_bride
    clergyBy: { x: 397, y: 406 }, // clergy after "By"
    churchName: { x: 397, y: 442 }, // Saints Peter & Paul Orthodox Church
    marriageDateMD: { x: 350, y: 478 }, // mdate MM/DD
    marriageDateY: { x: 550, y: 478 }, // mdate YYYY
    witness: { x: 397, y: 514 }, // witness
    rector: { x: 397, y: 550 } // clergy on "Rector" line
  };

  // Default font sizes for marriage certificate fields
  const DEFAULT_FONT_SIZES = {
    groomName: 18,
    brideName: 18,
    clergyBy: 16,
    churchName: 16,
    marriageDateMD: 16,
    marriageDateY: 16,
    witness: 16,
    rector: 14
  };
  
  // Individual field offsets for precise positioning
  const [fieldOffsets, setFieldOffsets] = useState(DEFAULT_FIELD_OFFSETS);
  // Individual font sizes for precise control
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
    setQuickPositionMode(false);
    setShowAdvancedPositioning(false);
    setHiddenFields(new Set()); // Reset hidden fields
    setPreviewLoading(false); // Reset loading state
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
  
  // CSV headers for export
  const csvHeaders = [
    { label: 'Groom First Name', key: 'fname_groom' },
    { label: 'Groom Last Name', key: 'lname_groom' },
    { label: 'Bride First Name', key: 'fname_bride' },
    { label: 'Bride Last Name', key: 'lname_bride' },
    { label: 'Marriage Date', key: 'mdate' },
    { label: 'Groom Parents', key: 'parentsg' },
    { label: 'Bride Parents', key: 'parentsb' },
    { label: 'Witness', key: 'witness' },
    { label: 'Marriage License', key: 'mlicense' },
    { label: 'Clergy', key: 'clergy' },
  ];

  // Fetch records on component mount and when dependencies change
  useEffect(() => {
    fetchRecords();
    fetchClergyData();
  }, [currentPage, recordsPerPage, sortField, sortDirection]);

  useEffect(() => {
    if (searchTerm || filters.startDate || filters.endDate || filters.clergy) {
      const delaySearch = setTimeout(() => {
        setCurrentPage(1);
        fetchRecords();
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, filters]);

  const fetchRecords = async () => {
    console.log('Marriage - fetchRecords called');
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
        sortField,
        sortDirection,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.clergy && { clergy: filters.clergy }),
      });

      console.log('Marriage - fetchRecords params:', params.toString());
      const response = await axios.get(`/api/marriage-records?${params}`);
      console.log('Marriage - fetchRecords response:', response.data);
      setRecords(response.data.records || []);
      setTotalRecords(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching records:', error);
      setError('Failed to fetch records');
      toast.error('Failed to fetch records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClergyData = async () => {
    try {
      const response = await axios.get('/api/clergy');
      setClergyList(response.data || []);
    } catch (error) {
      console.error('Error fetching clergy data:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRecords();
  };

  const handleEdit = (record) => {
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
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await axios.delete(`/api/marriage-records/${recordToDelete.id}`);
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
    setCurrentPage(pageNumber);
  };

  const handleSort = (field) => {
    console.log('Marriage - handleSort called with field:', field);
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
      clergy: '',
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
      const response = await axios.post('/api/marriage-records/import', formData, {
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
      const response = await axios.get(`/api/marriage-records/${record.id}/history`);
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
        mdate: values.mdate ? (
          values.mdate instanceof Date 
            ? values.mdate.toISOString().split('T')[0] 
            : values.mdate
        ) : null,
      };

      if (currentRecord) {
        await axios.put(`/api/marriage-records/${currentRecord.id}`, formattedValues);
        toast.success('Record updated successfully');
      } else {
        await axios.post('/api/marriage-records', formattedValues);
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
      toast.info("Generating marriage certificate...");
      
      // Create download URL with field offsets and font sizes as query parameters
      const offsetsParam = encodeURIComponent(JSON.stringify(fieldOffsets));
      const fontSizesParam = encodeURIComponent(JSON.stringify(fontSizes));
      const downloadUrl = `/api/certificate/marriage/${record.id}/download?offsets=${offsetsParam}&fontSizes=${fontSizesParam}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      const groomName = `${record.fname_groom || ''}_${record.lname_groom || ''}`.trim().replace(/\s+/g, '_');
      const brideName = `${record.fname_bride || ''}_${record.lname_bride || ''}`.trim().replace(/\s+/g, '_');
      link.download = `marriage_certificate_${groomName}_${brideName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Marriage certificate generated successfully");
    } catch (error) {
      console.error('Error generating marriage certificate:', error);
      toast.error("Failed to generate marriage certificate");
    }
  };

  const previewCertificate = async (record) => {
    if (!record || previewLoading) return;
    
    setPreviewLoading(true);
    
    try {
      // Only show toast for initial load, not for live updates
      if (!showPreviewModal) {
        toast.info("Generating preview...");
      }
      
      // Send the complete record with field offsets and font sizes for fine-tuning
      const response = await axios.post(`/api/certificate/marriage/${record.id}/preview`, {
        fieldOffsets: fieldOffsets,
        fontSizes: fontSizes
      });

      if (response.data.success) {
        console.log('Preview URL type:', typeof response.data.preview);
        console.log('Preview URL length:', response.data.preview?.length);
        console.log('Preview URL starts with:', response.data.preview?.substring(0, 50));
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

  // Auto-update preview when field offsets or font sizes change
  useEffect(() => {
    if (showPreviewModal && currentRecord && !previewLoading) {
      const timeoutId = setTimeout(() => {
        previewCertificate(currentRecord);
      }, 300); // Debounce for smoother slider experience
      
      return () => clearTimeout(timeoutId);
    }
  }, [fieldOffsets, fontSizes, showPreviewModal, currentRecord, previewLoading]);

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

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Test API function
  const testAPI = async () => {
    try {
      console.log('Testing API connectivity...');
      // Test the main marriage records endpoint with limit=1 to verify connectivity
      const response = await axios.get('/api/marriage-records', {
        params: {
          page: 1,
          limit: 1
        }
      });
      console.log('API Test Result:', response.data);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      toast.success(`API test successful - Connected to marriage records API (Status: ${response.status})`);
    } catch (error) {
      console.error('API Test Failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Request URL:', error.config?.url);
      toast.error(`API test failed: ${error.message} (Status: ${error.response?.status || 'No Response'})`);
    }
  };

  // Main component render
    
    return (
        <div className="fullscreen-page" style={{ 
          width: '100%', 
          height: '100%', 
          background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
          minHeight: '100vh'
        }}>
          <div className="marriage-records-container w-100 px-2 px-md-3 px-lg-4" style={{
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
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
            borderRadius: '15px',
            padding: '25px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div>
              <h2 className="h3 mb-2" style={{ fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Marriage Records
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
                      <Dropdown.Item as={CSVLink} data={records} headers={csvHeaders} filename="marriage_records.csv">
                        <FaFileExcel className="me-1" /> CSV
                      </Dropdown.Item>
                      <Dropdown.Item as={PDFDownloadLink} document={<MarriageRecordsPDF records={records} />} fileName="marriage_records.pdf">
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
                  variant="light" 
                  onClick={handleLogout}
                  size="sm"
                  style={{
                    borderRadius: '50px',
                    padding: '10px 15px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    border: 'none'
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
      {/* Compact Search and Controls */}
      <Card className="mb-3 shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-2">
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <Form onSubmit={handleSearch} className="flex-grow-1" style={{ minWidth: '300px' }}>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder="Search by groom, bride, clergy..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  style={{
                    borderRadius: '25px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                    fontSize: '16px',
                    paddingLeft: '20px'
                  }}
                />
                <Button 
                  variant="primary" 
                  type="submit" 
                  size="sm"
                  style={{
                    borderRadius: '25px',
                    background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                    border: 'none',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                    fontWeight: '600'
                  }}
                >
                  <FaSearch />
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    borderRadius: '25px',
                    border: '2px solid rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                    fontWeight: '600'
                  }}
                >
                  <FaFilter />
                </Button>
              </div>
            </Form>
            
            <div className="d-flex gap-2 align-items-center">
              <Form.Select
                value={recordsPerPage}
                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                size="sm"
                style={{ 
                  width: '100px',
                  borderRadius: '25px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                  fontWeight: '600'
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </Form.Select>
              <Button 
                variant="success" 
                onClick={() => {
                  setCurrentRecord(null);
                  setViewMode(false);
                  setShowModal(true);
                }}
                size="sm"
                disabled={isLocked}
                style={{
                  borderRadius: '25px',
                  background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
                  border: 'none',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                  fontWeight: '600',
                  opacity: isLocked ? 0.6 : 1
                }}
              >
                <FaPlus /> Add
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="mt-2 p-2 rounded" style={{
              background: 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)',
              borderRadius: '15px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
            }}>
              <div className="d-flex gap-2 flex-wrap">
                <Form.Control
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                  size="sm"
                  style={{ width: '140px' }}
                />
                <Form.Control
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                  size="sm"
                  style={{ width: '140px' }}
                />
                <Form.Select
                  value={filters.clergy}
                  onChange={(e) => handleFilterChange('clergy', e.target.value)}
                  size="sm"
                  style={{ width: '140px' }}
                >
                  <option value="">All Clergy</option>
                  {clergyList.map((clergy, idx) => (
                    <option key={idx} value={clergy}>{clergy}</option>
                  ))}
                </Form.Select>
                <Button variant="outline-secondary" onClick={resetFilters} size="sm">
                  <FaUndo /> Reset
                </Button>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
      
      {/* Compact Data Table */}
      
      {/* Compact Data Table */}
      <Card className="shadow-sm border-0" style={{
        borderRadius: '15px',
        background: 'linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)',
        boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
      }}>
        <Card.Body className="p-1">
          <div ref={printRef} className="table-responsive">
            <Table striped hover className="records-table mb-0" size="sm" style={{
              borderRadius: '15px',
              overflow: 'hidden',
              backgroundColor: 'rgba(255,255,255,0.95)'
            }}>
              <thead className="table-header" style={{
                background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                color: 'white'
              }}>
                <tr>
                  <th onClick={() => handleSort('lname_groom')} className="sortable-header" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center">
                      <span>Groom</span>
                      {sortField === 'lname_groom' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('lname_bride')} className="sortable-header" style={{ minWidth: '120px' }}>
                    <div className="d-flex align-items-center">
                      <span>Bride</span>
                      {sortField === 'lname_bride' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('mdate')} className="sortable-header" style={{ minWidth: '100px' }}>
                    <div className="d-flex align-items-center">
                      <span>Date</span>
                      {sortField === 'mdate' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th onClick={() => handleSort('clergy')} className="sortable-header d-none d-lg-table-cell" style={{ minWidth: '100px' }}>
                    <div className="d-flex align-items-center">
                      <span>Clergy</span>
                      {sortField === 'clergy' && (
                        <span className="ms-1">
                          {sortDirection === 'asc' ? <FaSortAmountUp size={10} /> : <FaSortAmountDown size={10} />}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="text-center" style={{ minWidth: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-3">
                      <Spinner animation="border" role="status" size="sm" />
                      <div className="mt-1 text-muted small">Loading...</div>
                    </td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <div className="fw-semibold small">{`${record.fname_groom || ''} ${record.lname_groom || ''}`}</div>
                      </td>
                      <td>
                        <div className="fw-semibold small">{`${record.fname_bride || ''} ${record.lname_bride || ''}`}</div>
                      </td>
                      <td className="small">{record.mdate ? new Date(record.mdate).toLocaleDateString() : 'N/A'}</td>
                      <td className="d-none d-lg-table-cell small">{record.clergy || ''}</td>
                      <td className="text-center">
                        <div className="btn-group btn-group-sm" role="group">
                          <Button variant="info" size="sm" onClick={() => handleView(record)} style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: 'none',
                            margin: '1px'
                          }}>
                            <FaEye />
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleEdit(record)} disabled={isLocked} style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: 'none',
                            margin: '1px',
                            opacity: isLocked ? 0.5 : 1
                          }}>
                            <FaEdit />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteClick(record)} disabled={isLocked} style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: 'none',
                            margin: '1px',
                            opacity: isLocked ? 0.5 : 1
                          }}>
                            <FaTrash />
                          </Button>
                          <Button variant="success" size="sm" onClick={e => {
                            e.stopPropagation();
                            generateCertificate(record);
                          }} style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: 'none',
                            margin: '1px'
                          }}>
                            <FaFileAlt />
                          </Button>
                          <Button variant="outline-secondary" size="sm" onClick={e => {
                            e.stopPropagation();
                            setCurrentRecord(record);
                            previewCertificate(record);
                          }} style={{
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: '1px solid #dee2e6',
                            margin: '1px'
                          }}>
                            <FaEye />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-3">
                      <div className="text-muted">
                        <FaSearch className="mb-2" size={20} />
                        <div>No records found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          
          {/* Compact Pagination */}
          <div className="d-flex justify-content-between align-items-center p-2 border-top bg-light small">
            <span className="text-muted">{records.length} of {totalRecords} records</span>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalRecords / recordsPerPage)}
              onPageChange={handlePageChange}
            />
          </div>
        </Card.Body>
      </Card>
      
      {/* Record Form Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {viewMode ? 'Marriage Record Details' : currentRecord ? 'Edit Marriage Record' : 'Add New Marriage Record'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewMode ? (
            currentRecord && (
              <div className="record-details">
                <Row className="mb-3">
                  <Col md={6}>
                    <p><strong>Groom:</strong> {`${currentRecord.fname_groom || ''} ${currentRecord.lname_groom || ''}`}</p>
                    <p><strong>Bride:</strong> {`${currentRecord.fname_bride || ''} ${currentRecord.lname_bride || ''}`}</p>
                    <p><strong>Marriage Date:</strong> {currentRecord.mdate ? new Date(currentRecord.mdate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Clergy:</strong> {currentRecord.clergy || 'N/A'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Groom's Parents:</strong> {currentRecord.parentsg || 'N/A'}</p>
                    <p><strong>Bride's Parents:</strong> {currentRecord.parentsb || 'N/A'}</p>
                    <p><strong>Witness:</strong> {currentRecord.witness || 'N/A'}</p>
                    <p><strong>Marriage License:</strong> {currentRecord.mlicense || 'N/A'}</p>
                  </Col>
                </Row>
              </div>
            )
          ) : (
            <Formik
              initialValues={{
                fname_groom: currentRecord?.fname_groom || '',
                lname_groom: currentRecord?.lname_groom || '',
                fname_bride: currentRecord?.fname_bride || '',
                lname_bride: currentRecord?.lname_bride || '',
                mdate: currentRecord?.mdate ? currentRecord.mdate.split('T')[0] : '',
                parentsg: currentRecord?.parentsg || '',
                parentsb: currentRecord?.parentsb || '',
                witness: currentRecord?.witness || '',
                mlicense: currentRecord?.mlicense || '',
                clergy: currentRecord?.clergy || '',
              }}
              validationSchema={marriageRecordSchema}
              onSubmit={handleSubmit}
            >
              {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
                <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Groom First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="fname_groom"
                          value={values.fname_groom}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.fname_groom && errors.fname_groom}
                        />
                        <Form.Control.Feedback type="invalid">{errors.fname_groom}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Groom Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lname_groom"
                          value={values.lname_groom}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.lname_groom && errors.lname_groom}
                        />
                        <Form.Control.Feedback type="invalid">{errors.lname_groom}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bride First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="fname_bride"
                          value={values.fname_bride}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.fname_bride && errors.fname_bride}
                        />
                        <Form.Control.Feedback type="invalid">{errors.fname_bride}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bride Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lname_bride"
                          value={values.lname_bride}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.lname_bride && errors.lname_bride}
                        />
                        <Form.Control.Feedback type="invalid">{errors.lname_bride}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="small fw-semibold">Marriage Date</Form.Label>
                        <Form.Control
                          type="date"
                          name="mdate"
                          size="sm"
                          value={values.mdate || ''}
                          onChange={(e) => setFieldValue('mdate', e.target.value)}
                          onBlur={handleBlur}
                          isInvalid={touched.mdate && errors.mdate}
                          style={{ minHeight: '38px' }}
                        />
                        {touched.mdate && errors.mdate && (
                          <div className="invalid-feedback d-block small">{errors.mdate}</div>
                        )}
                      </Form.Group>
                    </Col>
                    <Col md={6}>
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
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Groom's Parents</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="parentsg"
                      value={values.parentsg}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.parentsg && errors.parentsg}
                    />
                    <Form.Control.Feedback type="invalid">{errors.parentsg}</Form.Control.Feedback>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Bride's Parents</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="parentsb"
                      value={values.parentsb}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      isInvalid={touched.parentsb && errors.parentsb}
                    />
                    <Form.Control.Feedback type="invalid">{errors.parentsb}</Form.Control.Feedback>
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Witness</Form.Label>
                        <Form.Control
                          type="text"
                          name="witness"
                          value={values.witness}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.witness && errors.witness}
                        />
                        <Form.Control.Feedback type="invalid">{errors.witness}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Marriage License</Form.Label>
                        <Form.Control
                          type="text"
                          name="mlicense"
                          value={values.mlicense}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          isInvalid={touched.mlicense && errors.mlicense}
                        />
                        <Form.Control.Feedback type="invalid">{errors.mlicense}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
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
          <Alert variant="danger">
            <Alert.Heading>Warning: This action cannot be undone</Alert.Heading>
            <p>
              Are you sure you want to permanently delete the marriage record for{' '}
              <strong>{recordToDelete ? `${recordToDelete.fname_groom} ${recordToDelete.lname_groom}` : ''}</strong> and{' '}
              <strong>{recordToDelete ? `${recordToDelete.fname_bride} ${recordToDelete.lname_bride}` : ''}</strong>?
            </p>
          </Alert>
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
          <Modal.Title>Import Marriage Records</Modal.Title>
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
                File should contain columns for groom and bride names, marriage date, clergy, witness, and other relevant fields.
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
            
            <div className="d-flex justify-content-between align-items-center">
              <Button variant="outline-secondary" onClick={() => window.open('/templates/marriage_import_template.csv')}>
                Download Template
              </Button>
              <div>
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
                maxHeight: '200px',
                flexShrink: 0
              }}>
                <div className="p-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Alert variant="success" className="py-1 mb-0" style={{ fontSize: '0.75rem' }}>
                      <small><strong>✅ Smart Mapping Active</strong></small>
                    </Alert>
                    <div className="d-flex gap-2">
                      <Button 
                        size="sm" 
                        variant={quickPositionMode ? "info" : "outline-info"}
                        onClick={() => setQuickPositionMode(!quickPositionMode)}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {quickPositionMode ? "⚡ Quick" : "🎯 Precise"}
                      </Button>
                      <Badge 
                        bg={quickPositionMode ? "info" : "secondary"}
                        className="ms-1"
                        style={{ fontSize: '0.6rem' }}
                      >
                        Range: ±{quickPositionMode ? "1200" : "600"}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline-warning" 
                        onClick={resetFieldOffsetsToDefaults}
                        style={{ fontSize: '0.7rem' }}
                      >
                        🔄 Reset All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Horizontal scrollable field controls */}
                  <div className="d-flex gap-2 align-items-start" style={{ 
                    overflowX: 'auto', 
                    paddingBottom: '10px',
                    flexWrap: 'nowrap'
                  }}>
                    {Object.entries(fieldOffsets).map(([fieldName, offset]) => {
                      const fieldLabels = {
                        groomName: 'Groom Name',
                        brideName: 'Bride Name',
                        clergyBy: 'Clergy (BY)',
                        churchName: 'Church Name',
                        marriageDateMD: 'Marriage Date (MM/DD)',
                        marriageDateY: 'Marriage Year (YYYY)',
                        witness: 'Witness',
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
                          className="border rounded p-2 bg-white flex-shrink-0"
                          style={{ 
                            minWidth: '140px',
                            maxWidth: '140px'
                          }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong className="text-truncate" style={{ fontSize: '0.7rem' }}>
                              {fieldLabels[fieldName]}
                            </strong>
                            <Button 
                              size="sm" 
                              variant="outline-danger"
                              onClick={() => toggleFieldVisibility(fieldName)}
                              style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
                              title="Hide this field control"
                            >
                              ✕
                            </Button>
                          </div>
                          
                          {/* Compact horizontal coordinate controls */}
                          <div className="d-flex gap-1 mb-2">
                            <div className="text-center" style={{ fontSize: '0.6rem' }}>
                              <div>X: {offset.x}</div>
                              <div>Y: {offset.y}</div>
                            </div>
                            <div className="flex-grow-1">
                              {/* X controls */}
                              <div className="d-flex align-items-center gap-1 mb-1">
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => setFieldOffsets(prev => ({
                                    ...prev,
                                    [fieldName]: { ...prev[fieldName], x: Math.max(0, prev[fieldName].x - stepSize) }
                                  }))}
                                  style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
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
                                  style={{ height: '0.4rem', flex: '1' }}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => setFieldOffsets(prev => ({
                                    ...prev,
                                    [fieldName]: { ...prev[fieldName], x: Math.min(maxX, prev[fieldName].x + stepSize) }
                                  }))}
                                  style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
                                >
                                  ▶
                                </Button>
                              </div>
                              
                              {/* Y controls */}
                              <div className="d-flex align-items-center gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => setFieldOffsets(prev => ({
                                    ...prev,
                                    [fieldName]: { ...prev[fieldName], y: Math.max(0, prev[fieldName].y - stepSize) }
                                  }))}
                                  style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
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
                                  style={{ height: '0.4rem', flex: '1' }}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary"
                                  onClick={() => setFieldOffsets(prev => ({
                                    ...prev,
                                    [fieldName]: { ...prev[fieldName], y: Math.min(maxY, prev[fieldName].y + stepSize) }
                                  }))}
                                  style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
                                >
                                  ▼
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Font size control */}
                          <div className="d-flex align-items-center gap-1 mt-2">
                            <span className="text-muted" style={{ fontSize: '0.6rem' }}>
                              Font: {fontSizes[fieldName]}px
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline-secondary"
                              onClick={() => setFontSizes(prev => ({
                                ...prev,
                                [fieldName]: Math.max(8, prev[fieldName] - 1)
                              }))}
                              style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
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
                              style={{ height: '0.4rem', flex: '1' }}
                            />
                            <Button 
                              size="sm" 
                              variant="outline-secondary"
                              onClick={() => setFontSizes(prev => ({
                                ...prev,
                                [fieldName]: Math.min(24, prev[fieldName] + 1)
                              }))}
                              style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Show hidden fields as collapsed items */}
                    {hiddenFields.size > 0 && (
                      <div className="border rounded p-2 bg-light flex-shrink-0 d-flex align-items-center gap-2" style={{ minWidth: '120px' }}>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          Hidden ({hiddenFields.size})
                        </small>
                        {Array.from(hiddenFields).map(fieldName => (
                          <Button 
                            key={fieldName}
                            size="sm" 
                            variant="outline-success"
                            onClick={() => toggleFieldVisibility(fieldName)}
                            style={{ fontSize: '0.5rem', padding: '0.1rem 0.3rem', lineHeight: '1' }}
                            title={`Show ${fieldName}`}
                          >
                            {fieldName.charAt(0).toUpperCase()}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
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
        .marriage-records-container {
          padding: 10px;
          transition: all 0.3s ease;
          max-width: 100%;
        }
        
        /* Compact table styling */
        .records-table {
          font-size: 0.8rem;
        }
        
        .records-table td, .records-table th {
          padding: 0.4rem 0.3rem;
          vertical-align: middle;
        }
        
        .table-header th {
          background-color: var(--bs-gray-100);
          border-bottom: 1px solid var(--bs-gray-300);
          font-weight: 600;
          font-size: 0.75rem;
        }
        
        /* Compact button groups */
        .btn-group-sm .btn {
          padding: 0.2rem 0.4rem;
          font-size: 0.7rem;
          border-radius: 2px;
        }
        
        /* Responsive modal sizing */
        .certificate-preview-modal .modal-dialog {
          max-width: 98vw;
          width: 98vw;
          height: 95vh;
          margin: 1vh auto;
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
          max-height: 180px;
          overflow-y: auto;
        }
        
        .controls-panel.collapsed {
          max-height: 35px;
          overflow: hidden;
        }
        
        .controls-panel h6 {
          margin: 0;
          padding: 8px 12px;
          background: rgba(13, 110, 253, 0.1);
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(13, 110, 253, 0.2);
          font-size: 0.8rem;
          font-weight: 600;
          color: #0d6efd;
        }
        
        /* Horizontal field controls */
        .field-controls-horizontal {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 8px;
          background: white;
          border-radius: 0 0 8px 8px;
          scrollbar-width: thin;
        }
        
        .field-controls-horizontal::-webkit-scrollbar {
          height: 4px;
        }
        
        .field-controls-horizontal::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 2px;
        }
        
        .field-controls-horizontal::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 2px;
        }
        
        /* Individual field control styling */
        .field-control {
          min-width: 110px;
          width: 110px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 6px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          transition: all 0.2s ease;
        }
        
        .field-control:hover {
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .field-control-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 3px;
          text-align: center;
          line-height: 1.1;
        }
        
        .field-control-coords {
          display: flex;
          gap: 3px;
          margin-bottom: 3px;
        }
        
        .field-control-coords .form-control {
          height: 20px;
          font-size: 0.65rem;
          padding: 1px 3px;
          border-radius: 2px;
          text-align: center;
        }
        
        .field-control-sliders {
          display: flex;
          flex-direction: column;
          gap: 1px;
          margin-bottom: 3px;
        }
        
        .field-control-slider {
          height: 12px;
          border-radius: 6px;
          background: #e9ecef;
          outline: none;
        }
        
        .field-control-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #0d6efd;
          cursor: pointer;
        }
        
        .field-control-buttons {
          display: flex;
          gap: 1px;
        }
        
        .field-control-buttons .btn {
          padding: 1px 4px;
          font-size: 0.6rem;
          border-radius: 2px;
          flex: 1;
          min-height: 16px;
        }
        
        .field-control-coordinate-display {
          font-size: 0.6rem;
          color: #6c757d;
          text-align: center;
          margin-top: 1px;
          font-family: monospace;
        }
        
        /* Certificate preview positioning */
        .certificate-preview-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
          background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #f8f9fa 75%), 
                      linear-gradient(-45deg, transparent 75%, #f8f9fa 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          border-radius: 8px;
          overflow: auto;
          padding: 15px;
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
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .marriage-records-container {
            padding: 5px;
          }
          
          .certificate-preview-modal .modal-dialog {
            width: 100vw;
            max-width: 100vw;
            margin: 0;
            height: 100vh;
          }
          
          .field-control {
            min-width: 90px;
            width: 90px;
          }
          
          .controls-panel {
            max-height: 120px;
          }
        }
        
        /* Print styles */
        @media print {
          .marriage-records-container {
            padding: 0 !important;
          }
          
          .btn, .dropdown, .pagination {
            display: none !important;
          }
        }
      `}</style>
        </>
      )}
          </div>
      </div>
    );
};

export default MarriageRecords;
