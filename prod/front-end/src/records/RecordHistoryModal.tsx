import React from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaHistory } from 'react-icons/fa';

/**
 * Modal component for displaying record history
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordHistoryModal = ({
  showHistoryModal,
  setShowHistoryModal,
  recordHistory,
  historyLoading
}) => {
  return (
    <Modal 
      show={showHistoryModal} 
      onHide={() => setShowHistoryModal(false)} 
      size="lg" 
      fullscreen="md-down" 
      scrollable
    >
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
      
      <style jsx="true">{`
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
      `}</style>
    </Modal>
  );
};

export default RecordHistoryModal;