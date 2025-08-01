import React from 'react';
import { Form, Row, Col, Button } from 'react-bootstrap';
import { FaUndo } from 'react-icons/fa';
import { FIELD_DEFINITIONS } from './constants';

/**
 * Component for filtering records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordFilters = ({
  recordType,
  filters,
  handleFilterChange,
  resetFilters,
  locations,
  clergyList
}) => {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return null;
  }

  // Get filter definitions for this record type
  const filterDefs = fieldDefs.filters || [];

  // Render a filter field based on its type
  const renderFilterField = (filter) => {
    switch (filter.type) {
      case 'date':
        return (
          <Form.Control
            type="date"
            value={filters[filter.name] ? filters[filter.name].toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value ? new Date(e.target.value) : null)}
            style={{ minHeight: '44px' }}
          />
        );
        
      case 'select':
        let options = [];
        
        if (filter.options) {
          options = filter.options;
        } else if (filter.optionsSource === 'locations') {
          options = locations || [];
        } else if (filter.optionsSource === 'clergy') {
          options = clergyList || [];
        }
        
        return (
          <Form.Select
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            style={{ minHeight: '44px' }}
          >
            <option value="">All {filter.label}s</option>
            {options.map((option, idx) => (
              <option key={idx} value={typeof option === 'object' ? option.value : option}>
                {typeof option === 'object' ? option.label : option}
              </option>
            ))}
          </Form.Select>
        );
        
      case 'text':
      default:
        return (
          <Form.Control
            type="text"
            value={filters[filter.name] || ''}
            onChange={(e) => handleFilterChange(filter.name, e.target.value)}
            style={{ minHeight: '44px' }}
          />
        );
    }
  };

  return (
    <div className="p-3 p-md-4 bg-light rounded">
      <h6 className="mb-3">Filter Records</h6>
      <Row className="g-3">
        {filterDefs.map((filter, index) => (
          <Col xs={12} sm={6} md={4} lg={3} key={index}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">{filter.label}</Form.Label>
              {renderFilterField(filter)}
            </Form.Group>
          </Col>
        ))}
      </Row>
      <div className="d-flex justify-content-center justify-content-md-end mt-3">
        <Button variant="secondary" onClick={resetFilters} className="px-3">
          <FaUndo className="me-1" /> Reset Filters
        </Button>
      </div>
    </div>
  );
};

export default RecordFilters;