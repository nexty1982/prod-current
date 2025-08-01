// server/routes/importRecords.js
// Full-stack JSON import solution for baptism, marriage, and funeral records

const express = require('express');
const { promisePool } = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { getChurchDbConnection } = require('../utils/dbSwitcher');

const router = express.Router();

// Validation constants
const SUPPORTED_RECORD_TYPES = ['baptism', 'marriage', 'funeral'];
const MAX_RECORDS_PER_IMPORT = 1000;
const MIN_RECORDS_PER_IMPORT = 1;

// Field mappings for different record types
const FIELD_MAPPINGS = {
  baptism: {
    tableName: 'baptism_records',
    requiredFields: ['person_name'],
    optionalFields: ['date_performed', 'priest_name', 'notes', 'birth_date', 'parents', 'sponsors', 'birthplace'],
    dbFieldMapping: {
      person_name: 'first_name', // Will split into first_name/last_name
      date_performed: 'reception_date',
      priest_name: 'clergy',
      birth_date: 'birth_date',
      parents: 'parents',
      sponsors: 'sponsors',
      birthplace: 'birthplace',
      notes: 'notes'
    }
  },
  marriage: {
    tableName: 'marriage_records',
    requiredFields: ['person_name'],
    optionalFields: ['date_performed', 'priest_name', 'notes', 'groom_name', 'bride_name', 'witnesses', 'marriage_license'],
    dbFieldMapping: {
      person_name: 'fname_groom', // For compatibility
      groom_name: 'fname_groom',
      bride_name: 'fname_bride',
      date_performed: 'mdate',
      priest_name: 'clergy',
      witnesses: 'witness',
      marriage_license: 'mlicense',
      notes: 'notes'
    }
  },
  funeral: {
    tableName: 'funeral_records',
    requiredFields: ['person_name'],
    optionalFields: ['date_performed', 'priest_name', 'notes', 'deceased_date', 'burial_date', 'burial_location', 'age'],
    dbFieldMapping: {
      person_name: 'name', // Will split into name/lastname
      date_performed: 'burial_date',
      deceased_date: 'deceased_date',
      burial_date: 'burial_date',
      burial_location: 'burial_location',
      priest_name: 'clergy',
      age: 'age',
      notes: 'notes'
    }
  }
};

/**
 * Validates a single record based on record type
 */
function validateRecord(record, recordType) {
  const errors = [];
  const mapping = FIELD_MAPPINGS[recordType];
  
  if (!mapping) {
    return ['Invalid record type'];
  }

  // Check required fields
  for (const field of mapping.requiredFields) {
    if (!record[field] || String(record[field]).trim() === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate person_name format
  if (record.person_name && typeof record.person_name !== 'string') {
    errors.push('person_name must be a string');
  }

  // Validate date fields
  const dateFields = ['date_performed', 'birth_date', 'deceased_date', 'burial_date'];
  dateFields.forEach(field => {
    if (record[field] && record[field] !== null) {
      const date = new Date(record[field]);
      if (isNaN(date.getTime())) {
        errors.push(`Invalid date format for ${field}: ${record[field]}`);
      }
    }
  });

  // Validate age for funeral records
  if (recordType === 'funeral' && record.age) {
    const age = parseInt(record.age);
    if (isNaN(age) || age < 0 || age > 150) {
      errors.push('Age must be a number between 0 and 150');
    }
  }

  return errors;
}

/**
 * Sanitizes and transforms a record for database insertion
 */
function sanitizeRecord(record, recordType, churchId) {
  const mapping = FIELD_MAPPINGS[recordType];
  const sanitized = {
    church_id: churchId,
    created_at: new Date(),
    updated_at: new Date()
  };

  // Handle person_name splitting for different record types
  if (record.person_name) {
    const nameParts = record.person_name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (recordType === 'baptism') {
      sanitized.first_name = firstName;
      sanitized.last_name = lastName;
    } else if (recordType === 'marriage') {
      sanitized.fname_groom = firstName;
      sanitized.lname_groom = lastName;
    } else if (recordType === 'funeral') {
      sanitized.name = firstName;
      sanitized.lastname = lastName;
    }
  }

  // Map other fields
  Object.keys(mapping.dbFieldMapping).forEach(jsonField => {
    if (record[jsonField] !== undefined && jsonField !== 'person_name') {
      const dbField = mapping.dbFieldMapping[jsonField];
      sanitized[dbField] = record[jsonField];
    }
  });

  // Ensure all string fields are properly sanitized
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitized[key].trim();
      if (sanitized[key] === '') {
        sanitized[key] = null;
      }
    }
  });

  return sanitized;
}

/**
 * GET /api/records - Simple records endpoint for the Records Browser
 * Uses the same approach as Legacy Records - delegates to existing endpoints
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    console.log('🔍 Records Browser API called by user:', req.session.user?.username, 'role:', req.session.user?.role);
    
    // For now, return a simple response that tells the frontend to use existing endpoints
    // This matches how Legacy Records works - it calls separate endpoints for each type
    res.json({
      success: true,
      message: 'Records Browser should use existing endpoints',
      suggestion: 'Use /api/baptism-records, /api/marriage-records, /api/funeral-records endpoints instead',
      endpoints: {
        baptism: '/api/baptism-records',
        marriage: '/api/marriage-records', 
        funeral: '/api/funeral-records',
        churches: '/api/admin/churches'
      }
    });

  } catch (error) {
    console.error('❌ Error in records endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch records',
      message: error.message
    });
  }
});

/**
 * POST /api/records/import - Import records from JSON
 */
router.post('/import', requireAuth, async (req, res) => {
  try {
    // Check if user has admin, super_admin, priest, or deacon role
    const allowedRoles = ['admin', 'super_admin', 'priest', 'deacon'];
    if (!allowedRoles.includes(req.session.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Priest, deacon, admin, or super_admin role required.'
      });
    }

    const { churchId, recordType, records } = req.body;

    console.log('📤 Import request received:', {
      churchId,
      recordType,
      recordCount: records ? records.length : 0,
      user: req.session.user.username
    });

    // Validate request body structure
    if (!churchId || !recordType || !records) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: churchId, recordType, records'
      });
    }

    // Validate church ID
    if (!Number.isInteger(churchId) || churchId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid churchId: must be a positive integer'
      });
    }

    // Validate record type
    if (!SUPPORTED_RECORD_TYPES.includes(recordType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid recordType. Supported types: ${SUPPORTED_RECORD_TYPES.join(', ')}`
      });
    }

    // Validate records array
    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'Records must be an array'
      });
    }

    if (records.length < MIN_RECORDS_PER_IMPORT || records.length > MAX_RECORDS_PER_IMPORT) {
      return res.status(400).json({
        success: false,
        error: `Records array must contain between ${MIN_RECORDS_PER_IMPORT} and ${MAX_RECORDS_PER_IMPORT} items`
      });
    }

    // Verify church exists in platform database
    const [churchExists] = await promisePool.query(
      'SELECT id FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (churchExists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Church not found or inactive'
      });
    }

    // Validate each record
    const validationErrors = [];
    records.forEach((record, index) => {
      const errors = validateRecord(record, recordType);
      if (errors.length > 0) {
        validationErrors.push({
          recordIndex: index,
          errors: errors
        });
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Record validation failed',
        validationErrors: validationErrors.slice(0, 10) // Limit error details
      });
    }

    // Get church database connection
    const CHURCH_DB_NAME = 'ssppoc_records_db'; // TODO: Make this dynamic based on church
    const churchDbPool = getChurchDbConnection(CHURCH_DB_NAME);

    // Sanitize records for database insertion
    const sanitizedRecords = records.map(record => 
      sanitizeRecord(record, recordType, churchId)
    );

    // Prepare batch insert
    const mapping = FIELD_MAPPINGS[recordType];
    const tableName = mapping.tableName;
    
    // Get all possible fields for this record type
    const allFields = Object.values(mapping.dbFieldMapping).concat([
      'church_id', 'created_at', 'updated_at'
    ]);

    // Build dynamic INSERT query
    const placeholders = sanitizedRecords.map(() => 
      `(${allFields.map(() => '?').join(', ')})`
    ).join(', ');

    const insertQuery = `
      INSERT INTO ${tableName} (${allFields.join(', ')})
      VALUES ${placeholders}
    `;

    // Flatten values for batch insert
    const values = [];
    sanitizedRecords.forEach(record => {
      allFields.forEach(field => {
        values.push(record[field] || null);
      });
    });

    console.log(`📋 Inserting ${sanitizedRecords.length} records into ${tableName}`);

    // Execute batch insert
    const [result] = await churchDbPool.execute(insertQuery, values);

    console.log(`✅ Successfully imported ${result.affectedRows} records`);

    // Log the import activity
    console.log('📊 Import summary:', {
      user: req.session.user.username,
      churchId,
      recordType,
      recordsImported: result.affectedRows,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      inserted: result.affectedRows,
      message: `Successfully imported ${result.affectedRows} ${recordType} records`
    });

  } catch (error) {
    console.error('❌ Error importing records:', error);
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate record detected. Some records may already exist.'
      });
    }

    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        success: false,
        error: `Database table for ${req.body.recordType} records not found`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to import records',
      details: error.message
    });
  }
});

/**
 * GET /api/records/import/sample/:recordType - Get sample JSON format
 */
router.get('/sample/:recordType', requireAuth, (req, res) => {
  const { recordType } = req.params;

  if (!SUPPORTED_RECORD_TYPES.includes(recordType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid recordType. Supported types: ${SUPPORTED_RECORD_TYPES.join(', ')}`
    });
  }

  const samples = {
    baptism: [
      {
        person_name: 'John Michael Smith',
        date_performed: '2024-06-15',
        priest_name: 'Father Andreas Papadopoulos',
        birth_date: '2024-01-15',
        parents: 'Michael Smith and Maria Smith',
        sponsors: 'George Dimitriou and Elena Dimitriou',
        birthplace: 'Chicago, Illinois',
        notes: 'Beautiful ceremony with family present'
      }
    ],
    marriage: [
      {
        groom_name: 'Alexander Petrov',
        bride_name: 'Sofia Ivanova',
        date_performed: '2024-07-20',
        priest_name: 'Father Nicholas Popov',
        witnesses: 'Dimitri Petrov and Anna Ivanova',
        marriage_license: 'ML-2024-12345',
        notes: 'Traditional Orthodox ceremony'
      }
    ],
    funeral: [
      {
        person_name: 'Constantine Georgios',
        deceased_date: '2024-05-10',
        burial_date: '2024-05-13',
        priest_name: 'Father Michael Stavros',
        burial_location: 'Holy Cross Cemetery',
        age: 87,
        notes: 'Beloved community member, longtime parish supporter'
      }
    ]
  };

  res.json({
    success: true,
    recordType,
    sampleFormat: samples[recordType],
    requiredFields: FIELD_MAPPINGS[recordType].requiredFields,
    optionalFields: FIELD_MAPPINGS[recordType].optionalFields,
    maxRecordsPerImport: MAX_RECORDS_PER_IMPORT
  });
});

module.exports = router;