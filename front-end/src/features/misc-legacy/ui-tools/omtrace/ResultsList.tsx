import React from 'react';
import { ChevronRight, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { OmtraceRunResult } from './types';

interface ResultsListProps {
  results: OmtraceRunResult[];
  onOpenDetails: (result: OmtraceRunResult) => void;
}

export const ResultsList: React.FC<ResultsListProps> = ({ results, onOpenDetails }) => {
  const getStatusIcon = (result: OmtraceRunResult) => {
    if (result.error) return <XCircle className="w-5 h-5 text-red-500" />;
    if (result.direct.length === 0) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (result: OmtraceRunResult) => {
    if (result.error) return 'Error';
    if (result.direct.length === 0) return 'No Dependencies';
    return 'Success';
  };

  const getStatusColor = (result: OmtraceRunResult) => {
    if (result.error) return 'bg-red-100 text-red-800';
    if (result.direct.length === 0) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatPath = (path: string) => {
    if (path.startsWith('src/')) {
      return path.substring(4);
    }
    return path;
  };

  return (
    <div className="divide-y divide-gray-200">
      {results.map((result, index) => (
        <div
          key={index}
          className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => onOpenDetails(result)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(result)}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {result.entry}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatPath(result.resolvedPath)}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(result)}`}>
                  {getStatusText(result)}
                </span>
              </div>

              {/* Dependency Counts */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Direct:</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {result.direct.length}
                  </span>
                </div>
                
                {result.transitive && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Transitive:</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                      {result.transitive.length}
                    </span>
                  </div>
                )}
                
                {result.reverse && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Reverse:</span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                      {result.reverse.length}
                    </span>
                  </div>
                )}
                
                {result.api && result.api.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">API:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      {result.api.length}
                    </span>
                  </div>
                )}
                
                {result.routes && result.routes.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Routes:</span>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                      {result.routes.length}
                    </span>
                  </div>
                )}
                
                {result.guards && result.guards.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Guards:</span>
                    <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">
                      {result.guards.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {result.error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {result.error}
                </div>
              )}

              {/* Refactor Preview */}
              {result.refactorPlan && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-blue-900">Refactor Plan:</span>
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      {result.refactorPlan.domain}-{result.refactorPlan.slug}
                    </span>
                  </div>
                  <div className="text-xs text-blue-700">
                    <div>From: {formatPath(result.refactorPlan.from)}</div>
                    <div>To: {formatPath(result.refactorPlan.to)}</div>
                  </div>
                </div>
              )}

              {/* Stats */}
              {result.stats && (
                <div className="mt-2 text-xs text-gray-500">
                  Analysis completed in {result.stats.duration}ms
                  {result.stats.cacheHit && ' (cached)'}
                </div>
              )}
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
          </div>
        </div>
      ))}
    </div>
  );
};
