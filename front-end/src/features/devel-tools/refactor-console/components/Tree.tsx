import React, { useState, useEffect, memo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FileCode, 
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Copy,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Archive,
  RotateCcw,
  FileX,
  FileCheck
} from 'lucide-react';
import { TreeItem, RecoveryStatus } from '@/types/refactorConsole';
import { useTheme } from '@mui/material/styles';

// Browser-compatible path utilities
const pathBasename = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || '/';
};

const pathExtname = (filePath: string): string => {
  const basename = pathBasename(filePath);
  const lastDot = basename.lastIndexOf('.');
  return lastDot >= 0 ? basename.slice(lastDot) : '';
};

const pathDirname = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts.slice(0, -1).join('/') || '/';
};

interface TreeProps {
  treeItems: TreeItem[];
  expandedPaths: Set<string>;
  onToggleExpanded: (path: string) => void;
  onNodeAction: (action: string, node: TreeItem) => void;
  className?: string;
  isDark?: boolean;
}


const getRecoveryStatusIcon = (recoveryStatus?: RecoveryStatus) => {
  if (!recoveryStatus) return null;
  
  switch (recoveryStatus) {
    case 'missing_in_prod':
      return <FileX className="w-4 h-4 text-purple-500" title="Missing in production" />;
    case 'modified_since_backup':
      return <AlertTriangle className="w-4 h-4 text-orange-500" title="Modified since backup" />;
    case 'new_file':
      return <FileCheck className="w-4 h-4 text-green-500" title="New file (not in backup)" />;
    case 'unchanged':
      return <CheckCircle className="w-4 h-4 text-gray-400" title="Unchanged since backup" />;
    default:
      return null;
  }
};

const getRecoveryStatusColor = (recoveryStatus?: RecoveryStatus): string => {
  if (!recoveryStatus) return '';
  
  switch (recoveryStatus) {
    case 'missing_in_prod':
      return 'border-l-4 border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20';
    case 'modified_since_backup':
      return 'border-l-4 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20';
    case 'new_file':
      return 'border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20';
    case 'unchanged':
      return '';
    default:
      return '';
  }
};

const getClassificationIcon = (classification: string) => {
  switch (classification) {
    case 'green':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'orange':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'yellow':
      return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'red':
        return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <FileCode className="w-4 h-4 text-gray-400" />;
  }
};

// Text colors are now handled inline in TreeNode using isDark prop

const getFileIcon = (filePath: string) => {
  const extension = pathExtname(filePath).toLowerCase();
  
  switch (extension) {
    case 'tsx':
    case 'ts':
      return <FileCode className="w-4 h-4 text-blue-500" />;
    case 'jsx':
    case 'js':
      return <FileCode className="w-4 h-4 text-yellow-500" />;
    case 'css':
    case 'scss':
      return <FileCode className="w-4 h-4 text-purple-500" />;
    case 'json':
      return <FileCode className="w-4 h-4 text-green-500" />;
    default:
      return <FileCode className="w-4 h-4 text-gray-400" />;
  }
};

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  onToggleExpanded: (path: string) => void;
  onNodeAction: (action: string, node: TreeItem) => void;
  showBadges?: boolean;
  isDark?: boolean;
}

const TreeNode = memo<TreeNodeProps>(({ 
  item, 
  level, 
  onToggleExpanded, 
  onNodeAction,
  showBadges = true,
  isDark = false
}) => {
  const [showActions, setShowActions] = useState(false);
  const isExpanded = item.expanded;
  const hasChildren = item.children && item.children.length > 0;
  const isDirectory = item.type === 'dir';
  
  const indentStyle = { marginLeft: `${level * 16}px` };
  
  // Get text color based on classification and dark mode
  const getTextColor = () => {
    switch (item.classification) {
      case 'green': return isDark ? '#4ade80' : '#15803d';
      case 'orange': return isDark ? '#fb923c' : '#c2410c';
      case 'yellow': return isDark ? '#facc15' : '#a16207';
      case 'red': return isDark ? '#f87171' : '#b91c1c';
      default: return isDark ? '#d1d5db' : '#374151';
    }
  };
  
  const textColor = getTextColor();
  
  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onNodeAction(action, item);
    setShowActions(false);
  };
  
  const renderBadges = () => {
    if (!showBadges) return null;
    
    const badges = [];
    
    // Badge style helper
    const getBadgeStyle = (type: string) => {
      const styles: Record<string, { bg: string; text: string; border?: string }> = {
        purple: {
          bg: isDark ? 'rgba(147, 51, 234, 0.25)' : '#f3e8ff',
          text: isDark ? '#d8b4fe' : '#7e22ce',
          border: isDark ? '#7c3aed' : '#c4b5fd'
        },
        orange: {
          bg: isDark ? 'rgba(234, 88, 12, 0.25)' : '#ffedd5',
          text: isDark ? '#fdba74' : '#c2410c',
          border: isDark ? '#ea580c' : '#fdba74'
        },
        green: {
          bg: isDark ? 'rgba(34, 197, 94, 0.25)' : '#dcfce7',
          text: isDark ? '#86efac' : '#15803d',
          border: isDark ? '#22c55e' : '#86efac'
        },
        yellow: {
          bg: isDark ? 'rgba(234, 179, 8, 0.25)' : '#fef9c3',
          text: isDark ? '#fde047' : '#a16207',
          border: isDark ? '#eab308' : '#fde047'
        },
        red: {
          bg: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fee2e2',
          text: isDark ? '#fca5a5' : '#b91c1c',
          border: isDark ? '#ef4444' : '#fca5a5'
        },
        blue: {
          bg: isDark ? 'rgba(59, 130, 246, 0.25)' : '#dbeafe',
          text: isDark ? '#93c5fd' : '#1e40af'
        },
        gray: {
          bg: isDark ? '#374151' : '#f3f4f6',
          text: isDark ? '#9ca3af' : '#4b5563',
          border: isDark ? '#4b5563' : '#d1d5db'
        }
      };
      return styles[type] || styles.gray;
    };
    
    // Recovery status badge (highest priority)
    if (item.recoveryStatus) {
      const statusLabels = {
        'missing_in_prod': 'MISSING',
        'modified_since_backup': 'MODIFIED',
        'new_file': 'NEW',
        'unchanged': 'UNCHANGED'
      };
      const statusTypes = {
        'missing_in_prod': 'purple',
        'modified_since_backup': 'orange',
        'new_file': 'green',
        'unchanged': 'gray'
      };
      const style = getBadgeStyle(statusTypes[item.recoveryStatus]);
      badges.push(
        <span 
          key="recovery"
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: style.bg,
            color: style.text,
            border: style.border ? `1px solid ${style.border}` : 'none'
          }}
        >
          {statusLabels[item.recoveryStatus]}
        </span>
      );
    }
    
    // Classification badge
    const classStyle = getBadgeStyle(item.classification === 'green' ? 'green' : 
                                     item.classification === 'orange' ? 'orange' :
                                     item.classification === 'yellow' ? 'yellow' : 'red');
    badges.push(
      <span 
        key="classification"
        className="text-xs px-2 py-1 rounded-full font-medium"
        style={{
          backgroundColor: classStyle.bg,
          color: classStyle.text
        }}
      >
        {item.classification.toUpperCase()}
      </span>
    );
    
    // Usage score badge
    if (item.type === 'file') {
      const blueStyle = getBadgeStyle('blue');
      badges.push(
        <span 
          key="score" 
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: blueStyle.bg,
            color: blueStyle.text
          }}
        >
          Score: {item.usage.score}
        </span>
      );
    }
    
    // Duplicate badge
    if (item.similarity?.duplicates.length || item.similarity?.nearMatches.length) {
      const redStyle = getBadgeStyle('red');
      badges.push(
        <span 
          key="duplicates" 
          className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"
          style={{
            backgroundColor: redStyle.bg,
            color: redStyle.text
          }}
        >
          <GitBranch className="w-3 h-3" />
          Dupes
        </span>
      );
    }
    
    // Feature path badge
    if (item.featurePathMatch) {
      const greenStyle = getBadgeStyle('green');
      badges.push(
        <span 
          key="feature" 
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: greenStyle.bg,
            color: greenStyle.text
          }}
        >
          Feature
        </span>
      );
    }
    
    return (
      <div className="flex gap-1 flex-wrap">
        {badges}
      </div>
    );
  };
  
  return (
    <div 
      className="flex items-center gap-2 py-2 px-3 cursor-pointer group"
      style={{
        ...indentStyle,
        color: textColor,
        backgroundColor: 'transparent',
        transition: 'background-color 0.15s'
      }}
      onMouseEnter={(e) => {
        setShowActions(true);
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.5)' : '#f9fafb';
      }}
      onMouseLeave={(e) => {
        setShowActions(false);
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Expand/Collapse Button */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpanded(item.path);
          }}
          className="flex items-center justify-center w-4 h-4 rounded transition-colors"
          style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      )}
      
      {!hasChildren && <div className="w-4 h-4" />}
      
      {/* File/Directory Icon */}
      <div className="flex items-center">
        {isDirectory ? (
          <Folder className="w-4 h-4 text-blue-500" />
        ) : (
          getFileIcon(item.path)
        )}
      </div>
      
      {/* Recovery Status Icon (if in recovery mode) */}
      {item.recoveryStatus && (
        <div className="flex items-center">
          {getRecoveryStatusIcon(item.recoveryStatus)}
        </div>
      )}
      
      {/* Classification Icon */}
      <div className="flex items-center">
        {getClassificationIcon(item.classification)}
      </div>
      
      {/* File/Directory Name */}
      <div className="flex-1 min-w-0">
        <div 
          className="text-sm font-medium truncate"
          style={{ color: textColor }}
        >
          {item.type === 'dir' ? pathBasename(item.path) : pathBasename(item.relPath)}
        </div>
        {item.type === 'file' && (
          <div 
            className="text-xs truncate"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {item.relPath}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleAction(e, 'copy')}
            className="p-1 rounded"
            style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Copy relative path"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          {item.type === 'file' && (
            <button
              onClick={(e) => handleAction(e, 'open')}
              className="p-1 rounded"
              style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Open in editor"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          
          {/* Restore button (only for missing files) */}
          {item.recoveryStatus === 'missing_in_prod' && item.type === 'file' && (
            <button
              onClick={(e) => handleAction(e, 'restore')}
              className="p-1 rounded"
              style={{ color: isDark ? '#c084fc' : '#9333ea' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(147, 51, 234, 0.3)' : '#e9d5ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Restore from backup"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={(e) => handleAction(e, 'reasons')}
            className="p-1 rounded"
            style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#4b5563' : '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="View classification reasons"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Badges */}
      <div className="flex-shrink-0 mr-2">
        {renderBadges()}
      </div>
    </div>
  );
});

const Tree = memo<TreeProps>(({ 
  treeItems, 
  expandedPaths, 
  onToggleExpanded, 
  onNodeAction,
  className = '',
  isDark: isDarkProp
}) => {
  const theme = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme.palette.mode === 'dark';
  const [flattenedList, setFlattenedList] = useState<TreeItem[]>([]);
  
  // Flatten tree for virtualization
  const flattenTree = (items: TreeItem[], level: number = 0): TreeItem[] => {
    const result: TreeItem[] = [];
    
    items.forEach(item => {
      const flattenedItem = { ...item, level };
      result.push(flattenedItem);
      
      if (item.children && item.children.length > 0 && item.expanded) {
        result.push(...flattenTree(item.children, level + 1));
      }
    });
    
    return result;
  };
  
  useEffect(() => {
    const flattened = flattenTree(treeItems);
    setFlattenedList(flattened);
  }, [treeItems, expandedPaths]);
  
  if (treeItems.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-64 rounded-lg"
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          color: isDark ? '#9ca3af' : '#6b7280'
        }}
      >
        <div className="text-center">
          <FileCode 
            className="w-8 h-8 mx-auto mb-2" 
            style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
          />
          <p>No files found matching current filters</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`rounded-lg ${className}`}
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
      }}
    >
      <div 
        className="p-4"
        style={{
          backgroundColor: isDark ? 'rgba(55, 65, 81, 0.5)' : '#f9fafb',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
        }}
      >
        <div className="flex items-center justify-between">
          <h3 
            className="font-medium"
            style={{ color: isDark ? '#f3f4f6' : '#111827' }}
          >
            File Tree ({flattenedList.length} items)
          </h3>
          <div 
            className="text-sm"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {treeItems.length} root items
          </div>
        </div>
      </div>
      
      <div 
        className="overflow-auto" 
        style={{ 
          maxHeight: '600px',
          backgroundColor: isDark ? '#1f2937' : '#ffffff'
        }}
      >
        {flattenedList.map((item, index) => (
          <TreeNode
            key={`${item.path}-${index}`}
            item={item}
            level={(item as any).level || 0}
            onToggleExpanded={onToggleExpanded}
            onNodeAction={onNodeAction}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
});

Tree.displayName = 'Tree';
TreeNode.displayName = 'TreeNode';

export default Tree;
