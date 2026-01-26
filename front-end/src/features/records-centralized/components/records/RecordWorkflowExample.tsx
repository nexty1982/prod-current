// front-end/src/examples/RecordWorkflowExample.tsx
// Complete example showing record generation → import workflow

import React, { useState } from 'react';
import RecordGenerator from '@/components/RecordGenerator';
import ImportRecordsButton from '@/components/ImportRecordsButton';

const RecordWorkflowExample: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Generate Test Data',
      description: 'Create realistic dummy records in multiple languages',
      icon: '⚡'
    },
    {
      id: 2,
      title: 'Download JSON',
      description: 'Export generated records as JSON file',
      icon: '📥'
    },
    {
      id: 3,
      title: 'Import Records',
      description: 'Upload JSON to church database',
      icon: '📤'
    },
    {
      id: 4,
      title: 'Verify Import',
      description: 'Check records in the system',
      icon: '✅'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Complete Record Workflow Demo
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          Experience the full workflow: Generate realistic Orthodox church records, 
          download as JSON, and import them into your church management system.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          🗺️ Workflow Steps
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                currentStep === step.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : currentStep > step.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
              }`}
              onClick={() => setCurrentStep(step.id)}
            >
              {/* Step Number */}
              <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                currentStep === step.id
                  ? 'bg-blue-500 text-white'
                  : currentStep > step.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}>
                {currentStep > step.id ? '✓' : step.id}
              </div>

              {/* Icon */}
              <div className="text-3xl mb-2">{step.icon}</div>
              
              {/* Title */}
              <h3 className={`font-semibold mb-1 ${
                currentStep === step.id
                  ? 'text-blue-700 dark:text-blue-300'
                  : currentStep > step.id
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {step.title}
              </h3>
              
              {/* Description */}
              <p className={`text-sm ${
                currentStep === step.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : currentStep > step.id
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {step.description}
              </p>

              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className={`hidden md:block absolute top-6 -right-6 w-12 h-0.5 ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="space-y-8">
        {/* Step 1 & 2: Record Generator */}
        {(currentStep === 1 || currentStep === 2) && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {currentStep === 1 ? '⚡ Step 1: Generate Records' : '📥 Step 2: Download JSON'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {currentStep === 1 
                  ? 'Use the generator below to create realistic test data in multiple languages.'
                  : 'Click the "Download JSON" button to save your generated records as a file.'
                }
              </p>
            </div>
            <RecordGenerator />
          </div>
        )}

        {/* Step 3: Import Records */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              📤 Step 3: Import Records
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Now use the Import Records button to upload your JSON file to a church database.
              Select the appropriate church and record type.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Import Your Generated Data
              </h3>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <ImportRecordsButton />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ← Click here to import the JSON file you downloaded
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  💡 Import Tips:
                </h4>
                <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                  <li>• Select the same record type you generated (baptism, marriage, funeral)</li>
                  <li>• Choose a target church from the dropdown</li>
                  <li>• Upload the JSON file you downloaded in Step 2</li>
                  <li>• Verify the preview before confirming the import</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Verification */}
        {currentStep === 4 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              ✅ Step 4: Verify Import
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              After a successful import, verify that your records appear in the church management system.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Navigation Links */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  📋 Check Records
                </h3>
                <div className="space-y-2">
                  <a 
                    href="/records/baptism" 
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    → Baptism Records
                  </a>
                  <a 
                    href="/records/marriage" 
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    → Marriage Records
                  </a>
                  <a 
                    href="/records/funeral" 
                    className="block text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    → Funeral Records
                  </a>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  📊 What to Look For
                </h3>
                <ul className="text-gray-600 dark:text-gray-400 text-sm space-y-1">
                  <li>• Records appear in the table</li>
                  <li>• All fields are populated</li>
                  <li>• Dates are formatted correctly</li>
                  <li>• Names are culturally appropriate</li>
                  <li>• Search and filtering work</li>
                </ul>
              </div>

              {/* Success Indicators */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <h3 className="font-medium text-green-800 dark:text-green-200 mb-3">
                  🎉 Success Indicators
                </h3>
                <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
                  <li>✓ Import success message</li>
                  <li>✓ Record count matches</li>
                  <li>✓ No error messages</li>
                  <li>✓ Data appears in church system</li>
                  <li>✓ Search functionality works</li>
                </ul>
              </div>
            </div>

            {/* Restart Button */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🔄 Start New Workflow
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 1
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gray-600 hover:bg-gray-700 text-white'
          }`}
        >
          ← Previous Step
        </button>

        <button
          onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
          disabled={currentStep === 4}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentStep === 4
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Next Step →
        </button>
      </div>
    </div>
  );
};

export default RecordWorkflowExample;
