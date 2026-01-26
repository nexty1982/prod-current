// Support both development (../src/api/pages) and production (../api/pages) paths
let pagesModule;
try {
    pagesModule = require('../api/pages');
} catch (e) {
    pagesModule = require('../src/api/pages');
}
module.exports = pagesModule;
