/**
 * Custom hook for managing record data across baptism, marriage, and funeral records
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  fetchRecords, 
  createRecord, 
  updateRecord, 
  deleteRecord, 
  fetchRecordHistory,
  importRecords,
  fetchDropdownOptions,
  generateCertificate,
  previewCertificate,
  testAPI
} from './api';
import { FIELD_DEFINITIONS, RECORD_TYPES } from './constants';

/**
 * Hook for managing record data
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @returns {Object} - Record management functions and state
 */
const useRecordManager = (recordType) => {
  // Validate record type
  if (!Object.values(RECORD_TYPES).includes(recordType)) {
    throw new Error(`Invalid record type: ${recordType}`);
  }

  // State for records data
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // State for sorting
  const [sortField, setSortField] = useState(FIELD_DEFINITIONS[recordType].defaultSort.field);
  const [sortDirection, setSortDirection] = useState(FIELD_DEFINITIONS[recordType].defaultSort.direction);
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // State for dropdown options
  const [locations, setLocations] = useState([]);
  const [clergyList, setClergyList] = useState([]);
  
  // State for modals
  const [showModal, setShowModal] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [recordHistory, setRecordHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // State for certificate preview
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [certificateZoom, setCertificateZoom] = useState(70);
  const [showAdvancedPositioning, setShowAdvancedPositioning] = useState(false);
  
  // Get default field offsets and font sizes from constants
  const defaultFieldOffsets = FIELD_DEFINITIONS[recordType].certificateConfig.defaultFieldOffsets;
  const defaultFontSizes = FIELD_DEFINITIONS[recordType].certificateConfig.defaultFontSizes || {};
  
  // State for certificate field positioning
  const [fieldOffsets, setFieldOffsets] = useState(defaultFieldOffsets);
  const [fontSizes, setFontSizes] = useState(defaultFontSizes);
  const [quickPositionMode, setQuickPositionMode] = useState(false);
  const [hiddenFields, setHiddenFields] = useState(new Set());
  
  // State for record locking
  const [isLocked, setIsLocked] = useState(false);
  
  // Fetch records when dependencies change
  useEffect(() => {
    loadRecords();
  }, [currentPage, recordsPerPage, sortField, sortDirection]);
  
  // Fetch dropdown options on mount
  useEffect(() => {
    loadDropdownOptions();
  }, []);
  
  // Handle search and filter changes with debounce
  useEffect(() => {
    if (searchTerm || Object.values(filters).some(value => value !== null && value !== '')) {
      const delaySearch = setTimeout(() => {
        setCurrentPage(1);
        loadRecords();
      }, 500);
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchTerm, filters]);
  
  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  // Auto-update preview when field offsets or font sizes change
  useEffect(() => {
    if (showPreviewModal && currentRecord && !previewLoading) {
      const timeoutId = setTimeout(() => {
        handlePreviewCertificate(currentRecord);
      }, 300); // Debounce for smoother slider experience
      
      return () => clearTimeout(timeoutId);
    }
  }, [fieldOffsets, fontSizes, hiddenFields, showPreviewModal, currentRecord, previewLoading]);
  
  /**
   * Load records from the API
   */
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = {
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
        sortField,
        sortDirection,
        ...filters
      };
      
      const { records: fetchedRecords, totalRecords: total } = await fetchRecords(recordType, params);
      
      setRecords(fetchedRecords);
      setTotalRecords(total);
    } catch (error) {
      console.error(`Error fetching ${recordType} records:`, error);
      setError(`Failed to load records: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [recordType, currentPage, recordsPerPage, searchTerm, sortField, sortDirection, filters]);
  
  /**
   * Load dropdown options for filters
   */
  const loadDropdownOptions = async () => {
    try {
      const [locationsData, clergyData] = await Promise.all([
        fetchDropdownOptions('locations', recordType),
        fetchDropdownOptions('clergy')
      ]);
      
      setLocations(locationsData);
      setClergyList(clergyData);
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };
  
  /**
   * Handle page change
   * @param {number} pageNumber - The new page number
   */
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  
  /**
   * Handle sort change
   * @param {string} field - The field to sort by
   */
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  /**
   * Handle filter change
   * @param {string} name - The filter name
   * @param {any} value - The filter value
   */
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setFilters({});
    setSearchTerm('');
  };
  
  /**
   * Handle search form submission
   * @param {Event} e - The form event
   */
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRecords();
  };
  
  /**
   * Open the edit modal for a record
   * @param {Object} record - The record to edit
   */
  const handleEdit = (record) => {
    setCurrentRecord(record);
    setViewMode(false);
    setShowModal(true);
  };
  
  /**
   * Open the view modal for a record
   * @param {Object} record - The record to view
   */
  const handleView = (record) => {
    setCurrentRecord(record);
    setViewMode(true);
    setShowModal(true);
  };
  
  /**
   * Open the delete confirmation modal for a record
   * @param {Object} record - The record to delete
   */
  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };
  
  /**
   * Delete a record
   */
  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      await deleteRecord(recordType, recordToDelete.id);
      loadRecords();
      toast.success('Record deleted successfully');
      setShowDeleteModal(false);
      setRecordToDelete(null);
    } catch (error) {
      console.error(`Error deleting ${recordType} record:`, error);
      toast.error('Failed to delete record');
    }
  };
  
  /**
   * Submit a record form (create or update)
   * @param {Object} values - The form values
   * @param {Object} formikHelpers - Formik helpers
   */
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      // Format date values if needed
      const formattedValues = { ...values };
      
      // Handle different date field names based on record type
      const dateFields = {
        [RECORD_TYPES.BAPTISM]: ['birth_date', 'reception_date'],
        [RECORD_TYPES.MARRIAGE]: ['mdate'],
        [RECORD_TYPES.FUNERAL]: ['deceased_date', 'burial_date']
      };
      
      // Format date fields
      (dateFields[recordType] || []).forEach(field => {
        if (formattedValues[field]) {
          formattedValues[field] = formattedValues[field] instanceof Date
            ? formattedValues[field].toISOString().split('T')[0]
            : formattedValues[field];
        }
      });
      
      if (currentRecord) {
        await updateRecord(recordType, currentRecord.id, formattedValues);
        toast.success('Record updated successfully');
      } else {
        await createRecord(recordType, formattedValues);
        toast.success('Record created successfully');
      }
      
      setShowModal(false);
      loadRecords();
      resetForm();
    } catch (error) {
      console.error(`Error saving ${recordType} record:`, error);
      toast.error('Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };
  
  /**
   * Handle import form submission
   * @param {Event} e - The form event
   */
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) return;
    
    setIsImporting(true);
    setImportErrors([]);
    
    try {
      const result = await importRecords(recordType, importFile);
      
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
      } else {
        toast.success(`Successfully imported ${result.imported} records`);
        setShowImportModal(false);
        loadRecords();
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import records');
    } finally {
      setIsImporting(false);
    }
  };
  
  /**
   * View record history
   * @param {Object} record - The record to view history for
   */
  const handleViewHistory = async (record) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    
    try {
      const history = await fetchRecordHistory(recordType, record.id);
      setRecordHistory(history);
    } catch (error) {
      console.error('Error fetching record history:', error);
      toast.error('Failed to load record history');
    } finally {
      setHistoryLoading(false);
    }
  };
  
  /**
   * Generate a certificate for a record
   * @param {Object} record - The record to generate a certificate for
   */
  const handleGenerateCertificate = async (record) => {
    try {
      toast.info(`Generating ${recordType} certificate...`);
      
      // Get download URL
      const downloadUrl = generateCertificate(recordType, record.id, {
        fieldOffsets,
        fontSizes,
        hiddenFields
      });
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Get filename from constants
      const filenameGetter = FIELD_DEFINITIONS[recordType].certificateFilename;
      const filename = filenameGetter ? filenameGetter(record) : `${recordType}_certificate.png`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${recordType.charAt(0).toUpperCase() + recordType.slice(1)} certificate generated successfully`);
    } catch (error) {
      console.error(`Error generating ${recordType} certificate:`, error);
      toast.error(`Failed to generate ${recordType} certificate`);
    }
  };
  
  /**
   * Preview a certificate for a record
   * @param {Object} record - The record to preview a certificate for
   */
  const handlePreviewCertificate = async (record) => {
    if (!record || previewLoading) return;
    
    setPreviewLoading(true);
    
    try {
      // Only show toast for initial load, not for live updates
      if (!showPreviewModal) {
        toast.info("Generating preview...");
      }
      
      const result = await previewCertificate(recordType, record.id, {
        fieldOffsets,
        fontSizes,
        hiddenFields
      });
      
      if (result.success) {
        setPreviewUrl(result.preview);
        setShowPreviewModal(true);
        toast.dismiss();
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error("Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };
  
  /**
   * Close the preview modal and reset state
   */
  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setCurrentRecord(null);
    setPreviewLoading(false);
    setQuickPositionMode(false);
    setShowAdvancedPositioning(false);
    setHiddenFields(new Set());
    
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };
  
  /**
   * Reset field offsets to defaults
   */
  const resetFieldOffsetsToDefaults = () => {
    setFieldOffsets({ ...defaultFieldOffsets });
    setFontSizes({ ...defaultFontSizes });
    setHiddenFields(new Set());
  };
  
  /**
   * Reset an individual field to default
   * @param {string} fieldName - The field name
   */
  const resetIndividualFieldToDefault = (fieldName) => {
    setFieldOffsets(prev => ({
      ...prev,
      [fieldName]: { ...defaultFieldOffsets[fieldName] }
    }));
    
    if (defaultFontSizes[fieldName]) {
      setFontSizes(prev => ({
        ...prev,
        [fieldName]: defaultFontSizes[fieldName]
      }));
    }
  };
  
  /**
   * Toggle field visibility
   * @param {string} fieldName - The field name
   */
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
  
  /**
   * Test API connectivity
   */
  const handleTestAPI = async () => {
    try {
      const result = await testAPI(recordType);
      toast.success(`API test successful - Connected to ${recordType} records API (Status: ${result.status})`);
      return result;
    } catch (error) {
      console.error('API Test Failed:', error);
      toast.error(`API test failed: ${error.message}`);
      throw error;
    }
  };
  
  /**
   * Toggle record locking
   */
  const handleLockToggle = () => {
    setIsLocked(prev => !prev);
  };
  
  return {
    // State
    records,
    totalRecords,
    isLoading,
    error,
    currentPage,
    recordsPerPage,
    sortField,
    sortDirection,
    searchTerm,
    filters,
    showFilters,
    locations,
    clergyList,
    showModal,
    currentRecord,
    viewMode,
    showDeleteModal,
    recordToDelete,
    showImportModal,
    importFile,
    importErrors,
    isImporting,
    showHistoryModal,
    recordHistory,
    historyLoading,
    showPreviewModal,
    previewUrl,
    previewLoading,
    certificateZoom,
    showAdvancedPositioning,
    fieldOffsets,
    fontSizes,
    quickPositionMode,
    hiddenFields,
    isLocked,
    
    // Setters
    setCurrentPage,
    setRecordsPerPage,
    setSortField,
    setSortDirection,
    setSearchTerm,
    setFilters,
    setShowFilters,
    setShowModal,
    setCurrentRecord,
    setViewMode,
    setShowDeleteModal,
    setRecordToDelete,
    setShowImportModal,
    setImportFile,
    setShowHistoryModal,
    setCertificateZoom,
    setShowAdvancedPositioning,
    setFieldOffsets,
    setFontSizes,
    setQuickPositionMode,
    setIsLocked,
    
    // Handlers
    loadRecords,
    handlePageChange,
    handleSort,
    handleFilterChange,
    resetFilters,
    handleSearch,
    handleEdit,
    handleView,
    handleDeleteClick,
    handleDelete,
    handleSubmit,
    handleImportSubmit,
    handleViewHistory,
    handleGenerateCertificate,
    handlePreviewCertificate,
    closePreviewModal,
    resetFieldOffsetsToDefaults,
    resetIndividualFieldToDefault,
    toggleFieldVisibility,
    handleTestAPI,
    handleLockToggle
  };
};

export default useRecordManager;