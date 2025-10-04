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
