# Source Code Extraction: refactor-console

**Extracted from:** `/var/www/orthodoxmetrics/prod/front-end/src/features/devel-tools/refactor-console`
**Generated:** 2026-01-26 07:23:43 UTC

---

**Total files:** 7

## Table of Contents

- [api/refactorConsoleClient.ts](#api-refactorconsoleclient-ts)
- [components/Legend.tsx](#components-legend-tsx)
- [components/Toolbar.tsx](#components-toolbar-tsx)
- [components/Tree.tsx](#components-tree-tsx)
- [hooks/useRefactorScan.ts](#hooks-userefactorscan-ts)
- [README.md](#readme-md)
- [RefactorConsole.tsx](#refactorconsole-tsx)

---

## File: `api/refactorConsoleClient.ts`

**Size:** 1743 bytes | **Lines:** 61

```typescript
import { RefactorScan } from '@/types/refactorConsole';

class RefactorConsoleClient {
  private baseUrl = '/api/refactor-console';

  /**
   * Scan the codebase for refactoring analysis
   * @param rebuild - Whether to force a rebuild of the scan (ignore cache)
   * @returns Promise containing the scan results
   */
  async scan(rebuild: boolean = false): Promise<RefactorScan> {
    try {
      const params = new URLSearchParams();
      if (rebuild) {
        params.append('rebuild', '1');
      }

      const response = await fetch(`${this.baseUrl}/scan?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch refactor scan:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch scan data');
    }
  }

  /**
   * Check if cached scan data exists and is recent
   */
  async checkCacheStatus(): Promise<{ exists: boolean; age: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/scan`, {
        method: 'HEAD',
        credentials: 'include',
      });

      const age = response.status === 200 ? 0 : -1;
      return {
        exists: response.status === 200,
        age
      };
    } catch (error) {
      return { exists: false, age: -1 };
    }
  }
}

// Export singleton instance
export const refactorConsoleClient = new RefactorConsoleClient();
export default refactorConsoleClient;
```

---

## File: `components/Legend.tsx`

**Size:** 7819 bytes | **Lines:** 226

```typescript
import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  XCircle,
  GitBranch,
  Zap,
  Calendar,
  FileText
} from 'lucide-react';
import { Classification, RefactorScan, FilterState } from '@/types/refactorConsole';

interface LegendProps {
  scanData: RefactorScan | null;
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  className?: string;
}

const Legend: React.FC<LegendProps> = ({ 
  scanData, 
  filterState, 
  onFilterChange,
  className = '' 
}) => {
  if (!scanData) return null;

  const classificationConfigs = [
    {
      key: 'green' as Classification,
      label: 'Production Ready',
      icon: CheckCircle,
      description: 'Likely in production and actively used',
      color: 'green',
      count: scanData.summary.likelyInProd
    },
    {
      key: 'orange' as Classification,
      label: 'High Risk',
      icon: AlertTriangle,
      description: 'May be used by multiple feature areas',
      color: 'orange',
      count: scanData.summary.highRisk
    },
    {
      key: 'yellow' as Classification,
      label: 'In Development',
      icon: Clock,
      description: 'Development files or low usage, recent edits',
      color: 'yellow',
      count: scanData.summary.inDevelopment
    },
    {
      key: 'red' as Classification,
      label: 'Legacy/Duplicate',
      icon: XCircle,
      description: 'Duplicates, legacy patterns, or old files',
      color: 'red',
      count: scanData.summary.legacyOrDupes
    }
  ];

  const handleClassificationToggle = (classification: Classification) => {
    const newClassifications = filterState.classifications.includes(classification)
      ? filterState.classifications.filter(c => c !== classification)
      : [...filterState.classifications, classification];
    
    onFilterChange({ classifications: newClassifications });
  };

  const handleSelectAllClassifications = () => {
    onFilterChange({ classifications: ['green', 'orange', 'yellow', 'red'] });
  };

  const handleDeselectAllClassifications = () => {
    onFilterChange({ classifications: [] });
  };

  const getColorClasses = (color: string) => ({
    bg: color === 'green' ? 'bg-green-100' : 
        color === 'orange' ? 'bg-orange-100' : 
        color === 'yellow' ? 'bg-yellow-100' : 'bg-red-100',
    text: color === 'green' ? 'text-green-800' : 
          color === 'orange' ? 'text-orange-800' : 
          color === 'yellow' ? 'text-yellow-800' : 'text-red-800',
    border: color === 'green' ? 'border-green-300' : 
            color === 'orange' ? 'border-orange-300' : 
            color === 'yellow' ? 'border-yellow-300' : 'border-red-300',
    icon: color === 'green' ? 'text-green-600' : 
          color === 'orange' ? 'text-orange-600' : 
          color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
  });

  const IconComponent = ({
    icon: IconComponent,
    classification,
    colors
  }: {
    icon: any;
    classification: Classification;
    colors: any;
  }) => {
    switch (classification) {
      case 'green':
        return <CheckCircle className={`w-4 h-4 ${colors.icon}`} />;
      case 'orange':
        return <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />;
      case 'yellow':
        return <Clock className={`w-4 h-4 ${colors.icon}`} />;
      case 'red':
        return <XCircle className={`w-4 h-4 ${colors.icon}`} />;
      default:
        return <FileText className={`w-4 h-4 ${colors.icon}`} />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Classification Legend</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllClassifications}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              All
            </button>
            <button
              onClick={handleDeselectAllClassifications}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Classification Items */}
      <div className="p-4 space-y-3">
        {classificationConfigs.map((config) => {
          const colors = getColorClasses(config.color);
          const Icon = config.icon;
          const isSelected = filterState.classifications.includes(config.key);

          return (
            <div
              key={config.key}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.border} border-opacity-100`
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleClassificationToggle(config.key)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded ${
                  isSelected ? colors.bg : 'bg-gray-200'
                }`}>
                  <IconComponent
                    icon={Icon}
                    classification={config.key}
                    colors={{ icon: isSelected ? colors.icon : 'text-gray-400' }}
                  />
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium text-sm ${
                    isSelected ? colors.text : 'text-gray-700'
                  }`}>
                    {config.label}
                  </div>
                  <div className={`text-xs ${
                    isSelected ? colors.text : 'text-gray-500'
                  } text-opacity-75`}>
                    {config.description}
                  </div>
                </div>
                
                <div className={`text-sm font-medium ${
                  isSelected ? colors.text : 'text-gray-500'
                }`}>
                  {config.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {scanData.summary.totalFiles}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {scanData.summary.totalDirs}
            </div>
            <div className="text-sm text-gray-600">Directories</div>
          </div>
          <div className="col-span-2 mt-2">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <span>{scanData.summary.duplicates} duplicates</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Last scan: {new Date(scanData.generatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legend;
```

---

## File: `components/Toolbar.tsx`

**Size:** 13509 bytes | **Lines:** 362

```typescript
import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  Zap,
  FileSearch,
  Calendar,
  AlertCircle,
  Save,
  Settings
} from 'lucide-react';
import { FilterState, SortOption } from '@/types/refactorConsole';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  sortOptions: SortOption[];
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  
  isLoading: boolean;
  onRefresh: () => void;
  onAnalyze: () => void;
  
  filteredCount: number;
  totalCount: number;
  
  className?: string;
}

const Toolbar: React.FC<ToolbarProps> = ({
  searchQuery,
  onSearchChange,
  sortOptions,
  currentSort,
  onSortChange,
  filterState,
  onFilterChange,
  isLoading,
  onRefresh,
  onAnalyze,
  filteredCount,
  totalCount,
  className = ''
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showFileTypePicker, setShowFileTypePicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  const fileTypes = [
    { label: 'All Files', value: '' },
    { label: 'TypeScript', value: '.ts' },
    { label: 'TSX Components', value: '.tsx' },
    { label: 'JavaScript', value: '.js' },
    { label: 'JSX Components', value: '.jsx' },
    { label: 'CSS/SCSS', value: '.css' },
    { label: 'JSON', value: '.json' },
    { label: 'Configuration', value: ['.json', '.yaml', '.yml', '.toml'] },
  ];

  const modifiedTimeOptions = [
    { label: 'All Time', value: 0 },
    { label: 'Last 24 Hours', value: 1 },
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
  ];

  const handleFileTypeSelect = (value: string | string[]) => {
    onFilterChange({ 
      fileType: Array.isArray(value) ? value[0] : value 
    });
    setShowFileTypePicker(false);
  };

  const handleSortSelect = (sort: SortOption) => {
    onSortChange(sort);
    setShowSortPicker(false);
  };

  const handleModifiedTimeSelect = (days: number) => {
    onFilterChange({ modifiedDays: days });
  };

  const clearFilters = () => {
    onFilterChange({
      classifications: ['green', 'orange', 'yellow', 'red'],
      searchQuery: '',
      fileType: '',
      modifiedDays: 0,
      showDuplicates: false,
    });
  };

  const hasActiveFilters = 
    filterState.searchQuery.trim() !== '' ||
    filterState.fileType !== '' ||
    filterState.modifiedDays > 0 ||
    filterState.showDuplicates ||
    filterState.classifications.length < 4;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Main Toolbar */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search files by name or path..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortPicker(!showSortPicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {currentSort.key === 'score' ? (
                  <Zap className="w-4 h-4" />
                ) : currentSort.key === 'name' ? (
                  <FileSearch className="w-4 h-4" />
                ) : currentSort.key === 'mtime' ? (
                  <Calendar className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{currentSort.label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showSortPicker && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {sortOptions.map((option) => (
                      <button
                        key={`${option.key}-${option.direction}`}
                        onClick={() => handleSortSelect(option)}
                        className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 flex items-center gap-2 ${
                          currentSort.key === option.key && currentSort.direction === option.direction
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.key === 'score' ? (
                          <Zap className="w-4 h-4" />
                        ) : option.key === 'name' ? (
                          <FileSearch className="w-4 h-4" />
                        ) : option.key === 'mtime' ? (
                          <Calendar className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        <span>{option.label}</span>
                        {option.direction === 'asc' ? (
                          <SortAsc className="w-4 h-4 ml-auto" />
                        ) : (
                          <SortDesc className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* File Type Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFileTypePicker(!showFileTypePicker)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <FileSearch className="w-4 h-4" />
                <span>{filterState.fileType || 'All Types'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showFileTypePicker && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    {fileTypes.map((type) => (
                      <button
                        key={type.label}
                        onClick={() => handleFileTypeSelect(type.value)}
                        className={`w-full px-3 py-2 text-left text-sm rounded hover:bg-gray-50 ${
                          (Array.isArray(type.value) ? type.value.includes(filterState.fileType) : filterState.fileType === type.value)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Additional Filters */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg ${
                hasActiveFilters
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg transition-colors ${
                isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'hover:bg-gray-50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Analyze Button */}
            <button
              onClick={onAnalyze}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Analyze</span>
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <div>
            Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} files
            {hasActiveFilters && ' (filtered)'}
          </div>
          
          {isLoading && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing codebase...</span>
            </div>
          )}
        </div>
      </div>

      {/* Extended Filters Panel */}
      {showFilters && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Modified Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modified Within
              </label>
              <select
                value={filterState.modifiedDays}
                onChange={(e) => handleModifiedTimeSelect(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {modifiedTimeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duplicates Only */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showDuplicates"
                checked={filterState.showDuplicates}
                onChange={(e) => onFilterChange({ showDuplicates: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="showDuplicates" className="text-sm font-medium text-gray-700">
                Show duplicates only
              </label>
            </div>

            {/* Quick Filter Badges */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Quick Filters</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => filterState.showDuplicates ? null : onFilterChange({ showDuplicates: true })}
                  className={`px-2 py-1 text-xs rounded-full ${
                    filterState.showDuplicates
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                  }`}
                >
                  Duplicates
                </button>
                <button
                  onClick={() => onFilterChange({ modifiedDays: filterState.modifiedDays === 7 ? 0 : 7 })}
                  className={`px-2 py-1 text-xs rounded-full ${
                    filterState.modifiedDays === 7
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                  }`}
                >
                  Recent (7d)
                </button>
                <button
                  onClick={() => onFilterChange({ classifications: ['red'] })}
                  className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Legacy Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;
```

---

## File: `components/Tree.tsx`

**Size:** 10005 bytes | **Lines:** 351

```typescript
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
      
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        {flattenedList.map((item, index) => (
          <TreeNode
            key={`${item.path}-${index}`}
            item={item}
            level={(item as any).level || 0}
            onToggleExpanded={onToggleExpanded}
            onNodeAction={onNodeAction}
          />
        ))}
      </div>
    </div>
  );
});

Tree.displayName = 'Tree';
TreeNode.displayName = 'TreeNode';

export default Tree;
```

---

## File: `hooks/useRefactorScan.ts`

**Size:** 8280 bytes | **Lines:** 262

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefactorScan, FileNode, Classification, FilterState, SortOption, TreeItem } from '@/types/refactorConsole';
import refactorConsoleClient from '../api/refactorConsoleClient';

interface UseRefactorScanReturn {
  scanData: RefactorScan | null;
  isLoading: boolean;
  error: string | null;
  
  // Filtering and search
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  
  // Sorting
  sortOption: SortOption;
  setSortOption: React.Dispatch<React.SetStateAction<SortOption>>;
  
  // Tree structure
  treeItems: TreeItem[];
  expandedPaths: Set<string>;
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  
  // Actions
  loadScanData: (rebuild?: boolean) => Promise<void>;
  refreshScan: () => Promise<void>;
  
  // Utilities
  toggleExpanded: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Statistics
  filteredCount: number;
  visibleNodes: FileNode[];
}

export const useRefactorScan = (): UseRefactorScanReturn => {
  const [scanData, setScanData] = useState<RefactorScan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filterState, setFilterState] = useState<FilterState>({
    classifications: ['green', 'orange', 'yellow', 'red'],
    searchQuery: '',
    fileType: '',
    modifiedDays: 0,
    showDuplicates: false,
  });
  
  const [sortOption, setSortOption] = useState<SortOption>({
    key: 'score',
    direction: 'desc',
    label: 'Usage Score (High to Low)',
  });
  
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Load scan data
  const loadScanData = useCallback(async (rebuild: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await refactorConsoleClient.scan(rebuild);
      setScanData(data);
      
      // Auto-expand first level directories
      const autoExpandPaths = new Set<string>();
      if (data.nodes) {
        data.nodes
          .filter(node => node.type === 'dir')
          .slice(0, 5)  // Expand first 5 directories
          .forEach(node => autoExpandPaths.add(node.path));
      }
      setExpandedPaths(autoExpandPaths);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan data');
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshScan = useCallback(() => {
    return loadScanData(true);
  }, [loadScanData]);

  // Apply filters and sorting
  const filteredAndSortedNodes = useMemo(() => {
    if (!scanData?.nodes) return [];
    
    let filtered = scanData.nodes;
    
    // Apply classification filter
    filtered = filtered.filter(node => 
      filterState.classifications.includes(node.classification)
    );
    
    // Apply search query
    if (filterState.searchQuery.trim()) {
      const query = filterState.searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.relPath.toLowerCase().includes(query) ||
        node.reasons.some(reason => reason.toLowerCase().includes(query))
      );
    }
    
    // Apply file type filter
    if (filterState.fileType) {
      filtered = filtered.filter(node => 
        node.type === 'file' && 
        node.relPath.toLowerCase().endsWith(filterState.fileType.toLowerCase())
      );
    }
    
    // Apply modification date filter
    if (filterState.modifiedDays > 0) {
      const cutoffDate = Date.now() - (filterState.modifiedDays * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(node => node.mtimeMs >= cutoffDate);
    }
    
    // Apply duplicates filter
    if (filterState.showDuplicates) {
      filtered = filtered.filter(node => 
        node.similarity?.duplicates.length || node.similarity?.nearMatches.length
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption.key) {
        case 'score':
          comparison = a.usage.score - b.usage.score;
          break;
        case 'name':
          comparison = a.relPath.localeCompare(b.relPath);
          break;
          case 'mtime':
            comparison = a.mtimeMs - b.mtimeMs;
            break;
            case 'classification':
              const classificationOrder = { red: 0, orange: 1, yellow: 2, green: 3 };
              comparison = classificationOrder[a.classification] - classificationOrder[b.classification];
              break;
            default:
              comparison = 0;
          }
          
          return sortOption.direction === 'desc' ? -comparison : comparison;
        });
        
        return filtered;
      }, [scanData?.nodes, filterState, sortOption]);
      
      // Build tree structure
      const treeItems = useMemo(() => {
        if (!filteredAndSortedNodes.length) return [];
        
        const treeMap = new Map<string, TreeItem>();
        const rootItems: TreeItem[] = [];
        
        // Create tree item for each node
        filteredAndSortedNodes.forEach(node => {
          const treeItem: TreeItem = {
            ...node,
            children: [],
            expanded: expandedPaths.has(node.path),
            visible: true,
            parentPath: undefined,
          };
          treeMap.set(node.path, treeItem);
        });
        
        // Build hierarchy
        filteredAndSortedNodes.forEach(node => {
          const treeItem = treeMap.get(node.path)!;
          
          // Find the closest parent directory
          const pathParts = node.path.split('/');
          let parentPath = '';
          
          for (let i = pathParts.length - 1; i > 0; i--) {
            parentPath = pathParts.slice(0, i).join('/');
            const parentItem = treeMap.get(parentPath + '/'); // Directory paths end with '/'
            
            if (parentItem) {
              parentItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
            
            parentPath = pathParts.slice(0, i).join('/');
            const parentDirItem = treeMap.get(parentPath);
            
            if (parentDirItem && parentDirItem.type === 'dir') {
              parentDirItem.children!.push(treeItem);
              treeItem.parentPath = parentPath;
              break;
            }
          }
          
          // If no parent found, it's a root item
          if (!treeItem.parentPath) {
            rootItems.push(treeItem);
          }
        });
        
        return rootItems;
      }, [filteredAndSortedNodes, expandedPaths]);
      
      // Utility functions
      const toggleExpanded = useCallback((path: string) => {
        setExpandedPaths(prev => {
          const newSet = new Set(prev);
          if (newSet.has(path)) {
            newSet.delete(path);
          } else {
            newSet.add(path);
          }
          return newSet;
        });
      }, []);
      
      const expandAll = useCallback(() => {
        const allDirPaths = scanData?.nodes
          ?.filter(node => node.type === 'dir')
          .map(node => node.path) || [];
        setExpandedPaths(new Set(allDirPaths));
      }, [scanData?.nodes]);
      
      const collapseAll = useCallback(() => {
        setExpandedPaths(new Set());
      }, []);
      
      // Auto-load on mount
      useEffect(() => {
        loadScanData();
      }, [loadScanData]);
      
      return {
        scanData,
        isLoading,
        error,
        filterState,
        setFilterState,
        sortOption,
        setSortOption,
        treeItems,
        expandedPaths,
        setExpandedPaths,
        loadScanData,
        refreshScan,
        toggleExpanded,
        expandAll,
        collapseAll,
        filteredCount: filteredAndSortedNodes.length,
        visibleNodes: filteredAndSortedNodes,
      };
    };
```

---

## File: `README.md`

**Size:** 7091 bytes | **Lines:** 223

```markdown
# Refactor Console

A comprehensive developer tool for analyzing codebase structure, detecting duplicates, usage patterns, and refactoring opportunities.

## Features

### Code Analysis
- **File Discovery**: Scans `/var/www/orthodoxmetrics/prod/front-end/src/**` and `/var/www/orthodoxmetrics/prod/server/**`
- **Usage Analysis**: Tracks import references, server dependencies, route usage, and runtime hints
- **Smart Classification**: Files are classified as:
  - 🟢 **Green (Production Ready)**: Likely in production and actively used
  - 🟠 **Orange (High Risk)**: Used by multiple feature areas or core systems
  - 🟡 **Yellow (In Development)**: Development files or low usage, recent edits
  - 🔴 **Red (Legacy/Duplicate)**: Duplicates, legacy patterns, or old files

### Duplicate Detection
- **Exact Duplicates**: MD5 hash comparison for identical files
- **Near-Duplicates**: Levenshtein similarity analysis for similar filenames
- **Similarity Scoring**: Configurable thresholds (≥0.85 for near-matches, ≥0.9 for high-risk)

### Interactive UI
- **Virtualized Tree**: Handles large codebases with virtual scrolling
- **Advanced Filtering**: By classification, file type, modification date, duplicated status
- **Smart Sorting**: By usage score, name, modification time, or classification priority
- **Real-time Search**: File name and path search with instant results

## Installation

### Prerequisites
Ensure the following dependencies are installed:

**Frontend Dependencies (already added):**
```json
{
  "react-window": "^1.8.6",
  "react-hot-toast": "^2.4.1"
}
```

**Backend Dependencies (already added):**
```json
{
  "fs-extra": "^11.1.1",
  "glob": "^10.3.10",
  "ts-morph": "^27.0.0"
}
```

### Installation Steps

1. **Install Dependencies**:
   ```bash
   # Frontend dependencies
   cd /var/www/orthodoxmetrics/prod/front-end
   npm install

   # Backend dependencies
   cd /var/www/orthodoxmetrics/prod/server
   npm install
   ```

2. **Restart Services**:
   ```bash
   # Restart the backend to load new routes
   pm2 restart orthodoxmetrics-server

   # Rebuild frontend
   cd /var/www/orthodoxmetrics/prod/front-end
   npm run build
   ```

## Usage

### Accessing the Tool
1. Navigate to **Developer Tools > Refactor Console** in the sidebar menu
2. Or visit `/devel-tools/refactor-console` directly
3. Requires `super_admin` or `admin` role

### Performing Analysis
1. **Initial Scan**: Automatically performs on first visit
2. **Refresh**: Updates from cache (refreshes if >10 minutes old)
3. **Full Analysis**: Click "Analyze" button to force a complete rebuild

### Interpreting Results

#### Classification Legend
- **Green Files**: Core production files with high usage scores
- **Orange Files**: High-impact files that affect multiple systems
- **Yellow Files**: Development/testing files or recently modified code
- **Red Files**: Suspected duplicates or legacy code

#### Usage Scores
Composite score calculated as:
- Import References × 4
- Server References × 3
- Route References × 5
- Runtime Hints × 2

#### Risk Indicators
- **Import References**: How often other files import this file
- **Server References**: Server-side require()/import() usage
- **Route References**: Mentions in Router/Menu or route definitions
- **Runtime Hints**: Files observed in server middleware/controllers

## API Endpoints

### GET `/api/refactor-console/scan`
Scan the codebase and return analysis results.

**Query Parameters:**
- `rebuild`: `0` (use cache) or `1` (force rebuild)

**Response:**
```typescript
interface RefactorScan {
  generatedAt: string;
  root: string;
  summary: {
    totalFiles: number;
    totalDirs: number;
    duplicates: number;
    likelyInProd: number;
    highRisk: number;
    inDevelopment: number;
    legacyOrDupes: number;
  };
  nodes: FileNode[];
}
```

### Caching
- Analysis results are cached at `/var/www/orthodoxmetrics/prod/.analysis/refactor-scan.json`
- Cache auto-refreshes every 10 minutes
- Use `?rebuild=1` to force immediate rebuild

## Configuration

### File Patterns

**Include Patterns:**
- `/var/www/orthodoxmetrics/prod/front-end/src/**`
- `/var/www/orthodoxmetrics/prod/server/**`

**Exclude Patterns:**
- `**/node_modules/**`
- `**/dist/**`
- `**/.git/**`
- `**/.next/**`
- `**/build/**`
- `**/.cache/**`
- `**/coverage/**`
- `**/.nyc_output/**`

### Classification Heuristics

**Green (Production)**: Files in `front-end/src/features/**` with usage score ≥5 and referenced in routes

**Orange (High Risk)**: Files used by ≥2 distinct feature areas OR imported by auth/layout/core providers OR server middleware with ≥3 refs

**Yellow (Development)**: Files under `devel-*`, `demos/`, `examples/`, `sandbox/` OR files with usage score <3 and modified in last 14 days

**Red (Legacy/Duplicate)**: Exact duplicate exists elsewhere OR near-duplicate ≥0.9 similarity OR files under `legacy/`, `old/`, `backup/`, `-copy/`, `.bak`, `.old` patterns

## Troubleshooting

### Common Issues

**1. Analysis Takes Too Long**
- Large codebases may take several minutes for initial scan
- Consider adjusting include/exclude patterns if necessary
- Monitor server CPU usage during analysis

**2. High Memory Usage**
- Analysis uses worker threads for hashing and similarity calculations
- Monitor memory usage with very large codebases
- Consider running analysis during low-traffic periods

**3. Cache Issues**
- Clear cache by deleting `/var/www/orthodoxmetrics/prod/.analysis/refactor-scan.json`
- Force rebuild with `?rebuild=1` parameter

**4. Permission Errors**
- Ensure server has read access to all included directories
- Check file permissions for the `.analysis` directory

### Performance Notes
- Virtualized tree handles thousands of files efficiently
- Search is debounced for responsive UX
- Analysis runs in background worker threads
- Results are cached to avoid repeated expensive computations

## Development

### File Structure
```
src/features/devel-tools/refactor-console/
├── RefactorConsole.tsx          # Main page component
├── api/
│   └── refactorConsoleClient.ts # API client
├── hooks/
│   └── useRefactorScan.ts       # Data management hook
├── components/
│   ├── Tree.tsx                 # Virtualized file tree
│   ├── Legend.tsx               # Classification legend
│   └── Toolbar.tsx              # Search and filter controls
└── README.md                    # This file
```

### Backend Structure
```
server/src/routes/
└── refactorConsole.ts           # Express router with scan logic
```

### Contributing
When adding new analysis features:
1. Update `RefactorScan` interface in types
2. Modify classification logic in backend
3. Update frontend components to display new data
4. Add corresponding tests

## License
Same as the OrthodoxMetrics project.
```

---

## File: `RefactorConsole.tsx`

**Size:** 15265 bytes | **Lines:** 408

```typescript
import React, { useState } from 'react';
import {
  AlertCircle,
  RefreshCw,
  Search,
  Zap,
  Info,
  Copy,
  ExternalLink,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';

import Tree from './components/Tree';
import Legend from './components/Legend';
import Toolbar from './components/Toolbar';
import { useRefactorScan } from './hooks/useRefactorScan';
import { SortOption, Classification } from '@/types/refactorConsole';

const RefactorConsole: React.FC = () => {
  const {
    scanData,
    isLoading,
    error,
    filterState,
    setFilterState,
    sortOption,
    setSortOption,
    treeItems,
    expandedPaths,
    setExpandedPaths,
    refreshScan,
    toggleExpanded,
    expandAll,
    collapseAll,
    filteredCount,
    visibleNodes
  } = useRefactorScan();

  const [showModal, setShowModal] = useState<{ 
    type: 'reasons' | 'duplicates'; 
    data: any 
  } | null>(null);

  // Sort options configuration
  const sortOptions: SortOption[] = [
    { key: 'score', direction: 'desc', label: 'Usage Score (High to Low)' },
    { key: 'score', direction: 'asc', label: 'Usage Score (Low to High)' },
    { key: 'name', direction: 'asc', label: 'File Name (A-Z)' },
    { key: 'name', direction: 'desc', label: 'File Name (Z-A)' },
    { key: 'mtime', direction: 'desc', label: 'Recently Modified' },
    { key: 'mtime', direction: 'asc', label: 'Oldest Modified' },
    { key: 'classification', direction: 'asc', label: 'Classification Priority' },
  ];

  // Handle toolbar actions
  const handleSearchChange = (query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (updates: Partial<typeof filterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };

  const handleRefresh = async () => {
    try {
      await refreshScan();
      toast.success('Scan data refreshed');
    } catch (error) {
      toast.error('Failed to refresh scan data');
    }
  };

  const handleAnalyze = async () => {
    try {
      await refreshScan(); // This will trigger a rebuild
      toast.success('Codebase analysis completed');
    } catch (error) {
      toast.error('Failed to analyze codebase');
    }
  };

  // Handle tree actions
  const handleNodeAction = (action: string, node: any) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(node.relPath);
        toast.success('Path copied to clipboard');
        break;
        
      case 'open':
        // In a real implementation, this would integrate with VS Code or similar
        toast.info(`Would open ${node.relPath} in editor`);
        break;
        
      case 'reasons':
        setShowModal({ 
          type: 'reasons', 
          data: { 
            node, 
            reasons: node.reasons,
            classification: node.classification,
            usage: node.usage
          } 
        });
        break;
        
      case 'duplicates':
        if (node.similarity?.duplicates.length || node.similarity?.nearMatches.length) {
          setShowModal({ 
            type: 'replicates', 
            data: { 
              node, 
              duplicates: node.similarity?.duplicates || [],
              nearMatches: node.similarity?.nearMatches || []
            } 
          });
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleToggleExpanded = (path: string) => {
    toggleExpanded(path);
  };

  // Modal component for showing details
  const Modal = ({ onClose }: { onClose: () => void }) => {
    if (!showModal) return null;

    const { type, data } = showModal;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {type === 'reasons' ? 'Classification Details' : 'Duplicate Analysis'}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {type === 'reasons' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">File Information</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-mono">{data.node.relPath}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Classification: <span className="font-medium">{data.classification}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Usage Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-800">Import References</p>
                      <p className="text-lg font-semibold text-blue-900">{data.usage.importRefs}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm text-green-800">Server References</p>
                      <p className="text-lg font-semibold text-green-900">{data.usage.serverRefs}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-sm text-purple-800">Route References</p>
                      <p className="text-lg font-semibold text-purple-900">{data.usage.routeRefs}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-sm text-orange-800">Usage Score</p>
                      <p className="text-lg font-semibold text-orange-900">{data.usage.score}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Classification Reasons</h3>
                  <ul className="space-y-1">
                    {data.reasons.map((reason: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {type === 'duplicates' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Duplicate Analysis</h3>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-mono">{data.node.relPath}</p>
                  </div>
                </div>

                {data.duplicates.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Exact Duplicates</h3>
                    <ul className="space-y-1">
                      {data.duplicates.map((duplicate: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span className="font-mono">{duplicate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.nearMatches.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Near Matches</h3>
                    <ul className="space-y-2">
                      {data.nearMatches.map((match: any, index: number) => (
                        <li key={index} className="bg-yellow-50 p-3 rounded">
                          <div className="flex justify-between items-start">
                            <span className="font-mono text-sm">{match.target}</span>
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                              {Math.round(match.similarity * 100)}% similar
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Refactor Console</h1>
              <p className="text-gray-600 mt-1">
                Analyze your codebase for duplicates, usage patterns, and refactoring opportunities
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {scanData && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">Last scan</div>
                  <div className="text-sm font-medium">
                    {new Date(scanData.generatedAt).toLocaleString()}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLoading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h3 className="font-medium text-red-800">Error Loading Data</h3>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {isLoading && !scanData && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <h3 className="font-medium text-gray-900 mb-2">Analyzing Codebase</h3>
              <p className="text-gray-600">This may take a few moments...</p>
            </div>
          </div>
        )}

        {scanData && (
          <div className="space-y-6">
            {/* Toolbar */}
            <Toolbar
              searchQuery={filterState.searchQuery}
              onSearchChange={handleSearchChange}
              sortOptions={sortOptions}
              currentSort={sortOption}
              onSortChange={handleSortChange}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onAnalyze={handleAnalyze}
              filteredCount={filteredCount}
              totalCount={scanData.summary.totalFiles + scanData.summary.totalDirs}
            />

            {/* Stats Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {scanData.summary.likelyInProd}
                  </div>
                  <div className="text-sm text-gray-600">Production Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {scanData.summary.highRisk}
                  </div>
                  <div className="text-sm text-gray-600">High Risk</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {scanData.summary.inDevelopment}
                  </div>
                  <div className="text-sm text-gray-600">In Development</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {scanData.summary.legacyOrDupes}
                  </div>
                  <div className="text-sm text-gray-600">Legacy/Duplicates</div>
                </div>
              </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Legend */}
              <div className="lg:col-span-1">
                <Legend
                  scanData={scanData}
                  filterState={filterState}
                  onFilterChange={handleFilterChange}
                />
              </div>

              {/* File Tree */}
              <div className="lg:col-span-3">
                <Tree
                  treeItems={treeItems}
                  expandedPaths={expandedPaths}
                  onToggleExpanded={handleToggleExpanded}
                  onNodeAction={handleNodeAction}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal onClose={() => setShowModal(null)} />
    </div>
  );
};

export default RefactorConsole;
```

---


---

**Extraction complete.**

Generated by `om-md` on 2026-01-26 07:23:44 UTC
