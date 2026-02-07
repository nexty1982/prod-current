/**
 * Feature Flags Resolver
 * Resolves feature flags using global defaults + per-church overrides
 * 
 * Resolution order: churchOverride ?? globalDefault ?? false
 * - Global defaults stored in orthodoxmetrics_db.settings (key_name: features.*)
 * - Per-church overrides stored in orthodoxmetrics_db.churches.settings JSON
 * - All features default to DISABLED unless explicitly enabled
 */

const logger = require('./logger') || console;

// Known feature flags
const KNOWN_FEATURES = [
  'ag_grid_enabled',
  'power_search_enabled',
  'custom_field_mapping_enabled'
];

// In-memory cache for global defaults (60 second TTL)
let globalDefaultsCache = null;
let globalDefaultsCacheTime = 0;
const CACHE_TTL_MS = 60000; // 60 seconds

/**
 * Parse boolean value from string or boolean
 * Handles 'true', 'false', true, false, 1, 0
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

/**
 * Load global feature defaults from settings table
 * @param {object} dbConn - Database connection (getAppPool())
 * @returns {Promise<object>} Object with feature flags as keys, boolean values
 */
async function getGlobalFeatureDefaults(dbConn) {
  // Check cache
  const now = Date.now();
  if (globalDefaultsCache && (now - globalDefaultsCacheTime) < CACHE_TTL_MS) {
    return globalDefaultsCache;
  }

  try {
    const result = await dbConn.query(
      `SELECT key_name, value FROM settings WHERE key_name LIKE 'features.%'`
    );

    // Normalize query result - handle different DB driver return shapes
    // mysql2 returns [rows, fields], some return just rows, some return {rows, ...}
    let rows;
    if (Array.isArray(result)) {
      rows = Array.isArray(result[0]) ? result[0] : result;
    } else if (result && result.rows) {
      rows = result.rows;
    } else {
      rows = [];
    }

    const defaults = {};
    
    // Initialize all known features to false
    KNOWN_FEATURES.forEach(feature => {
      defaults[feature] = false;
    });

    // Parse settings rows
    if (Array.isArray(rows)) {
      rows.forEach(row => {
        if (row && row.key_name) {
          // Extract feature name from key_name (e.g., 'features.ag_grid_enabled' -> 'ag_grid_enabled')
          const featureName = row.key_name.replace('features.', '');
          if (KNOWN_FEATURES.includes(featureName)) {
            defaults[featureName] = parseBoolean(row.value);
          }
        }
      });
    }

    // Update cache
    globalDefaultsCache = defaults;
    globalDefaultsCacheTime = now;

    logger.info('Global feature defaults loaded', { defaults });
    return defaults;

  } catch (error) {
    const errorMsg = error && error.message ? error.message : String(error);
    logger.error('Failed to load global feature defaults', { error: errorMsg });
    
    // Return all disabled on error
    const fallback = {};
    KNOWN_FEATURES.forEach(feature => {
      fallback[feature] = false;
    });
    return fallback;
  }
}

/**
 * Load per-church feature overrides from churches.settings JSON
 * @param {object} dbConn - Database connection (getAppPool())
 * @param {number} churchId - Church ID
 * @returns {Promise<object>} Object with feature flags as keys, boolean values (or undefined if no override)
 */
async function getChurchFeatureOverrides(dbConn, churchId) {
  try {
    const [rows] = await dbConn.query(
      'SELECT id, name, settings FROM churches WHERE id = ? AND is_active = 1',
      [churchId]
    );

    if (rows.length === 0) {
      logger.warn('Church not found or inactive', { churchId });
      return {};
    }

    const church = rows[0];
    const settingsString = church.settings;

    // Handle NULL or empty settings
    if (!settingsString || settingsString.trim() === '') {
      return {};
    }

    // Parse JSON
    let settings;
    try {
      settings = JSON.parse(settingsString);
    } catch (parseError) {
      logger.warn('Invalid JSON in church settings, treating as no overrides', {
        churchId,
        error: parseError.message
      });
      return {};
    }

    // Extract features object
    if (!settings || typeof settings !== 'object' || !settings.features) {
      return {};
    }

    const features = settings.features;
    const overrides = {};

    // Only include known features with explicit boolean values
    KNOWN_FEATURES.forEach(feature => {
      if (features.hasOwnProperty(feature) && typeof features[feature] === 'boolean') {
        overrides[feature] = features[feature];
      }
    });

    logger.debug('Church feature overrides loaded', { churchId, churchName: church.name, overrides });
    return overrides;

  } catch (error) {
    logger.error('Failed to load church feature overrides', { 
      churchId, 
      error: error.message 
    });
    return {};
  }
}

/**
 * Resolve effective feature flags
 * Resolution: churchOverride ?? globalDefault ?? false
 * @param {object} options
 * @param {object} options.global - Global defaults
 * @param {object} options.override - Church overrides
 * @returns {object} Effective feature flags
 */
function resolveFeatures({ global, override }) {
  const effective = {};

  KNOWN_FEATURES.forEach(feature => {
    // Resolution order: override ?? global ?? false
    if (override.hasOwnProperty(feature) && typeof override[feature] === 'boolean') {
      effective[feature] = override[feature];
    } else if (global.hasOwnProperty(feature)) {
      effective[feature] = global[feature];
    } else {
      effective[feature] = false;
    }
  });

  return effective;
}

/**
 * Get effective feature flags for a church (convenience function)
 * @param {object} dbConn - Database connection (getAppPool())
 * @param {number} churchId - Church ID
 * @returns {Promise<object>} { global, overrides, effective }
 */
async function getEffectiveFeatures(dbConn, churchId) {
  const global = await getGlobalFeatureDefaults(dbConn);
  const overrides = await getChurchFeatureOverrides(dbConn, churchId);
  const effective = resolveFeatures({ global, override: overrides });

  return {
    global,
    overrides,
    effective
  };
}

/**
 * Clear global defaults cache (useful for testing or after settings update)
 */
function clearCache() {
  globalDefaultsCache = null;
  globalDefaultsCacheTime = 0;
}

module.exports = {
  KNOWN_FEATURES,
  getGlobalFeatureDefaults,
  getChurchFeatureOverrides,
  resolveFeatures,
  getEffectiveFeatures,
  clearCache
};
