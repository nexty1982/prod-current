import React from 'react';
import { Modal, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { FaFileAlt } from 'react-icons/fa';
import { FIELD_DEFINITIONS, RECORD_TYPES } from './constants';

/**
 * Reusable form modal component for adding and editing records
 * @param {Object} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const RecordFormModal = ({
  recordType,
  showModal,
  setShowModal,
  currentRecord,
  viewMode,
  setViewMode,
  handleSubmit,
  handleGenerateCertificate,
  clergyList,
  locations
}) => {
  // Get field definitions for this record type
  const fieldDefs = FIELD_DEFINITIONS[recordType];
  if (!fieldDefs) {
    console.error(`Invalid record type: ${recordType}`);
    return null;
  }

  // Get fields for this record type
  const fields = fieldDefs.fields || [];

  // Get validation schema for this record type
  const validationSchemaObj = fieldDefs.validationSchema || {};

  // Build Yup validation schema
  const buildValidationSchema = () => {
    const schema = {};
    
    fields.forEach(field => {
      let fieldSchema = Yup.string();
      
      // Apply required validation if specified
      if (field.required) {
        fieldSchema = fieldSchema.required(validationSchemaObj[field.name]?.required || `${field.label} is required`);
      } else {
        fieldSchema = fieldSchema.nullable();
      }
      
      // Apply additional validations based on field type
      if (field.type === 'number') {
        fieldSchema = Yup.number()
          .nullable()
          .transform((value, originalValue) => 
            originalValue === '' ? null : value
          );
        
        // Apply min validation if specified
        if (validationSchemaObj[field.name]?.min !== undefined) {
          const min = validationSchemaObj[field.name].min;
          const message = validationSchemaObj[field.name].message || `${field.label} must be at least ${min}`;
          fieldSchema = fieldSchema.min(min, message);
        }
      }
      
      schema[field.name] = fieldSchema;
    });
    
    return Yup.object().shape(schema);
  };

  // Get initial values for the form
  const getInitialValues = () => {
    const initialValues = {};
    
    fields.forEach(field => {
      // Get value from current record or use empty string/null
      let value = currentRecord ? currentRecord[field.name] : '';
      
      // Format date fields
      if (field.type === 'date' && value) {
        // Ensure date is in YYYY-MM-DD format for input[type="date"]
        value = value.split('T')[0];
      }
      
      initialValues[field.name] = value;
    });
    
    return initialValues;
  };

  // Get options for a select field
  const getSelectOptions = (field) => {
    if (field.options) {
      return field.options;
    }
    
    if (field.optionsSource === 'clergy') {
      return clergyList || [];
    }
    
    if (field.optionsSource === 'locations') {
      return locations || [];
    }
    
    return [];
  };

  // Render a form field based on its type
  const renderField = (field, values, errors, touched, handleChange, handleBlur, setFieldValue) => {
    const isInvalid = touched[field.name] && errors[field.name];
    
    switch (field.type) {
      case 'text':
        return (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type="text"
              name={field.name}
              size="sm"
              value={values[field.name] || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={isInvalid}
              style={{ minHeight: '38px' }}
            />
            <Form.Control.Feedback type="invalid">{errors[field.name]}</Form.Control.Feedback>
          </Form.Group>
        );
        
      case 'textarea':
        return (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name={field.name}
              value={values[field.name] || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={isInvalid}
              style={{ minHeight: '38px' }}
            />
            <Form.Control.Feedback type="invalid">{errors[field.name]}</Form.Control.Feedback>
          </Form.Group>
        );
        
      case 'date':
        return (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type="date"
              name={field.name}
              size="sm"
              value={values[field.name] || ''}
              onChange={(e) => setFieldValue(field.name, e.target.value)}
              onBlur={handleBlur}
              isInvalid={isInvalid}
              style={{ minHeight: '38px' }}
            />
            {isInvalid && (
              <div className="invalid-feedback d-block small">{errors[field.name]}</div>
            )}
          </Form.Group>
        );
        
      case 'number':
        return (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              type="number"
              name={field.name}
              size="sm"
              value={values[field.name] || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={isInvalid}
              style={{ minHeight: '38px' }}
              min={field.min}
              max={field.max}
            />
            <Form.Control.Feedback type="invalid">{errors[field.name]}</Form.Control.Feedback>
          </Form.Group>
        );
        
      case 'select':
        const options = getSelectOptions(field);
        return (
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              {field.label} {field.required && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Select
              name={field.name}
              size="sm"
              value={values[field.name] || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              isInvalid={isInvalid}
              style={{ minHeight: '38px' }}
            >
              <option value="">Select {field.label}</option>
              {options.map((option, idx) => (
                <option key={idx} value={typeof option === 'object' ? option.value : option}>
                  {typeof option === 'object' ? option.label : option}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors[field.name]}</Form.Control.Feedback>
          </Form.Group>
        );
        
      default:
        return null;
    }
  };

  // Render view mode content
  const renderViewContent = () => {
    if (!currentRecord) return null;
    
    // Group fields into two columns
    const leftFields = fields.slice(0, Math.ceil(fields.length / 2));
    const rightFields = fields.slice(Math.ceil(fields.length / 2));
    
    return (
      <div className="record-details">
        <Row className="g-2 g-md-3">
          <Col xs={12} md={6}>
            {leftFields.map((field, index) => (
              <div className="mb-3" key={index}>
                <strong className="d-block small text-muted">{field.label}:</strong>
                <span>
                  {field.type === 'date' && currentRecord[field.name]
                    ? new Date(currentRecord[field.name]).toLocaleDateString()
                    : currentRecord[field.name] || 'N/A'}
                </span>
              </div>
            ))}
          </Col>
          <Col xs={12} md={6}>
            {rightFields.map((field, index) => (
              <div className="mb-3" key={index}>
                <strong className="d-block small text-muted">{field.label}:</strong>
                <span>
                  {field.type === 'date' && currentRecord[field.name]
                    ? new Date(currentRecord[field.name]).toLocaleDateString()
                    : currentRecord[field.name] || 'N/A'}
                </span>
              </div>
            ))}
          </Col>
        </Row>
      </div>
    );
  };

  // Get modal title based on mode and record type
  const getModalTitle = () => {
    const recordTypeName = recordType.charAt(0).toUpperCase() + recordType.slice(1);
    
    if (viewMode) {
      return `${recordTypeName} Record Details`;
    }
    
    return currentRecord ? `Edit ${recordTypeName} Record` : `Add New ${recordTypeName} Record`;
  };

  return (
    <Modal 
      show={showModal} 
      onHide={() => setShowModal(false)} 
      size="lg" 
      fullscreen="md-down" 
      scrollable
    >
      <Modal.Header closeButton className="py-2 py-md-3">
        <Modal.Title className="h5 h-md-4">
          {getModalTitle()}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-2 p-md-3">
        {viewMode ? (
          renderViewContent()
        ) : (
          <Formik
            initialValues={getInitialValues()}
            validationSchema={buildValidationSchema()}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, errors, touched, handleChange, handleBlur, handleSubmit, setFieldValue, isSubmitting }) => (
              <Form onSubmit={handleSubmit}>
                <Row className="g-2 g-md-3">
                  {fields.map((field, index) => {
                    // Determine if field should be in a column
                    if (field.fullWidth) {
                      return (
                        <Col xs={12} key={index}>
                          {renderField(field, values, errors, touched, handleChange, handleBlur, setFieldValue)}
                        </Col>
                      );
                    }
                    
                    // Group fields into pairs for two-column layout
                    if (index % 2 === 0) {
                      const nextField = fields[index + 1];
                      return (
                        <React.Fragment key={index}>
                          <Col xs={12} md={6}>
                            {renderField(field, values, errors, touched, handleChange, handleBlur, setFieldValue)}
                          </Col>
                          {nextField && (
                            <Col xs={12} md={6}>
                              {renderField(nextField, values, errors, touched, handleChange, handleBlur, setFieldValue)}
                            </Col>
                          )}
                        </React.Fragment>
                      );
                    }
                    
                    // Skip odd indexes as they're handled in the previous iteration
                    return null;
                  })}
                </Row>
                <div className="d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4">
                  <Button 
                    variant="secondary" 
                    onClick={() => setShowModal(false)} 
                    className="order-2 order-sm-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="order-1 order-sm-2"
                    style={{ minHeight: '38px' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Saving...</span>
                      </>
                    ) : (
                      'Save Record'
                    )}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </Modal.Body>
      {viewMode && currentRecord && (
        <Modal.Footer className="py-2 py-md-3">
          <Button variant="success" onClick={() => handleGenerateCertificate(currentRecord)}>
            <FaFileAlt className="me-1" /> Generate Certificate
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setViewMode(false)}>
            Edit Record
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default RecordFormModal;