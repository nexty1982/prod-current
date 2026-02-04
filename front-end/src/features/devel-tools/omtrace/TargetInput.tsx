import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, X } from 'lucide-react';
import { OmtraceRunFlags } from './types.ts';

interface TargetInputProps {
  onAnalyze: (targets: string[], flags: OmtraceRunFlags) => void;
  isLoading?: boolean;
}

export const TargetInput: React.FC<TargetInputProps> = ({ onAnalyze, isLoading = false }) => {
  const [targets, setTargets] = useState<string[]>([]);
  const [currentTarget, setCurrentTarget] = useState('');
  const [flags, setFlags] = useState<OmtraceRunFlags>({
    reverse: false,
    deep: false,
    buildIndex: false,
    json: false,
    exact: false,
    listCandidates: false,
    pickFirst: false,
    refactor: false,
    yes: false,
    dryRun: false,
    force: false
  });

  // Load flags from localStorage on mount
  useEffect(() => {
    const savedFlags = localStorage.getItem('omtrace-flags');
    if (savedFlags) {
      try {
        const parsed = JSON.parse(savedFlags);
        setFlags(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.warn('Failed to parse saved flags:', e);
      }
    }
  }, []);

  // Save flags to localStorage when they change
  useEffect(() => {
    localStorage.setItem('omtrace-flags', JSON.stringify(flags));
  }, [flags]);

  const handleAddTarget = () => {
    if (currentTarget.trim() && !targets.includes(currentTarget.trim())) {
      setTargets(prev => [...prev, currentTarget.trim()]);
      setCurrentTarget('');
    }
  };

  const handleRemoveTarget = (targetToRemove: string) => {
    setTargets(prev => prev.filter(t => t !== targetToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTarget();
    }
  };

  const handleAnalyze = () => {
    if (targets.length > 0) {
      onAnalyze(targets, flags);
    }
  };

  const handleClearAll = () => {
    setTargets([]);
    setCurrentTarget('');
  };

  const toggleFlag = (flag: keyof OmtraceRunFlags) => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  return (
    <div className="space-y-4">
      {/* Target Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Component Targets
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentTarget}
            onChange={(e) => setCurrentTarget(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter component name or path (e.g., ChurchSetupWizard, src/components/...)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAddTarget}
            disabled={!currentTarget.trim()}
            className={`px-4 py-2 rounded-md font-semibold shadow-md transition-all ${
              !currentTarget.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transform hover:scale-105'
            }`}
          >
            Add
          </button>
        </div>
      </div>

      {/* Target Chips */}
      {targets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Targets:</span>
            <button
              onClick={handleClearAll}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {targets.map((target, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <span>{target}</span>
                <button
                  onClick={() => handleRemoveTarget(target)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Flags */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Analysis Options
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.reverse}
              onChange={() => toggleFlag('reverse')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Reverse Dependencies</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.deep}
              onChange={() => toggleFlag('deep')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Deep Analysis</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.buildIndex}
              onChange={() => toggleFlag('buildIndex')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Build Index</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.json}
              onChange={() => toggleFlag('json')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">JSON Output</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.exact}
              onChange={() => toggleFlag('exact')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Exact Match</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-purple-50 p-3 rounded-lg border border-transparent hover:border-purple-200 transition-all">
            <input
              type="checkbox"
              checked={flags.listCandidates}
              onChange={() => toggleFlag('listCandidates')}
              className="mr-3 w-5 h-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">List Candidates</span>
          </label>
        </div>
      </div>

      {/* Refactor Flags */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Refactor Options
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex items-center cursor-pointer hover:bg-amber-50 p-3 rounded-lg border border-transparent hover:border-amber-200 transition-all">
            <input
              type="checkbox"
              checked={flags.refactor}
              onChange={() => toggleFlag('refactor')}
              className="mr-3 w-5 h-5 text-amber-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Refactor Mode</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-amber-50 p-3 rounded-lg border border-transparent hover:border-amber-200 transition-all">
            <input
              type="checkbox"
              checked={flags.yes}
              onChange={() => toggleFlag('yes')}
              className="mr-3 w-5 h-5 text-amber-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Execute Refactor</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-amber-50 p-3 rounded-lg border border-transparent hover:border-amber-200 transition-all">
            <input
              type="checkbox"
              checked={flags.dryRun}
              onChange={() => toggleFlag('dryRun')}
              className="mr-3 w-5 h-5 text-amber-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Dry Run</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-amber-50 p-3 rounded-lg border border-transparent hover:border-amber-200 transition-all">
            <input
              type="checkbox"
              checked={flags.force}
              onChange={() => toggleFlag('force')}
              className="mr-3 w-5 h-5 text-amber-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            />
            <span className="text-sm font-medium text-gray-700">Force</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleAnalyze}
          disabled={targets.length === 0 || isLoading}
          className={`flex items-center gap-2 px-6 py-3 rounded-md font-semibold shadow-md transition-all ${
            targets.length === 0 || isLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 transform hover:scale-105'
          }`}
        >
          <Play size={18} />
          {flags.refactor ? 'Analyze & Refactor' : 'Analyze'}
        </button>
        
        <button
          onClick={handleClearAll}
          className="px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 font-semibold shadow-md transition-all transform hover:scale-105"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
