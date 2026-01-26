// Support both development (../src/api/uploads) and production (../api/uploads) paths
let uploadsModule;
try {
    uploadsModule = require('../api/uploads');
} catch (e) {
    uploadsModule = require('../src/api/uploads');
}
module.exports = uploadsModule;
