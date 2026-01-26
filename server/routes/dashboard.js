// Bridge route to api/dashboard.js
// Support both development (../src/api/dashboard) and production (../api/dashboard) paths
let dashboardModule;
try {
    dashboardModule = require('../api/dashboard');
} catch (e) {
    dashboardModule = require('../src/api/dashboard');
}
module.exports = dashboardModule;
