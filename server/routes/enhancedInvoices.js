// Bridge route to api/enhancedInvoices.js
// Support both development (../src/api/enhancedInvoices) and production (../api/enhancedInvoices) paths
let invoicesModule;
try {
    invoicesModule = require('../api/enhancedInvoices');
} catch (e) {
    invoicesModule = require('../src/api/enhancedInvoices');
}
module.exports = invoicesModule;
