import React, { useState, useEffect, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
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
  MoreHorizontal
} from 'lucide-react';
import { TreeItem } from '@/types/refactorConsole';

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
}

interface TreeRowProps {
  index: number;
  style: React.CSSProperties;
}

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

const getClassificationTextColor = (classification: string) => {
  switch (classification) {
    case 'green':
      return 'text-green-700';
    case 'orange':
      return 'text-orange-700';
    case 'yellow':
      return 'text-yellow-700';
    case 'red':
      return 'text-red-700';
    default:
      return 'text-gray-700';
  }
};

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
}

const TreeNode = memo<TreeNodeProps>(({ 
  item, 
  level, 
  onToggleExpanded, 
  onNodeAction,
  showBadges = true 
}) => {
  const [showActions, setShowActions] = useState(false);
  const isExpanded = item.expanded;
  const hasChildren = item.children && item.children.length > 0;
  const isDirectory = item.type === 'dir';
  
  const indentStyle = { marginLeft: `${level * 16}px` };
      const iconTintClass = getClassificationTextColor(item.classification);
  
  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onNodeAction(action, item);
    setShowActions(false);
  };
  
  const renderBadges = () => {
    if (!showBadges) return null;
    
    const badges = [];
    
    // Classification badge
    badges.push(
      <span 
        key="classification"
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          item.classification === 'green' ? 'bg-green-100 text-green-800' :
          item.classification === 'orange' ? 'bg-orange-100 text-orange-800' :
          item.classification === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}
      >
        {item.classification.toUpperCase()}
      </span>
    );
    
    // Usage score badge
    if (item.type === 'file') {
      badges.push(
        <span 
          key="score" 
          className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium"
        >
          Score: {item.usage.score}
        </span>
      );
    }
    
    // Duplicate badge
    if (item.similarity?.duplicates.length || item.similarity?.nearMatches.length) {
      badges.push(
        <span 
          key="duplicates" 
          className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium flex items-center gap-1"
        >
          <GitBranch className="w-3 h-3" />
          Dupes
        </span>
      );
    }
    
    // Feature path badge
    if (item.featurePathMatch) {
      badges.push(
        <span 
          key="feature" 
          className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium"
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
      className={`flex items-center gap-2 py-2 px-3 hover:bg-gray-50 cursor-pointer group ${iconTintClass}`}
      style={indentStyle}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Expand/Collapse Button */}
      {hasChildren && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpanded(item.path);
          }}
          className="flex items-center justify-center w-4 h-4 hover:bg-gray-200 rounded transition-colors"
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
      
      {/* Classification Icon */}
      <div className="flex items-center">
        {getClassificationIcon(item.classification)}
      </div>
      
      {/* File/Directory Name */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${iconTintClass}`}>
          {item.type === 'dir' ? pathBasename(item.path) : pathBasename(item.relPath)}
        </div>
        {item.type === 'file' && (
          <div className="text-xs text-gray-500 truncate">
            {item.relPath}
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleAction(e, 'copy')}
            className="p-1 hover:bg-gray-200 rounded"
            title="Copy relative path"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          {item.type === 'file' && (
            <button
              onClick={(e) => handleAction(e, 'open')}
              className="p-1 hover:bg-gray-200 rounded"
              title="Open in editor"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={(e) => handleAction(e, 'reasons')}
            className="p-1 hover:bg-gray-200 rounded"
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
  className = '' 
}) => {
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
  
  const TreeRow = ({ index, style }: TreeRowProps) => {
    const item = flattenedList[index];
    if (!item) return null;
    
    return (
      <div style={style}>
        <TreeNode
          item={item}
          level={(item as any).level || 0}
          onToggleExpanded={onToggleExpanded}
          onNodeAction={onNodeAction}
        />
      </div>
    );
  };
  
  if (treeItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <FileCode className="w-8 h-8 mx-auto mb-2" />
          <p>No files found matching current filters</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">
            File Tree ({flattenedList.length} items)
          </h3>
          <div className="text-sm text-gray-500">
            {treeItems.length} root items
          </div>
        </div>
      </div>
      
      <div className="overflow-hidden">
        <List
          height={600}
          itemCount={flattenedList.length}
          itemSize={60}
          width="100%"
        >
          {TreeRow}
        </List>
      </div>
    </div>
  );
});

Tree.displayName = 'Tree';
TreeNode.displayName = 'TreeNode';

export default Tree;
