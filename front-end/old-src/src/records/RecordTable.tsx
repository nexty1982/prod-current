import React, { useRef } from 'react';
import { Table, Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaHistory, 
  FaFileAlt, 
  FaSortAmountUp, 
  FaSortAmountDown 
} from 'react-icons/fa';
import { FIELD_DEFINITIONS, RECORD_TYPES } from './constants';

/**
 * Reusable table component for displaying records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordTable = ({
  recordType,
  records,
  isLoading,
  sortField,
  sortDirection,
  handleSort,
  handleView,
  handleEdit,
  handleDeleteClick,
  handleViewHistory,
  handlePreviewCertificate,
  handleGenerateCertificate,
  isLocked,
  printRef
}) => {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return <div>Error: Invalid record type</div>;
  }

  // Get display name function for this record type
  const getDisplayName = fieldDefs.displayName || ((record) => `Record ${record.id}`);

  // Get sort fields for this record type
  const sortFields = fieldDefs.sortFields || [];

  // Get table columns for this record type
  const tableColumns = fieldDefs.tableColumns || [];

  // Function to format date values
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Function to get cell value based on column definition
  const getCellValue = (record, column) => {
    if (column.valueGetter) {
      return column.valueGetter({ data: record });
    }
    
    if (column.cellRenderer === 'dateRenderer') {
      return formatDate(record[column.field]);
    }
    
    return record[column.field] || 'N/A';
  };

  // Function to render mobile-friendly additional info
  const renderMobileInfo = (record) => {
    // Different mobile info based on record type
    switch (recordType) {
      case RECORD_TYPES.BAPTISM:
        return (
          <div className="d-md-none small text-muted">
            {record.birth_date ? formatDate(record.birth_date) : 'Birth: N/A'}
            {record.birthplace && ` • ${record.birthplace}`}
          </div>
        );
      case RECORD_TYPES.MARRIAGE:
        return (
          <div className="d-md-none small text-muted">
            {record.mdate ? formatDate(record.mdate) : 'N/A'}
          </div>
        );
      case RECORD_TYPES.FUNERAL:
        return (
          <div className="d-md-none small text-muted">
            {record.deceased_date ? formatDate(record.deceased_date) : 'N/A'}
            {record.clergy && (
              <div className="text-truncate" style={{ maxWidth: '120px' }}>
                {record.clergy}
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={printRef} className="table-responsive">
      <Table striped bordered hover className="records-table mb-0" size="sm">
        <thead className="table-header" style={{
          background: fieldDefs.tableHeaderBackground || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <tr>
            {tableColumns.map((column, index) => (
              // Only show certain columns on mobile
              <th 
                key={index} 
                onClick={() => handleSort(column.field)} 
                className={`sortable-header ${column.hideOnMobile ? 'd-none d-md-table-cell' : ''}`}
                style={{ minWidth: column.minWidth || '120px' }}
              >
                <div className="d-flex align-items-center">
                  <span>{column.headerName}</span>
                  {sortField === column.field && (
                    <span className="ms-1">
                      {sortDirection === 'asc' ? <FaSortAmountUp size={12} /> : <FaSortAmountDown size={12} />}
                    </span>
                  )}
                </div>
              </th>
            ))}
            <th className="text-center" style={{ minWidth: '120px', width: '120px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={tableColumns.length + 1} className="text-center py-4">
                <Spinner animation="border" role="status" size="sm">
                  <span className="visually-hidden">Loading...</span>
                </Spinner>
                <div className="mt-2 text-muted">Loading records...</div>
              </td>
            </tr>
          ) : records.length > 0 ? (
            records.map((record) => (
              <tr key={record.id}>
                {tableColumns.map((column, colIndex) => {
                  // Skip columns that should be hidden on mobile
                  if (column.hideOnMobile) {
                    return (
                      <td key={colIndex} className="d-none d-md-table-cell">
                        {getCellValue(record, column)}
                      </td>
                    );
                  }
                  
                  // First column gets special treatment with mobile info
                  if (colIndex === 0) {
                    return (
                      <td key={colIndex}>
                        <div className="fw-semibold">{getCellValue(record, column)}</div>
                        {renderMobileInfo(record)}
                      </td>
                    );
                  }
                  
                  // Regular column
                  return (
                    <td key={colIndex} className={column.className || ''}>
                      {getCellValue(record, column)}
                    </td>
                  );
                })}
                <td className="text-center">
                  <div className="d-flex justify-content-center gap-1">
                    <OverlayTrigger placement="top" overlay={<Tooltip>View Details</Tooltip>}>
                      <Button 
                        variant="info" 
                        size="sm" 
                        onClick={() => handleView(record)} 
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <FaEye size={12} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>Edit Record</Tooltip>}>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => handleEdit(record)} 
                        disabled={isLocked}
                        style={{ 
                          minWidth: '32px', 
                          minHeight: '32px',
                          opacity: isLocked ? 0.5 : 1
                        }}
                      >
                        <FaEdit size={12} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>Delete Record</Tooltip>}>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => handleDeleteClick(record)} 
                        disabled={isLocked}
                        style={{ 
                          minWidth: '32px', 
                          minHeight: '32px',
                          opacity: isLocked ? 0.5 : 1
                        }}
                      >
                        <FaTrash size={12} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>View History</Tooltip>}>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleViewHistory(record)} 
                        className="d-none d-lg-inline-block"
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <FaHistory size={12} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>Generate Certificate</Tooltip>}>
                      <Button 
                        variant="success" 
                        size="sm" 
                        onClick={() => handleGenerateCertificate(record)} 
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <FaFileAlt size={12} />
                      </Button>
                    </OverlayTrigger>
                    
                    <OverlayTrigger placement="top" overlay={<Tooltip>Preview Certificate</Tooltip>}>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={() => handlePreviewCertificate(record)} 
                        style={{ minWidth: '32px', minHeight: '32px' }}
                      >
                        <FaEye size={12} />
                      </Button>
                    </OverlayTrigger>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={tableColumns.length + 1} className="text-center py-5">
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
  );
};

export default RecordTable;