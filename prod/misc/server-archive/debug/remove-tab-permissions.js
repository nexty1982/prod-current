const fs = require('fs');
const path = require('path');

console.log('🔧 Removing permission checks from Content & Services tabs...');

const adminSettingsPath = path.join(__dirname, '../../front-end/src/views/admin/AdminSettings.tsx');

// Read the current file
let content = fs.readFileSync(adminSettingsPath, 'utf8');

console.log('📋 BEFORE: Content & Services tabs have permission checks');
console.log('📋 AFTER: Content & Services tabs will be visible like other tabs');

// Remove the conditional wrapper around Content and Services tabs
const tabsPattern = /\{isSuperAdmin\(\) \|\| hasRole\(\['admin', 'super_admin'\]\)\) && \(\s*<>\s*<Tab[^>]*label="Content"[\s\S]*?<Tab[^>]*label="Services"[\s\S]*?\/>\s*<\/>\s*\)\}/;
const tabsReplacement = `<Tab
                                icon={<IconPhoto />}
                                label="Content"
                                id="admin-settings-tab-4"
                                aria-controls="admin-settings-tabpanel-4"
                            />
                            <Tab
                                icon={<IconActivity />}
                                label="Services"
                                id="admin-settings-tab-5"
                                aria-controls="admin-settings-tabpanel-5"
                            />`;

content = content.replace(tabsPattern, tabsReplacement);

// Remove the conditional wrapper around Content TabPanel
const contentTabPanelPattern = /\{isSuperAdmin\(\) \|\| hasRole\(\['admin', 'super_admin'\]\)\) && \(\s*<TabPanel value=\{tabValue\} index=\{4\}>\s*<ContentSettings \/>\s*<\/TabPanel>\s*\)\}/;
const contentTabPanelReplacement = `<TabPanel value={tabValue} index={4}>
                        <ContentSettings />
                    </TabPanel>`;

content = content.replace(contentTabPanelPattern, contentTabPanelReplacement);

// Remove the conditional wrapper around Services TabPanel
const servicesTabPanelPattern = /\{isSuperAdmin\(\) \|\| hasRole\(\['admin', 'super_admin'\]\)\) && \(\s*<TabPanel value=\{tabValue\} index=\{5\}>\s*<ServiceManagement \/>\s*<\/TabPanel>\s*\)\}/;
const servicesTabPanelReplacement = `<TabPanel value={tabValue} index={5}>
                        <ServiceManagement />
                    </TabPanel>`;

content = content.replace(servicesTabPanelPattern, servicesTabPanelReplacement);

// Write the modified file
fs.writeFileSync(adminSettingsPath, content);

console.log('✅ Permission checks removed from AdminSettings.tsx');
console.log('');
console.log('📋 CHANGES MADE:');
console.log('1. ✅ Content tab - now always visible');
console.log('2. ✅ Services tab - now always visible');
console.log('3. ✅ Content TabPanel - now always rendered');
console.log('4. ✅ Services TabPanel - now always rendered');
console.log('');
console.log('🔄 NEXT STEPS:');
console.log('1. Refresh your browser');
console.log('2. Go to Settings page');
console.log('3. Content & Services tabs should now be visible!');
console.log('');
console.log('🎯 RESULT: Content & Services tabs will now behave exactly like');
console.log('General, Backup & Restore, Security, and Notifications tabs'); 