/**
 * Church Settings Helper
 * Safe JSON parsing, merging, and persistence for churches.settings column
 * Preserves unknown keys and handles NULL/invalid JSON gracefully
 */

const { logger } = require('./logger');

/**
 * Parse settings from database (LONGTEXT) to object
 * @param {string|null} settingsString - Raw settings from database
 * @returns {object} Parsed settings object (empty object if invalid/null)
 */
function parseSettings(settingsString) {
  // Handle NULL or empty
  if (!settingsString || settingsString.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(settingsString);
    // Ensure it's an object, not array or primitive
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
    logger.warn('Settings parsed to non-object type, returning empty object', { parsed });
    return {};
  } catch (error) {
    logger.warn('Failed to parse settings JSON, returning empty object', { 
      error: error.message,
      settingsString: settingsString.substring(0, 100) // Log first 100 chars
    });
    return {};
  }
}

/**
 * Stringify settings object to JSON string for database storage
 * @param {object} settingsObject - Settings object to stringify
 * @returns {string} JSON string
 */
function stringifySettings(settingsObject) {
  try {
    return JSON.stringify(settingsObject);
  } catch (error) {
    logger.error('Failed to stringify settings, returning empty object JSON', { error: error.message });
    return '{}';
  }
}

/**
 * Get feature flags from settings object
 * @param {object} settings - Parsed settings object
 * @returns {object} Feature flags object
 */
function getFeatures(settings) {
  if (!settings || typeof settings !== 'object') {
    return {
      ag_grid_enabled: false,
      power_search_enabled: false,
      custom_field_mapping_enabled: false
    };
  }

  const features = settings.features || {};
  
  return {
    ag_grid_enabled: features.ag_grid_enabled === true,
    power_search_enabled: features.power_search_enabled === true,
    custom_field_mapping_enabled: features.custom_field_mapping_enabled === true
  };
}

/**
 * Merge feature flags into settings object (preserves other keys)
 * @param {object} currentSettings - Current parsed settings
 * @param {object} newFeatures - New feature flags to merge
 * @returns {object} Updated settings object
 */
function mergeFeatures(currentSettings, newFeatures) {
  // Ensure currentSettings is an object
  const settings = (currentSettings && typeof currentSettings === 'object') ? { ...currentSettings } : {};
  
  // Ensure features object exists
  if (!settings.features || typeof settings.features !== 'object') {
    settings.features = {};
  }

  // Merge only valid boolean feature flags
  const validFeatureKeys = ['ag_grid_enabled', 'power_search_enabled', 'custom_field_mapping_enabled'];
  
  validFeatureKeys.forEach(key => {
    if (newFeatures.hasOwnProperty(key) && typeof newFeatures[key] === 'boolean') {
      settings.features[key] = newFeatures[key];
    }
  });

  return settings;
}

/**
 * Validate feature flags object
 * @param {object} features - Feature flags to validate
 * @returns {object} { isValid: boolean, errors: string[] }
 */
function validateFeatures(features) {
  const errors = [];
  
  if (!features || typeof features !== 'object') {
    errors.push('Features must be an object');
    return { isValid: false, errors };
  }

  const validKeys = ['ag_grid_enabled', 'power_search_enabled', 'custom_field_mapping_enabled'];
  const providedKeys = Object.keys(features);

  // Check for unknown keys
  const unknownKeys = providedKeys.filter(key => !validKeys.includes(key));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown feature keys: ${unknownKeys.join(', ')}`);
  }

  // Check that all provided values are booleans
  providedKeys.forEach(key => {
    if (validKeys.includes(key) && typeof features[key] !== 'boolean') {
      errors.push(`Feature '${key}' must be a boolean, got ${typeof features[key]}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  parseSettings,
  stringifySettings,
  getFeatures,
  mergeFeatures,
  validateFeatures
};
