// Bridge route to api/ecommerce.js
// Support both development (../src/api/ecommerce) and production (../api/ecommerce) paths
let ecommerceModule;
try {
    ecommerceModule = require('../api/ecommerce');
} catch (e) {
    ecommerceModule = require('../src/api/ecommerce');
}
module.exports = ecommerceModule;
