// server/utils/dateFormatter.js
// Utility functions for cleaning up MySQL date/datetime formatting

/**
 * Format a date to YYYY-MM-DD format
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted date string or null
 */
function formatDate(date) {
  if (!date) return null;
  
  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return null;
  
  // Return just the date part in YYYY-MM-DD format
  return dateObj.toISOString().split('T')[0];
}

/**
 * Format a datetime to readable format
 * @param {Date|string} date - The datetime to format
 * @returns {string|null} - Formatted datetime string or null
 */
function formatDateTime(date) {
  if (!date) return null;
  
  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return null;
  
  // Return in format: "2025-07-03 7:05 PM"
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Clean up common date fields in a record object
 * @param {Object} record - The record to clean
 * @returns {Object} - Record with cleaned date fields
 */
function cleanRecord(record) {
  if (!record || typeof record !== 'object') return record;
  
  const cleaned = { ...record };
  
  // Common date fields to format as dates
  const dateFields = ['birth_date', 'mdate', 'date', 'due_date', 'start_date', 'end_date', 'trial_end'];
  dateFields.forEach(field => {
    if (cleaned[field]) {
      cleaned[field] = formatDate(cleaned[field]);
    }
  });
  
  // Common datetime fields to format as readable datetimes
  const datetimeFields = ['created_at', 'updated_at', 'date_entered', 'last_login', 'cancelled_at', 'paid_at'];
  datetimeFields.forEach(field => {
    if (cleaned[field]) {
      cleaned[field] = formatDateTime(cleaned[field]);
    }
  });
  
  return cleaned;
}

/**
 * Clean up an array of records
 * @param {Array} records - Array of records to clean
 * @returns {Array} - Array of cleaned records
 */
function cleanRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(cleanRecord);
}

/**
 * Transform baptism record from database format to frontend format
 * @param {Object} record - The database record to transform
 * @returns {Object} - Transformed record with frontend-compatible field names
 */
function transformBaptismRecord(record) {
  if (!record || typeof record !== 'object') return record;
  
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    middleName: record.middle_name || '',
    dateOfBirth: formatDate(record.birth_date),
    dateOfBaptism: formatDate(record.reception_date),
    placeOfBirth: record.birthplace || '',
    placeOfBaptism: record.place_of_baptism || '',
    fatherName: record.parents ? record.parents.split(',')[0]?.trim() : '',
    motherName: record.parents ? record.parents.split(',')[1]?.trim() : '',
    godparentNames: record.sponsors || '',
    priest: record.clergy || '',
    registryNumber: record.registry_number || record.entry_type || `B-${record.id}`,
    churchId: record.church_id?.toString() || '1',
    churchName: record.church_name || 'Saints Peter and Paul Orthodox Church',
    notes: record.notes || '',
    createdAt: formatDateTime(record.created_at),
    updatedAt: formatDateTime(record.updated_at),
    createdBy: record.created_by || 'admin@church.org',
    // Keep original database fields for reference
    _originalRecord: record
  };
}

/**
 * Transform array of baptism records
 * @param {Array} records - Array of database records to transform
 * @returns {Array} - Array of transformed records
 */
function transformBaptismRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(transformBaptismRecord);
}

/**
 * Transform marriage record from database format to frontend format
 * @param {Object} record - The database record to transform
 * @returns {Object} - Transformed record with frontend-compatible field names
 */
function transformMarriageRecord(record) {
  if (!record || typeof record !== 'object') return record;
  
  return {
    id: record.id,
    // Create consistent firstName/lastName fields for frontend compatibility
    firstName: record.fname_groom,
    lastName: record.lname_groom,
    // Keep original marriage-specific fields
    groomFirstName: record.fname_groom,
    groomLastName: record.lname_groom,
    groomParents: record.parentsg || '',
    brideFirstName: record.fname_bride,
    brideLastName: record.lname_bride,
    brideParents: record.parentsb || '',
    marriageDate: formatDate(record.mdate),
    dateOfBaptism: formatDate(record.mdate), // Map to expected field for table display
    witnesses: record.witness || '',
    marriageLicense: record.mlicense || '',
    priest: record.clergy || '', // Map to expected field name
    clergy: record.clergy || '',
    registryNumber: record.registry_number || record.entry_type || `M-${record.id}`,
    churchId: record.church_id?.toString() || '1',
    churchName: record.church_name || 'Saints Peter and Paul Orthodox Church',
    notes: record.notes || '',
    createdAt: formatDateTime(record.created_at),
    updatedAt: formatDateTime(record.updated_at),
    createdBy: record.created_by || 'admin@church.org',
    // Keep original database fields for reference
    _originalRecord: record
  };
}

/**
 * Transform array of marriage records
 * @param {Array} records - Array of database records to transform
 * @returns {Array} - Array of transformed records
 */
function transformMarriageRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(transformMarriageRecord);
}

/**
 * Transform funeral record from database format to frontend format
 * @param {Object} record - The database record to transform
 * @returns {Object} - Transformed record with frontend-compatible field names
 */
function transformFuneralRecord(record) {
  if (!record || typeof record !== 'object') return record;
  
  return {
    id: record.id,
    // Create consistent firstName/lastName fields for frontend compatibility
    firstName: record.name,
    lastName: record.lastname,
    age: record.age,
    dateOfDeath: formatDate(record.deceased_date),
    dateOfFuneral: formatDate(record.burial_date),
    dateOfBaptism: formatDate(record.burial_date), // Map to expected field for table display
    burialLocation: record.burial_location || '',
    placeOfBaptism: record.burial_location || '', // Map to expected field for table display
    priest: record.clergy || '', // Map to expected field name
    clergy: record.clergy || '',
    registryNumber: record.registry_number || record.entry_type || `F-${record.id}`,
    churchId: record.church_id?.toString() || '1',
    churchName: record.church_name || 'Saints Peter and Paul Orthodox Church',
    notes: record.notes || '',
    createdAt: formatDateTime(record.created_at),
    updatedAt: formatDateTime(record.updated_at),
    createdBy: record.created_by || 'admin@church.org',
    // Keep original database fields for reference
    _originalRecord: record
  };
}

/**
 * Transform array of funeral records
 * @param {Array} records - Array of database records to transform
 * @returns {Array} - Array of transformed records
 */
function transformFuneralRecords(records) {
  if (!Array.isArray(records)) return records;
  return records.map(transformFuneralRecord);
}

module.exports = {
  formatDate,
  formatDateTime,
  cleanRecord,
  cleanRecords,
  transformBaptismRecord,
  transformBaptismRecords,
  transformMarriageRecord,
  transformMarriageRecords,
  transformFuneralRecord,
  transformFuneralRecords
};
