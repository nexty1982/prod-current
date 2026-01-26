// Bridge route to api/menuPermissions.js
// Support both development (../src/api/menuPermissions) and production (../api/menuPermissions) paths
let menuPermissionsModule;
try {
    menuPermissionsModule = require('../api/menuPermissions');
} catch (e) {
    menuPermissionsModule = require('../src/api/menuPermissions');
}
module.exports = menuPermissionsModule;
