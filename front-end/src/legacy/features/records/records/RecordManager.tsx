import React, { useRef } from 'react';
import { Card, Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import shared components
import RecordHeader from './RecordHeader';
import RecordSearch from './RecordSearch';
import RecordFilters from './RecordFilters';
import RecordTable from './RecordTable';
import RecordFormModal from './RecordFormModal';
import RecordHistoryModal from './RecordHistoryModal';
import CertificatePreviewer from './CertificatePreviewer';
import ImportModal from './ImportModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import RecordPagination from './RecordPagination';

// Import custom hook and constants
import useRecordManager from './useRecordManager';
import { RECORD_TYPES, THEME_COLORS, CSV_HEADERS } from './constants';

/**
 * Main component for managing records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordManager = ({
  recordType,
  PDFDocument,
  ReadOnlyView
}) => {
  // Validate record type
  if (!Object.values(RECORD_TYPES).includes(recordType)) {
    console.error(`Invalid record type: ${recordType}`);
    // throw an error to prevent invalid usage
    throw new Error(`Invalid record type: ${recordType}`);
    // or: return null;
  }

  // Use the record manager hook
  const recordManager = useRecordManager(recordType);
  
  // Get theme colors for this record type
  const themeColors = THEME_COLORS[recordType] || THEME_COLORS[RECORD_TYPES.BAPTISM];
  
  // Get CSV headers for this record type
  const csvHeaders = CSV_HEADERS[recordType] || [];
  
  // Reference for printing
  const printRef = useRef();

  return (
    <div className="fullscreen-page" style={{ 
      width: '100%', 
      height: '100%', 
      background: themeColors.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      <div 
        className="records-container w-100 px-2 px-md-3 px-lg-4 orthodox-cross-pattern" 
        data-record-type={recordType}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          margin: '20px',
          padding: '30px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Header Section */}
        <RecordHeader
          recordType={recordType}
          isLocked={recordManager.isLocked}
          handleLockToggle={recordManager.handleLockToggle}
          handleLogout={recordManager.handleLogout}
          setShowImportModal={recordManager.setShowImportModal}
          testAPI={recordManager.handleTestAPI}
          records={recordManager.records}
          csvHeaders={csvHeaders}
          PDFDocument={PDFDocument}
        />
        
        {/* Conditional rendering based on lock state */}
        {recordManager.isLocked && ReadOnlyView ? (
          <ReadOnlyView />
        ) : (
          <>
            {/* Search and Controls Section */}
            <Card className="mb-4 shadow-sm border-0" style={{
              borderRadius: '15px',
              background: themeColors.search || 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
              <Card.Body className="p-3 p-md-4">
                <RecordSearch
                  recordType={recordType}
                  searchTerm={recordManager.searchTerm}
                  setSearchTerm={recordManager.setSearchTerm}
                  handleSearch={recordManager.handleSearch}
                  showFilters={recordManager.showFilters}
                  setShowFilters={recordManager.setShowFilters}
                  recordsPerPage={recordManager.recordsPerPage}
                  setRecordsPerPage={recordManager.setRecordsPerPage}
                  setCurrentRecord={recordManager.setCurrentRecord}
                  setViewMode={recordManager.setViewMode}
                  setShowModal={recordManager.setShowModal}
                  isLocked={recordManager.isLocked}
                />
                
                {/* Filters Section */}
                {recordManager.showFilters && (
                  <Card className="mb-3 border-0" style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '15px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.1)'
                  }}>
                    <Card.Body>
                      <RecordFilters
                        recordType={recordType}
                        filters={recordManager.filters}
                        handleFilterChange={recordManager.handleFilterChange}
                        resetFilters={recordManager.resetFilters}
                        locations={recordManager.locations}
                        clergyList={recordManager.clergyList}
                      />
                    </Card.Body>
                  </Card>
                )}
              </Card.Body>
            </Card>
            
            {/* Records Table Card */}
            <Card className="shadow-sm border-0" style={{
              borderRadius: '15px',
              background: themeColors.table || 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
              boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
            }}>
              <Card.Body className="p-0">
                {/* Records Table */}
                <RecordTable
                  recordType={recordType}
                  records={recordManager.records}
                  isLoading={recordManager.isLoading}
                  sortField={recordManager.sortField}
                  sortDirection={recordManager.sortDirection}
                  handleSort={recordManager.handleSort}
                  handleView={recordManager.handleView}
                  handleEdit={recordManager.handleEdit}
                  handleDeleteClick={recordManager.handleDeleteClick}
                  handleViewHistory={recordManager.handleViewHistory}
                  handlePreviewCertificate={recordManager.handlePreviewCertificate}
                  handleGenerateCertificate={recordManager.handleGenerateCertificate}
                  isLocked={recordManager.isLocked}
                  printRef={printRef}
                />
                
                {/* Pagination and Record Count */}
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 mt-3 pt-3 px-3 border-top">
                  <div className="text-muted small">
                    Showing {recordManager.records.length} of {recordManager.totalRecords} records
                  </div>
                  <RecordPagination
                    currentPage={recordManager.currentPage}
                    totalPages={Math.ceil(recordManager.totalRecords / recordManager.recordsPerPage)}
                    onPageChange={recordManager.handlePageChange}
                  />
                </div>
              </Card.Body>
            </Card>
            
            {/* Modals */}
            <RecordFormModal
              recordType={recordType}
              showModal={recordManager.showModal}
              setShowModal={recordManager.setShowModal}
              currentRecord={recordManager.currentRecord}
              viewMode={recordManager.viewMode}
              setViewMode={recordManager.setViewMode}
              handleSubmit={recordManager.handleSubmit}
              handleGenerateCertificate={recordManager.handleGenerateCertificate}
              clergyList={recordManager.clergyList}
              locations={recordManager.locations}
            />
            
            <RecordHistoryModal
              showHistoryModal={recordManager.showHistoryModal}
              setShowHistoryModal={recordManager.setShowHistoryModal}
              recordHistory={recordManager.recordHistory}
              historyLoading={recordManager.historyLoading}
            />
            
            <CertificatePreviewer
              recordType={recordType}
              showPreviewModal={recordManager.showPreviewModal}
              closePreviewModal={recordManager.closePreviewModal}
              previewUrl={recordManager.previewUrl}
              previewLoading={recordManager.previewLoading}
              certificateZoom={recordManager.certificateZoom}
              setCertificateZoom={recordManager.setCertificateZoom}
              currentRecord={recordManager.currentRecord}
              handleGenerateCertificate={recordManager.handleGenerateCertificate}
              showAdvancedPositioning={recordManager.showAdvancedPositioning}
              setShowAdvancedPositioning={recordManager.setShowAdvancedPositioning}
              fieldOffsets={recordManager.fieldOffsets}
              setFieldOffsets={recordManager.setFieldOffsets}
              fontSizes={recordManager.fontSizes}
              setFontSizes={recordManager.setFontSizes}
              quickPositionMode={recordManager.quickPositionMode}
              setQuickPositionMode={recordManager.setQuickPositionMode}
              hiddenFields={recordManager.hiddenFields}
              toggleFieldVisibility={recordManager.toggleFieldVisibility}
              resetFieldOffsetsToDefaults={recordManager.resetFieldOffsetsToDefaults}
            />
            
            <ImportModal
              recordType={recordType}
              showImportModal={recordManager.showImportModal}
              setShowImportModal={recordManager.setShowImportModal}
              importFile={recordManager.importFile}
              setImportFile={recordManager.setImportFile}
              importErrors={recordManager.importErrors}
              isImporting={recordManager.isImporting}
              handleImportSubmit={recordManager.handleImportSubmit}
            />
            
            <DeleteConfirmationModal
              recordType={recordType}
              showDeleteModal={recordManager.showDeleteModal}
              setShowDeleteModal={recordManager.setShowDeleteModal}
              recordToDelete={recordManager.recordToDelete}
              handleDelete={recordManager.handleDelete}
            />
          </>
        )}
      </div>
      
      <style jsx="true">{`
        .records-container {
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
        
        /* Print styles */
        @media print {
          .records-container {
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
  );
};

export default RecordManager;