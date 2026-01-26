// front-end/src/components/RecordGenerator.tsx
// Multilingual dummy record generator component for OrthodoxMetrics

import React, { useState, useCallback } from 'react';
import {
  generateDummyRecords,
  getLanguageDisplayName,
  getRecordTypeDisplayName,
  generateFileName,
  type RecordType,
  type LanguageCode,
  type GeneratedRecord
} from '@/utils/generateDummyRecords';

// ─── TYPES ─────────────────────────────────────────────────────
interface GeneratorState {
  recordType: RecordType;
  language: LanguageCode;
  count: number;
  records: GeneratedRecord[];
  isGenerating: boolean;
  error: string | null;
}

// ─── CONSTANTS ─────────────────────────────────────────────────────
const RECORD_TYPES: { value: RecordType; label: string; icon: string }[] = [
  { value: 'baptism', label: 'Baptism Records', icon: '💧' },
  { value: 'marriage', label: 'Marriage Records', icon: '💒' },
  { value: 'funeral', label: 'Funeral Records', icon: '🕊️' }
];

const LANGUAGES: { value: LanguageCode; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'gr', label: 'Ελληνικά (Greek)', flag: '🇬🇷' },
  { value: 'ru', label: 'Русский (Russian)', flag: '🇷🇺' },
  { value: 'ro', label: 'Română (Romanian)', flag: '🇷🇴' }
];

const RECORD_COUNTS = [100, 500, 1500];

// ─── RECORD GENERATOR COMPONENT ─────────────────────────────────────────────────────
const RecordGenerator: React.FC = () => {
  const [state, setState] = useState<GeneratorState>({
    recordType: 'baptism',
    language: 'en',
    count: 100,
    records: [],
    isGenerating: false,
    error: null
  });

  // ─── HANDLERS ─────────────────────────────────────────────────────
  const handleRecordTypeChange = useCallback((recordType: RecordType) => {
    setState(prev => ({ ...prev, recordType, records: [], error: null }));
  }, []);

  const handleLanguageChange = useCallback((language: LanguageCode) => {
    setState(prev => ({ ...prev, language, records: [], error: null }));
  }, []);

  const handleCountChange = useCallback((count: number) => {
    setState(prev => ({ ...prev, count, records: [], error: null }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setState(prev => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Add artificial delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      const records = generateDummyRecords(state.recordType, state.language, state.count);
      
      setState(prev => ({
        ...prev,
        records,
        isGenerating: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate records',
        isGenerating: false
      }));
    }
  }, [state.recordType, state.language, state.count]);

  const handleDownload = useCallback(() => {
    if (state.records.length === 0) return;

    const filename = generateFileName(state.recordType, state.language, state.count);
    const dataStr = JSON.stringify(state.records, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.records, state.recordType, state.language, state.count]);

  // ─── RENDER HELPERS ─────────────────────────────────────────────────────
  const renderRecordPreview = (record: GeneratedRecord, index: number) => {
    return (
      <div
        key={index}
        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
      >
        <div className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-2">
          Record #{index + 1}
        </div>
        <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(record, null, 2)}
        </pre>
      </div>
    );
  };

  const getProgressWidth = () => {
    if (!state.isGenerating) return '0%';
    return '100%';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Multilingual Record Generator
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Generate realistic dummy baptism, marriage, and funeral records in multiple languages 
          for testing and demonstration purposes.
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🔧 Configuration
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Record Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Record Type
            </label>
            <div className="space-y-2">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleRecordTypeChange(type.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                    state.recordType === type.value
                      ? 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <div className="space-y-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-all duration-200 ${
                    state.language === lang.value
                      ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{lang.flag}</span>
                    <span className="font-medium">{lang.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Count Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Record Count
            </label>
            <div className="space-y-2">
              {RECORD_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => handleCountChange(count)}
                  className={`w-full p-3 rounded-lg border text-center transition-all duration-200 ${
                    state.count === count
                      ? 'bg-purple-100 dark:bg-purple-900 border-purple-500 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="text-2xl font-bold">{count.toLocaleString()}</div>
                  <div className="text-sm">records</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={handleGenerate}
            disabled={state.isGenerating}
            className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
              state.isGenerating
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            {state.isGenerating ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">⚡</span>
                Generate {state.count.toLocaleString()} Records
              </span>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={state.records.length === 0}
            className={`flex-1 sm:flex-none py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
              state.records.length === 0
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
            }`}
          >
            <span className="flex items-center justify-center">
              <span className="mr-2">📥</span>
              Download JSON
            </span>
          </button>
        </div>

        {/* Progress Bar */}
        {state.isGenerating && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: getProgressWidth() }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              Generating {getRecordTypeDisplayName(state.recordType).toLowerCase()} in {getLanguageDisplayName(state.language)}...
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <span className="mr-2">❌</span>
            <strong className="font-medium">Error:</strong>
            <span className="ml-2">{state.error}</span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {state.records.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-0">
              📋 Generated Records
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {state.records.length.toLocaleString()} {getRecordTypeDisplayName(state.recordType).toLowerCase()} 
              {' '}in {getLanguageDisplayName(state.language)}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {state.records.length.toLocaleString()}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Records</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round(JSON.stringify(state.records).length / 1024)}KB
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">File Size</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {state.language.toUpperCase()}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Language</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {state.recordType}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-400">Type</div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Record Preview (showing first 5 records)
              </h3>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {state.records.slice(0, 5).map((record, index) => renderRecordPreview(record, index))}
                {state.records.length > 5 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    ... and {(state.records.length - 5).toLocaleString()} more records
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Download reminder */}
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              💡 <strong>Tip:</strong> Click "Download JSON" to save these records as a file. 
              You can then import them using the ImportRecordsButton component in the application.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordGenerator;
