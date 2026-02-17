// server/utils/dateFormatter.js
// Utility functions for cleaning up MySQL date/datetime formatting

/**
 * Format a date to YYYY-MM-DD format
 * @param {Date|string} date - The date to format
 * @returns {string|null} - Formatted date string or null
 */
function formatDate(date) {
  if (!date) return null;
  
  // Handle Date objects - convert to string first
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  
  // If already in YYYY-MM-DD format, return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // Handle ISO datetime strings (e.g., "2025-08-01T04:00:00.000Z")
  // Extract just the date part before 'T' if present
  if (typeof date === 'string' && date.includes('T')) {
    const datePart = date.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
  }
  
  // Handle MySQL datetime format (e.g., "2025-08-01 04:00:00")
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(date)) {
    return date.split(' ')[0];
  }
  
  // Try to parse as Date object
  const dateObj = new Date(date);
  
  // Check if date is valid
  if (isNaN(dateObj.getTime())) return null;
  
  // Return just the date part in YYYY-MM-DD format as a string
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
  
  // Defensive fallback for entry_type: try record.entry_type, then originalRecord.entry_type, then null
  const originalRecord = record;
  const entryType = record.entry_type ?? originalRecord.entry_type ?? null;
  
  // Log warning in dev if entry_type is missing after transformation
  if (process.env.NODE_ENV !== 'production' && entryType === null && record.id) {
    console.warn(`[transformBaptismRecord] Missing entry_type for record id=${record.id}, church_id=${record.church_id}`);
  }
  
  return {
    id: record.id,
    // ═══════════════════════════════════════════════════════════════
    // SNAKE_CASE FIELDS (match DB columns - for frontend grid binding)
    // ═══════════════════════════════════════════════════════════════
    first_name: record.first_name,
    last_name: record.last_name,
    middle_name: record.middle_name || '',
    birth_date: formatDate(record.birth_date),
    reception_date: formatDate(record.reception_date),
    birthplace: record.birthplace || '',
    sponsors: record.sponsors || '',
    parents: record.parents || '',
    clergy: record.clergy || '',
    entry_type: entryType,
    church_id: record.church_id,
    // ═══════════════════════════════════════════════════════════════
    // CAMELCASE FIELDS (legacy frontend compatibility)
    // ═══════════════════════════════════════════════════════════════
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
    entryType: entryType,
    // Search relevance metadata (present when search is active)
    _matchScore: record._matchScore != null ? record._matchScore : null,
    _matchedFields: record._matchedFields || null,
    _topMatchReason: record._topMatchReason || null,
    // Keep original database fields for reference
    originalRecord: originalRecord
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
  
  // Format the marriage date once and reuse
  const originalRecord = record;
  const rawMdate = record.mdate ?? originalRecord.mdate ?? null;
  const formattedMdate = rawMdate ? formatDate(rawMdate) : null;
  
  // Log warning in dev if mdate is missing after transformation
  if (process.env.NODE_ENV !== 'production' && rawMdate === null && record.id) {
    console.warn(`[transformMarriageRecord] Missing mdate for record id=${record.id}, church_id=${record.church_id}`);
  }
  
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
    // Include mdate at top level for grid binding (snake_case for frontend compatibility)
    mdate: formattedMdate,
    // Include marriageDate at top level (camelCase for frontend compatibility)
    marriageDate: formattedMdate,
    dateOfBaptism: formattedMdate, // Map to expected field for table display
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
    // Search relevance metadata (present when search is active)
    _matchScore: record.relevance_score != null ? record.relevance_score : null,
    _matchedFields: record._matchedFields || null,
    _topMatchReason: record._topMatchReason || null,
    // Keep original database fields for reference
    originalRecord: originalRecord
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
  
  // Defensive fallback for burial_date: try record.burial_date, then originalRecord.burial_date, then null
  const originalRecord = record;
  const rawBurialDate = record.burial_date ?? originalRecord.burial_date ?? null;
  const formattedBurialDate = rawBurialDate ? formatDate(rawBurialDate) : null;
  const rawDeceasedDate = record.deceased_date ?? originalRecord.deceased_date ?? null;
  const formattedDeceasedDate = rawDeceasedDate ? formatDate(rawDeceasedDate) : null;
  
  // Log warning in dev if burial_date is missing after transformation
  if (process.env.NODE_ENV !== 'production' && rawBurialDate === null && record.id) {
    console.warn(`[transformFuneralRecord] Missing burial_date for record id=${record.id}, church_id=${record.church_id}`);
  }
  
  return {
    id: record.id,
    // ═══════════════════════════════════════════════════════════════
    // SNAKE_CASE FIELDS (match DB columns - for frontend grid binding)
    // ═══════════════════════════════════════════════════════════════
    name: record.name,
    lastname: record.lastname,
    age: record.age,
    deceased_date: formattedDeceasedDate,
    burial_date: formattedBurialDate,
    burial_location: record.burial_location || '',
    clergy: record.clergy || '',
    church_id: record.church_id,
    notes: record.notes || '',
    // ═══════════════════════════════════════════════════════════════
    // CAMELCASE FIELDS (legacy frontend compatibility)
    // ═══════════════════════════════════════════════════════════════
    firstName: record.name,
    lastName: record.lastname,
    dateOfDeath: formattedDeceasedDate,
    dateOfFuneral: formattedBurialDate,
    dateOfBaptism: formattedBurialDate, // Map to expected field for table display
    burialLocation: record.burial_location || '',
    placeOfBaptism: record.burial_location || '', // Map to expected field for table display
    priest: record.clergy || '', // Map to expected field name
    registryNumber: record.registry_number || record.entry_type || `F-${record.id}`,
    churchId: record.church_id?.toString() || '1',
    churchName: record.church_name || 'Saints Peter and Paul Orthodox Church',
    createdAt: formatDateTime(record.created_at),
    updatedAt: formatDateTime(record.updated_at),
    createdBy: record.created_by || 'admin@church.org',
    burialDate: formattedBurialDate,
    funeralDate: formattedBurialDate,
    deathDate: formattedDeceasedDate,
    // Search relevance metadata (present when search is active)
    _matchScore: record.relevance_score != null ? record.relevance_score : null,
    _matchedFields: record._matchedFields || null,
    _topMatchReason: record._topMatchReason || null,
    // Keep original database fields for reference
    originalRecord: originalRecord
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
