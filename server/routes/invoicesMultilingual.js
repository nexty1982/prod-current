// Bridge route to api/invoicesMultilingual.js
// Support both development (../src/api/invoicesMultilingual) and production (../api/invoicesMultilingual) paths
let invoicesModule;
try {
    invoicesModule = require('../api/invoicesMultilingual');
} catch (e) {
    invoicesModule = require('../src/api/invoicesMultilingual');
}
module.exports = invoicesModule;
