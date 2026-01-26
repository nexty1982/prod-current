// Bridge route to api/billing.js
// Support both development (../src/api/billing) and production (../api/billing) paths
let billingModule;
try {
    billingModule = require('../api/billing');
} catch (e) {
    billingModule = require('../src/api/billing');
}
module.exports = billingModule;
