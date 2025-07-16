// Account Service for Orthodox Metrics
export interface UserProfile {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    preferred_language: string;
    timezone: string;
    role: string;
    church_id: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export class AccountService {
    private static baseUrl = '/api/auth';

    /**
     * Get current user profile
     */
    static async getProfile(): Promise<UserProfile> {
        const response = await fetch(`${this.baseUrl}/profile`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required');
            } else if (response.status === 404) {
                throw new Error('User profile not found');
            }
            throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch profile');
        }

        return data.user;
    }

    /**
     * Update user profile
     */
    static async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
        const response = await fetch(`${this.baseUrl}/profile`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required');
            } else if (response.status === 400) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Invalid profile data');
            }
            throw new Error(`Failed to update profile: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to update profile');
        }

        return data.user;
    }

    /**
     * Change user password
     */
    static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/change-password`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required');
            } else if (response.status === 400) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Invalid password data');
            }
            throw new Error(`Failed to change password: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to change password');
        }
    }

    /**
     * Upload profile avatar (if supported)
     */
    static async uploadAvatar(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch(`${this.baseUrl}/profile/avatar`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication required');
            } else if (response.status === 400) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Invalid file format');
            }
            throw new Error(`Failed to upload avatar: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to upload avatar');
        }

        return data.avatarUrl;
    }

    /**
     * Get available languages for the language selector
     */
    static async getAvailableLanguages(): Promise<Array<{ code: string; name: string }>> {
        try {
            const response = await fetch('/api/languages', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                return data.languages || [];
            }
        } catch (error) {
            console.error('Error fetching languages:', error);
        }

        // Return default languages if API call fails
        return [
            { code: 'en', name: 'English' },
            { code: 'el', name: 'Greek' },
            { code: 'ru', name: 'Russian' },
            { code: 'sr', name: 'Serbian' },
            { code: 'ro', name: 'Romanian' },
            { code: 'bg', name: 'Bulgarian' },
        ];
    }

    /**
     * Get available timezones for the timezone selector
     */
    static async getAvailableTimezones(): Promise<Array<{ value: string; label: string }>> {
        // Return common timezones
        return [
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
            { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
            { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
            { value: 'Europe/London', label: 'London' },
            { value: 'Europe/Paris', label: 'Paris' },
            { value: 'Europe/Athens', label: 'Athens' },
            { value: 'Europe/Moscow', label: 'Moscow' },
            { value: 'Asia/Tokyo', label: 'Tokyo' },
            { value: 'Australia/Sydney', label: 'Sydney' },
        ];
    }
}
