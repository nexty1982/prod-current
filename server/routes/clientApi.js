// Support both development (../src/api/clientApi) and production (../api/clientApi) paths
let clientApiModule;
try {
    clientApiModule = require('../api/clientApi');
} catch (e) {
    clientApiModule = require('../src/api/clientApi');
}
module.exports = clientApiModule;
