import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export interface DynamicMenuPermission {
    id: number;
    menu_key: string;
    title: string;
    path: string;
    icon: string;
    parent_id: number | null;
    display_order: number;
    description: string;
    is_visible: boolean;
}

export interface MenuPermissionsResponse {
    success: boolean;
    menuPermissions: DynamicMenuPermission[];
    userRole: string;
    hasSocialAccess: boolean;
    socialPermissions: string[];
    useStaticPermissions: boolean;
}

export const useDynamicMenuPermissions = () => {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<DynamicMenuPermission[]>([]);
    const [hasSocialAccess, setHasSocialAccess] = useState(false);
    const [socialPermissions, setSocialPermissions] = useState<string[]>([]);
    const [useStaticPermissions, setUseStaticPermissions] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMenuPermissions = async () => {
        if (!user) {
            setUseStaticPermissions(true);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            console.log(`📋 Loading dynamic menu permissions for ${user.email} (${user.role})`);

            const response = await fetch('/api/admin/menu-permissions/user-permissions', {
                credentials: 'include'
            });

            if (response.ok) {
                const data: MenuPermissionsResponse = await response.json();
                
                if (data.success) {
                    setPermissions(data.menuPermissions || []);
                    setHasSocialAccess(data.hasSocialAccess || false);
                    setSocialPermissions(data.socialPermissions || []);
                    setUseStaticPermissions(data.useStaticPermissions || false);
                    
                    console.log(`📋 Loaded ${data.menuPermissions?.length || 0} menu permissions`);
                    console.log(`📱 Social access: ${data.hasSocialAccess ? 'ENABLED' : 'DISABLED'}`);
                    
                    if (data.hasSocialAccess) {
                        console.log(`📱 Social permissions: ${data.socialPermissions.join(', ')}`);
                    }
                } else {
                    console.warn('Failed to load menu permissions, falling back to static');
                    setUseStaticPermissions(true);
                }
            } else {
                console.warn('Menu permissions API unavailable, using static permissions');
                setUseStaticPermissions(true);
            }
        } catch (err) {
            console.error('Error loading menu permissions:', err);
            setError('Failed to load menu permissions');
            setUseStaticPermissions(true);
        } finally {
            setLoading(false);
        }
    };

    // Load permissions when user changes
    useEffect(() => {
        loadMenuPermissions();
    }, [user?.id, user?.role]);

    // Check if a specific menu item is visible
    const isMenuVisible = (menuKey: string): boolean => {
        if (useStaticPermissions) {
            // Return true to fall back to static role-based filtering
            return true;
        }

        const permission = permissions.find(p => p.menu_key === menuKey);
        return permission?.is_visible || false;
    };

    // Check if social features are enabled
    const isSocialEnabled = (): boolean => {
        if (useStaticPermissions) {
            return false; // Social features disabled by default in static mode
        }
        
        return hasSocialAccess;
    };

    // Get all visible menu keys
    const getVisibleMenuKeys = (): string[] => {
        if (useStaticPermissions) {
            return [];
        }
        
        return permissions.filter(p => p.is_visible).map(p => p.menu_key);
    };

    // Get social menu permissions specifically
    const getSocialMenuPermissions = (): DynamicMenuPermission[] => {
        return permissions.filter(p => p.menu_key.startsWith('social') && p.is_visible);
    };

    return {
        permissions,
        hasSocialAccess,
        socialPermissions,
        useStaticPermissions,
        loading,
        error,
        isMenuVisible,
        isSocialEnabled,
        getVisibleMenuKeys,
        getSocialMenuPermissions,
        reload: loadMenuPermissions
    };
}; 