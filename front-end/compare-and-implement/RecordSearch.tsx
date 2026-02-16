import React from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';
import { FaSearch, FaFilter, FaPlus } from 'react-icons/fa';
import { THEME_COLORS } from './constants';

/**
 * Component for searching and filtering records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordSearch = ({
  recordType,
  searchTerm,
  setSearchTerm,
  handleSearch,
  showFilters,
  setShowFilters,
  recordsPerPage,
  setRecordsPerPage,
  setCurrentRecord,
  setViewMode,
  setShowModal,
  isLocked
}) => {
  // Get theme colors for this record type
  const themeColors = THEME_COLORS[recordType] || {};

  return (
    <Row className="mb-3 g-3">
      <Col xs={12} md={8} lg={9}>
        <Form onSubmit={handleSearch}>
          <div className="d-flex flex-column flex-sm-row gap-2">
            <Form.Control
              type="text"
              placeholder="Search by name, location, clergy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow-1"
              style={{ 
                minHeight: '44px',
                borderRadius: '25px',
                border: '2px solid rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.9)',
                boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                fontSize: '16px',
                paddingLeft: '20px'
              }}
            />
            <div className="d-flex gap-2 flex-nowrap">
              <Button 
                variant="primary" 
                type="submit" 
                className="flex-shrink-0" 
                style={{ 
                  minHeight: '44px', 
                  minWidth: '48px',
                  borderRadius: '25px',
                  background: themeColors.gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
                  fontWeight: '600'
                }}
              >
                <FaSearch className="d-sm-none" />
                <span className="d-none d-sm-inline"><FaSearch className="me-1" /> Search</span>
              </Button>
              <Button 
                variant="outline-secondary" 
                className="flex-shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                style={{ 
                  minHeight: '44px', 
                  minWidth: '48px',
                  borderRadius: '25px',
                  border: '2px solid rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                  fontWeight: '600'
                }}
              >
                <FaFilter className="d-sm-none" />
                <span className="d-none d-sm-inline"><FaFilter className="me-1" /> {showFilters ? 'Hide' : 'Filters'}</span>
              </Button>
            </div>
          </div>
        </Form>
      </Col>
      <Col xs={12} md={4} lg={3}>
        <div className="d-flex gap-2 w-100">
          <Form.Select
            value={recordsPerPage}
            onChange={(e) => setRecordsPerPage(Number(e.target.value))}
            className="flex-shrink-0"
            style={{ 
              minWidth: '90px', 
              maxWidth: '130px', 
              minHeight: '44px',
              borderRadius: '25px',
              border: '2px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.9)',
              boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
              fontWeight: '600'
            }}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </Form.Select>
          <Button 
            variant="success" 
            onClick={() => {
              setCurrentRecord(null);
              setViewMode(false);
              setShowModal(true);
            }}
            className="flex-grow-1"
            disabled={isLocked}
            style={{ 
              minHeight: '44px',
              borderRadius: '25px',
              background: themeColors.addButton || 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
              fontWeight: '600',
              opacity: isLocked ? 0.6 : 1
            }}
          >
            <FaPlus className="d-sm-none" />
            <span className="d-none d-sm-inline"><FaPlus className="me-1" /> Add New</span>
          </Button>
        </div>
      </Col>
    </Row>
  );
};

export default RecordSearch;