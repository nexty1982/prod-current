import React, { useState } from 'react';
import { TargetInput } from './TargetInput.tsx';
import { ResultsList } from './ResultsList.tsx';
import { useOmtraceApi } from './hooks/useOmtraceApi.ts';
import { useFsScan } from './hooks/useFsScan.ts';
import { OmtraceRunResult, RefactorResponse } from './types.ts';

export const OmtraceConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'console' | 'slugs' | 'tree' | 'history'>('console');
  const [results, setResults] = useState<OmtraceRunResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<OmtraceRunResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { runAnalysis, runRefactor, getHistory, getSlugRules, updateSlugRules } = useOmtraceApi();
  const { scanFileSystem, fileTree } = useFsScan();

  const handleAnalyze = async (targets: string[], flags: any) => {
    try {
      const result = await runAnalysis(targets, flags);
      setResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
  };

  const handleRefactor = async (target: string, options: any) => {
    try {
      const result = await runRefactor(target, options);
      console.log('Refactor result:', result);
      // Refresh results after refactor
      // setResults(prev => [...prev]);
    } catch (error) {
      console.error('Refactor failed:', error);
    }
  };

  const handleOpenDetails = (result: OmtraceRunResult) => {
    setSelectedResult(result);
    setIsDrawerOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDrawerOpen(false);
    setSelectedResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OMTrace Console</h1>
          <p className="text-gray-600">Component dependency analysis and intelligent refactoring</p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'console', label: 'Console', icon: '🔍' },
              { id: 'slugs', label: 'Slug Manager', icon: '🏷️' },
              { id: 'tree', label: 'Tree Browser', icon: '🌳' },
              { id: 'history', label: 'History', icon: '📚' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'console' && (
            <div className="space-y-6">
              {/* Analysis Input */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Analysis</h2>
                <TargetInput onAnalyze={handleAnalyze} isLoading={false} />
              </div>

              {/* Results */}
              {results.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
                  </div>
                  <ResultsList results={results} onOpenDetails={handleOpenDetails} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'slugs' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Slug Taxonomy Manager</h2>
              <div className="text-gray-600">
                <p>Manage domain and slug mapping rules for automatic refactoring.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <h3 className="font-medium mb-2">Prefix Rules (Hard Priority)</h3>
                  <ul className="text-sm space-y-1">
                    <li>• <code>Church*</code> → <code>church-management/ch-panel</code></li>
                    <li>• <code>User*</code> → <code>user-management/usr-core</code></li>
                    <li>• <code>Record*</code> → <code>record-management/rec-template</code></li>
                    <li>• <code>AccessControlDashboard*</code> → <code>dashboard-management/acl-dash</code></li>
                  </ul>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <h3 className="font-medium mb-2">Slug Taxonomy (Heuristics)</h3>
                  <ul className="text-sm space-y-1">
                    <li>• <code>Wizard</code> → <code>*-wiz</code></li>
                    <li>• <code>Roles/Permissions</code> → <code>*-roles</code></li>
                    <li>• <code>Options/Config</code> → <code>*-opt</code></li>
                    <li>• <code>Display/View</code> → <code>*-dis</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tree' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Tree Browser</h2>
              <div className="text-gray-600">
                <p>Browse the component dependency tree and explore relationships.</p>
                <button
                  onClick={() => scanFileSystem()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Scan File System
                </button>
                {fileTree && (
                  <div className="mt-4 p-4 bg-gray-50 rounded border">
                    <pre className="text-xs overflow-auto">{JSON.stringify(fileTree, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Refactor History</h2>
              <div className="text-gray-600">
                <p>View history of refactoring operations and their results.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded border">
                  <p className="text-sm">No refactor history available yet.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Drawer */}
      {isDrawerOpen && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Analysis Details</h3>
                <button
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Entry</h4>
                  <p className="text-sm text-gray-600">{selectedResult.entry}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Resolved Path</h4>
                  <p className="text-sm text-gray-600">{selectedResult.resolvedPath}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Direct Dependencies</h4>
                  <p className="text-sm text-gray-600">{selectedResult.direct.length} items</p>
                  <ul className="text-xs text-gray-500 mt-1">
                    {selectedResult.direct.slice(0, 5).map((dep, i) => (
                      <li key={i}>• {dep}</li>
                    ))}
                    {selectedResult.direct.length > 5 && (
                      <li>... and {selectedResult.direct.length - 5} more</li>
                    )}
                  </ul>
                </div>

                {selectedResult.transitive && (
                  <div>
                    <h4 className="font-medium text-gray-900">Transitive Dependencies</h4>
                    <p className="text-sm text-gray-600">{selectedResult.transitive.length} items</p>
                  </div>
                )}

                {selectedResult.api && selectedResult.api.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900">API Calls</h4>
                    <p className="text-sm text-gray-600">{selectedResult.api.length} endpoints</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OmtraceConsole;
