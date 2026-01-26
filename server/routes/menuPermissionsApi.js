// Support both development (../src/api/menuPermissionsApi) and production (../api/menuPermissionsApi) paths
let api;
try {
    api = require('../api/menuPermissionsApi');
} catch (e) {
    api = require('../src/api/menuPermissionsApi');
}
module.exports = api;
