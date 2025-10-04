import React from 'react';

interface SystemMessageCardProps {
  type: 'info' | 'success' | 'warning' | 'error';
  category: 'service' | 'security' | 'backup' | 'notification' | 'config' | 'performance';
  title: string;
  description: string;
  timestamp: Date;
  onDismiss: () => void;
}

export const SystemMessageCard: React.FC<SystemMessageCardProps> = ({
  type,
  category,
  title,
  description,
  timestamp,
  onDismiss
}) => {
  const formatTimestamp = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-900/30 border-green-700/50',
          icon: '✅',
          badge: 'bg-green-900 text-green-400',
          text: 'text-green-400'
        };
      case 'info':
        return {
          container: 'bg-blue-900/30 border-blue-700/50',
          icon: 'ℹ️',
          badge: 'bg-blue-900 text-blue-400',
          text: 'text-blue-400'
        };
      case 'warning':
        return {
          container: 'bg-yellow-900/30 border-yellow-700/50',
          icon: '⚠️',
          badge: 'bg-yellow-900 text-yellow-400',
          text: 'text-yellow-400'
        };
      case 'error':
        return {
          container: 'bg-red-900/30 border-red-700/50',
          icon: '❌',
          badge: 'bg-red-900 text-red-400',
          text: 'text-red-400'
        };
      default:
        return {
          container: 'bg-gray-900/30 border-gray-700/50',
          icon: '📋',
          badge: 'bg-gray-900 text-gray-400',
          text: 'text-gray-400'
        };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'service': return '🔧';
      case 'security': return '🔒';
      case 'backup': return '💾';
      case 'notification': return '🔔';
      case 'config': return '⚙️';
      case 'performance': return '📈';
      default: return '📋';
    }
  };

  const styles = getTypeStyles(type);

  return (
    <div 
      className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-lg group ${styles.container}`}
      // Add animation classes for future Framer Motion integration
      // initial={{ opacity: 0, x: -20, scale: 0.95 }}
      // animate={{ opacity: 1, x: 0, scale: 1 }}
      // exit={{ opacity: 0, x: 20, scale: 0.95 }}
    >
      <div className="flex items-start space-x-3">
        {/* Category Icon */}
        <div className="text-xl flex-shrink-0">
          {getCategoryIcon(category)}
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles.badge}`}>
                {type.toUpperCase()}
              </span>
              <span className="text-xs text-gray-400 capitalize">
                {category}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          
          {/* Title */}
          <div className={`font-medium text-sm mb-1 ${styles.text}`}>
            {title}
          </div>
          
          {/* Description */}
          <div className="text-sm text-gray-300 leading-relaxed">
            {description}
          </div>
        </div>
        
        {/* Dismiss Button */}
        <button
          onClick={onDismiss}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-gray-400 hover:text-gray-200 p-1 rounded"
          title="Dismiss message"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SystemMessageCard;