// Bridge route to api/unique-values.js
// Support both development (../src/api/unique-values) and production (../api/unique-values) paths
let uniqueValuesModule;
try {
    uniqueValuesModule = require('../api/unique-values');
} catch (e) {
    uniqueValuesModule = require('../src/api/unique-values');
}
module.exports = uniqueValuesModule;
