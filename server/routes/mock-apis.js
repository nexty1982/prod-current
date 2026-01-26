// Support both development (../src/api/mock-apis) and production (../api/mock-apis) paths
let mockApisModule;
try {
    mockApisModule = require('../api/mock-apis');
} catch (e) {
    mockApisModule = require('../src/api/mock-apis');
}
module.exports = mockApisModule;
