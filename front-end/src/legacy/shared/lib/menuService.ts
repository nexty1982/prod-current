/**
 * Menu Service for Orthodox Metrics
 * Handles dynamic menu loading based on user roles and permissions
 */

import {
    IconDashboard,
    IconCalendar,
    IconMail,
    IconNotes,
    IconTicket,
    IconCurrencyDollar,
    IconApps,
    IconChartLine,
    IconBorderAll,
    IconFileDescription,
    IconPackage,
    IconFiles,
    IconBoxMultiple,
    IconHelp,
    IconSettings,
    IconUsers,
    IconBuildingChurch,
    IconLock,
    IconShield,
    IconMenu,
    IconFileText,
    IconPoint,
    IconDroplet,
    IconHeart,
    IconCross,
    IconCertificate,
    IconReceipt,
    IconCreditCard,
    IconBuilding,
    IconBooks,
    IconUser,
    IconBrain,
} from '@tabler/icons-react';
import { IconBrain, IconTerminal } from "@tabler/icons-react";
import OrthodoxChurchIcon from '@/shared/ui/OrthodoxChurchIcon';

export interface MenuItem {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    parent_id: number | null;
    display_order: number;
    description?: string;
    children?: MenuItem[];
}

export interface MenuPermission {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    parent_id: number | null;
    display_order: number;
    is_system_required: boolean;
    description?: string;
    permissions: {
        [role: string]: boolean;
    };
}

export class MenuService {
    /**
     * Get menu items for current authenticated user
     */
    static async getCurrentUserMenuItems(): Promise<MenuItem[]> {
        try {
            const response = await fetch('/api/menu-management/current-user', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch menu items: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return data.menuItems || [];
            } else {
                throw new Error(data.message || 'Failed to load menu items');
            }
        } catch (error: any) {
            console.error('Error fetching current user menu items:', error);
            throw new Error(error.message || 'Failed to load menu items');
        }
    }

    /**
     * Get menu items for a specific role (admin function)
     */
    static async getMenuItemsForRole(role: string): Promise<MenuItem[]> {
        try {
            const response = await fetch(`/api/menu-management/for-role/${role}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch menu items for role: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return data.menuItems || [];
            } else {
                throw new Error(data.message || 'Failed to load menu items');
            }
        } catch (error: any) {
            console.error(`Error fetching menu items for role ${role}:`, error);
            throw new Error(error.message || 'Failed to load menu items');
        }
    }

    /**
     * Get all menu permissions (super admin only)
     */
    static async getAllMenuPermissions(): Promise<MenuPermission[]> {
        try {
            const response = await fetch('/api/menu-management/permissions', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch menu permissions: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return data.menuPermissions || [];
            } else {
                throw new Error(data.message || 'Failed to load menu permissions');
            }
        } catch (error: any) {
            console.error('Error fetching menu permissions:', error);
            throw new Error(error.message || 'Failed to load menu permissions');
        }
    }

    /**
     * Update menu permissions (super admin only)
     */
    static async updateMenuPermissions(updates: Array<{
        menu_item_id: number;
        role: string;
        is_visible: boolean;
    }>): Promise<void> {
        try {
            const response = await fetch('/api/menu-management/permissions', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update menu permissions: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to update menu permissions');
            }
        } catch (error: any) {
            console.error('Error updating menu permissions:', error);
            throw new Error(error.message || 'Failed to update menu permissions');
        }
    }

    /**
     * Convert database menu items to frontend menu structure
     */
    static convertToFrontendMenuItems(backendItems: MenuItem[]): any[] {
        return backendItems.map(item => ({
            id: item.id,
            title: item.title,
            icon: this.getIconComponent(item.icon),
            href: item.path,
            children: item.children ? this.convertToFrontendMenuItems(item.children) : undefined,
            navlabel: false,
            subheader: undefined,
            chip: undefined,
            chipColor: undefined,
            variant: undefined,
            external: false,
        }));
    }

    /**
     * Get icon component based on icon name
     */
    private static getIconComponent(iconName: string): any {
        const iconMap: { [key: string]: any } = {
            'IconDashboard': IconDashboard,
            'IconCalendar': IconCalendar,
            'IconMail': IconMail,
            'IconNotes': IconNotes,
            'IconTicket': IconTicket,
            'IconCurrencyDollar': IconCurrencyDollar,
            'IconApps': IconApps,
            'IconChartLine': IconChartLine,
            'IconBorderAll': IconBorderAll,
            'IconFileDescription': IconFileDescription,
            'IconPackage': IconPackage,
            'IconFiles': IconFiles,
            'IconBoxMultiple': IconBoxMultiple,
            'IconHelp': IconHelp,
            'IconSettings': IconSettings,
            'IconUsers': IconUsers,
            'IconBuildingChurch': OrthodoxChurchIcon,
            'OrthodoxChurchIcon': OrthodoxChurchIcon,
            'IconLock': IconLock,
            'IconShield': IconShield,
            'IconMenu': IconMenu,
            'IconFileText': IconFileText,
            'IconDroplet': IconDroplet,
            'IconHeart': IconHeart,
            'IconCross': IconCross,
            'IconCertificate': IconCertificate,
            'IconReceipt': IconReceipt,
            'IconCreditCard': IconCreditCard,
            'IconBuilding': IconBuilding,
            'IconBooks': IconBooks,
            'IconUser': IconUser,
            'IconBrain': IconBrain,
            'IconTerminal': IconTerminal,
    IconBrain,
        };

        return iconMap[iconName] || IconPoint;
    }
}

export default MenuService;
