import React, { useEffect } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import { FaDownload, FaUndo } from 'react-icons/fa';
import { FIELD_DEFINITIONS } from './constants';

/**
 * Component for previewing and customizing certificates
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const CertificatePreviewer = ({
  recordType,
  showPreviewModal,
  closePreviewModal,
  previewUrl,
  previewLoading,
  certificateZoom,
  setCertificateZoom,
  currentRecord,
  handleGenerateCertificate,
  showAdvancedPositioning,
  setShowAdvancedPositioning,
  fieldOffsets,
  setFieldOffsets,
  fontSizes,
  setFontSizes,
  quickPositionMode,
  setQuickPositionMode,
  hiddenFields,
  toggleFieldVisibility,
  resetFieldOffsetsToDefaults
}) => {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return null;
  }

  // Get certificate config for this record type
  const certificateConfig = fieldDefs.certificateConfig || {};
  const defaultFieldOffsets = certificateConfig.defaultFieldOffsets || {};
  const defaultFontSizes = certificateConfig.defaultFontSizes || {};

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

  // Get field labels for this record type
  const getFieldLabels = () => {
    const fieldLabels = {};
    
    Object.keys(defaultFieldOffsets).forEach(fieldName => {
      // Generate readable labels based on field names
      fieldLabels[fieldName] = fieldName
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .replace(/MD$/, ' (MM/DD)') // Replace MD suffix with (MM/DD)
        .replace(/Y$/, ' (YYYY)'); // Replace Y suffix with (YYYY)
    });
    
    return fieldLabels;
  };

  const fieldLabels = getFieldLabels();

  return (
    <Modal 
      show={showPreviewModal} 
      onHide={closePreviewModal} 
      size="xl" 
      fullscreen="lg-down" 
      scrollable
    >
      <Modal.Header closeButton className="py-2 py-md-3">
        <Modal.Title className="h5 h-md-4 d-flex align-items-center justify-content-between w-100">
          <span>Certificate Preview</span>
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
              maxHeight: '120px',
              flexShrink: 0,
              padding: '8px'
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
                  <span 
                    className={`badge ${quickPositionMode ? "bg-info" : "bg-secondary"}`}
                    style={{ fontSize: '0.6rem' }}
                  >
                    ±{quickPositionMode ? "20" : "5"}
                  </span>
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
                          {fieldLabels[fieldName] || fieldName}
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
                          ×
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
                      {fontSizes && fontSizes[fieldName] !== undefined && (
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
                      )}
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
                  handleGenerateCertificate(currentRecord);
                  closePreviewModal();
                }}
              >
                <FaDownload className="me-1" /> Generate Certificate
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
      
      <style jsx="true">{`
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
    </Modal>
  );
};

export default CertificatePreviewer;