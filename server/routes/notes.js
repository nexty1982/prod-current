// Bridge route to api/notes.js
// Support both development (../src/api/notes) and production (../api/notes) paths
let notesModule;
try {
    notesModule = require('../api/notes');
} catch (e) {
    notesModule = require('../src/api/notes');
}
module.exports = notesModule;
