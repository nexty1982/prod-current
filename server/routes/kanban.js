// Bridge to api/kanban.js
// Support both development (../src/api/kanban) and production (../api/kanban) paths
let kanbanModule;
try {
    kanbanModule = require('../api/kanban');
} catch (e) {
    kanbanModule = require('../src/api/kanban');
}
module.exports = kanbanModule;
