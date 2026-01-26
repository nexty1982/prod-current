// Bridge route to api/notifications.js (exports { router, notificationService })
// Support both development (../src/api/notifications) and production (../api/notifications) paths
let notificationsModule;
try {
    notificationsModule = require('../api/notifications');
} catch (e) {
    notificationsModule = require('../src/api/notifications');
}
module.exports = notificationsModule;
