// Support both development (../src/api/runScript) and production (../api/runScript) paths
let runScriptModule;
try {
    runScriptModule = require('../api/runScript');
} catch (e) {
    runScriptModule = require('../src/api/runScript');
}
module.exports = runScriptModule;
