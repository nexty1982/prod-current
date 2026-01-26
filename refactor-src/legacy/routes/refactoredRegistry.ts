import { lazy } from "react";

export type RefRoute = {
  /** URL path under /refactored */
  path: string;                         // e.g. "refactored-1/ai-admin-panel"
  /** Import path using aliases, no extension */
  importPath: string;                   // e.g. @/features/misc-legacy/ai/AIAdminPanel"
  /** Display name for menus */
  label: string;                        // e.g. "AI Admin Panel"
  /** Optional icon key (lucide/shadcn/etc.) */
  icon?: string;                        // e.g. "Brain", "Users", "Table"
  meta?: Record<string, unknown>;
};

export const REFACTORED_ROUTES: RefRoute[] = [
  // 🔄 REFACTORED-1 (A-C, first 10 items alphabetically)
  { path: "refactored-1/ai-admin-panel",            importPath: @/features/misc-legacy/ai/AIAdminPanel",                                        label: "AI Admin Panel",           icon: "Brain" },
  { path: "refactored-1/ai-analytics-dashboard",    importPath: @/features/misc-legacy/ai/AIAnalyticsDashboard",                                label: "AI Analytics Dashboard",   icon: "Chart" },
  { path: "refactored-1/ai-content-generator",      importPath: @/features/misc-legacy/ai/AIContentGenerator",                                  label: "AI Content Generator",     icon: "Generate" },
  { path: "refactored-1/ai-deployment-automation",  importPath: @/features/misc-legacy/ai/AIDeploymentAutomation",                             label: "AI Deployment Automation", icon: "Deploy" },
  { path: "refactored-1/ai-log-analysis",           importPath: @/features/misc-legacy/ai/AILogAnalysis",                                       label: "AI Log Analysis",          icon: "Logs" },
  { path: "refactored-1/ai-translation-assistant",  importPath: @/features/misc-legacy/ai/AITranslationAssistant",                             label: "AI Translation Assistant", icon: "Translate" },
  { path: "refactored-1/admin-admin-dashboard-layout", importPath: @/features/misc-legacy/admin/AdminDashboardLayout",                          label: "Admin Dashboard Layout",  icon: "Layout" },
  { path: "refactored-1/admin-admin-page-fallback", importPath: @/features/misc-legacy/admin/AdminPageFallback",                                label: "Admin Page Fallback",     icon: "Fallback" },
  { path: "refactored-1/admin-admin-tile",          importPath: @/features/misc-legacy/admin/AdminTile",                                        label: "Admin Tile",               icon: "Tile" },
  { path: "refactored-1/admin-build-console",       importPath: @/features/misc-legacy/admin/BuildConsole",                                     label: "Build Console",            icon: "Build" },
  
  // 🔄 REFACTORED-2 (C-D, next 10 items alphabetically)
  { path: "refactored-2/admin-component-discovery", importPath: @/features/misc-legacy/admin/ComponentDiscoveryPanel",                          label: "Component Discovery Panel", icon: "Search" },
  { path: "refactored-2/admin-component-inspector", importPath: @/features/misc-legacy/ComponentInspector",                                    label: "Component Inspector",      icon: "Bug" },
  { path: "refactored-2/admin-git-ops",             importPath: @/features/misc-legacy/GitOpsPanel",                                           label: "Git Ops Panel",            icon: "Git" },
  { path: "refactored-2/admin-memory-manager",      importPath: @/features/misc-legacy/admin/MemoryManager",                                    label: "Memory Manager",           icon: "Memory" },
  { path: "refactored-2/admin-notification-management", importPath: @/features/misc-legacy/admin/NotificationManagement",                       label: "Notification Management", icon: "Bell" },
  { path: "refactored-2/admin-script-runner",       importPath: @/features/misc-legacy/admin/ScriptRunner",                                     label: "Script Runner",            icon: "Terminal" },
  { path: "refactored-2/admin-super-dashboard",     importPath: @/features/misc-legacy/admin/SuperAdminDashboard",                             label: "Super Admin Dashboard",    icon: "Dashboard" },
  { path: "refactored-2/admin-system-watchdog",     importPath: @/features/misc-legacy/admin/SystemWatchdog",                                   label: "System Watchdog",          icon: "Monitor" },
  { path: "refactored-2/advanced-grid-dialog",      importPath: @/features/misc-legacy/AdvancedGridDialog",                                     label: "Advanced Grid Dialog",     icon: "Dialog" },
  { path: "refactored-2/advanced-grid-page",        importPath: @/features/misc-legacy/AdvancedGridPage",                                       label: "Advanced Grid Page",       icon: "Grid" },
  
  // 🔄 REFACTORED-3 (D-F, next 10 items alphabetically)
  { path: "refactored-3/advanced-records-demo",     importPath: "@/views/AdvancedRecordsDemo",                                        label: "Advanced Records Demo",     icon: "Demo" },
  { path: "refactored-3/ag-grid-view-only",         importPath: @/features/misc-legacy/AGGridViewOnly",                                         label: "AG Grid View Only",         icon: "Grid" },
  { path: "refactored-3/authentication-component",  importPath: @/features/misc-legacy/AuthenticationComponent",                               label: "Authentication Component", icon: "Key" },
  { path: "refactored-3/bigbook-console",           importPath: @/features/misc-legacy/admin/BigBookConsolePage",                              label: "Big Book Console",         icon: "Terminal" },
  { path: "refactored-3/bigbook-custom-viewer",     importPath: @/features/misc-legacy/admin/BigBookCustomComponentViewer",                     label: "Big Book Custom Viewer",   icon: "Eye" },
  { path: "refactored-3/bigbook-dynamic-route",     importPath: @/features/misc-legacy/admin/BigBookDynamicRoute",                              label: "Big Book Dynamic Route",   icon: "Route" },
  { path: "refactored-3/bigbook-kanban-sync",       importPath: @/features/misc-legacy/admin/BigBookKanbanSync",                               label: "Big Book Kanban Sync",     icon: "Sync" },
  { path: "refactored-3/bigbook-main",              importPath: @/features/misc-legacy/admin/OMBigBook",                                        label: "OM Big Book",              icon: "Book" },
  { path: "refactored-3/bigbook-settings",          importPath: @/features/misc-legacy/admin/BigBookSettings",                                  label: "Big Book Settings",        icon: "Settings" },
  { path: "refactored-3/church-edit-modal",         importPath: @/features/misc-legacy/admin/EditChurchModal",                                  label: "Edit Church Modal",        icon: "Edit" },
  
  // 🔄 REFACTORED-4 (F-K, next 10 items alphabetically)
  { path: "refactored-4/church-management",         importPath: @/features/misc-legacy/admin/ChurchManagement",                                 label: "Church Management",        icon: "List" },
  { path: "refactored-4/church-server-manager",     importPath: @/features/misc-legacy/admin/ChurchServerManager",                              label: "Church Server Manager",    icon: "Server" },
  { path: "refactored-4/church-setup-wizard",       importPath: @/features/misc-legacy/church-management/ch-wiz/ChurchSetupWizard",             label: "Church Setup Wizard",      icon: "Shield" },
  { path: "refactored-4/church-wizard",             importPath: @/features/misc-legacy/admin/ChurchWizard",                                     label: "Church Wizard",            icon: "Wand" },
  { path: "refactored-4/color-picker-popover",     importPath: @/features/misc-legacy/ColorPickerPopover",                                     label: "Color Picker Popover",     icon: "Color" },
  { path: "refactored-4/component-inspector",       importPath: @/features/misc-legacy/ComponentInspector",                                    label: "Component Inspector",      icon: "Bug" },
  { path: "refactored-4/content-manual-fix-editor", importPath: @/features/misc-legacy/ManualFixEditor",                                        label: "Manual Fix Editor",         icon: "Edit" },
  { path: "refactored-4/content-markdown-upload",   importPath: @/features/misc-legacy/MarkdownUpload",                                          label: "Markdown Upload",           icon: "Upload" },
  { path: "refactored-4/content-ocr-scan-preview",  importPath: @/features/misc-legacy/OcrScanPreview",                                         label: "OCR Scan Preview",         icon: "Scan" },
  
  // 🔄 REFACTORED-5 (I-O, next 10 items alphabetically)
  { path: "refactored-5/data-import-records",       importPath: @/features/misc-legacy/ImportRecordsButton",                                    label: "Import Records Button",    icon: "Import" },
  { path: "refactored-5/data-import-records-simple", importPath: @/features/misc-legacy/ImportRecordsButtonSimple",                            label: "Import Records Simple",    icon: "Import" },
  { path: "refactored-5/data-import-records-v2",    importPath: @/features/misc-legacy/ImportRecordsButtonV2",                                 label: "Import Records Button V2", icon: "Import" },
  { path: "refactored-5/data-record-generator",     importPath: @/features/misc-legacy/RecordGenerator",                                        label: "Record Generator",          icon: "Generate" },
  { path: "refactored-5/data-upload-token-manager", importPath: @/features/misc-legacy/UploadTokenManager",                                     label: "Upload Token Manager",     icon: "Token" },
  { path: "refactored-5/debug-component-inspector", importPath: @/features/misc-legacy/ComponentInspector",                                    label: "Component Inspector",      icon: "Inspect" },
  { path: "refactored-5/debug-permission-debugger", importPath: @/features/misc-legacy/debug/PermissionDebugger",                               label: "Permission Debugger",      icon: "Debug" },
  { path: "refactored-5/debug-vrt-settings",        importPath: @/features/misc-legacy/VRTSettingsPanel",                                       label: "VRT Settings Panel",        icon: "Settings" },
  { path: "refactored-5/debug-visual-regression",   importPath: @/features/misc-legacy/VisualRegressionDashboard",                              label: "Visual Regression Dashboard", icon: "Regression" },
  
  // 🔄 REFACTORED-6 (O-S, next 10 items alphabetically)
  { path: "refactored-6/omai-discovery-panel",      importPath: @/features/misc-legacy/admin/OMAIDiscoveryPanel",                               label: "OMAI Discovery Panel",      icon: "Discovery" },
  { path: "refactored-6/omai-discovery-panel-mobile", importPath: @/features/misc-legacy/admin/OMAIDiscoveryPanelMobile",                       label: "OMAI Discovery Panel Mobile", icon: "Mobile" },
  { path: "refactored-6/omai-task-assignment",      importPath: @/features/misc-legacy/admin/OMAITaskAssignmentWidget",                         label: "OMAI Task Assignment",     icon: "Task" },
  { path: "refactored-6/om-deps",                   importPath: "@/tools/om-deps/OM-deps",                                             label: "OM Dependencies",          icon: "Git" },
  { path: "refactored-6/omtrace",                   importPath: @/features/misc-legacy/ui-tools/omtrace/OmtraceConsole",                        label: "OMTrace Console",          icon: "Wrench" },
  { path: "refactored-6/public-assign-task",        importPath: "@/features/miscellaneous-centralized/pages/AssignTask",                                            label: "Public Task Assignment",    icon: "Task" },
  { path: "refactored-6/record-generator",          importPath: @/features/misc-legacy/RecordGenerator",                                        label: "Record Generator",          icon: "Generate" },
  { path: "refactored-6/reset-password-modal",      importPath: @/features/misc-legacy/ResetPasswordModal",                                    label: "Reset Password Modal",     icon: "Lock" },
  { path: "refactored-6/security-encrypted-storage", importPath: @/features/misc-legacy/admin/EncryptedStoragePanel",                           label: "Encrypted Storage Panel",  icon: "Lock" },
  { path: "refactored-6/security-nfs-backup-config", importPath: @/features/misc-legacy/admin/NFSBackupConfig",                                 label: "NFS Backup Config",         icon: "Backup" },
  
  // 🔄 REFACTORED-7 (S-U, next 10 items alphabetically)
  { path: "refactored-7/security-sdlc-backup-panel", importPath: @/features/misc-legacy/admin/SDLCBackupPanel",                                 label: "SDLC Backup Panel",         icon: "Backup" },
  { path: "refactored-7/site-editor",               importPath: @/features/misc-legacy/SiteEditor",                                            label: "Site Editor",              icon: "Edit" },
  { path: "refactored-7/site-editor-error-boundary", importPath: @/features/misc-legacy/SiteEditorErrorBoundary",                              label: "Site Editor Error Boundary", icon: "Alert" },
  { path: "refactored-7/site-editor-fallback",      importPath: @/features/misc-legacy/SiteEditorFallback",                                    label: "Site Editor Fallback",     icon: "Fallback" },
  { path: "refactored-7/site-editor-overlay",       importPath: @/features/misc-legacy/SiteEditorOverlay",                                     label: "Site Editor Overlay",      icon: "Edit" },
  { path: "refactored-7/site-editor-test",          importPath: @/features/misc-legacy/SiteEditorTest",                                        label: "Site Editor Test",         icon: "Test" },
  { path: "refactored-7/site-structure",            importPath: "@/tools/SiteStructureVisualizer",                                     label: "Site Structure Visualizer", icon: "Sitemap" },
  { path: "refactored-7/social-permissions-toggle", importPath: @/features/misc-legacy/SocialPermissionsToggle",                               label: "Social Permissions Toggle", icon: "Toggle" },
  { path: "refactored-7/table-control-panel",      importPath: @/features/misc-legacy/TableControlPanel",                                      label: "Table Control Panel",      icon: "Control" },
  
  // 🔄 REFACTORED-8 (T-Z, remaining items alphabetically)
  { path: "refactored-8/table-theme-demo",          importPath: @/features/misc-legacy/TableThemeDemo",                                         label: "Table Theme Demo",          icon: "Demo" },
  { path: "refactored-8/table-theme-selector",      importPath: @/features/misc-legacy/TableThemeSelector",                                     label: "Table Theme Selector",     icon: "Palette" },
  { path: "refactored-8/themed-table",              importPath: @/features/misc-legacy/ThemedTable",                                            label: "Themed Table",             icon: "Table" },
  { path: "refactored-8/terminal-jit-terminal",     importPath: @/features/system/terminal/JITTerminal",                                   label: "JIT Terminal",             icon: "Terminal" },
  { path: "refactored-8/tsx-component-install",     importPath: @/features/misc-legacy/admin/TSXComponentInstallWizard",                      label: "TSX Component Install Wizard", icon: "Install" },
  { path: "refactored-8/upload-token-manager",      importPath: @/features/misc-legacy/UploadTokenManager",                                     label: "Upload Token Manager",     icon: "Token" },
  { path: "refactored-8/user-form-modal",           importPath: @/features/misc-legacy/UserFormModal",                                         label: "User Form Modal",          icon: "User" },
  { path: "refactored-8/visual-regression-dashboard", importPath: @/features/misc-legacy/VisualRegressionDashboard",                              label: "Visual Regression Dashboard", icon: "Regression" },
  { path: "refactored-8/vrt-settings-panel",        importPath: @/features/misc-legacy/VRTSettingsPanel",                                       label: "VRT Settings Panel",        icon: "Settings" },
  
  // 🔄 DUPLICATE Components (Multiple Locations) - Only existing components
  { path: "duplicate/profile-tab",     importPath: "@/features/user-profile/UserProfile",                                 label: "ProfileTab",               icon: "User" },
  { path: "duplicate/profile-tab-backup1", importPath: "@/features/user-profile/UserProfile",                             label: "ProfileTab (Backup 1)",     icon: "User" },
  { path: "duplicate/profile-tab-backup2", importPath: "@/features/user-profile/UserProfile",                             label: "ProfileTab (Backup 2)",     icon: "User" },
  { path: "duplicate/profile-tab-backup3", importPath: "@/features/user-profile/UserProfile",                             label: "ProfileTab (Backup 3)",     icon: "User" },
  { path: "duplicate/user-profile",   importPath: "@/features/user-profile/UserProfile",                                   label: "UserProfile",               icon: "User" },
  { path: "duplicate/user-profile-backup1", importPath: "@/features/user-profile/UserProfile",                           label: "UserProfile (Backup 1)",   icon: "User" },
  { path: "duplicate/user-profile-backup2", importPath: "@/features/user-profile/UserProfile",                           label: "UserProfile (Backup 2)",   icon: "User" },
  { path: "duplicate/gallery",        importPath: "@/features/user-profile/Gallery",                                        label: "Gallery",                  icon: "Image" },
  { path: "duplicate/gallery-backup1", importPath: "@/features/user-profile/Gallery",                                      label: "Gallery (Backup 1)",        icon: "Image" },
  { path: "duplicate/gallery-backup2", importPath: "@/features/user-profile/Gallery",                                      label: "Gallery (Backup 2)",        icon: "Image" },
  { path: "duplicate/friends",        importPath: "@/features/user-profile/Friends",                                        label: "Friends",                  icon: "Users" },
  { path: "duplicate/friends-backup1", importPath: "@/features/user-profile/Friends",                                      label: "Friends (Backup 1)",        icon: "Users" },
  { path: "duplicate/friends-backup2", importPath: "@/features/user-profile/Friends",                                      label: "Friends (Backup 2)",        icon: "Users" },
  { path: "duplicate/followers",      importPath: "@/features/user-profile/Followers",                                      label: "Followers",                icon: "Users" },
  { path: "duplicate/followers-backup1", importPath: "@/features/user-profile/Followers",                                  label: "Followers (Backup 1)",     icon: "Users" },
  { path: "duplicate/followers-backup2", importPath: "@/features/user-profile/Followers",                                  label: "Followers (Backup 2)",     icon: "Users" },
];

// Static map of lazy imports (IMPORTANT: no dynamic strings at runtime)
export const REFACTORED_IMPORTS: Record<string, ReturnType<typeof lazy>> = {
  // 🔄 REFACTORED-1
  "refactored-1/ai-admin-panel":            lazy(() => import(@/features/misc-legacy/ai/AIAdminPanel")),
  "refactored-1/ai-analytics-dashboard":    lazy(() => import(@/features/misc-legacy/ai/AIAnalyticsDashboard")),
  "refactored-1/ai-content-generator":      lazy(() => import(@/features/misc-legacy/ai/AIContentGenerator")),
  "refactored-1/ai-deployment-automation":  lazy(() => import(@/features/misc-legacy/ai/AIDeploymentAutomation")),
  "refactored-1/ai-log-analysis":           lazy(() => import(@/features/misc-legacy/ai/AILogAnalysis")),
  "refactored-1/ai-translation-assistant":  lazy(() => import(@/features/misc-legacy/ai/AITranslationAssistant")),
  "refactored-1/admin-admin-dashboard-layout": lazy(() => import(@/features/misc-legacy/admin/AdminDashboardLayout")),
  "refactored-1/admin-admin-page-fallback": lazy(() => import(@/features/misc-legacy/admin/AdminPageFallback")),
  "refactored-1/admin-admin-tile":          lazy(() => import(@/features/misc-legacy/admin/AdminTile")),
  "refactored-1/admin-build-console":       lazy(() => import(@/features/misc-legacy/admin/BuildConsole")),
  
  // 🔄 REFACTORED-2
  "refactored-2/admin-component-discovery": lazy(() => import(@/features/misc-legacy/admin/ComponentDiscoveryPanel")),
  "refactored-2/admin-component-inspector": lazy(() => import(@/features/misc-legacy/ComponentInspector")),
  "refactored-2/admin-git-ops":             lazy(() => import(@/features/misc-legacy/GitOpsPanel")),
  "refactored-2/admin-memory-manager":      lazy(() => import(@/features/misc-legacy/admin/MemoryManager")),
  "refactored-2/admin-notification-management": lazy(() => import(@/features/misc-legacy/admin/NotificationManagement")),
  "refactored-2/admin-script-runner":       lazy(() => import(@/features/misc-legacy/admin/ScriptRunner")),
  "refactored-2/admin-super-dashboard":     lazy(() => import(@/features/misc-legacy/admin/SuperAdminDashboard")),
  "refactored-2/admin-system-watchdog":     lazy(() => import(@/features/misc-legacy/admin/SystemWatchdog")),
  "refactored-2/advanced-grid-dialog":      lazy(() => import(@/features/misc-legacy/AdvancedGridDialog")),
  "refactored-2/advanced-grid-page":        lazy(() => import(@/features/misc-legacy/AdvancedGridPage")),
  
  // 🔄 REFACTORED-3
  "refactored-3/advanced-records-demo":     lazy(() => import("@/views/AdvancedRecordsDemo")),
  "refactored-3/ag-grid-view-only":         lazy(() => import(@/features/misc-legacy/AGGridViewOnly")),
  "refactored-3/authentication-component":  lazy(() => import(@/features/misc-legacy/AuthenticationComponent")),
  "refactored-3/bigbook-console":           lazy(() => import(@/features/misc-legacy/admin/BigBookConsolePage")),
  "refactored-3/bigbook-custom-viewer":     lazy(() => import(@/features/misc-legacy/admin/BigBookCustomComponentViewer")),
  "refactored-3/bigbook-dynamic-route":     lazy(() => import(@/features/misc-legacy/admin/BigBookDynamicRoute")),
  "refactored-3/bigbook-kanban-sync":       lazy(() => import(@/features/misc-legacy/admin/BigBookKanbanSync")),
  "refactored-3/bigbook-main":              lazy(() => import(@/features/misc-legacy/admin/OMBigBook")),
  "refactored-3/bigbook-settings":          lazy(() => import(@/features/misc-legacy/admin/BigBookSettings")),
  "refactored-3/church-edit-modal":         lazy(() => import(@/features/misc-legacy/admin/EditChurchModal")),
  
  // 🔄 REFACTORED-4
  "refactored-4/church-management":         lazy(() => import(@/features/misc-legacy/admin/ChurchManagement")),
  "refactored-4/church-server-manager":     lazy(() => import(@/features/misc-legacy/admin/ChurchServerManager")),
  "refactored-4/church-setup-wizard":       lazy(() => import(@/features/misc-legacy/church-management/ch-wiz/ChurchSetupWizard")),
  "refactored-4/church-wizard":             lazy(() => import(@/features/misc-legacy/admin/ChurchWizard")),
  "refactored-4/color-picker-popover":     lazy(() => import(@/features/misc-legacy/ColorPickerPopover")),
  "refactored-4/component-inspector":       lazy(() => import(@/features/misc-legacy/ComponentInspector")),
  "refactored-4/content-manual-fix-editor": lazy(() => import(@/features/misc-legacy/ManualFixEditor")),
  "refactored-4/content-markdown-upload":   lazy(() => import(@/features/misc-legacy/MarkdownUpload")),
  "refactored-4/content-ocr-scan-preview":  lazy(() => import(@/features/misc-legacy/OcrScanPreview")),
  
  // 🔄 REFACTORED-5
  "refactored-5/data-import-records":       lazy(() => import(@/features/misc-legacy/ImportRecordsButton")),
  "refactored-5/data-import-records-simple": lazy(() => import(@/features/misc-legacy/ImportRecordsButtonSimple")),
  "refactored-5/data-import-records-v2":    lazy(() => import(@/features/misc-legacy/ImportRecordsButtonV2")),
  "refactored-5/data-record-generator":     lazy(() => import(@/features/misc-legacy/RecordGenerator")),
  "refactored-5/data-upload-token-manager": lazy(() => import(@/features/misc-legacy/UploadTokenManager")),
  "refactored-5/debug-component-inspector": lazy(() => import(@/features/misc-legacy/ComponentInspector")),
  "refactored-5/debug-permission-debugger": lazy(() => import(@/features/misc-legacy/debug/PermissionDebugger")),
  "refactored-5/debug-vrt-settings":        lazy(() => import(@/features/misc-legacy/VRTSettingsPanel")),
  "refactored-5/debug-visual-regression":   lazy(() => import(@/features/misc-legacy/VisualRegressionDashboard")),
  
  // 🔄 REFACTORED-6
  "refactored-6/omai-discovery-panel":      lazy(() => import(@/features/misc-legacy/admin/OMAIDiscoveryPanel")),
  "refactored-6/omai-discovery-panel-mobile": lazy(() => import(@/features/misc-legacy/admin/OMAIDiscoveryPanelMobile")),
  "refactored-6/omai-task-assignment":      lazy(() => import(@/features/misc-legacy/admin/OMAITaskAssignmentWidget")),
  "refactored-6/om-deps":                   lazy(() => import("@/tools/om-deps/OM-deps")),
  "refactored-6/omtrace":                   lazy(() => import(@/features/misc-legacy/ui-tools/omtrace/OmtraceConsole")),
  "refactored-6/public-assign-task":        lazy(() => import("@/features/miscellaneous-centralized/pages/AssignTask")),
  "refactored-6/record-generator":          lazy(() => import(@/features/misc-legacy/RecordGenerator")),
  "refactored-6/reset-password-modal":      lazy(() => import(@/features/misc-legacy/ResetPasswordModal")),
  "refactored-6/security-encrypted-storage": lazy(() => import(@/features/misc-legacy/admin/EncryptedStoragePanel")),
  "refactored-6/security-nfs-backup-config": lazy(() => import(@/features/misc-legacy/admin/NFSBackupConfig")),
  
  // 🔄 REFACTORED-7
  "refactored-7/security-sdlc-backup-panel": lazy(() => import(@/features/misc-legacy/admin/SDLCBackupPanel")),
  "refactored-7/site-editor":               lazy(() => import(@/features/misc-legacy/SiteEditor")),
  "refactored-7/site-editor-error-boundary": lazy(() => import(@/features/misc-legacy/SiteEditorErrorBoundary")),
  "refactored-7/site-editor-fallback":      lazy(() => import(@/features/misc-legacy/SiteEditorFallback")),
  "refactored-7/site-editor-overlay":       lazy(() => import(@/features/misc-legacy/SiteEditorOverlay")),
  "refactored-7/site-editor-test":          lazy(() => import(@/features/misc-legacy/SiteEditorTest")),
  "refactored-7/site-structure":            lazy(() => import("@/tools/SiteStructureVisualizer")),
  "refactored-7/social-permissions-toggle": lazy(() => import(@/features/misc-legacy/SocialPermissionsToggle")),
  "refactored-7/table-control-panel":      lazy(() => import(@/features/misc-legacy/TableControlPanel")),
  
  // 🔄 REFACTORED-8
  "refactored-8/table-theme-demo":          lazy(() => import(@/features/misc-legacy/TableThemeDemo")),
  "refactored-8/table-theme-selector":      lazy(() => import(@/features/misc-legacy/TableThemeSelector")),
  "refactored-8/themed-table":              lazy(() => import(@/features/misc-legacy/ThemedTable")),
  "refactored-8/terminal-jit-terminal":     lazy(() => import(@/features/system/terminal/JITTerminal")),
  "refactored-8/tsx-component-install":     lazy(() => import(@/features/misc-legacy/admin/TSXComponentInstallWizard")),
  "refactored-8/upload-token-manager":      lazy(() => import(@/features/misc-legacy/UploadTokenManager")),
  "refactored-8/user-form-modal":           lazy(() => import(@/features/misc-legacy/UserFormModal")),
  "refactored-8/visual-regression-dashboard": lazy(() => import(@/features/misc-legacy/VisualRegressionDashboard")),
  "refactored-8/vrt-settings-panel":        lazy(() => import(@/features/misc-legacy/VRTSettingsPanel")),
  
  // 🔄 DUPLICATE Components (Multiple Locations) - Only existing components
  "duplicate/profile-tab":     lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/profile-tab-backup1": lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/profile-tab-backup2": lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/profile-tab-backup3": lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/user-profile":   lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/user-profile-backup1": lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/user-profile-backup2": lazy(() => import("@/features/user-profile/UserProfile")),
  "duplicate/gallery":        lazy(() => import("@/features/user-profile/Gallery")),
  "duplicate/gallery-backup1": lazy(() => import("@/features/user-profile/Gallery")),
  "duplicate/gallery-backup2": lazy(() => import("@/features/user-profile/Gallery")),
  "duplicate/friends":        lazy(() => import("@/features/user-profile/Friends")),
  "duplicate/friends-backup1": lazy(() => import("@/features/user-profile/Friends")),
  "duplicate/friends-backup2": lazy(() => import("@/features/user-profile/Friends")),
  "duplicate/followers":      lazy(() => import("@/features/user-profile/Followers")),
  "duplicate/followers-backup1": lazy(() => import("@/features/user-profile/Followers")),
  "duplicate/followers-backup2": lazy(() => import("@/features/user-profile/Followers")),
};
