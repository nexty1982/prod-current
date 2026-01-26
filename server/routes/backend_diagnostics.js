// Support both development (../src/api/backend_diagnostics) and production (../api/backend_diagnostics) paths
let diagnosticsModule;
try {
    diagnosticsModule = require('../api/backend_diagnostics');
} catch (e) {
    diagnosticsModule = require('../src/api/backend_diagnostics');
}
module.exports = diagnosticsModule;
