#!/bin/bash

# Phase 1: Update refactoredRegistry.ts with user-management components
echo "=== Phase 1: Updating Registry ==="

# Change to front-end directory
cd /var/www/orthodoxmetrics/prod/front-end

# Backup current registry
cp src/routes/refactoredRegistry.ts src/routes/refactoredRegistry.ts.backup
echo "Backed up current registry to refactoredRegistry.ts.backup"

echo ""
echo "Adding Phase 1 components to refactoredRegistry.ts..."
echo ""

# Create the updated registry content
cat > src/routes/refactoredRegistry.ts << 'EOF'
import { lazy } from "react";

export type RefRoute = {
  path: string;
  importPath: string;
  label: string;
  icon?: string;
  meta?: Record<string, unknown>;
};

export const REFACTORED_ROUTES: RefRoute[] = [
  // Existing routes
  { path: "tools/omtrace",             importPath: "@/components/ui-tools/omtrace/OmtraceConsole",                        label: "OMTrace Console",          icon: "Wrench" },
  { path: "church/setup-wizard",       importPath: "@/components/church-management/ch-wiz/ChurchSetupWizard",             label: "Church Setup Wizard",      icon: "Shield" },
  { path: "site/editor",               importPath: "@/components/SiteEditor",                                            label: "Site Editor",              icon: "Edit" },
  { path: "site/editor-overlay",       importPath: "@/components/SiteEditorOverlay",                                     label: "Site Editor Overlay",      icon: "Edit" },
  { path: "user/form-modal",           importPath: "@/components/UserFormModal",                                         label: "User Form Modal",          icon: "User" },
  { path: "admin/component-inspector", importPath: "@/components/ComponentInspector",                                    label: "Component Inspector",      icon: "Bug" },
  { path: "admin/git-ops",             importPath: "@/components/GitOpsPanel",                                           label: "Git Ops Panel",            icon: "Git" },
  
  // Phase 1: User Management Routes
  { path: "user/management",           importPath: "@/components/user-management/usr-core/UserManagement",                 label: "User Management",          icon: "Users" },
  { path: "user/sessions",             importPath: "@/components/user-management/usr-core/SessionManagement",               label: "Session Management",      icon: "Clock" },
  { path: "user/roles",                importPath: "@/components/user-management/usr-roles/RoleManagement",                label: "Role Management",          icon: "Shield" },
  { path: "user/menu",                 importPath: "@/components/user-management/usr-roles/MenuManagement",                 label: "Menu Management",          icon: "Menu2" },
  { path: "user/menu-permissions",     importPath: "@/components/user-management/usr-roles/MenuPermissions",               label: "Menu Permissions",        icon: "Lock" },
];

// Static map of lazy imports (IMPORTANT: no dynamic strings at runtime)
export const REFACTORED_IMPORTS: Record<string, ReturnType<typeof lazy>> = {
  // Existing imports
  "tools/omtrace":           lazy(() => import("@/components/ui-tools/omtrace/OmtraceConsole")),
  "church/setup-wizard":     lazy(() => import("@/components/church-management/ch-wiz/ChurchSetupWizard")),
  "site/editor":             lazy(() => import("@/components/SiteEditor")),
  "site/editor-overlay":     lazy(() => import("@/components/SiteEditorOverlay")),
  "user/form-modal":         lazy(() => import("@/components/UserFormModal")),
  "admin/component-inspector": lazy(() => import("@/components/ComponentInspector")),
  "admin/git-ops":           lazy(() => import("@/components/GitOpsPanel")),
  
  // Phase 1: User Management Imports
  "user/management":         lazy(() => import("@/components/user-management/usr-core/UserManagement")),
  "user/sessions":           lazy(() => import("@/components/user-management/usr-core/SessionManagement")),
  "user/roles":              lazy(() => import("@/components/user-management/usr-roles/RoleManagement")),
  "user/menu":               lazy(() => import("@/components/user-management/usr-roles/MenuManagement")),
  "user/menu-permissions":   lazy(() => import("@/components/user-management/usr-roles/MenuPermissions")),
};
EOF

echo "Updated refactoredRegistry.ts with Phase 1 components"
echo ""

echo "Registry now includes:"
echo "  - user/management → UserManagement"
echo "  - user/sessions → SessionManagement" 
echo "  - user/roles → RoleManagement"
echo "  - user/menu → MenuManagement"
echo "  - user/menu-permissions → MenuPermissions"
echo ""

echo "Next steps:"
echo "1. Test build: pnpm run build"
echo "2. Test routes: navigate to /refactored/user/*"
echo "3. Verify sidebar shows new menu items"
echo ""

echo "Phase 1 registry update complete!"
