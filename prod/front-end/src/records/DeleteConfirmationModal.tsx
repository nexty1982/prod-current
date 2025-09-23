import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';
import { FIELD_DEFINITIONS, RECORD_TYPES } from './constants';

/**
 * Modal component for confirming record deletion
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const DeleteConfirmationModal = ({
  recordType,
  showDeleteModal,
  setShowDeleteModal,
  recordToDelete,
  handleDelete
}) => {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return null;
  }

  // Get display name function for this record type
  const getDisplayName = fieldDefs.displayName || ((record) => `Record ${record.id}`);

  // Get record type name for display
  const getRecordTypeName = () => {
    switch (recordType) {
      case RECORD_TYPES.BAPTISM:
        return 'baptism';
      case RECORD_TYPES.MARRIAGE:
        return 'marriage';
      case RECORD_TYPES.FUNERAL:
        return 'funeral';
      default:
        return 'record';
    }
  };

  return (
    <Modal 
      show={showDeleteModal} 
      onHide={() => setShowDeleteModal(false)} 
      centered 
      size="sm"
    >
      <Modal.Header closeButton className="py-2">
        <Modal.Title className="h6">Confirm Deletion</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-3">
        <div className="text-center">
          <FaTrash size={32} className="text-danger mb-3" />
          <p className="mb-2">Are you sure you want to delete the {getRecordTypeName()} record for:</p>
          <strong className="d-block">
            {recordToDelete ? getDisplayName(recordToDelete) : ''}
          </strong>
          <small className="text-muted mt-2 d-block">This action cannot be undone.</small>
        </div>
      </Modal.Body>
      <Modal.Footer className="py-2 d-flex justify-content-center gap-2">
        <Button 
          variant="secondary" 
          onClick={() => setShowDeleteModal(false)} 
          size="sm"
        >
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          size="sm"
        >
          <FaTrash className="me-1" /> Delete Record
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteConfirmationModal;