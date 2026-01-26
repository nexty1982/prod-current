/**
 * Safe Require Helper
 * Tries to require a module, returns a fallback stub if MODULE_NOT_FOUND
 * Logs a single WARN at startup (not on every request)
 */

const warnedModules = new Set();

/**
 * Safely require a module with fallback
 * @param {string} modulePath - Path to require
 * @param {Function} fallbackFactory - Function that returns fallback stub
 * @param {string} moduleName - Name for logging purposes
 * @returns {any} Required module or fallback stub
 */
function safeRequire(modulePath, fallbackFactory, moduleName = null) {
  try {
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      const name = moduleName || modulePath;
      if (!warnedModules.has(name)) {
        console.warn(`⚠️  [SafeRequire] Module not found: ${modulePath} - using fallback stub`);
        warnedModules.add(name);
      }
      return fallbackFactory();
    }
    // Re-throw non-MODULE_NOT_FOUND errors
    throw error;
  }
}

module.exports = { safeRequire };
