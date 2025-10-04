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
import { Toaster, toast } from 'react-hot-toast';

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
      <Toaster position="top-right" />
      
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
