// Bridge route to api/invoices.js
// Support both development (../src/api/invoices) and production (../api/invoices) paths
let invoicesModule;
try {
    invoicesModule = require('../api/invoices');
} catch (e) {
    invoicesModule = require('../src/api/invoices');
}
module.exports = invoicesModule;
