import React from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { RECORD_TYPES } from './constants';

/**
 * Modal component for importing records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const ImportModal = ({
  recordType,
  showImportModal,
  setShowImportModal,
  importFile,
  setImportFile,
  importErrors,
  isImporting,
  handleImportSubmit
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

  // Get expected columns for this record type
  const getExpectedColumns = () => {
    switch (recordType) {
      case RECORD_TYPES.BAPTISM:
        return 'first_name, last_name, birth_date, reception_date, birthplace, entry_type, sponsors, parents, and clergy';
      case RECORD_TYPES.MARRIAGE:
        return 'fname_groom, lname_groom, fname_bride, lname_bride, mdate, parentsg, parentsb, witness, mlicense, and clergy';
      case RECORD_TYPES.FUNERAL:
        return 'name, lastname, deceased_date, burial_date, age, burial_location, and clergy';
      default:
        return 'appropriate columns for this record type';
    }
  };

  return (
    <Modal 
      show={showImportModal} 
      onHide={() => setShowImportModal(false)} 
      size="lg" 
      fullscreen="md-down" 
      centered
    >
      <Modal.Header closeButton className="py-2 py-md-3">
        <Modal.Title className="h5 h-md-4">Import {getRecordTypeName()} Records</Modal.Title>
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
              File should contain columns for {getExpectedColumns()}.
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
            <Button 
              variant="secondary" 
              onClick={() => setShowImportModal(false)} 
              className="order-2 order-sm-1"
            >
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
  );
};

export default ImportModal;