// front-end/src/pages/RecordGeneratorPage.tsx
// Demo route for the multilingual record generator

import React from 'react';
import RecordGenerator from '../components/RecordGenerator';

const RecordGeneratorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                OrthodoxMetrics Demo
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Multilingual Record Generator Tool
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                Demo Tool
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                4 Languages
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <RecordGenerator />
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* About */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                About This Tool
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Generate realistic Orthodox church records in multiple languages for testing, 
                demonstrations, and development purposes. All data is randomly generated and 
                culturally appropriate.
              </p>
            </div>

            {/* Features */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Features
              </h3>
              <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                <li>• Baptism, Marriage, and Funeral records</li>
                <li>• English, Greek, Russian, Romanian</li>
                <li>• Culturally authentic names and places</li>
                <li>• JSON export for data import</li>
                <li>• Dark mode compatible</li>
              </ul>
            </div>

            {/* Usage */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Usage
              </h3>
              <ol className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                <li>1. Select record type and language</li>
                <li>2. Choose record count (100-1500)</li>
                <li>3. Click "Generate Records"</li>
                <li>4. Preview and download JSON</li>
                <li>5. Import using ImportRecordsButton</li>
              </ol>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                OrthodoxMetrics.com - Multilingual Record Generator
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0">
                Built with React, TypeScript, and Tailwind CSS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordGeneratorPage;
