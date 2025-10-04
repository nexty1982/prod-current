import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  autoDismiss?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss after 5 seconds if autoDismiss is true (default for non-error types)
    if (notification.autoDismiss || notification.type !== 'error') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Toast component for displaying notifications
export const NotificationToast: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const { notifications, removeNotification } = useNotifications();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-500/10 text-green-400';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10 text-yellow-400';
      case 'error': return 'border-red-500 bg-red-500/10 text-red-400';
      default: return 'border-blue-500 bg-blue-500/10 text-blue-400';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg animate-slide-in-right ${
            isDarkMode ? 'bg-slate-800' : 'bg-white'
          } ${getTypeColor(notification.type)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0">{getTypeIcon(notification.type)}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">{notification.title}</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`text-lg hover:opacity-70 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
