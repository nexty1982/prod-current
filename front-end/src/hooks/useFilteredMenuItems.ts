import { useMemo } from 'react';
import { useMenuVisibility } from '../contexts/MenuVisibilityContext';
import { useAuth } from '../context/AuthContext';
import { devLogDataShape, devLogMenuFilter } from '../utils/devLogger';
import Menuitems from '../layouts/full/vertical/sidebar/MenuItems';

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
    const { visibleMenus, extrasEnabled } = useMenuVisibility();
    const { user, hasRole, isSuperAdmin } = useAuth();

    const filteredMenuItems = useMemo(() => {
        // Development logging for input data
        devLogDataShape(
            Menuitems,
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
            if (title === 'Orthodox Metrics Admin' || href === '/admin/orthodox-metrics') {
                return hasRole(['super_admin']); // Only super_admin
            }

            if (title === 'AI Administration' || href === '/admin/ai') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
            }

            if (title === 'Settings' || href === '/admin/settings') {
                return hasRole(['super_admin', 'admin']); // super_admin + admin
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
                return hasRole(['super_admin', 'admin', 'priest', 'deacon', 'supervisor', 'user', 'volunteer', 'church', 'viewer']); // All roles
            }

            if (title === 'Client Management' || href.includes('/apps/client-management')) {
                return hasRole(['super_admin', 'admin']); // super_admin + admin only
            }

            if (title === 'CMS' || href.includes('/cms')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon']); // Clergy + admins
            }

            if (title === 'Table Theme Editor' || href.includes('/demos/table-tester')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon']); // Clergy + admins (content creation)
            }

            if (title === 'Records Management' || title === 'Baptism Records' || title === 'Marriage Records' || title === 'Funeral Records' || href.includes('/records/') || href.includes('-Records')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon']); // Clergy + admins (record management)
            }

            if (title === 'Site Clone' || href.includes('/site-clone')) {
                return hasRole(['super_admin', 'admin']); // super_admin + admin only
            }

            if (title === 'OCR Upload' || href.includes('/ocr') || href.includes('/upload')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon', 'supervisor', 'user', 'volunteer']); // All except church, viewer
            }

            // Charts/Dashboards (Modern, eCommerce dashboards)
            if (title.includes('Dashboard') || href.includes('/dashboard') || href.includes('/chart')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon', 'supervisor', 'user', 'church', 'viewer']); // All except volunteer
            }

            // Invoices
            if (title.includes('Invoice') || href.includes('/invoice')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon', 'supervisor', 'user', 'church']); // All except volunteer, viewer
            }

            // Export functionality (typically in reports/analytics)
            if (title.includes('Export') || href.includes('/export')) {
                return hasRole(['super_admin', 'admin', 'priest', 'supervisor']); // High-level roles only
            }

            // External links and general navigation (Calendar, Notes, etc.)
            if (title === 'Calendar' || title === 'Notes' || title === 'Contacts' || href.includes('/calendar') || href.includes('/notes') || href.includes('/contact')) {
                return hasRole(['super_admin', 'admin', 'priest', 'deacon', 'supervisor', 'user', 'volunteer', 'church', 'viewer']); // All roles
            }

            // Default: show item for basic navigation (but restrict admin-specific items)
            if (href.includes('/admin/') && !href.includes('/admin/orthodox-metrics')) {
                return hasRole(['super_admin', 'admin']); // Admin routes restricted to admins
            }

            // Default: show item (for general app navigation)
            return true;
        };

        // Dynamic badge generator based on access matrix and role hierarchy
        const getDynamicBadge = (item: any) => {
            if (!user) return null;

            const title = item.title || '';
            const href = item.href || '';

            // SaaS-specific items (super_admin only)
            if (title === 'Orthodox Metrics Admin') {
                return isSuperAdmin() ? { chip: 'SaaS', chipColor: 'success' } : null;
            }

            // Super admin exclusive items
            if (title === 'Menu Permissions') {
                return isSuperAdmin() ? { chip: 'Super', chipColor: 'error' } : null;
            }

            // Admin level items (super_admin + admin)
            if (title === 'AI Administration' || title === 'Settings' || title === 'Site Clone') {
                if (isSuperAdmin()) {
                    return { chip: 'Super', chipColor: 'error' };
                } else if (hasRole('admin')) {
                    return { chip: 'Admin', chipColor: 'warning' };
                }
                return null;
            }

            // User management items
            if (title === 'User Management' || title === 'Role Management' || title === 'Logs') {
                if (isSuperAdmin()) {
                    return { chip: 'Super', chipColor: 'error' };
                } else if (hasRole('admin')) {
                    return { chip: 'Admin', chipColor: 'warning' };
                }
                return null;
            }

            // Client management (admin only)
            if (title === 'Client Management') {
                if (isSuperAdmin()) {
                    return { chip: 'Super', chipColor: 'error' };
                } else if (hasRole('admin')) {
                    return { chip: 'Admin', chipColor: 'warning' };
                }
                return null;
            }

            // CMS items (clergy + admin)
            if (title === 'CMS') {
                if (isSuperAdmin()) {
                    return { chip: 'Super', chipColor: 'error' };
                } else if (hasRole('admin')) {
                    return { chip: 'Admin', chipColor: 'warning' };
                } else if (hasRole(['priest', 'deacon'])) {
                    return { chip: 'Clergy', chipColor: 'primary' };
                }
                return null;
            }

            // Table Theme Editor (content creation tools)
            if (title === 'Table Theme Editor') {
                if (isSuperAdmin()) {
                    return { chip: 'Super', chipColor: 'error' };
                } else if (hasRole('admin')) {
                    return { chip: 'Admin', chipColor: 'warning' };
                } else if (hasRole(['priest', 'deacon'])) {
                    return { chip: 'Design', chipColor: 'secondary' };
                }
                return null;
            }

            // OCR items (most roles except church/viewer)
            if (title === 'OCR Upload' && hasRole(['volunteer', 'user', 'supervisor'])) {
                return { chip: 'OCR', chipColor: 'info' };
            }

            // Export functionality
            if (title.includes('Export') && hasRole(['supervisor'])) {
                return { chip: 'Export', chipColor: 'secondary' };
            }

            // Return original badge if no role-specific logic applies
            return item.chip ? { chip: item.chip, chipColor: item.chipColor } : null;
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
            const result: any[] = [];
            
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                
                // Handle navigation labels (subheaders)
                if (item.navlabel || item.subheader) {
                    // Check if this section is an "extras" section
                    if (!extrasEnabled && isExtrasItem(item)) {
                        // Skip the entire section if extras are disabled
                        // Fast-forward past all items in this section
                        let j = i + 1;
                        while (j < items.length && !items[j].navlabel && !items[j].subheader) {
                            j++;
                        }
                        i = j - 1; // Will be incremented by the for loop
                        continue;
                    }

                    // Look ahead to see if any items in this section will be visible
                    let hasVisibleChildren = false;
                    let j = i + 1;
                    
                    // Check subsequent items until we hit another navlabel or end of array
                    while (j < items.length && !items[j].navlabel && !items[j].subheader) {
                        const nextItem = items[j];
                        
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

        const originalItems = Menuitems;
        const filteredItems = filterItems(originalItems);
        
        // Development logging for filtering results
        devLogMenuFilter(originalItems, filteredItems, 'Complete Menu');
        
        return filteredItems;
    }, [visibleMenus, extrasEnabled, user, hasRole, isSuperAdmin]);

    return filteredMenuItems;
};
