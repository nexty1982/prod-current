/**
 * Record Completeness Evaluator
 * Determines if records are missing important fields and assigns severity levels
 */

export type RecordType = 'baptism' | 'marriage' | 'funeral';

export interface CompletenessResult {
  severity: 0 | 1 | 2; // 0 = complete, 1 = warning (1 missing), 2 = critical (2+ missing or required group violated)
  missing: string[];
}

/**
 * Check if a field value is considered missing
 */
function isFieldMissing(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  // 0 is considered valid (e.g., age can be 0)
  return false;
}

/**
 * Get completeness severity for a baptism record
 */
function getBaptismCompleteness(record: any): CompletenessResult {
  const importantFields = [
    { key: 'firstName', aliases: ['first_name', 'firstName', 'firstname'] },
    { key: 'lastName', aliases: ['last_name', 'lastName', 'lastname'] },
    { key: 'birthDate', aliases: ['birth_date', 'birthDate', 'birthdate'] },
    { key: 'receptionDate', aliases: ['reception_date', 'receptionDate', 'receptiondate', 'date_of_baptism', 'dateOfBaptism'] },
    { key: 'entryType', aliases: ['entry_type', 'entryType', 'entrytype'] },
  ];

  const niceToHaveFields = [
    { key: 'sponsors', aliases: ['sponsors', 'sponsor'] },
    { key: 'parents', aliases: ['parents', 'parent'] },
    { key: 'clergy', aliases: ['clergy', 'officiant', 'priest'] },
  ];

  const missing: string[] = [];

  // Check important fields
  importantFields.forEach(field => {
    let found = false;
    for (const alias of field.aliases) {
      if (!isFieldMissing(record[alias])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(field.key);
    }
  });

  // Determine severity
  if (missing.length >= 2) {
    return { severity: 2, missing };
  } else if (missing.length === 1) {
    return { severity: 1, missing };
  }

  return { severity: 0, missing: [] };
}

/**
 * Get completeness severity for a marriage record
 */
function getMarriageCompleteness(record: any): CompletenessResult {
  const importantFields = [
    { key: 'marriageDate', aliases: ['mdate', 'marriageDate', 'marriage_date', 'm_date'] },
    { key: 'groomFirstName', aliases: ['groom_first_name', 'groomFirstName', 'groomfirstname'] },
    { key: 'groomLastName', aliases: ['groom_last_name', 'groomLastName', 'groomlastname'] },
    { key: 'brideFirstName', aliases: ['bride_first_name', 'brideFirstName', 'bridefirstname'] },
    { key: 'brideLastName', aliases: ['bride_last_name', 'brideLastName', 'bridelastname'] },
  ];

  const niceToHaveFields = [
    { key: 'witness', aliases: ['witness', 'witnesses'] },
    { key: 'clergy', aliases: ['clergy', 'officiant', 'priest'] },
  ];

  const missing: string[] = [];

  // Check important fields
  importantFields.forEach(field => {
    let found = false;
    for (const alias of field.aliases) {
      if (!isFieldMissing(record[alias])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(field.key);
    }
  });

  // Determine severity
  if (missing.length >= 2) {
    return { severity: 2, missing };
  } else if (missing.length === 1) {
    return { severity: 1, missing };
  }

  return { severity: 0, missing: [] };
}

/**
 * Get completeness severity for a funeral record
 */
function getFuneralCompleteness(record: any): CompletenessResult {
  const importantFields = [
    { key: 'firstName', aliases: ['first_name', 'firstName', 'firstname', 'name'] },
    { key: 'lastName', aliases: ['last_name', 'lastName', 'lastname'] },
  ];

  const requiredDateGroup = [
    { key: 'deathDate', aliases: ['death_date', 'deathDate', 'deathdate', 'deceased_date', 'deceasedDate'] },
    { key: 'burialDate', aliases: ['burial_date', 'burialDate', 'burialdate'] },
  ];

  const niceToHaveFields = [
    { key: 'burialLocation', aliases: ['burial_location', 'burialLocation', 'buriallocation'] },
    { key: 'clergy', aliases: ['clergy', 'officiant', 'priest'] },
    { key: 'age', aliases: ['age'] },
  ];

  const missing: string[] = [];

  // Check important fields
  importantFields.forEach(field => {
    let found = false;
    for (const alias of field.aliases) {
      if (!isFieldMissing(record[alias])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(field.key);
    }
  });

  // Check required date group: at least one of deathDate OR burialDate must exist
  let hasDate = false;
  for (const dateField of requiredDateGroup) {
    for (const alias of dateField.aliases) {
      if (!isFieldMissing(record[alias])) {
        hasDate = true;
        break;
      }
    }
    if (hasDate) break;
  }

  if (!hasDate) {
    missing.push('deathDate OR burialDate');
  }

  // Determine severity
  // If required group is violated (both dates missing), that's critical
  if (!hasDate) {
    return { severity: 2, missing };
  }

  // Otherwise, count missing important fields
  if (missing.length >= 2) {
    return { severity: 2, missing };
  } else if (missing.length === 1) {
    return { severity: 1, missing };
  }

  return { severity: 0, missing: [] };
}

/**
 * Get completeness severity for a record
 * @param recordType - The type of record (baptism, marriage, funeral)
 * @param record - The record object to evaluate
 * @param fieldMap - Optional field mapping (not used in current implementation)
 * @returns CompletenessResult with severity and missing fields
 */
export function getCompletenessSeverity(
  recordType: RecordType,
  record: any,
  fieldMap?: Record<string, string>
): CompletenessResult {
  if (!record) {
    return { severity: 2, missing: ['record'] };
  }

  switch (recordType) {
    case 'baptism':
      return getBaptismCompleteness(record);
    case 'marriage':
      return getMarriageCompleteness(record);
    case 'funeral':
      return getFuneralCompleteness(record);
    default:
      return { severity: 0, missing: [] };
  }
}
