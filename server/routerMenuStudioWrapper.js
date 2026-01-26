// JavaScript wrapper for TypeScript RouterMenuStudio feature
const { createRequire } = require('module');
const require_ts = createRequire(import.meta.url);

async function registerRouterMenuStudio(app) {
  try {
    // Dynamic import for TypeScript module
    const { registerRouterMenuStudio } = await import('./src/features/routerMenuStudio/index.ts');
    registerRouterMenuStudio(app);
    console.log('✅ RouterMenuStudio mounted at /api/studio');
  } catch (error) {
    console.error('❌ Failed to register RouterMenuStudio:', error.message);
  }
}

module.exports = { registerRouterMenuStudio };
