// Support both development (../src/api/ai) and production (../api/ai) paths
let aiModule;
try {
    aiModule = require('../api/ai');
} catch (e) {
    aiModule = require('../src/api/ai');
}
module.exports = aiModule;
