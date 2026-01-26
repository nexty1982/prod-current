import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// Types
export interface NotificationType {
    id: number;
    user_id: number;
    notification_type_id: number;
    title: string;
    message: string;
    data?: any;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    is_read: boolean;
    is_dismissed: boolean;
    read_at?: string;
    dismissed_at?: string;
    expires_at?: string;
    action_url?: string;
    action_text?: string;
    icon?: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    type_name: string;
    category: string;
}

export interface NotificationCounts {
    total: number;
    unread: number;
    urgent: number;
    high: number;
}

export interface NotificationPreference {
    type_name: string;
    category: string;
    email_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    sms_enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'disabled';
}

interface NotificationContextType {
    // State
    notifications: NotificationType[];
    counts: NotificationCounts;
    preferences: NotificationPreference[];
    loading: boolean;
    error: string | null;

    // Actions
    fetchNotifications: (options?: {
        limit?: number;
        offset?: number;
        unread_only?: boolean;
        category?: string;
        priority?: string;
    }) => Promise<void>;
    fetchCounts: () => Promise<void>;
    fetchPreferences: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    dismissNotification: (id: number) => Promise<void>;
    updatePreferences: (preferences: NotificationPreference[]) => Promise<void>;

    // Real-time updates
    addNotification: (notification: NotificationType) => void;
    updateNotification: (id: number, updates: Partial<NotificationType>) => void;
    removeNotification: (id: number) => void;

    // Utility functions
    getNotificationsByCategory: (category: string) => NotificationType[];
    getNotificationsByPriority: (priority: string) => NotificationType[];
    getUnreadCount: () => number;
    hasUnreadNotifications: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { authenticated, user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [counts, setCounts] = useState<NotificationCounts>({
        total: 0,
        unread: 0,
        urgent: 0,
        high: 0
    });
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async (options = {}) => {
        if (!authenticated) return;

        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit.toString());
            if (options.offset) params.append('offset', options.offset.toString());
            if (options.unread_only) params.append('unread_only', 'true');
            if (options.category) params.append('category', options.category);
            if (options.priority) params.append('priority', options.priority);

            const response = await fetch(`/api/notifications?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Handle 404 gracefully - feature not enabled, return empty data
            if (response.status === 404) {
                setNotifications([]);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }

            const data = await response.json();
            if (data.success) {
                setNotifications(data.notifications);
            } else {
                setError(data.message || 'Failed to fetch notifications');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    }, [authenticated]);

    // Fetch notification counts
    const fetchCounts = useCallback(async () => {
        if (!authenticated) return;

        try {
            const response = await fetch('/api/notifications/counts', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Handle 401 authentication errors gracefully - user not logged in
            if (response.status === 401) {
                setCounts({ total: 0, unread: 0, urgent: 0, high: 0 });
                return;
            }

            // Handle 404 gracefully - feature not enabled, return empty counts
            if (response.status === 404) {
                setCounts({ total: 0, unread: 0, urgent: 0, high: 0 });
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch notification counts');
            }

            const data = await response.json();
            if (data.success) {
                setCounts(data.counts);
            }
        } catch (err: any) {
            console.error('Error fetching notification counts:', err);
        }
    }, [authenticated]);

    // Fetch notification preferences
    const fetchPreferences = useCallback(async () => {
        if (!authenticated) return;

        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Handle 404 gracefully - feature not enabled, return empty preferences
            if (response.status === 404) {
                setPreferences([]);
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch notification preferences');
            }

            const data = await response.json();
            if (data.success) {
                setPreferences(data.preferences);
            }
        } catch (err: any) {
            console.error('Error fetching notification preferences:', err);
        }
    }, [authenticated]);

    // Mark notification as read
    const markAsRead = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            const data = await response.json();
            if (data.success) {
                setNotifications(prev =>
                    prev.map(notification =>
                        notification.id === id
                            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                            : notification
                    )
                );
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error marking notification as read:', err);
        }
    }, [fetchCounts]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        try {
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }

            const data = await response.json();
            if (data.success) {
                setNotifications(prev =>
                    prev.map(notification => ({
                        ...notification,
                        is_read: true,
                        read_at: new Date().toISOString()
                    }))
                );
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error marking all notifications as read:', err);
        }
    }, [fetchCounts]);

    // Dismiss notification
    const dismissNotification = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to dismiss notification');
            }

            const data = await response.json();
            if (data.success) {
                setNotifications(prev => prev.filter(notification => notification.id !== id));
                fetchCounts(); // Refresh counts
            }
        } catch (err: any) {
            console.error('Error dismissing notification:', err);
        }
    }, [fetchCounts]);

    // Update notification preferences
    const updatePreferences = useCallback(async (newPreferences: NotificationPreference[]) => {
        try {
            const response = await fetch('/api/notifications/preferences', {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ preferences: newPreferences }),
            });

            if (!response.ok) {
                throw new Error('Failed to update notification preferences');
            }

            const data = await response.json();
            if (data.success) {
                setPreferences(newPreferences);
            }
        } catch (err: any) {
            console.error('Error updating notification preferences:', err);
            throw err;
        }
    }, []);

    // Add notification (for real-time updates)
    const addNotification = useCallback((notification: NotificationType) => {
        setNotifications(prev => [notification, ...prev]);
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Update notification (for real-time updates)
    const updateNotification = useCallback((id: number, updates: Partial<NotificationType>) => {
        setNotifications(prev =>
            prev.map(notification =>
                notification.id === id
                    ? { ...notification, ...updates }
                    : notification
            )
        );
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Remove notification (for real-time updates)
    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(notification => notification.id !== id));
        fetchCounts(); // Refresh counts
    }, [fetchCounts]);

    // Utility functions
    const getNotificationsByCategory = useCallback((category: string) => {
        return notifications.filter(notification => notification.category === category);
    }, [notifications]);

    const getNotificationsByPriority = useCallback((priority: string) => {
        return notifications.filter(notification => notification.priority === priority);
    }, [notifications]);

    const getUnreadCount = useCallback(() => {
        return notifications.filter(notification => !notification.is_read).length;
    }, [notifications]);

    const hasUnreadNotifications = useCallback(() => {
        return notifications.some(notification => !notification.is_read);
    }, [notifications]);

    // Initialize data when authenticated
    useEffect(() => {
        if (authenticated) {
            fetchNotifications();
            fetchCounts();
            fetchPreferences();
        } else {
            setNotifications([]);
            setCounts({ total: 0, unread: 0, urgent: 0, high: 0 });
            setPreferences([]);
        }
    }, [authenticated, fetchNotifications, fetchCounts, fetchPreferences]);

    // Set up real-time updates (you can implement WebSocket or Server-Sent Events here)
    useEffect(() => {
        if (!authenticated) return;

        // Example: Set up Server-Sent Events for real-time notifications
        // const eventSource = new EventSource('/api/notifications/stream');
        // eventSource.onmessage = (event) => {
        //     const notification = JSON.parse(event.data);
        //     addNotification(notification);
        // };
        // 
        // return () => {
        //     eventSource.close();
        // };

        // For now, we'll use polling as a simple solution
        const interval = setInterval(() => {
            fetchCounts();
        }, 30000); // Check for new notifications every 30 seconds

        return () => {
            clearInterval(interval);
        };
    }, [authenticated, fetchCounts]);

    const value: NotificationContextType = {
        // State
        notifications,
        counts,
        preferences,
        loading,
        error,

        // Actions
        fetchNotifications,
        fetchCounts,
        fetchPreferences,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        updatePreferences,

        // Real-time updates
        addNotification,
        updateNotification,
        removeNotification,

        // Utility functions
        getNotificationsByCategory,
        getNotificationsByPriority,
        getUnreadCount,
        hasUnreadNotifications,
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
