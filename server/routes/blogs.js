// Support both development (../src/api/blogs) and production (../api/blogs) paths
let api;
try {
    api = require('../api/blogs');
} catch (e) {
    api = require('../src/api/blogs');
}
module.exports = api;
