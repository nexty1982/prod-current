// Client Management Types for Multi-Tenant SaaS System

export interface Client {
    id: number;
    slug: string;
    name: string;
    domain?: string;
    contact_email: string;
    contact_phone?: string;
    database_name: string;
    status: 'active' | 'inactive' | 'suspended';
    subscription_tier: 'basic' | 'premium' | 'enterprise';
    branding_config: ClientBranding;
    created_at: string;
    updated_at: string;
    admin_user?: {
        username: string;
        email: string;
        created_at: string;
    };
}

export interface ClientBranding {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
    favicon_url?: string;
    church_name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    custom_css?: string;
}

export interface CreateClientRequest {
    name: string;
    slug: string;
    contact_email: string;
    contact_phone?: string;
    subscription_tier: 'basic' | 'premium' | 'enterprise';
    branding?: Partial<ClientBranding>;
    admin_username?: string;
    admin_email?: string;
}

export interface ClientListResponse {
    clients: Client[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ClientApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface ClientStats {
    total_baptisms: number;
    total_marriages: number;
    total_funerals: number;
    recent_activity: number;
    storage_used: string;
    last_backup: string;
}

// Church Info for client sites
export interface ChurchInfo {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    established_date?: string;
    patron_saint?: string;
    priest_name: string;
    priest_email?: string;
    priest_phone?: string;
    liturgical_language: string;
    timezone: string;
    branding?: ClientBranding;
}

export interface ChurchInfoUpdateRequest {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    established_date?: string;
    patron_saint?: string;
    priest_name?: string;
    priest_email?: string;
    priest_phone?: string;
    liturgical_language?: string;
    timezone?: string;
}
