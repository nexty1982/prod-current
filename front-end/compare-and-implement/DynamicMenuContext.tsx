/**
 * Dynamic Menu Context for Orthodox Metrics
 * Manages menu items based on user roles and backend permissions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import MenuService, { MenuItem } from '@/shared/lib/menuService';

interface DynamicMenuContextType {
    menuItems: MenuItem[];
    loading: boolean;
    error: string | null;
    refreshMenuItems: () => Promise<void>;
    hasMenuItem: (menuKey: string) => boolean;
}

const DynamicMenuContext = createContext<DynamicMenuContextType | undefined>(undefined);

interface DynamicMenuProviderProps {
    children: ReactNode;
}

export const DynamicMenuProvider: React.FC<DynamicMenuProviderProps> = ({ children }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user, authenticated } = useAuth();

    // Comprehensive fallback menu structure with all features components
    const getFallbackMenuItems = (): MenuItem[] => {
        return [
            // Dashboard Section
            {
                id: 1,
                menu_key: 'dashboard',
                title: 'Dashboard',
                path: '/dashboard',
                icon: 'IconDashboard',
                parent_id: null,
                display_order: 1,
                description: 'Main dashboard overview'
            },

            // Records Management Section
            {
                id: 100,
                menu_key: 'records_section',
                title: 'Records Management',
                path: '',
                icon: 'IconFiles',
                parent_id: null,
                display_order: 100,
                description: 'Church records and data management',
                children: [
                    {
                        id: 101,
                        menu_key: 'baptism_records',
                        title: 'Baptism Records',
                        path: '/features/records-centralized/components/baptism/BaptismRecordsPage',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 1
                    },
                    {
                        id: 102,
                        menu_key: 'baptism_records_1',
                        title: 'Baptism Records Component',
                        path: '/features/records-centralized/components/baptism/BaptismRecordsComponent',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 2
                    },
                    {
                        id: 103,
                        menu_key: 'baptism_viewer',
                        title: 'Baptism Record Viewer',
                        path: '/features/records-centralized/components/baptism/BaptismRecordViewerMagnifier',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 3
                    },
                    {
                        id: 104,
                        menu_key: 'marriage_records',
                        title: 'Marriage Records',
                        path: '/features/records-centralized/components/marriage/MarriageRecords',
                        icon: 'IconHeart',
                        parent_id: 100,
                        display_order: 4
                    },
                    {
                        id: 105,
                        menu_key: 'death_records',
                        title: 'Death Records',
                        path: '/features/records-centralized/components/death',
                        icon: 'IconCross',
                        parent_id: 100,
                        display_order: 5
                    },
                    {
                        id: 106,
                        menu_key: 'confirmation_records',
                        title: 'Confirmation Records',
                        path: '/features/records-centralized/components/confirmation',
                        icon: 'IconCertificate',
                        parent_id: 100,
                        display_order: 6
                    },
                    {
                        id: 107,
                        menu_key: 'communion_records',
                        title: 'Communion Records',
                        path: '/features/records-centralized/components/communion',
                        icon: 'IconCertificate',
                        parent_id: 100,
                        display_order: 7
                    },
                    {
                        id: 108,
                        menu_key: 'census_records',
                        title: 'Census Records',
                        path: '/features/records-centralized/components/census',
                        icon: 'IconUsers',
                        parent_id: 100,
                        display_order: 8
                    },
                    {
                        id: 109,
                        menu_key: 'members_records',
                        title: 'Members Records',
                        path: '/features/records-centralized/components/members',
                        icon: 'IconUsers',
                        parent_id: 100,
                        display_order: 9
                    },
                    {
                        id: 110,
                        menu_key: 'entries_records',
                        title: 'Entries Records',
                        path: '/features/records-centralized/components/entries',
                        icon: 'IconFileDescription',
                        parent_id: 100,
                        display_order: 10
                    }
                ]
            },

            // Tables & Grids Section
            {
                id: 200,
                menu_key: 'tables_section',
                title: 'Tables & Data Grids',
                path: '',
                icon: 'IconBorderAll',
                parent_id: null,
                display_order: 200,
                description: 'Data tables and grid components',
                children: [
                    {
                        id: 201,
                        menu_key: 'aggrid_viewonly',
                        title: 'AG Grid View Only',
                        path: '/features/tables/AGGridViewOnly/AGGridViewOnly',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 1
                    },
                    {
                        id: 202,
                        menu_key: 'basic_table',
                        title: 'Basic Table',
                        path: '/features/tables/BasicTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 2
                    },
                    {
                        id: 203,
                        menu_key: 'collapsible_table',
                        title: 'Collapsible Table',
                        path: '/features/tables/CollapsibleTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 3
                    },
                    {
                        id: 204,
                        menu_key: 'enhance_table',
                        title: 'Enhanced Table',
                        path: '/features/tables/EnhanceTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 4
                    },
                    {
                        id: 205,
                        menu_key: 'fixed_header_table',
                        title: 'Fixed Header Table',
                        path: '/features/tables/FixedHeaderTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 5
                    },
                    {
                        id: 206,
                        menu_key: 'pagination_table',
                        title: 'Pagination Table',
                        path: '/features/tables/PaginationTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 6
                    },
                    {
                        id: 207,
                        menu_key: 'search_table',
                        title: 'Search Table',
                        path: '/features/tables/SearchTable',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 7
                    },
                    {
                        id: 208,
                        menu_key: 'advanced_grid_dialog',
                        title: 'Advanced Grid Dialog',
                        path: '/features/tables/AdvancedGridDialog',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 8
                    },
                    {
                        id: 209,
                        menu_key: 'table_control_panel',
                        title: 'Table Control Panel',
                        path: '/features/tables/TableControlPanel',
                        icon: 'IconBorderAll',
                        parent_id: 200,
                        display_order: 9
                    }
                ]
            },

            // Forms Section
            {
                id: 300,
                menu_key: 'forms_section',
                title: 'Forms & Inputs',
                path: '',
                icon: 'IconFileDescription',
                parent_id: null,
                display_order: 300,
                description: 'Form components and builders',
                children: [
                    {
                        id: 301,
                        menu_key: 'form_builder',
                        title: 'Form Builder',
                        path: '/features/records-centralized/components/forms/FormBuilder',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 1
                    },
                    {
                        id: 302,
                        menu_key: 'form_validation',
                        title: 'Form Validation',
                        path: '/features/records-centralized/components/forms/FormValidation',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 2
                    },
                    {
                        id: 303,
                        menu_key: 'dynamic_record_form',
                        title: 'Dynamic Record Form',
                        path: '/features/records-centralized/components/forms/DynamicRecordForm',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 3
                    },
                    {
                        id: 304,
                        menu_key: 'enhanced_dynamic_form',
                        title: 'Enhanced Dynamic Form',
                        path: '/features/records-centralized/components/forms/EnhancedDynamicForm',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 4
                    },
                    {
                        id: 305,
                        menu_key: 'church_form',
                        title: 'Church Form',
                        path: '/features/church/apps/church-management/ChurchForm',
                        icon: 'IconBuildingChurch',
                        parent_id: 300,
                        display_order: 5
                    },
                    {
                        id: 306,
                        menu_key: 'form_layouts',
                        title: 'Form Layouts',
                        path: '/features/records-centralized/components/forms/FormLayouts',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 6
                    },
                    {
                        id: 307,
                        menu_key: 'form_dialog',
                        title: 'Form Dialog',
                        path: '/features/records-centralized/components/forms/FormDialog',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 7
                    }
                ]
            },

            // Admin Tools Section
            {
                id: 400,
                menu_key: 'admin_section',
                title: 'Admin Tools',
                path: '',
                icon: 'IconSettings',
                parent_id: null,
                display_order: 400,
                description: 'Administrative tools and management',
                children: [
                    {
                        id: 401,
                        menu_key: 'component_manager',
                        title: 'Component Manager',
                        path: '/features/admin/admin/components/ComponentManager',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 1
                    },
                    {
                        id: 402,
                        menu_key: 'tsx_component_wizard',
                        title: 'TSX Component Wizard',
                        path: '/features/admin/admin/TSXComponentInstallWizard',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 2
                    },
                    {
                        id: 403,
                        menu_key: 'component_discovery',
                        title: 'Component Discovery',
                        path: '/features/admin/admin/ComponentDiscoveryPanel',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 3
                    },
                    {
                        id: 404,
                        menu_key: 'bigbook_viewer',
                        title: 'BigBook Component Viewer',
                        path: '/features/admin/admin/BigBookCustomComponentViewer',
                        icon: 'IconBooks',
                        parent_id: 400,
                        display_order: 4
                    },
                    {
                        id: 405,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: '/features/devel-tools/RouterMenuStudio',
                        icon: 'IconMenu',
                        parent_id: 400,
                        display_order: 5
                    }
                ]
            },

            // Security Section
            {
                id: 500,
                menu_key: 'security_section',
                title: 'Security & Access',
                path: '',
                icon: 'IconShield',
                parent_id: null,
                display_order: 500,
                description: 'Security and access control',
                children: [
                    {
                        id: 501,
                        menu_key: 'security_tab',
                        title: 'Security Settings',
                        path: '/features/security/apps/account-settings/SecurityTab',
                        icon: 'IconShield',
                        parent_id: 500,
                        display_order: 1
                    },
                    {
                        id: 502,
                        menu_key: 'permission_debugger',
                        title: 'Permission Debugger',
                        path: '/features/security/debug/PermissionDebugger',
                        icon: 'IconShield',
                        parent_id: 500,
                        display_order: 2
                    },
                    {
                        id: 503,
                        menu_key: 'jit_terminal_access',
                        title: 'JIT Terminal Access',
                        path: '/features/security/settings/JITTerminalAccess',
                        icon: 'IconShield',
                        parent_id: 500,
                        display_order: 3
                    },
                    {
                        id: 504,
                        menu_key: 'social_permissions',
                        title: 'Social Permissions',
                        path: '/features/security/SocialPermissionsToggle',
                        icon: 'IconShield',
                        parent_id: 500,
                        display_order: 4
                    }
                ]
            },

            // System Logs Section
            {
                id: 600,
                menu_key: 'logs_section',
                title: 'System Logs',
                path: '',
                icon: 'IconFileText',
                parent_id: null,
                display_order: 600,
                description: 'System monitoring and logs',
                children: [
                    {
                        id: 601,
                        menu_key: 'system_logs',
                        title: 'System Logs',
                        path: '/features/system/apps/logs/Logs',
                        icon: 'IconFileText',
                        parent_id: 600,
                        display_order: 1
                    },
                    {
                        id: 602,
                        menu_key: 'realtime_console',
                        title: 'Real-time Console',
                        path: '/features/system/logs/RealTimeConsole',
                        icon: 'IconFileText',
                        parent_id: 600,
                        display_order: 2
                    },
                    {
                        id: 603,
                        menu_key: 'critical_events',
                        title: 'Critical Events',
                        path: '/features/system/logs/CriticalEvents',
                        icon: 'IconFileText',
                        parent_id: 600,
                        display_order: 3
                    },
                    {
                        id: 604,
                        menu_key: 'notification_system',
                        title: 'Notification System',
                        path: '/features/system/logs/NotificationSystem',
                        icon: 'IconFileText',
                        parent_id: 600,
                        display_order: 4
                    }
                ]
            }
        ];
    };

    const loadMenuItems = async () => {
        if (!authenticated || !user) {
            setMenuItems([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Try to load from backend first
            const items = await MenuService.getCurrentUserMenuItems();
            setMenuItems(items);
        } catch (err: any) {
            console.error('Error loading menu items from backend, using fallback:', err);
            // Use comprehensive fallback menu if backend fails
            setMenuItems(getFallbackMenuItems());
            setError(null); // Don't show error when using fallback
        } finally {
            setLoading(false);
        }
    };

    const refreshMenuItems = async () => {
        await loadMenuItems();
    };

    const hasMenuItem = (menuKey: string): boolean => {
        const checkMenuItem = (items: MenuItem[]): boolean => {
            for (const item of items) {
                if (item.menu_key === menuKey) {
                    return true;
                }
                if (item.children && checkMenuItem(item.children)) {
                    return true;
                }
            }
            return false;
        };

        return checkMenuItem(menuItems);
    };

    // Load menu items when user authentication changes
    useEffect(() => {
        loadMenuItems();
    }, [authenticated, user?.id, user?.role]);

    const contextValue: DynamicMenuContextType = {
        menuItems,
        loading,
        error,
        refreshMenuItems,
        hasMenuItem,
    };

    return (
        <DynamicMenuContext.Provider value={contextValue}>
            {children}
        </DynamicMenuContext.Provider>
    );
};

export const useDynamicMenu = (): DynamicMenuContextType => {
    const context = useContext(DynamicMenuContext);
    if (!context) {
        throw new Error('useDynamicMenu must be used within a DynamicMenuProvider');
    }
    return context;
};

export default DynamicMenuProvider;
