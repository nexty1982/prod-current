import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMenuVisibility } from '../contexts/MenuVisibilityContext';
import { useDynamicMenuPermissions } from './useDynamicMenuPermissions';
import createSSPPOCMenuItems from '../layouts/full/vertical/sidebar/SSPPOCMenuItems';
import { devLogDataShape, devLogMenuFilter } from '../utils/devLogger';
import Menuitems from '../layouts/full/vertical/sidebar/MenuItems';
import { ensureArray } from '../utils/arrayUtils';
import { uniqueId } from 'lodash';
import { useAddonsRegistry } from '../components/registry/ComponentRegistry';
import { componentsAPI, type Component } from '../api/components.api';
import {
    IconWriting,
    IconUserPlus,
    IconMessage,
    IconBell,
    IconUsers,
    IconApps,
    IconMap
} from '@tabler/icons-react';

// Map menu items to their corresponding component names for status checking
// These should match the component names exactly as they appear in the component manifest
const menuComponentMap: { [title: string]: string } = {
    'Site Clone': 'Site Clone',
    'CMS (Legacy)': 'CMS (Legacy)',
    'Church Management': 'Church Management', 
    'Client Management': 'Client Management',
    'Records Management': 'Records Management',
    'OCR Upload': 'OCR Upload',
    'Notes': 'Notes',
    'Calendar': 'Calendar',
    'Kanban': 'Kanban',
    'Big Book': 'Big Book',
    'Contacts': 'Contacts',
    'Blog': 'Blog',
    'Ecommerce': 'Ecommerce',
    'Chats': 'Chats',
    'Email': 'Email',
    'Invoice': 'Invoice',
    'Tickets': 'Tickets'
};

// Map menu items to their visibility IDs
const menuIdMap: { [title: string]: string } = {
    'Modern': 'dashboard-modern',
    'eCommerce': 'dashboard-ecommerce',
    'Frontend pages': 'frontend-pages',
    'Contacts': 'app-contacts',
    'Blog': 'app-blog',
    'Ecommerce': 'app-ecommerce',
    'Chats': 'app-chats',
    'Church Management': 'admin-church-management',
    'Client Management': 'admin-client-management',
    'Notes': 'app-notes',
    'Calendar': 'app-calendar',
    'Email': 'app-email',
    'Tickets': 'app-tickets',
    'Kanban': 'app-kanban',
    'Invoice': 'app-invoice',
    'Pricing': 'settings-pricing',
    'Account Setting': 'settings-account-setting',
    'FAQ': 'settings-faq',
    'Landingpage': 'settings-landingpage',
    'Widgets': 'page-widgets',
    'Form Elements': 'form-elements',
    'Form Layout': 'form-layout',
    'Form Horizontal': 'form-horizontal',
    'Form Vertical': 'form-vertical',
    'Form Custom': 'form-custom',
    'Form Wizard': 'form-wizard',
    'Form Validation': 'form-validation',
    'Tiptap Editor': 'form-tiptap-editor',
    'Basic': 'table-basic',
    'Collapsible': 'table-collapsible',
    'Enhanced': 'table-enhanced',
    'Fixed Header': 'table-fixed-header',
    'Pagination': 'table-pagination',
    'Search': 'table-search',
    'React Table': 'table-react-table',
    'BarCharts': 'chart-bar',
    'LineCharts': 'chart-line',
    'PieCharts': 'chart-pie',
    'ScatterCharts': 'chart-scatter',
    'SparklineCharts': 'chart-sparkline',
    'GaugeCharts': 'chart-gauge',
    'SimpleTreeView': 'tree-view-simple',
    'Ui Components': 'ui-components',
    'Menu Settings': 'settings-menu',
    'User Management': 'admin-users',
    'Role Management': 'admin-roles',
    'Settings': 'admin-settings',
    'Orthodox Metrics Admin': 'admin-orthodox-metrics',
    'AI Administration': 'admin-ai',
    'OCR Upload': 'app-ocr-upload',
    'Site Clone': 'admin-site-clone',
    'Table Theme Editor': 'content-table-theme-editor',
    'Records Management': 'church-records-management',
    'Baptism Records': 'church-baptism-records',
    'Marriage Records': 'church-marriage-records',
    'Funeral Records': 'church-funeral-records',
    'Server Logs': 'settings-logs',
    'Logs': 'admin-logs',
};

export const useFilteredMenuItems = () => {
    const { user, hasRole, isSuperAdmin } = useAuth();
    const { visibleMenus, extrasEnabled } = useMenuVisibility();
    const { 
        hasSocialAccess, 
        isSocialEnabled, 
        getSocialMenuPermissions, 
        useStaticPermissions 
    } = useDynamicMenuPermissions();
    const { registry: addonsRegistry, loading: addonsLoading } = useAddonsRegistry();

    // Component status state for menu filtering
    const [componentStatus, setComponentStatus] = useState<{ [componentName: string]: boolean }>({});
    const [componentsLoading, setComponentsLoading] = useState(true);

    // Fetch component status for menu filtering
    useEffect(() => {
        const fetchComponentStatus = async () => {
            try {
                if (!hasRole(['admin', 'super_admin'])) {
                    // Non-admin users don't need component status checking
                    setComponentsLoading(false);
                    return;
                }

                const response = await componentsAPI.getAll({ limit: 1000 }); // Get all components
                const statusMap: { [componentName: string]: boolean } = {};
                
                response.components.forEach((component: Component) => {
                    // Map component IDs to their enabled status
                    statusMap[component.name] = component.enabled;
                });
                
                setComponentStatus(statusMap);
            } catch (error) {
                console.warn('Failed to fetch component status for menu filtering:', error);
                // On error, assume all components are enabled to avoid hiding menus unnecessarily
                setComponentStatus({});
            } finally {
                setComponentsLoading(false);
            }
        };

        fetchComponentStatus();
    }, [hasRole]);

    // Helper function to check if a menu item's component is enabled
    const isComponentEnabled = (menuTitle: string): boolean => {
        const componentName = menuComponentMap[menuTitle];
        if (!componentName) {
            // If not mapped, assume enabled
            return true;
        }
        
        // For components that are mapped, check their status
        // Default to enabled if status is unknown
        return componentStatus[componentName] !== false;
    };

    const filteredMenuItems = useMemo(() => {
        // Ensure Menuitems is always an array
        const safeMenuItems = ensureArray(Menuitems, []);
        
        // Development logging for input data
        devLogDataShape(
            safeMenuItems,
            'Original Menu Items',
            {
                expectedType: 'array',
                componentName: 'useFilteredMenuItems',
                operation: 'menu filtering',
                required: true
            }
        );
        // Role-based visibility checker based on Orthodox Metrics Access Matrix
        const isVisibleForRole = (item: any): boolean => {
            if (!user) return false;

            const title = item.title || '';
            const href = item.href || '';

            // Role-based menu item filtering per access matrix
            if (title === 'Orthodox Metrics' || href === '/admin/orthodox-metrics') {
                return hasRole(['super_admin']); // Only super_admin
            }

            if (title === 'AI Administration' || href === '/admin/ai') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'Settings' || href === '/admin/settings') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'User & Access Management' || href === '/admin/users') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin only
            }

            if (title === 'Logs' || href === '/admin/logs') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin only
            }

            if (title === 'Menu Permissions' || href === '/admin/menu-permissions') {
                return hasRole(['super_admin']); // Only super_admin
            }

            if (title === 'User Management' || href === '/admin/users') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'Role Management' || href === '/admin/roles') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'Logs' || href.includes('/logs')) {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'Church Management' || href.includes('/apps/church-management')) {
                return hasRole(['super_admin', 'admin', 'manager']) && isComponentEnabled('Church Management'); // Admin roles only + component enabled
            }

            if (title === 'Client Management' || href.includes('/apps/client-management')) {
                return hasRole(['super_admin', 'admin']) && isComponentEnabled('Client Management'); // super_admin + admin only + component enabled
            }

            if (title === 'CMS' || href.includes('/cms')) {
                return hasRole(['super_admin', 'admin']) && isComponentEnabled('CMS (Legacy)'); // Admin only + component enabled
            }

            if (title === 'Table Theme Editor' || href.includes('/demos/table-tester')) {
                return hasRole(['super_admin', 'admin']); // Admin only
            }

            if (title === 'Records Management' || title === 'Baptism Records' || title === 'Marriage Records' || title === 'Funeral Records' || href.includes('/records/') || href.includes('-Records')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user']) && isComponentEnabled('Records Management'); // All authenticated users can access records + component enabled
            }

            if (title === 'Site Clone' || href.includes('/site-clone')) {
                return hasRole(['super_admin', 'admin']) && isComponentEnabled('Site Clone'); // Admin only + component enabled
            }

            if (title === 'Template Manager' || href.includes('/template-manager')) {
                return hasRole(['super_admin', 'admin']); // Admin only
            }

            if (title === 'OCR Upload' || href.includes('/ocr') || href.includes('/upload')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user']) && isComponentEnabled('OCR Upload'); // All authenticated users can access OCR + component enabled
            }

            // Charts/Dashboards (Modern, eCommerce dashboards)
            if (title.includes('Dashboard') || href.includes('/dashboard') || href.includes('/chart')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user', 'viewer']); // All roles
            }

            // Invoices
            if (title.includes('Invoice') || href.includes('/invoice')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user']) && isComponentEnabled('Invoice'); // All except viewer + component enabled
            }

            // Export functionality (typically in reports/analytics)
            if (title.includes('Export') || href.includes('/export')) {
                return hasRole(['super_admin', 'admin', 'manager']); // High-level roles only
            }

            // External links and general navigation (Calendar, Notes, etc.)
            if (title === 'Calendar' || href.includes('/calendar')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user', 'viewer']) && isComponentEnabled('Calendar'); // All roles + component enabled
            }
            
            if (title === 'Notes' || href.includes('/notes')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user', 'viewer']) && isComponentEnabled('Notes'); // All roles + component enabled
            }
            
            if (title === 'Contacts' || href.includes('/contact')) {
                return hasRole(['super_admin', 'admin', 'manager', 'user', 'viewer']) && isComponentEnabled('Contacts'); // All roles + component enabled
            }

            // Default: show item for basic navigation (but restrict admin-specific items)
            if (href.includes('/admin/') && !href.includes('/admin/orthodox-metrics')) {
                return hasRole(['super_admin', 'admin']); // Admin routes restricted to admins
            }

            // Check if this menu item has a corresponding component that might be disabled
            if (menuComponentMap[title]) {
                return isComponentEnabled(title);
            }

            // Default: show item (for general app navigation)
            return true;
        };

        // Dynamic badge generator based on access matrix and role hierarchy
        const getDynamicBadge = (item: any) => {
            // Chips/badges have been disabled - return null for all items
            return null;
        };
        
        // Define what constitutes "extras" - development/demo components
        const isExtrasItem = (item: any): boolean => {
            if (!item.title && !item.href && !item.subheader) return false;
            
            const title = item.title || '';
            const href = item.href || '';
            const subheader = item.subheader || '';
            
            // Check for extras categories
            return (
                // Chart related
                title.includes('Chart') || 
                href.includes('/muicharts/') ||
                href.includes('/charts/') ||
                subheader.includes('Charts') ||
                
                // UI Components and demos
                title.includes('Components') ||
                subheader.includes('Components') ||
                
                // Forms demos
                subheader === 'Forms' ||
                title.includes('Form') ||
                href.includes('/forms/') ||
                
                // Tables demos
                subheader === 'Tables' ||
                title.includes('Table') ||
                href.includes('/tables/') ||
                
                // Tree demos
                subheader.includes('Trees') ||
                title.includes('Tree') ||
                
                // Auth pages
                subheader === 'Auth' ||
                href.includes('/auth/') ||
                
                // Widget demos
                title.includes('Widget') ||
                href.includes('/widgets/') ||
                
                // Others/Miscellaneous items
                subheader === 'Others' ||
                subheader === 'Other' ||
                subheader === 'Miscellaneous' ||
                title.includes('Sample') ||
                title.includes('Demo') ||
                title.includes('Example') ||
                title.includes('Test')
            );
        };

        const filterItems = (items: any[]): any[] => {
            // Ensure items is always an array
            const safeItems = ensureArray(items, []);
            const result: any[] = [];
            
            for (let i = 0; i < safeItems.length; i++) {
                const item = safeItems[i];
                
                // Handle navigation labels (subheaders)
                if (item.navlabel || item.subheader) {
                    // Check if this section is an "extras" section
                    if (!extrasEnabled && isExtrasItem(item)) {
                        // Skip the entire section if extras are disabled
                        // Fast-forward past all items in this section
                        let j = i + 1;
                        while (j < safeItems.length && !safeItems[j].navlabel && !safeItems[j].subheader) {
                            j++;
                        }
                        i = j - 1; // Will be incremented by the for loop
                        continue;
                    }

                    // Look ahead to see if any items in this section will be visible
                    let hasVisibleChildren = false;
                    let j = i + 1;
                    
                    // Check subsequent items until we hit another navlabel or end of array
                    while (j < safeItems.length && !safeItems[j].navlabel && !safeItems[j].subheader) {
                        const nextItem = safeItems[j];
                        
                        // Skip if this item is an extras item and extras are disabled
                        if (!extrasEnabled && isExtrasItem(nextItem)) {
                            j++;
                            continue;
                        }
                        
                        // Check role-based visibility first
                        if (!isVisibleForRole(nextItem)) {
                            j++;
                            continue;
                        }
                        
                        const menuId = menuIdMap[nextItem.title];
                        
                        // For items not explicitly mapped, check if they're in categories we want to hide
                        let isVisible = true;
                        if (menuId) {
                            isVisible = visibleMenus[menuId];
                        } else {
                            // Default behavior for unmapped items - be more restrictive for chart-related items
                            if (nextItem.title && (
                                nextItem.title.includes('Chart') || 
                                nextItem.href?.includes('/muicharts/') ||
                                nextItem.href?.includes('/charts/')
                            )) {
                                // For chart items, use a general chart visibility setting
                                isVisible = visibleMenus['chart-bar'] || visibleMenus['chart-line'] || visibleMenus['chart-pie'] || false;
                            }
                        }
                        
                        if (isVisible) {
                            // If it has children, check if any children are visible
                            if (nextItem.children) {
                                const filteredChildren = filterItems(nextItem.children);
                                if (filteredChildren.length > 0) {
                                    hasVisibleChildren = true;
                                    break;
                                }
                            } else {
                                hasVisibleChildren = true;
                                break;
                            }
                        }
                        j++;
                    }
                    
                    // Only include the navlabel if there are visible children
                    if (hasVisibleChildren) {
                        result.push(item);
                    }
                    continue;
                }

                // Skip if this item is an extras item and extras are disabled
                if (!extrasEnabled && isExtrasItem(item)) {
                    continue;
                }

                // Check role-based visibility first
                if (!isVisibleForRole(item)) {
                    continue;
                }

                // Check if this item should be visible
                const menuId = menuIdMap[item.title];
        
        // For items not explicitly mapped, check if they're in categories we want to hide
        let isVisible = true;
        if (menuId) {
            isVisible = visibleMenus[menuId];
        } else {
                    // Default behavior for unmapped items - be more restrictive for chart-related items
                    if (item.title && (
                        item.title.includes('Chart') || 
                        item.href?.includes('/muicharts/') ||
                        item.href?.includes('/charts/')
                    )) {
                        // For chart items, use a general chart visibility setting
                        isVisible = visibleMenus['chart-bar'] || visibleMenus['chart-line'] || visibleMenus['chart-pie'] || false;
                    }
                }

                if (!isVisible) {
                    continue;
                }

                // If item has children, filter them recursively
                if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    // Only include parent if it has visible children
                    if (filteredChildren.length > 0) {
                        const dynamicBadge = getDynamicBadge(item);
                        result.push({
                            ...item,
                            ...(dynamicBadge || {}),
                            children: filteredChildren
                        });
                    }
                } else {
                    const dynamicBadge = getDynamicBadge(item);
                    result.push({
                        ...item,
                        ...(dynamicBadge || {})
                    });
                }
            }
            
            return result;
        };

        const originalItems = safeMenuItems;
        
        // Check if user is from @ssppoc.org domain
        const isSSPPOCUser = user?.email?.endsWith('@ssppoc.org');
        
        if (isSSPPOCUser) {
            // Return SSPPOC-specific menu items
            const churchId = user?.church_id?.toString() || '1'; // Default to 1 if no church_id
            const ssppocMenuItems = createSSPPOCMenuItems(churchId);
            
            // Development logging
            devLogMenuFilter(originalItems, ssppocMenuItems, 'SSPPOC Menu');
            
            return ssppocMenuItems;
        }
        
        const filteredItems = filterItems(originalItems);
        
        // Development logging for filtering results
        devLogMenuFilter(originalItems, filteredItems, 'Complete Menu');
        
        // 🗺️ Add dynamic addon menu items if any are installed
        if (addonsRegistry && !addonsLoading && Object.keys(addonsRegistry.addons || {}).length > 0) {
            console.log('🗺️ Adding dynamic addon menu items to navigation');
            
            // Check if addons menu section already exists
            const hasAddonsSection = filteredItems.some((item: any) => 
                item.subheader && (item.subheader.includes('Components') || item.subheader.includes('🧩'))
            );
            
            if (!hasAddonsSection) {
                // Create addon menu items from registry
                const addonMenuItems = [
                    {
                        navlabel: true,
                        subheader: '🧩 Components',
                    }
                ];
                
                // Add each installed addon to the menu
                Object.values(addonsRegistry.addons || {}).forEach((addon: any) => {
                    if (addon.showInMenu && addon.route && addon.displayName) {
                        // Choose appropriate icon based on addon type
                        let addonIcon = IconApps; // Default icon
                        if (addon.displayName.toLowerCase().includes('map')) {
                            addonIcon = IconMap;
                        }
                        
                        addonMenuItems.push({
                            id: uniqueId(),
                            title: addon.displayName,
                            icon: addonIcon,
                            href: addon.route,
                        });
                    }
                });
                
                // Only add the section if there are actual addon items
                if (addonMenuItems.length > 1) { // More than just the subheader
                    // Insert addon items at the end of the menu
                    filteredItems.push(...addonMenuItems);
                    console.log(`🗺️ Added ${addonMenuItems.length - 1} addon menu items`);
                }
            } else {
                console.log('🗺️ Addons menu section already exists in static menu');
            }
        }

        // 📱 Add dynamic social menu items if enabled
        if (isSocialEnabled() && !useStaticPermissions) {
            console.log('📱 Adding dynamic social menu items to navigation');
            
            // Check if social menu section already exists
            const hasSocialSection = filteredItems.some((item: any) => 
                item.subheader && (item.subheader.includes('Social') || item.subheader.includes('💬'))
            );
            
            if (!hasSocialSection) {
                // Add social navigation section
                const socialMenuItems = [
                    {
                        navlabel: true,
                        subheader: '💬 Social Experience',
                    },
                    {
                        id: uniqueId(),
                        title: 'Blog',
                        icon: IconWriting,
                        href: '/social/blog',
                    },
                    {
                        id: uniqueId(),
                        title: 'Friends',
                        icon: IconUserPlus,
                        href: '/social/friends',
                    },
                    {
                        id: uniqueId(),
                        title: 'Chat',
                        icon: IconMessage,
                        href: '/social/chat',
                    },
                    {
                        id: uniqueId(),
                        title: 'Notifications',
                        icon: IconBell,
                        href: '/social/notifications',
                    }
                ];
                
                // Insert social items after system administration section
                const insertIndex = filteredItems.findIndex((item: any, index) => 
                    index > 0 && item.subheader && !item.subheader.includes('Administration')
                );
                
                if (insertIndex > 0) {
                    filteredItems.splice(insertIndex, 0, ...socialMenuItems);
                } else {
                    // If no good insertion point, add to beginning
                    filteredItems.unshift(...socialMenuItems);
                }
                
                console.log(`📱 Added ${socialMenuItems.length} social menu items`);
            } else {
                console.log('📱 Social menu section already exists in static menu');
            }
        }
        
        return filteredItems;
    }, [visibleMenus, extrasEnabled, user, hasRole, isSuperAdmin, hasSocialAccess, isSocialEnabled, useStaticPermissions, addonsRegistry, addonsLoading, componentStatus, componentsLoading]);

    return filteredMenuItems;
};
