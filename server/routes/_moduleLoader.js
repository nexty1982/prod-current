/**
 * Helper module for loading API modules in both development and production
 * Detects if running from dist/ or source and uses appropriate path
 */
const path = require('path');

/**
 * Load an API module, handling both dist and source paths
 * @param {string} moduleName - Name of the module (e.g., 'baptismCertificates')
 * @param {boolean} optional - If true, return null instead of throwing on error
 * @returns {*} The loaded module, or null if optional and failed
 * @throws {Error} If module cannot be loaded from any path and not optional
 */
function loadApiModule(moduleName, optional = false) {
    // Determine if we're running from dist or source
    const isDist = __dirname.includes(path.sep + 'dist' + path.sep);
    
    if (isDist) {
        // Running from dist: only try ../api/ path (src/ doesn't exist in dist)
        try {
            return require(`../api/${moduleName}`);
        } catch (e) {
            // Check if it's a native module compatibility issue (can be fixed separately)
            const isNativeModuleError = e.message.includes('NODE_MODULE_VERSION') || 
                                      e.message.includes('was compiled against');
            
            if (optional) {
                console.warn(`⚠️  [${moduleName}] Optional module failed to load (may need native module rebuild):`, e.message);
                return null;
            }
            
            console.error(`❌ [${moduleName}] Failed to load from ../api/${moduleName}:`, e.message);
            if (isNativeModuleError) {
                console.error(`   Note: This appears to be a native module compatibility issue. Run 'npm rebuild' in server directory.`);
            }
            throw new Error(`Cannot load ${moduleName} module from dist: ${e.message}`);
        }
    } else {
        // Running from source: try both paths
        try {
            return require(`../api/${moduleName}`);
        } catch (e) {
            try {
                return require(`../src/api/${moduleName}`);
            } catch (e2) {
                if (optional) {
                    console.warn(`⚠️  [${moduleName}] Optional module failed to load from both paths:`, e.message);
                    return null;
                }
                console.error(`❌ [${moduleName}] Failed to load from both paths:`, e.message, e2.message);
                throw new Error(`Cannot load ${moduleName} module: ${e.message}`);
            }
        }
    }
}

module.exports = { loadApiModule };
