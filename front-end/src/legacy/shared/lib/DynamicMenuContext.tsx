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
                        path: '/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordsPage',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 1
                    },
                    {
                        id: 102,
                        menu_key: 'baptism_records_1',
                        title: 'Baptism Records Component',
                        path: '/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordsComponent',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 2
                    },
                    {
                        id: 103,
                        menu_key: 'baptism_viewer',
                        title: 'Baptism Record Viewer',
                        path: '/features/records-centralized/shared/ui/legacy/baptism/BaptismRecordViewerMagnifier',
                        icon: 'IconDroplet',
                        parent_id: 100,
                        display_order: 3
                    },
                    {
                        id: 104,
                        menu_key: 'marriage_records',
                        title: 'Marriage Records',
                        path: '/features/records-centralized/shared/ui/legacy/marriage/MarriageRecords',
                        icon: 'IconHeart',
                        parent_id: 100,
                        display_order: 4
                    },
                    {
                        id: 105,
                        menu_key: 'death_records',
                        title: 'Death Records',
                        path: '/features/records-centralized/shared/ui/legacy/death',
                        icon: 'IconCross',
                        parent_id: 100,
                        display_order: 5
                    },
                    {
                        id: 106,
                        menu_key: 'confirmation_records',
                        title: 'Confirmation Records',
                        path: '/features/records-centralized/shared/ui/legacy/confirmation',
                        icon: 'IconCertificate',
                        parent_id: 100,
                        display_order: 6
                    },
                    {
                        id: 107,
                        menu_key: 'communion_records',
                        title: 'Communion Records',
                        path: '/features/records-centralized/shared/ui/legacy/communion',
                        icon: 'IconCertificate',
                        parent_id: 100,
                        display_order: 7
                    },
                    {
                        id: 108,
                        menu_key: 'census_records',
                        title: 'Census Records',
                        path: '/features/records-centralized/shared/ui/legacy/census',
                        icon: 'IconUsers',
                        parent_id: 100,
                        display_order: 8
                    },
                    {
                        id: 109,
                        menu_key: 'members_records',
                        title: 'Members Records',
                        path: '/features/records-centralized/shared/ui/legacy/members',
                        icon: 'IconUsers',
                        parent_id: 100,
                        display_order: 9
                    },
                    {
                        id: 110,
                        menu_key: 'entries_records',
                        title: 'Entries Records',
                        path: '/features/records-centralized/shared/ui/legacy/entries',
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
                        path: '/features/records-centralized/shared/ui/legacy/forms/FormBuilder',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 1
                    },
                    {
                        id: 302,
                        menu_key: 'form_validation',
                        title: 'Form Validation',
                        path: '/features/records-centralized/shared/ui/legacy/forms/FormValidation',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 2
                    },
                    {
                        id: 303,
                        menu_key: 'dynamic_record_form',
                        title: 'Dynamic Record Form',
                        path: '/features/records-centralized/shared/ui/legacy/forms/DynamicRecordForm',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 3
                    },
                    {
                        id: 304,
                        menu_key: 'enhanced_dynamic_form',
                        title: 'Enhanced Dynamic Form',
                        path: '/features/records-centralized/shared/ui/legacy/forms/EnhancedDynamicForm',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 4
                    },
                    {
                        id: 305,
                        menu_key: 'church_form',
                        title: 'Church Form',
                        path: '/features/records-centralized/shared/ui/legacy/forms/ChurchForm',
                        icon: 'IconBuildingChurch',
                        parent_id: 300,
                        display_order: 5
                    },
                    {
                        id: 306,
                        menu_key: 'form_layouts',
                        title: 'Form Layouts',
                        path: '/features/records-centralized/shared/ui/legacy/forms/FormLayouts',
                        icon: 'IconFileDescription',
                        parent_id: 300,
                        display_order: 6
                    },
                    {
                        id: 307,
                        menu_key: 'form_dialog',
                        title: 'Form Dialog',
                        path: '/features/records-centralized/shared/ui/legacy/forms/FormDialog',
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
                        path:@/features/admin/admin/shared/ui/legacy/ComponentManager',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 1
                    },
                    {
                        id: 402,
                        menu_key: 'tsx_component_wizard',
                        title: 'TSX Component Wizard',
                        path:@/features/admin/admin/TSXComponentInstallWizard',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 2
                    },
                    {
                        id: 403,
                        menu_key: 'component_discovery',
                        title: 'Component Discovery',
                        path:@/features/admin/admin/ComponentDiscoveryPanel',
                        icon: 'IconPackage',
                        parent_id: 400,
                        display_order: 3
                    },
                    {
                        id: 404,
                        menu_key: 'bigbook_viewer',
                        title: 'BigBook Component Viewer',
                        path:@/features/admin/admin/BigBookCustomComponentViewer',
                        icon: 'IconBooks',
                        parent_id: 400,
                        display_order: 4
                    },
                    {
                        id: 405,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: "/devel/router-menu-studio",
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
            // Apps Section
            {
                id: 700,
                menu_key: 'apps_section',
                title: 'Applications',
                path: '',
                icon: 'IconApps',
                parent_id: null,
                display_order: 700,
                description: 'Built-in applications',
                children: [
                    {
                        id: 701,
                        menu_key: 'contacts_app',
                        title: 'Contacts',
                        path: '/features/apps/contacts/Contacts',
                        icon: 'IconUsers',
                        parent_id: 700,
                        display_order: 1
                    },
                    {
                        id: 702,
                        menu_key: 'notes_app',
                        title: 'Notes',
                        path: '/features/apps/notes/Notes',
                        icon: 'IconNotes',
                        parent_id: 700,
                        display_order: 2
                    },
                    {
                        id: 703,
                        menu_key: 'tickets_app',
                        title: 'Tickets',
                        path: '/features/apps/tickets/Tickets',
                        icon: 'IconTicket',
                        parent_id: 700,
                        display_order: 3
                    },
                    {
                        id: 704,
                        menu_key: 'kanban_app',
                        title: 'Kanban Board',
                        path: '/features/apps/kanban/Kanban',
                        icon: 'IconApps',
                        parent_id: 700,
                        display_order: 4
                    },
                    {
                        id: 705,
                        menu_key: 'email_app',
                        title: 'Email',
                        path: '/features/apps/email/Email',
                        icon: 'IconMail',
                        parent_id: 700,
                        display_order: 5
                    }
                ]
            },

            // Church Management Section  
            {
                id: 800,
                menu_key: 'church_section',
                title: 'Church Management',
                path: '',
                icon: 'IconBuildingChurch',
                parent_id: null,
                display_order: 800,
                description: 'Parish and church administration',
                children: [
                    {
                        id: 801,
                        menu_key: 'church_wizard',
                        title: 'Church Setup Wizard',
                        path:@/features/admin/admin/ChurchWizard',
                        icon: 'IconBuildingChurch',
                        parent_id: 800,
                        display_order: 1
                    },
                    {
                        id: 802,
                        menu_key: 'church_management_dashboard',
                        title: 'Church Management Dashboard',
                        path:@/features/admin/admin/ChurchManagement',
                        icon: 'IconBuildingChurch',
                        parent_id: 800,
                        display_order: 2
                    },
                    {
                        id: 803,
                        menu_key: 'church_admin_list',
                        title: 'Church Admin List',
                        path:@/features/admin/admin/ChurchAdminList',
                        icon: 'IconBuildingChurch',
                        parent_id: 800,
                        display_order: 3
                    }
                ]
            },

            // Authentication Section
            {
                id: 900,
                menu_key: 'auth_section',
                title: 'Authentication',
                path: '',
                icon: 'IconLock',
                parent_id: null,
                display_order: 900,
                description: 'User authentication and access control',
                children: [
                    {
                        id: 901,
                        menu_key: 'user_management',
                        title: 'User Management',
                        path:@/features/admin/admin/UserManagement',
                        icon: 'IconUsers',
                        parent_id: 900,
                        display_order: 1
                    },
                    {
                        id: 902,
                        menu_key: 'role_management',
                        title: 'Role Management',
                        path:@/features/admin/admin/RoleManagement',
                        icon: 'IconShield',
                        parent_id: 900,
                        display_order: 2
                    },
                    {
                        id: 903,
                        menu_key: 'permissions_management',
                        title: 'Permissions Management',
                        path:@/features/admin/admin/PermissionsManagement',
                        icon: 'IconShield',
                        parent_id: 900,
                        display_order: 3
                    },
                    {
                        id: 904,
                        menu_key: 'menu_permissions',
                        title: 'Menu Permissions',
                        path:@/features/admin/admin/MenuPermissions',
                        icon: 'IconMenu',
                        parent_id: 900,
                        display_order: 4
                    }
                ]
            },

            // AI Tools Section
            {
                id: 1000,
,
            // Charts Section
            {
                id: 1100,
                menu_key: 'charts_section',
                title: 'Charts & Analytics',
                path: '',
                icon: 'IconChartLine',
                parent_id: null,
                display_order: 1100,
                description: 'Data visualization and charts',
                children: [
                    {
                        id: 1101,
                        menu_key: 'area_charts',
                        title: 'Area Charts',
                        path: '/features/charts/area',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 1
                    },
                    {
                        id: 1102,
                        menu_key: 'bar_charts',
                        title: 'Bar Charts',
                        path: '/features/charts/bar',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 2
                    },
                    {
                        id: 1103,
                        menu_key: 'pie_charts',
                        title: 'Pie Charts',
                        path: '/features/charts/pie',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 3
                    }
                ]
            },

            // CMS Section
            {
                id: 1200,
                menu_key: 'cms_section',
                title: 'Content Management',
                path: '',
                icon: 'IconFileDescription',
                parent_id: null,
                display_order: 1200,
                description: 'Website content and page management',
                children: [
                    {
                        id: 1201,
                        menu_key: 'cms_dashboard',
                        title: 'CMS Dashboard',
                        path: '/features/cms/dashboard',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 1
                    },
                    {
                        id: 1202,
                        menu_key: 'landing_pages',
                        title: 'Landing Pages',
                        path: '/features/cms/landingpage',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 2
                    },
                    {
                        id: 1203,
                        menu_key: 'frontend_pages',
                        title: 'Frontend Pages',
                        path: '/features/cms/frontend-pages',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 3
                    }
                ]
            },

            // Developer Tools Section
            {
                id: 1300,
                menu_key: 'developer_section',
                title: 'Developer Tools',
                path: '',
                icon: 'IconSettings',
                parent_id: null,
                display_order: 1300,
                description: 'Development and debugging tools',
                children: [
                    {
                        id: 1301,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: "/devel/router-menu-studio",
                        icon: 'IconMenu',
                        parent_id: 1300,
                        display_order: 1
                    },
                    {
                        id: 1302,
                        menu_key: 'script_runner',
                        title: 'Script Runner',
                        path:@/features/admin/admin/ScriptRunner',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 2
                    },
                    {
                        id: 1303,
                        menu_key: 'build_console',
                        title: 'Build Console',
                        path:@/features/admin/admin/BuildConsole',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 3
                    }
                ]
            },

            // Pages Section
            {
                id: 1400,
                menu_key: 'pages_section',
                title: 'System Pages',
                path: '',
                icon: 'IconFiles',
                parent_id: null,
                display_order: 1400,
                description: 'System and utility pages',
                children: [
                    {
                        id: 1401,
                        menu_key: 'pricing_page',
                        title: 'Pricing Page',
                        path: '/features/pages/pricing/Pricing',
                        icon: 'IconCurrencyDollar',
                        parent_id: 1400,
                        display_order: 1
                    },
                    {
                        id: 1402,
                        menu_key: 'faq_page',
                        title: 'FAQ Page',
                        path: '/features/pages/faq',
                        icon: 'IconHelp',
                        parent_id: 1400,
                        display_order: 2
                    },
                    {
                        id: 1403,
                        menu_key: 'account_settings',
                        title: 'Account Settings',
                        path: '/features/pages/account-setting',
                        icon: 'IconUser',
                        parent_id: 1400,
                        display_order: 3
                    }
                ]
            }
                menu_key: 'ai_section',
                title: 'AI & Automation',
                path: '',
                icon: 'IconBrain',
                parent_id: null,
                display_order: 1000,
                description: 'AI tools and automation',
                children: [
                    {
                        id: 1001,
                        menu_key: 'ai_admin_panel',
                        title: 'AI Admin Panel',
                        path:@/features/admin/ai/AIAdminPanel',
                        icon: 'IconBrain',
                        parent_id: 1000,
,
            // Charts Section
            {
                id: 1100,
                menu_key: 'charts_section',
                title: 'Charts & Analytics',
                path: '',
                icon: 'IconChartLine',
                parent_id: null,
                display_order: 1100,
                description: 'Data visualization and charts',
                children: [
                    {
                        id: 1101,
                        menu_key: 'area_charts',
                        title: 'Area Charts',
                        path: '/features/charts/area',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 1
                    },
                    {
                        id: 1102,
                        menu_key: 'bar_charts',
                        title: 'Bar Charts',
                        path: '/features/charts/bar',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 2
                    },
                    {
                        id: 1103,
                        menu_key: 'pie_charts',
                        title: 'Pie Charts',
                        path: '/features/charts/pie',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 3
                    }
                ]
            },

            // CMS Section
            {
                id: 1200,
                menu_key: 'cms_section',
                title: 'Content Management',
                path: '',
                icon: 'IconFileDescription',
                parent_id: null,
                display_order: 1200,
                description: 'Website content and page management',
                children: [
                    {
                        id: 1201,
                        menu_key: 'cms_dashboard',
                        title: 'CMS Dashboard',
                        path: '/features/cms/dashboard',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 1
                    },
                    {
                        id: 1202,
                        menu_key: 'landing_pages',
                        title: 'Landing Pages',
                        path: '/features/cms/landingpage',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 2
                    },
                    {
                        id: 1203,
                        menu_key: 'frontend_pages',
                        title: 'Frontend Pages',
                        path: '/features/cms/frontend-pages',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 3
                    }
                ]
            },

            // Developer Tools Section
            {
                id: 1300,
                menu_key: 'developer_section',
                title: 'Developer Tools',
                path: '',
                icon: 'IconSettings',
                parent_id: null,
                display_order: 1300,
                description: 'Development and debugging tools',
                children: [
                    {
                        id: 1301,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: "/devel/router-menu-studio",
                        icon: 'IconMenu',
                        parent_id: 1300,
                        display_order: 1
                    },
                    {
                        id: 1302,
                        menu_key: 'script_runner',
                        title: 'Script Runner',
                        path:@/features/admin/admin/ScriptRunner',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 2
                    },
                    {
                        id: 1303,
                        menu_key: 'build_console',
                        title: 'Build Console',
                        path:@/features/admin/admin/BuildConsole',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 3
                    }
                ]
            },

            // Pages Section
            {
                id: 1400,
                menu_key: 'pages_section',
                title: 'System Pages',
                path: '',
                icon: 'IconFiles',
                parent_id: null,
                display_order: 1400,
                description: 'System and utility pages',
                children: [
                    {
                        id: 1401,
                        menu_key: 'pricing_page',
                        title: 'Pricing Page',
                        path: '/features/pages/pricing/Pricing',
                        icon: 'IconCurrencyDollar',
                        parent_id: 1400,
                        display_order: 1
                    },
                    {
                        id: 1402,
                        menu_key: 'faq_page',
                        title: 'FAQ Page',
                        path: '/features/pages/faq',
                        icon: 'IconHelp',
                        parent_id: 1400,
                        display_order: 2
                    },
                    {
                        id: 1403,
                        menu_key: 'account_settings',
                        title: 'Account Settings',
                        path: '/features/pages/account-setting',
                        icon: 'IconUser',
                        parent_id: 1400,
                        display_order: 3
                    }
                ]
            }
                        display_order: 1
                    },
                    {
                        id: 1002,
                        menu_key: 'ai_analytics',
                        title: 'AI Analytics Dashboard',
                        path:@/features/admin/ai/AIAnalyticsDashboard',
                        icon: 'IconChartLine',
                        parent_id: 1000,
,
            // Charts Section
            {
                id: 1100,
                menu_key: 'charts_section',
                title: 'Charts & Analytics',
                path: '',
                icon: 'IconChartLine',
                parent_id: null,
                display_order: 1100,
                description: 'Data visualization and charts',
                children: [
                    {
                        id: 1101,
                        menu_key: 'area_charts',
                        title: 'Area Charts',
                        path: '/features/charts/area',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 1
                    },
                    {
                        id: 1102,
                        menu_key: 'bar_charts',
                        title: 'Bar Charts',
                        path: '/features/charts/bar',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 2
                    },
                    {
                        id: 1103,
                        menu_key: 'pie_charts',
                        title: 'Pie Charts',
                        path: '/features/charts/pie',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 3
                    }
                ]
            },

            // CMS Section
            {
                id: 1200,
                menu_key: 'cms_section',
                title: 'Content Management',
                path: '',
                icon: 'IconFileDescription',
                parent_id: null,
                display_order: 1200,
                description: 'Website content and page management',
                children: [
                    {
                        id: 1201,
                        menu_key: 'cms_dashboard',
                        title: 'CMS Dashboard',
                        path: '/features/cms/dashboard',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 1
                    },
                    {
                        id: 1202,
                        menu_key: 'landing_pages',
                        title: 'Landing Pages',
                        path: '/features/cms/landingpage',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 2
                    },
                    {
                        id: 1203,
                        menu_key: 'frontend_pages',
                        title: 'Frontend Pages',
                        path: '/features/cms/frontend-pages',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 3
                    }
                ]
            },

            // Developer Tools Section
            {
                id: 1300,
                menu_key: 'developer_section',
                title: 'Developer Tools',
                path: '',
                icon: 'IconSettings',
                parent_id: null,
                display_order: 1300,
                description: 'Development and debugging tools',
                children: [
                    {
                        id: 1301,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: "/devel/router-menu-studio",
                        icon: 'IconMenu',
                        parent_id: 1300,
                        display_order: 1
                    },
                    {
                        id: 1302,
                        menu_key: 'script_runner',
                        title: 'Script Runner',
                        path:@/features/admin/admin/ScriptRunner',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 2
                    },
                    {
                        id: 1303,
                        menu_key: 'build_console',
                        title: 'Build Console',
                        path:@/features/admin/admin/BuildConsole',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 3
                    }
                ]
            },

            // Pages Section
            {
                id: 1400,
                menu_key: 'pages_section',
                title: 'System Pages',
                path: '',
                icon: 'IconFiles',
                parent_id: null,
                display_order: 1400,
                description: 'System and utility pages',
                children: [
                    {
                        id: 1401,
                        menu_key: 'pricing_page',
                        title: 'Pricing Page',
                        path: '/features/pages/pricing/Pricing',
                        icon: 'IconCurrencyDollar',
                        parent_id: 1400,
                        display_order: 1
                    },
                    {
                        id: 1402,
                        menu_key: 'faq_page',
                        title: 'FAQ Page',
                        path: '/features/pages/faq',
                        icon: 'IconHelp',
                        parent_id: 1400,
                        display_order: 2
                    },
                    {
                        id: 1403,
                        menu_key: 'account_settings',
                        title: 'Account Settings',
                        path: '/features/pages/account-setting',
                        icon: 'IconUser',
                        parent_id: 1400,
                        display_order: 3
                    }
                ]
            }
                        display_order: 2
                    },
                    {
                        id: 1003,
                        menu_key: 'ai_content_generator',
                        title: 'AI Content Generator',
                        path:@/features/admin/ai/AIContentGenerator',
                        icon: 'IconFileDescription',
                        parent_id: 1000,
,
            // Charts Section
            {
                id: 1100,
                menu_key: 'charts_section',
                title: 'Charts & Analytics',
                path: '',
                icon: 'IconChartLine',
                parent_id: null,
                display_order: 1100,
                description: 'Data visualization and charts',
                children: [
                    {
                        id: 1101,
                        menu_key: 'area_charts',
                        title: 'Area Charts',
                        path: '/features/charts/area',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 1
                    },
                    {
                        id: 1102,
                        menu_key: 'bar_charts',
                        title: 'Bar Charts',
                        path: '/features/charts/bar',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 2
                    },
                    {
                        id: 1103,
                        menu_key: 'pie_charts',
                        title: 'Pie Charts',
                        path: '/features/charts/pie',
                        icon: 'IconChartLine',
                        parent_id: 1100,
                        display_order: 3
                    }
                ]
            },

            // CMS Section
            {
                id: 1200,
                menu_key: 'cms_section',
                title: 'Content Management',
                path: '',
                icon: 'IconFileDescription',
                parent_id: null,
                display_order: 1200,
                description: 'Website content and page management',
                children: [
                    {
                        id: 1201,
                        menu_key: 'cms_dashboard',
                        title: 'CMS Dashboard',
                        path: '/features/cms/dashboard',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 1
                    },
                    {
                        id: 1202,
                        menu_key: 'landing_pages',
                        title: 'Landing Pages',
                        path: '/features/cms/landingpage',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 2
                    },
                    {
                        id: 1203,
                        menu_key: 'frontend_pages',
                        title: 'Frontend Pages',
                        path: '/features/cms/frontend-pages',
                        icon: 'IconFileDescription',
                        parent_id: 1200,
                        display_order: 3
                    }
                ]
            },

            // Developer Tools Section
            {
                id: 1300,
                menu_key: 'developer_section',
                title: 'Developer Tools',
                path: '',
                icon: 'IconSettings',
                parent_id: null,
                display_order: 1300,
                description: 'Development and debugging tools',
                children: [
                    {
                        id: 1301,
                        menu_key: 'router_menu_studio',
                        title: 'Router Menu Studio',
                        path: "/devel/router-menu-studio",
                        icon: 'IconMenu',
                        parent_id: 1300,
                        display_order: 1
                    },
                    {
                        id: 1302,
                        menu_key: 'script_runner',
                        title: 'Script Runner',
                        path:@/features/admin/admin/ScriptRunner',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 2
                    },
                    {
                        id: 1303,
                        menu_key: 'build_console',
                        title: 'Build Console',
                        path:@/features/admin/admin/BuildConsole',
                        icon: 'IconTerminal',
                        parent_id: 1300,
                        display_order: 3
                    }
                ]
            },

            // Pages Section
            {
                id: 1400,
                menu_key: 'pages_section',
                title: 'System Pages',
                path: '',
                icon: 'IconFiles',
                parent_id: null,
                display_order: 1400,
                description: 'System and utility pages',
                children: [
                    {
                        id: 1401,
                        menu_key: 'pricing_page',
                        title: 'Pricing Page',
                        path: '/features/pages/pricing/Pricing',
                        icon: 'IconCurrencyDollar',
                        parent_id: 1400,
                        display_order: 1
                    },
                    {
                        id: 1402,
                        menu_key: 'faq_page',
                        title: 'FAQ Page',
                        path: '/features/pages/faq',
                        icon: 'IconHelp',
                        parent_id: 1400,
                        display_order: 2
                    },
                    {
                        id: 1403,
                        menu_key: 'account_settings',
                        title: 'Account Settings',
                        path: '/features/pages/account-setting',
                        icon: 'IconUser',
                        parent_id: 1400,
                        display_order: 3
                    }
                ]
            }
                        display_order: 3
                    }
                ]
            }
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
