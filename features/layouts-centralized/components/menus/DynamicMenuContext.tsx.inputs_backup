/**
 * Dynamic Menu Context for Orthodox Metrics
 * Manages menu items based on user roles and backend permissions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import MenuService, { MenuItem } from '../services/menuService';

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

    const loadMenuItems = async () => {
        if (!authenticated || !user) {
            setMenuItems([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const items = await MenuService.getCurrentUserMenuItems();
            setMenuItems(items);
        } catch (err: any) {
            console.error('Error loading menu items:', err);
            setError(err.message || 'Failed to load menu items');
            setMenuItems([]);
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
