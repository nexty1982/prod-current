// Church validation service
// Provides comprehensive validation for church creation and updates

/**
 * Validates church creation data
 * @param {Object} churchData - Church data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateChurchData(churchData) {
  const errors = {};
  const warnings = [];

  // Required fields validation
  const requiredFields = ['name', 'email', 'country', 'timezone'];
  
  requiredFields.forEach(field => {
    if (!churchData[field] || String(churchData[field]).trim() === '') {
      errors[field] = `${field.replace('_', ' ')} is required`;
    }
  });

  // Language preference validation (check both possible field names)
  const languageValue = churchData.preferred_language || churchData.language_preference;
  if (!languageValue || String(languageValue).trim() === '') {
    errors.language_preference = 'Language preference is required';
  } else {
    const validLanguages = ['en', 'gr', 'ru', 'ro', 'es', 'fr', 'de', 'ar', 'he'];
    if (!validLanguages.includes(languageValue)) {
      errors.language_preference = `Invalid language. Valid options: ${validLanguages.join(', ')}`;
    }
  }

  // Email validation
  if (churchData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(churchData.email)) {
      errors.email = 'Invalid email format';
    }
  }

  // Phone validation (if provided)
  if (churchData.phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(churchData.phone.replace(/[\s\-\(\)]/g, ''))) {
      warnings.push('Phone number format may be invalid');
    }
  }

  // Website validation (if provided)
  if (churchData.website) {
    try {
      new URL(churchData.website);
    } catch {
      errors.website = 'Invalid website URL format';
    }
  }

  // Currency validation
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'RUB', 'RON', 'BGN'];
  if (churchData.currency && !validCurrencies.includes(churchData.currency)) {
    errors.currency = `Invalid currency. Valid options: ${validCurrencies.join(', ')}`;
  }

  // Founded year validation
  const currentYear = new Date().getFullYear();
  if (churchData.founded_year) {
    const year = parseInt(churchData.founded_year);
    if (isNaN(year) || year < 50 || year > currentYear) {
      errors.founded_year = `Founded year must be between 50 and ${currentYear}`;
    }
  }

  // Timezone validation (basic)
  if (churchData.timezone) {
    const validTimezonePattern = /^[A-Za-z_\/]+$/;
    if (!validTimezonePattern.test(churchData.timezone)) {
      errors.timezone = 'Invalid timezone format';
    }
  }

  // Postal code validation by country
  if (churchData.postal_code && churchData.country) {
    const postalValidation = validatePostalCode(churchData.postal_code, churchData.country);
    if (!postalValidation.isValid) {
      warnings.push(postalValidation.message);
    }
  }

  // Name length validation
  if (churchData.name && churchData.name.length > 255) {
    errors.name = 'Church name must be less than 255 characters';
  }

  // Description length validation
  if (churchData.description && churchData.description.length > 2000) {
    errors.description = 'Description must be less than 2000 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    summary: {
      errorCount: Object.keys(errors).length,
      warningCount: warnings.length
    }
  };
}

/**
 * Validates postal code based on country
 * @param {string} postalCode - Postal code to validate
 * @param {string} country - Country code or name
 * @returns {Object} - Validation result
 */
function validatePostalCode(postalCode, country) {
  const patterns = {
    'United States': /^\d{5}(-\d{4})?$/,
    'Canada': /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/,
    'United Kingdom': /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    'Germany': /^\d{5}$/,
    'France': /^\d{5}$/,
    'Greece': /^\d{3}\s?\d{2}$/,
    'Romania': /^\d{6}$/,
    'Russia': /^\d{6}$/
  };

  const pattern = patterns[country];
  if (!pattern) {
    return { isValid: true, message: 'Postal code format not validated for this country' };
  }

  if (pattern.test(postalCode)) {
    return { isValid: true, message: 'Valid postal code format' };
  } else {
    return { isValid: false, message: `Invalid postal code format for ${country}` };
  }
}

/**
 * Sanitizes church data for database insertion
 * @param {Object} churchData - Raw church data
 * @returns {Object} - Sanitized church data
 */
function sanitizeChurchData(churchData) {
  const sanitized = {};

  // String fields - trim and sanitize
  const stringFields = ['name', 'email', 'phone', 'website', 'address', 'city', 'state_province', 'postal_code', 'country', 'description', 'timezone', 'currency', 'tax_id'];
  
  stringFields.forEach(field => {
    if (churchData[field] !== undefined && churchData[field] !== null) {
      sanitized[field] = String(churchData[field]).trim();
      // Remove empty strings
      if (sanitized[field] === '') {
        sanitized[field] = null;
      }
    } else {
      sanitized[field] = null;
    }
  });

  // Handle language preference field mapping (frontend sends preferred_language, backend expects language_preference)
  const languageValue = churchData.preferred_language || churchData.language_preference;
  if (languageValue !== undefined && languageValue !== null) {
    sanitized.language_preference = String(languageValue).trim() || 'en';
  } else {
    sanitized.language_preference = 'en';
  }

  // Numeric fields
  if (churchData.founded_year) {
    sanitized.founded_year = parseInt(churchData.founded_year);
    if (isNaN(sanitized.founded_year)) {
      sanitized.founded_year = null;
    }
  } else {
    sanitized.founded_year = null;
  }

  // Boolean fields
  sanitized.is_active = churchData.is_active !== undefined ? Boolean(churchData.is_active) : true;

  // Set defaults
  sanitized.timezone = sanitized.timezone || 'UTC';
  sanitized.currency = sanitized.currency || 'USD';

  return sanitized;
}

/**
 * Generates a unique church_id based on church name
 * @param {string} churchName - Name of the church
 * @returns {string} - Generated church_id
 */
function generateChurchId(churchName) {
  // Create prefix from church name (first 6 alphanumeric characters)
  const prefix = churchName
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6)
    .padEnd(6, 'X'); // Pad with X if less than 6 characters

  // Add timestamp suffix
  const suffix = String(Date.now()).slice(-3);
  
  return `${prefix}_${suffix}`;
}

module.exports = {
  validateChurchData,
  validatePostalCode,
  sanitizeChurchData,
  generateChurchId
};
