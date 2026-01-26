import { useAuth } from '@/context/AuthContext';

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

    // Return permissive defaults - no API calls
    return {
        permissions: [],
        hasSocialAccess: true,
        socialPermissions: ['read', 'write', 'admin'],
        useStaticPermissions: true,
        loading: false,
        error: null,
        isMenuVisible: () => true, // Always visible
        isSocialEnabled: () => true, // Social features enabled
        getVisibleMenuKeys: () => [], // Empty array
        getSocialMenuPermissions: () => [], // Empty array
        reload: () => {} // No-op
    };
}; 