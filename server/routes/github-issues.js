// Support both development (../src/api/github-issues) and production (../api/github-issues) paths
let api;
try {
    api = require('../api/github-issues');
} catch (e) {
    api = require('../src/api/github-issues');
}
module.exports = api;
