import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Form, Button, Table, Dropdown, Card, Modal, Alert, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaEdit, FaTrash, FaPalette, FaFilePdf, FaFileExcel, FaPrint, FaFilter, FaSortAmountDown, FaSortAmountUp, FaEye, FaDownload, FaCloudUploadAlt, FaHistory, FaUndo, FaLock, FaUnlock, FaSignOutAlt, FaFileAlt } from 'react-icons/fa';
import { useAuthContext } from '@/context/useAuthContext';
import axios from 'axios';
import Pagination from './pagination';
import ReadOnlyView from './view';
import { CSVLink } from 'react-csv';
// Temporarily comment out PDF imports to test
// import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
// import { useReactToPrint } from 'react-to-print';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import { jsPDF } from 'jspdf';
// import 'jspdf-autotable';
// import { saveAs } from 'file-saver';

// PDF styles for export - temporarily commented out
/*
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
const FuneralRecordsPDF = ({ records }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.title}>Funeral Records</Text>
      <View style={pdfStyles.table}>
        <View style={[pdfStyles.tableRow, pdfStyles.tableHeader]}>
          <Text style={pdfStyles.tableCell}>Name</Text>
          <Text style={pdfStyles.tableCell}>Date of Death</Text>
          <Text style={pdfStyles.tableCell}>Burial Date</Text>
          <Text style={pdfStyles.tableCell}>Age</Text>
          <Text style={pdfStyles.tableCell}>Burial Location</Text>
          <Text style={pdfStyles.tableCell}>Clergy</Text>
        </View>
        {records.map((record) => (
          <View key={record.id} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{`${record.name} ${record.lastname}`}</Text>
            <Text style={pdfStyles.tableCell}>{record.deceased_date ? new Date(record.deceased_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.burial_date ? new Date(record.burial_date).toLocaleDateString() : 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.age || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.burial_location || 'N/A'}</Text>
            <Text style={pdfStyles.tableCell}>{record.clergy}</Text>
          </View>
        ))}
      </View>
      <Text style={pdfStyles.footer}>Generated on {new Date().toLocaleDateString()}</Text>
    </Page>
  </Document>
);
*/

// Validation schema for record form
const funeralRecordSchema = Yup.object().shape({
    name: Yup.string().required('First name is required'),
    lastname: Yup.string().required('Last name is required'),
    deceased_date: Yup.string().required('Date of death is required'),
    burial_date: Yup.string().nullable(),
    age: Yup.number().nullable().min(0, 'Age must be positive'),
    burial_location: Yup.string(),
    clergy: Yup.string().required('Clergy is required'),
});

const FuneralRecords = () => {
    const { removeSession } = useAuthContext();
    
    // Lock state - default to locked (true) for better security
    const [isLocked, setIsLocked] = useState(false);

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
    const [sortField, setSortField] = useState('deceased_date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        burial_location: '',
        clergy: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [locations, setLocations] = useState([]);
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
    const [previewLoading, setPreviewLoading] = useState(false);
    const [certificateZoom, setCertificateZoom] = useState(70); // Default zoom level
    // Advanced mode for individual field positioning
    const [showAdvancedPositioning, setShowAdvancedPositioning] = useState(false);
    
    // Default field offsets for optimal positioning
    const DEFAULT_FIELD_OFFSETS = {
        fullName: { x: -100, y: -26 },
        deathDate: { x: 22, y: -31 },
        burialDate: { x: 12, y: -36 },
        age: { x: 5, y: -34 },
        clergy: { x: 5, y: -34 },
        burialLocation: { x: 7, y: -34 }
    };
    
    // Individual field offsets for precise positioning
    const [fieldOffsets, setFieldOffsets] = useState(DEFAULT_FIELD_OFFSETS);
    // Quick positioning mode for easier adjustments
    const [quickPositionMode, setQuickPositionMode] = useState(false);
    // Hidden fields for cleaner preview
    const [hiddenFields, setHiddenFields] = useState(new Set());
    const [animateLock, setAnimateLock] = useState(false);
    const [userCanEdit, setUserCanEdit] = useState(true); // Default to true for demo
    const [lastActivity, setLastActivity] = useState(Date.now());
    const AUTO_LOCK_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const navigate = useNavigate();
    const printRef = useRef();
    
    // Helper function to reset field offsets to defaults
    const resetFieldOffsetsToDefaults = () => {
        setFieldOffsets({ ...DEFAULT_FIELD_OFFSETS });
        setHiddenFields(new Set()); // Also show all fields
    };
    
    // Helper function to reset individual field to default
    const resetIndividualFieldToDefault = (fieldName) => {
        setFieldOffsets(prev => ({
            ...prev,
            [fieldName]: { ...DEFAULT_FIELD_OFFSETS[fieldName] }
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
        { label: 'First Name', key: 'name' },
        { label: 'Last Name', key: 'lastname' },
        { label: 'Date of Death', key: 'deceased_date' },
        { label: 'Burial Date', key: 'burial_date' },
        { label: 'Age', key: 'age' },
        { label: 'Burial Location', key: 'burial_location' },
        { label: 'Clergy', key: 'clergy' },
    ];

    // Effect to check user permissions
    useEffect(() => {
        // For now, default to true since we don't have the permissions API
        setUserCanEdit(true);
    }, []);

    // Effect to update document title
    useEffect(() => {
        const originalTitle = document.title;
        document.title = `${isLocked ? '🔒 ' : '🔓 '}Funeral Records | Church Management`;

        return () => {
            document.title = originalTitle;
        };
    }, [isLocked]);

    // Effect to track user activity
    useEffect(() => {
        const updateActivity = () => {
            setLastActivity(Date.now());
        };

        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
        };
    }, []);

    // Effect to check for inactivity and auto-lock
    useEffect(() => {
        if (!isLocked) {
            const checkInactivity = setInterval(() => {
                const now = Date.now();
                if (now - lastActivity > AUTO_LOCK_TIMEOUT) {
                    // Auto-lock after inactivity
                    setIsLocked(true);
                    localStorage.setItem('funeralRecordsLocked', 'true');
                    toast.info('Records automatically locked due to inactivity');

                    // Clear the interval after locking
                    clearInterval(checkInactivity);
                }
            }, 60000); // Check every minute

            return () => clearInterval(checkInactivity);
        }
    }, [isLocked, lastActivity]);

    // Effect to handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ctrl+L to toggle lock
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault(); // Prevent browser's "Open Location" dialog
                if (userCanEdit) { // Only if user has permission
                    handleLockToggle();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isLocked, userCanEdit]);

    useEffect(() => {
        fetchRecords();
        fetchLocationsAndClergy();
    }, [currentPage, recordsPerPage, sortField, sortDirection]);

    useEffect(() => {
        if (searchTerm || filters.startDate || filters.endDate || filters.burial_location || filters.clergy) {
            const delaySearch = setTimeout(() => {
                setCurrentPage(1);
                fetchRecords();
            }, 500);

            return () => clearTimeout(delaySearch);
        }
    }, [searchTerm, filters]);

    const fetchLocationsAndClergy = async () => {
        try {
            console.log('Fetching locations and clergy...');
            const [locationsResponse, clergyResponse] = await Promise.all([
                axios.get('/api/funeral-records/unique-values?table=funeral_records&column=burial_location'),
                axios.get('/api/clergy')
            ]);

            console.log('Locations response:', locationsResponse.data);
            console.log('Clergy response:', clergyResponse.data);

            setLocations(locationsResponse.data.values || []);
            setClergyList(clergyResponse.data || []);
        } catch (error) {
            console.error('Error fetching dropdown data:', error);
            console.error('Error response:', error.response?.data);
            // Set empty arrays as fallback
            setLocations([]);
            setClergyList([]);
        }
    };

    const fetchRecords = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('Fetching funeral records...');
            const response = await axios.get(`/api/funeral-records`, {
                params: {
                    page: currentPage,
                    limit: recordsPerPage,
                    search: searchTerm,
                    sortField,
                    sortDirection,
                    startDate: filters.startDate ? filters.startDate.toISOString() : null,
                    endDate: filters.endDate ? filters.endDate.toISOString() : null,
                    burial_location: filters.burial_location,
                    clergy: filters.clergy,
                },
            });

            console.log('Fetch response:', response.data);

            // Handle both response formats
            const recordsData = response.data.records || response.data || [];
            const totalData = response.data.totalRecords || response.data.total || recordsData.length;

            setRecords(recordsData);
            setTotalRecords(totalData);
        } catch (error) {
            console.error('Error fetching funeral records:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            setError(`Failed to load records: ${error.response?.data?.error || error.message}`);
            // Set empty arrays as fallback
            setRecords([]);
            setTotalRecords(0);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle lock toggle with animation and confirmation
    const handleLockToggle = () => {
        // Set animation flag
        setAnimateLock(true);
        setTimeout(() => setAnimateLock(false), 300);

        if (isLocked) {
            // If we're unlocking, ask for confirmation
            if (window.confirm("Are you sure you want to unlock the records for editing?")) {
                const newLockState = false;
                setIsLocked(newLockState);
                localStorage.setItem('funeralRecordsLocked', String(newLockState));
                toast.success('Records are now unlocked for editing');
            }
        } else {
            // Just lock - no need to check for pending changes in this implementation
            const newLockState = true;
            setIsLocked(newLockState);
            localStorage.setItem('funeralRecordsLocked', String(newLockState));
            toast.info('Records are now locked in read-only mode');
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
            await axios.delete(`/api/funeral-records/${recordToDelete.id}`);
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
            burial_location: '',
            clergy: '',
        });
        setSearchTerm('');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) return;

        setIsImporting(true);
        setImportErrors([]);

        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await axios.post('/api/funeral-records/import', formData, {
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
            const response = await axios.get(`/api/funeral-records/${record.id}/history`);
            setRecordHistory(response.data);
        } catch (error) {
            console.error('Error fetching record history:', error);
            toast.error('Failed to load record history');
        } finally {
            setHistoryLoading(false);
        }
    };

    // Test function to verify API connectivity
    const testAPI = async () => {
        try {
            console.log('Testing API connectivity...');
            // Test the main funeral records endpoint with limit=1 to verify connectivity
            const response = await axios.get('/api/funeral-records', {
                params: {
                    page: 1,
                    limit: 1
                }
            });
            console.log('API Test Result:', response.data);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            toast.success(`API test successful - Connected to funeral records API (Status: ${response.status})`);
        } catch (error) {
            console.error('API Test Failed:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Request URL:', error.config?.url);
            toast.error(`API test failed: ${error.message} (Status: ${error.response?.status || 'No Response'})`);
        }
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            console.log('Form values before formatting:', values);

            // Validate required fields on frontend
            if (!values.name || !values.lastname || !values.deceased_date || !values.clergy) {
                toast.error('Please fill in all required fields: name, lastname, date of death, and clergy');
                setSubmitting(false);
                return;
            }

            // Format the data properly for the API
            const formattedValues = {
                name: values.name.trim(),
                lastname: values.lastname.trim(),
                deceased_date: values.deceased_date || null,
                burial_date: values.burial_date || null,
                age: values.age ? parseInt(values.age) : null,
                clergy: values.clergy.trim(),
                burial_location: values.burial_location ? values.burial_location.trim() : null
            };

            console.log('Formatted values for API:', formattedValues);

            let response;
            if (currentRecord) {
                console.log('Updating record with ID:', currentRecord.id);
                response = await axios.put(`/api/funeral-records/${currentRecord.id}`, formattedValues);
                toast.success('Record updated successfully');
            } else {
                console.log('Creating new record');
                response = await axios.post('/api/funeral-records', formattedValues);
                toast.success('Record created successfully');
            }

            console.log('API Response:', response.data);
            setShowModal(false);
            fetchRecords();
            resetForm();
        } catch (error) {
            console.error('Error saving record:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Error headers:', error.response?.headers);
            const errorMessage = error.response?.data?.error || 'Failed to save record';
            toast.error(`${errorMessage} (Status: ${error.response?.status || 'Unknown'})`);
        } finally {
            setSubmitting(false);
        }
    };

    const generateCertificate = async (record) => {
        try {
            toast.info("Generating funeral certificate...");
            
            // Create download URL with field offsets as query parameters
            const offsetsParam = encodeURIComponent(JSON.stringify(fieldOffsets));
            const downloadUrl = `/api/certificate/funeral/${record.id}/download?offsets=${offsetsParam}`;
            
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            const fullName = `${record.name || ''}_${record.lastname || ''}`.trim().replace(/\s+/g, '_');
            link.download = `funeral_certificate_${fullName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast.success("Funeral certificate generated successfully");
        } catch (error) {
            console.error('Error generating funeral certificate:', error);
            toast.error("Failed to generate funeral certificate");
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
            
            // Send the complete record with field offsets for fine-tuning
            const response = await axios.post(`/api/certificate/funeral/${record.id}/preview`, {
                fieldOffsets: fieldOffsets
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

    // Auto-update preview when field offsets change
    useEffect(() => {
        if (showPreviewModal && currentRecord && !previewLoading) {
            const timeoutId = setTimeout(() => {
                previewCertificate(currentRecord);
            }, 300); // Debounce for smoother slider experience
            
            return () => clearTimeout(timeoutId);
        }
    }, [fieldOffsets, hiddenFields, showPreviewModal, currentRecord, previewLoading]);

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

    return (
        <div className="fullscreen-page" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '100vh',
            padding: '20px'
        }}>
            <div className="funeral-records-container w-100 px-2 px-md-3 px-lg-4">
                <ToastContainer position="top-right" autoClose={3000} />

                {/* Header Section */}
                <Card className="mb-4 shadow-lg border-0" style={{
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
                }}>
                    <Card.Body className="p-4">
                        <Row className="mb-3 mb-md-4 align-items-center">
                            <Col xs={12} lg={8} className="mb-2 mb-lg-0">
                                <div className="d-flex align-items-center">
                                    <h2 className="h4 h-md-3 h-lg-2 mb-1 me-3" style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontWeight: 'bold'
                                    }}>⚱️ Funeral Records</h2>
                                    <OverlayTrigger
                                        placement="top"
                                        overlay={
                                            <Tooltip>
                                                {!userCanEdit ? 'You do not have permission to edit records' :
                                                    isLocked ? 'Click to unlock editing features (Ctrl+L)' : 'Click to lock into read-only view (Ctrl+L)'}
                                            </Tooltip>
                                        }
                                    >
                                        <span>
                                            <Button
                                                variant={isLocked ? "danger" : "success"}
                                                size="sm"
                                                onClick={handleLockToggle}
                                                className="d-flex align-items-center"
                                                disabled={!userCanEdit && isLocked}
                                                style={{
                                                    borderRadius: '25px',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                                    border: 'none',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                <span className={animateLock ? "lock-icon" : ""}>
                                                    {isLocked ? <FaLock className="me-1" /> : <FaUnlock className="me-1" />}
                                                </span>
                                                {isLocked ? 'Locked' : 'Unlocked'}
                                            </Button>
                                        </span>
                                    </OverlayTrigger>
                                </div>
                                <p className="text-muted small mb-0">
                                    {isLocked ? 'Read-only view of church funeral records' : 'Manage and search church funeral records'}
                                </p>
                    </Col>
                    <Col xs={12} lg={4} className="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end">
                        <Dropdown className="flex-fill flex-sm-grow-0">
                            <Dropdown.Toggle variant="outline-primary" id="dropdown-export" size="sm" className="w-100 w-sm-auto">
                                <FaDownload className="me-1" /> Export
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                                {records.length > 0 ? (
                                    <Dropdown.Item as={CSVLink} data={records} headers={csvHeaders} filename="funeral_records.csv">
                                        <FaFileExcel className="me-1" /> Export to CSV
                                    </Dropdown.Item>
                                ) : (
                                    <Dropdown.Item disabled>
                                        <FaFileExcel className="me-1" /> Export to CSV (No records)
                                    </Dropdown.Item>
                                )}
                                <Dropdown.Item onClick={handlePrint}>
                                    <FaPrint className="me-1" /> Print Records
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        {!isLocked && (
                            <Button variant="outline-success" onClick={() => setShowImportModal(true)} size="sm" className="flex-fill flex-sm-grow-0">
                                <FaCloudUploadAlt className="me-1" /> Import
                            </Button>
                        )}
                        <Button variant="outline-info" onClick={testAPI} size="sm" className="flex-fill flex-sm-grow-0">
                            Test API
                        </Button>
                        <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip>Logout</Tooltip>}
                        >
                            <Button 
                                variant="outline-danger" 
                                onClick={handleLogout}
                                size="sm"
                                className="flex-fill flex-sm-grow-0"
                            >
                                <FaSignOutAlt />
                            </Button>
                        </OverlayTrigger>
                    </Col>
                </Row>
                        </Card.Body>
                </Card>

                {/* Conditional rendering based on lock state */}
                {isLocked ? (
                    <ReadOnlyView onToggleLock={handleLockToggle} />
                ) : (
          <>
                        <Card className="mb-4 shadow-sm">
                            <Card.Body className="p-3 p-md-4">
                                {/* Search and Controls Section */}
                                <Row className="mb-3 g-3">
                                    <Col xs={12} lg={7} xl={8}>
                                        <Form onSubmit={handleSearch}>
                                            <div className="d-flex flex-column flex-sm-row gap-2">
                                                <Form.Control
                                                    type="text"
                                                    placeholder="Search by name, burial location, clergy..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="flex-grow-1"
                                                    style={{ minHeight: '44px' }}
                                                />
                                                <div className="d-flex gap-2">
                                                    <Button variant="primary" type="submit" className="px-3" style={{ minHeight: '44px' }}>
                                                        <FaSearch className="me-1 d-none d-sm-inline" />
                                                        <span className="d-sm-none">Search</span>
                                                        <span className="d-none d-sm-inline">Search</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => setShowFilters(!showFilters)}
                                                        className="px-3"
                                                        style={{ minHeight: '44px' }}
                                                    >
                                                        <FaFilter className="me-1 d-none d-sm-inline" />
                                                        <span className="d-sm-none">{showFilters ? 'Hide' : 'Show'}</span>
                                                        <span className="d-none d-sm-inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </Form>
                                    </Col>
                                    <Col xs={12} lg={5} xl={4} className="d-flex flex-column flex-sm-row gap-2">
                                        <Button
                                            variant="success"
                                            onClick={() => {
                                                setCurrentRecord(null);
                                                setViewMode(false);
                                                setShowModal(true);
                                            }}
                                            className="flex-grow-1 d-flex align-items-center justify-content-center"
                                            style={{ minHeight: '38px' }}
                                        >
                                            <FaPlus className="me-1" /> Add New Record
                                        </Button>
                                        <Form.Select
                                            className="flex-shrink-0"
                                            style={{ minWidth: '120px' }}
                                            size="sm"
                                            value={recordsPerPage}
                                            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                                        >
                                            <option value={10}>10 per page</option>
                                            <option value={25}>25 per page</option>
                                            <option value={50}>50 per page</option>
                                            <option value={100}>100 per page</option>
                                        </Form.Select>
                                    </Col>
                                </Row>
                                {/* Filters Section */}
                                {showFilters && (
                                    <Card className="mb-4 bg-light border-0">
                                        <Card.Body className="p-3 p-md-4">
                                            <h6 className="mb-3">Filter Records</h6>
                                            <Row className="g-3">
                                                <Col xs={12} sm={6} lg={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-semibold">Start Date</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
                                                            onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
                                                            style={{ minHeight: '44px' }}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={12} sm={6} lg={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-semibold">End Date</Form.Label>
                                                        <Form.Control
                                                            type="date"
                                                            value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
                                                            onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
                                                            style={{ minHeight: '44px' }}
                                                        />
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={12} sm={6} lg={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-semibold">Burial Location</Form.Label>
                                                        <Form.Select
                                                            value={filters.burial_location}
                                                            onChange={(e) => handleFilterChange('burial_location', e.target.value)}
                                                            style={{ minHeight: '44px' }}
                                                        >
                                                            <option value="">All Locations</option>
                                                            {locations.map((location, idx) => (
                                                                <option key={idx} value={location}>
                                                                    {location}
                                                                </option>
                                                            ))}
                                                        </Form.Select>
                                                    </Form.Group>
                                                </Col>
                                                <Col xs={12} sm={6} lg={3}>
                                                    <Form.Group className="mb-3">
                                                        <Form.Label className="small fw-semibold">Clergy</Form.Label>
                                                        <Form.Select
                                                            value={filters.clergy}
                                                            onChange={(e) => handleFilterChange('clergy', e.target.value)}
                                                            style={{ minHeight: '44px' }}
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
                                            </Row>
                                                <div className="d-flex justify-content-center justify-content-md-end mt-3">
                                                    <Button variant="secondary" onClick={resetFilters} className="px-3">
                                                        <FaUndo className="me-1" /> Reset Filters
                                                    </Button>
                                                </div>
                                    </Card.Body>
                  </Card>
                )}
                    </Card.Body>
            </Card>

            {/* Error Display */}
            {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

            {/* Records Table Card */}
            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    {/* Records Table */}
                    <div ref={printRef} className="table-responsive">
                        <Table striped bordered hover className="records-table mb-0" size="sm">
                            <thead className="table-dark">
                                <tr>
                                    <th onClick={() => handleSort('lastname')} className="sortable-header" style={{ minWidth: '140px' }}>
                                        <div className="d-flex align-items-center">
                                            <span>Name</span>
                                            {sortField === 'lastname' && (
                                                <span className="ms-1">
                                                    {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('deceased_date')} className="sortable-header d-none d-md-table-cell" style={{ minWidth: '120px' }}>
                                        <div className="d-flex align-items-center">
                                            <span>Date of Death</span>
                                            {sortField === 'deceased_date' && (
                                                <span className="ms-1">
                                                    {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('burial_date')} className="sortable-header d-none d-lg-table-cell" style={{ minWidth: '120px' }}>
                                        <div className="d-flex align-items-center">
                                            <span>Burial Date</span>
                                            {sortField === 'burial_date' && (
                                                <span className="ms-1">
                                                    {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('age')} className="sortable-header d-none d-lg-table-cell text-center" style={{ minWidth: '80px' }}>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <span>Age</span>
                                            {sortField === 'age' && (
                                                <span className="ms-1">
                                                    {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('burial_location')} className="sortable-header d-none d-xl-table-cell" style={{ minWidth: '140px' }}>
                                        <div className="d-flex align-items-center">
                                            <span>Burial Location</span>
                                            {sortField === 'burial_location' && (
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
                                    <th className="text-center" style={{ minWidth: '120px', width: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <Spinner animation="border" role="status" size="sm">
                                                <span className="visually-hidden">Loading...</span>
                                            </Spinner>
                                            <div className="mt-2 small text-muted">Loading records...</div>
                                        </td>
                                    </tr>
                                ) : records.length > 0 ? (
                                    records.map((record) => (
                                        <tr key={record.id}>
                                            <td>
                                                <div className="fw-semibold">{`${record.name} ${record.lastname}`}</div>
                                                <div className="d-md-none small text-muted">
                                                    {record.deceased_date ? new Date(record.deceased_date).toLocaleDateString() : 'N/A'}
                                                    {record.clergy && (
                                                        <div className="text-truncate" style={{ maxWidth: '120px' }}>
                                                            {record.clergy}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="d-none d-md-table-cell">
                                                {record.deceased_date ? new Date(record.deceased_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="d-none d-lg-table-cell">
                                                {record.burial_date ? new Date(record.burial_date).toLocaleDateString() : 'N/A'}
                                            </td>
                                            <td className="d-none d-lg-table-cell text-center">
                                                {record.age || 'N/A'}
                                            </td>
                                            <td className="d-none d-xl-table-cell">
                                                <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                                    {record.burial_location || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="d-none d-md-table-cell">
                                                <div className="text-truncate" style={{ maxWidth: '120px' }}>
                                                    {record.clergy}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-1">
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                                                        <Button variant="info" size="sm" onClick={() => handleView(record)} style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaEye size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit Record</Tooltip>}>
                                                        <Button variant="primary" size="sm" onClick={() => handleEdit(record)} style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaEdit size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Delete Record</Tooltip>}>
                                                        <Button variant="danger" size="sm" onClick={() => handleDeleteClick(record)} style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaTrash size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>View History</Tooltip>}>
                                                        <Button variant="secondary" size="sm" onClick={() => handleViewHistory(record)} className="d-none d-lg-inline-block" style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaHistory size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Generate Certificate</Tooltip>}>
                                                        <Button variant="outline-success" size="sm" onClick={() => generateCertificate(record)} style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaFileAlt size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                    <OverlayTrigger placement="top" overlay={<Tooltip>Preview Certificate</Tooltip>}>
                                                        <Button variant="outline-secondary" size="sm" onClick={() => {
                                                            setCurrentRecord(record);
                                                            previewCertificate(record);
                                                        }} style={{ minWidth: '32px', minHeight: '32px' }}>
                                                            <FaEye size={12} />
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-5">
                                            <div className="text-muted">
                                                <FaSearch size={24} className="mb-2" />
                                                <div>No records found</div>
                                                <small>Try adjusting your search or filters</small>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                    {/* Pagination Section */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center mt-3 pt-3 px-3 gap-2 border-top">
                        <div className="text-muted small order-2 order-sm-1">
                            Showing {records.length} of {totalRecords} records
                        </div>
                        <div className="order-1 order-sm-2">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(totalRecords / recordsPerPage)}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Record Form Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" fullscreen="md-down" scrollable>
                <Modal.Header closeButton className="py-2 py-md-3">
                    <Modal.Title className="h5 h-md-4">
                        {viewMode ? 'Funeral Record Details' : currentRecord ? 'Edit Funeral Record' : 'Add New Funeral Record'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2 p-md-3">
                    {viewMode ? (
                        currentRecord && (
                            <div className="record-details">
                                <Row className="g-2 g-md-3">
                                    <Col xs={12} md={6}>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Name:</strong>
                                            <span>{`${currentRecord.name} ${currentRecord.lastname}`}</span>
                                        </div>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Date of Death:</strong>
                                            <span>{currentRecord.deceased_date ? new Date(currentRecord.deceased_date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Burial Date:</strong>
                                            <span>{currentRecord.burial_date ? new Date(currentRecord.burial_date).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Age:</strong>
                                            <span>{currentRecord.age || 'N/A'}</span>
                                        </div>
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Burial Location:</strong>
                                            <span>{currentRecord.burial_location || 'N/A'}</span>
                                        </div>
                                        <div className="mb-3">
                                            <strong className="d-block small text-muted">Clergy:</strong>
                                            <span>{currentRecord.clergy}</span>
                                        </div>
                                    </Col>
                                </Row>
                            </div>
                        )
                    ) : (
                        <Formik
                            initialValues={{
                                name: currentRecord?.name || '',
                                lastname: currentRecord?.lastname || '',
                                deceased_date: currentRecord?.deceased_date ? currentRecord.deceased_date.split('T')[0] : '',
                                burial_date: currentRecord?.burial_date ? currentRecord.burial_date.split('T')[0] : '',
                                age: currentRecord?.age || '',
                                burial_location: currentRecord?.burial_location || '',
                                clergy: currentRecord?.clergy || '',
                            }}
                            validationSchema={funeralRecordSchema}
                            onSubmit={handleSubmit}
                            enableReinitialize
                        >
                            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
                                <Form onSubmit={handleSubmit}>
                                    <Row className="g-2 g-md-3">
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">First Name <span className="text-danger">*</span></Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="name"
                                                    size="sm"
                                                    value={values.name}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.name && errors.name}
                                                    style={{ minHeight: '38px' }}
                                                />
                                                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">Last Name <span className="text-danger">*</span></Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="lastname"
                                                    size="sm"
                                                    value={values.lastname}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.lastname && errors.lastname}
                                                    style={{ minHeight: '38px' }}
                                                />
                                                <Form.Control.Feedback type="invalid">{errors.lastname}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row className="g-2 g-md-3">
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">Date of Death <span className="text-danger">*</span></Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    name="deceased_date"
                                                    size="sm"
                                                    value={values.deceased_date}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.deceased_date && errors.deceased_date}
                                                    style={{ minHeight: '38px' }}
                                                />
                                                {touched.deceased_date && errors.deceased_date && (
                                                    <div className="invalid-feedback d-block small">{errors.deceased_date}</div>
                                                )}
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">Burial Date</Form.Label>
                                                <Form.Control
                                                    type="date"
                                                    name="burial_date"
                                                    size="sm"
                                                    value={values.burial_date}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.burial_date && errors.burial_date}
                                                    style={{ minHeight: '38px' }}
                                                />
                                                {touched.burial_date && errors.burial_date && (
                                                    <div className="invalid-feedback d-block small">{errors.burial_date}</div>
                                                )}
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Row className="g-2 g-md-3">
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">Age</Form.Label>
                                                <Form.Control
                                                    type="number"
                                                    name="age"
                                                    size="sm"
                                                    value={values.age}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.age && errors.age}
                                                    style={{ minHeight: '38px' }}
                                                    min="0"
                                                    max="150"
                                                />
                                                <Form.Control.Feedback type="invalid">{errors.age}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col xs={12} md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label className="small fw-semibold">Burial Location</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="burial_location"
                                                    size="sm"
                                                    value={values.burial_location}
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    isInvalid={touched.burial_location && errors.burial_location}
                                                    style={{ minHeight: '38px' }}
                                                />
                                                <Form.Control.Feedback type="invalid">{errors.burial_location}</Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="small fw-semibold">Clergy <span className="text-danger">*</span></Form.Label>
                                        <Form.Select
                                            name="clergy"
                                            size="sm"
                                            value={values.clergy}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            isInvalid={touched.clergy && errors.clergy}
                                            style={{ minHeight: '38px' }}
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
                                    <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4">
                                        <Button variant="secondary" onClick={() => setShowModal(false)} className="order-2 order-sm-1">
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="primary"
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="order-1 order-sm-2"
                                            style={{ minHeight: '38px' }}
                                        >
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
                    <Modal.Footer className="py-2 py-md-3">
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
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
                <Modal.Header closeButton className="py-2">
                    <Modal.Title className="h6">Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3">
                    <div className="text-center">
                        <FaTrash size={32} className="text-danger mb-3" />
                        <p className="mb-2">Are you sure you want to delete the funeral record for:</p>
                        <strong className="d-block">{recordToDelete ? `${recordToDelete.name} ${recordToDelete.lastname}` : ''}</strong>
                        <small className="text-muted mt-2 d-block">This action cannot be undone.</small>
                    </div>
                </Modal.Body>
                <Modal.Footer className="py-2 d-flex justify-content-center gap-2">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} size="sm">
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} size="sm">
                        <FaTrash className="me-1" /> Delete Record
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Import Modal */}
            <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg" fullscreen="md-down" centered>
                <Modal.Header closeButton className="py-2 py-md-3">
                    <Modal.Title className="h5 h-md-4">Import Funeral Records</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2 p-md-3">
                    <Form onSubmit={handleImportSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-semibold">Upload CSV or Excel File</Form.Label>
                            <Form.Control
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setImportFile(e.target.files[0])}
                                required
                                size="sm"
                                style={{ minHeight: '38px' }}
                            />
                            <Form.Text className="text-muted small">
                                File should contain columns for name, lastname, deceased_date, burial_date, age, burial_location, and clergy.
                            </Form.Text>
                        </Form.Group>

                        {importErrors.length > 0 && (
                            <Alert variant="warning" className="small">
                                <Alert.Heading className="h6">Import Warnings</Alert.Heading>
                                <ul className="mb-0 small">
                                    {importErrors.map((error, index) => (
                                        <li key={index}>{error}</li>
                                    ))}
                                </ul>
                            </Alert>
                        )}

                        <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setShowImportModal(false)} className="order-2 order-sm-1">
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={isImporting || !importFile}
                                className="order-1 order-sm-2"
                                style={{ minHeight: '38px' }}
                            >
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
            <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg" fullscreen="md-down" scrollable>
                <Modal.Header closeButton className="py-2 py-md-3">
                    <Modal.Title className="h5 h-md-4">Record History</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2 p-md-3">
                    {historyLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading history...</span>
                            </Spinner>
                            <div className="mt-2 text-muted small">Loading history...</div>
                        </div>
                    ) : recordHistory.length > 0 ? (
                        <div className="history-timeline">
                            {recordHistory.map((entry, index) => (
                                <div key={index} className="history-item border-bottom pb-3 mb-3">
                                    <div className="history-date text-muted small mb-1">
                                        {new Date(entry.timestamp).toLocaleString()}
                                    </div>
                                    <div className="history-content">
                                        <h6 className="mb-1">{entry.action}</h6>
                                        <p className="mb-2 small"><strong>By:</strong> {entry.user}</p>
                                        {entry.changes && (
                                            <div className="changes-list">
                                                <h6 className="small">Changes:</h6>
                                                <ul className="small mb-0">
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
                        <div className="text-center py-5 text-muted">
                            <FaHistory size={32} className="mb-3" />
                            <div>No history available for this record.</div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-2 py-md-3">
                    <Button variant="secondary" onClick={() => setShowHistoryModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Certificate Preview Modal */}
            <Modal show={showPreviewModal} onHide={closePreviewModal} size="xl" fullscreen="lg-down" scrollable>
                <Modal.Header closeButton className="py-2 py-md-3">
                    <Modal.Title className="h5 h-md-4">Certificate Preview</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-2 p-md-3">
                    {previewLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Generating preview...</span>
                            </Spinner>
                            <div className="mt-2 text-muted small">Generating preview...</div>
                        </div>
                    ) : previewUrl ? (
                        <div className="certificate-preview-container">
                            <div className="text-center mb-3">
                                <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                                    <label className="form-label small mb-0">Zoom:</label>
                                    <input 
                                        type="range" 
                                        min="25" 
                                        max="150" 
                                        value={certificateZoom} 
                                        onChange={(e) => setCertificateZoom(Number(e.target.value))}
                                        className="form-range"
                                        style={{ width: '200px' }}
                                    />
                                    <span className="small text-muted">{certificateZoom}%</span>
                                </div>
                                <div className="d-flex justify-content-center gap-2 mb-2">
                                    <Button variant="outline-primary" size="sm" onClick={resetFieldOffsetsToDefaults}>
                                        <FaUndo className="me-1" /> Reset Positions
                                    </Button>
                                    <Button variant="outline-info" size="sm" onClick={() => setQuickPositionMode(!quickPositionMode)}>
                                        {quickPositionMode ? 'Normal' : 'Quick'} Mode
                                    </Button>
                                </div>
                            </div>
                            <div className="certificate-preview-wrapper" style={{ 
                                textAlign: 'center', 
                                overflow: 'auto', 
                                maxHeight: '70vh',
                                border: '1px solid #dee2e6',
                                borderRadius: '8px',
                                padding: '20px',
                                backgroundColor: '#f8f9fa'
                            }}>
                                <img 
                                    src={previewUrl} 
                                    alt="Certificate Preview" 
                                    style={{ 
                                        maxWidth: '100%',
                                        height: 'auto',
                                        transform: `scale(${certificateZoom / 100})`,
                                        transformOrigin: 'top center',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                    }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <Alert variant="warning">
                                <FaFileAlt size={32} className="mb-3" />
                                <div>No preview available.</div>
                            </Alert>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="py-2 py-md-3">
                    <Button variant="secondary" onClick={closePreviewModal}>
                        Close
                    </Button>
                    {currentRecord && (
                        <Button variant="primary" onClick={() => generateCertificate(currentRecord)}>
                            <FaDownload className="me-1" /> Download Certificate
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
                </>
            )}

            <style jsx="true">{`
          @keyframes lockPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          
          .lock-icon {
            animation: lockPulse 0.3s ease-in-out;
          }
          
          .funeral-records-container {
            min-height: calc(100vh - 120px);
            transition: all 0.3s ease;
          }
          
          /* Responsive table improvements */
          .records-table {
            font-size: 0.875rem;
          }
          
          .sortable-header {
            cursor: pointer;
            user-select: none;
            padding: 0.5rem !important;
            position: relative;
            transition: background-color 0.2s ease;
          }
          
          .sortable-header:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }
          
          /* Mobile table text truncation */
          @media (max-width: 767.98px) {
            .records-table td {
              padding: 0.5rem 0.25rem;
              font-size: 0.8rem;
            }
            
            .records-table .text-truncate {
              max-width: 100px !important;
            }
          }
          
          /* Button spacing for mobile */
          @media (max-width: 575.98px) {
            .d-flex.gap-1 > * {
              margin-bottom: 0.25rem;
            }
          }
          
          /* History timeline styles */
          .history-timeline {
            max-height: 400px;
            overflow-y: auto;
          }
          
          .history-item:last-child {
            border-bottom: none !important;
            padding-bottom: 0 !important;
            margin-bottom: 0 !important;
          }
          
          .history-content {
            background: rgba(0, 0, 0, 0.02);
            border-radius: 0.375rem;
            padding: 0.75rem;
            margin-top: 0.25rem;
          }
          
          /* Responsive modal improvements */
          @media (max-width: 767.98px) {
            .modal-fullscreen-md-down .modal-body {
              padding: 1rem;
            }
            
            .modal-fullscreen-md-down .modal-header {
              padding: 0.75rem 1rem;
            }
            
            .modal-fullscreen-md-down .modal-footer {
              padding: 0.75rem 1rem;
            }
          }
          
          /* Touch-friendly button sizes */
          .btn-sm {
            min-height: 32px;
            min-width: 32px;
          }
          
          /* Improved spacing for small screens */
          @media (max-width: 575.98px) {
            .px-2 {
              padding-left: 0.75rem !important;
              padding-right: 0.75rem !important;
            }
            
            .funeral-records-container h2 {
              font-size: 1.5rem;
            }
          }
          
          /* Dropdown improvements */
          .dropdown-menu {
            min-width: 200px;
          }
          
          @media (max-width: 575.98px) {
            .dropdown-menu {
              min-width: 180px;
              font-size: 0.875rem;
            }
          }
          
          /* Form control improvements */
          .form-control:focus,
          .form-select:focus {
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
            border-color: #86b7fe;
          }
          
          /* Print styles */
          @media print {
            .funeral-records-container {
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
        `}</style>
            </div>
        </div>
    );
};

export default FuneralRecords;
