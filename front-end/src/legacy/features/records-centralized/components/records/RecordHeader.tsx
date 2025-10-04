import React from 'react';
import { Row, Col, Button, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FaLock, FaUnlock, FaDownload, FaCloudUploadAlt, FaSignOutAlt, FaFileExcel, FaFilePdf } from 'react-icons/fa';
// Temporarily disabled for build - react-csv not available
// import { CSVLink } from 'react-csv';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { RECORD_TYPES, THEME_COLORS } from '@/constants';

/**
 * Header component for records page
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordHeader = ({
  recordType,
  isLocked,
  handleLockToggle,
  handleLogout,
  setShowImportModal,
  testAPI,
  records,
  csvHeaders,
  PDFDocument
}) => {
  // Get record type name for display
  const getRecordTypeName = () => {
    switch (recordType) {
      case RECORD_TYPES.BAPTISM:
        return 'Baptism';
      case RECORD_TYPES.MARRIAGE:
        return 'Marriage';
      case RECORD_TYPES.FUNERAL:
        return 'Funeral';
      default:
        return 'Record';
    }
  };

  // Get theme colors for this record type
  const themeColors = THEME_COLORS[recordType] || THEME_COLORS[RECORD_TYPES.BAPTISM];

  return (
    <div className="d-flex justify-content-between align-items-center mb-4" style={{
      background: themeColors.header,
      borderRadius: '15px',
      padding: '25px',
      color: 'white',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <div>
        <h2 className="h3 mb-2" style={{ fontWeight: '700', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
          {getRecordTypeName()} Records
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
            onClick={handleLockToggle}
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
                <Dropdown.Item disabled>
                  <FaFileExcel className="me-1" /> CSV (temporarily unavailable)
                </Dropdown.Item>
                {PDFDocument && (
                  <Dropdown.Item as={PDFDownloadLink} document={<PDFDocument records={records} />} fileName={`${recordType}_records.pdf`}>
                    {({ loading }) => (loading ? 'Loading...' : <><FaFilePdf className="me-1" /> PDF</>)}
                  </Dropdown.Item>
                )}
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
  );
};

export default RecordHeader;