// Bridge route to api/menuManagement.js
// Support both development (../src/api/menuManagement) and production (../api/menuManagement) paths
let menuManagementModule;
try {
    menuManagementModule = require('../api/menuManagement');
} catch (e) {
    menuManagementModule = require('../src/api/menuManagement');
}
module.exports = menuManagementModule;
