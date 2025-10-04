import React from 'react';

const FeatureTogglesSection = ({ formData, handleInputChange }) => {
  const features = [
    {
      id: 'enable_ocr',
      name: 'OCR Document Processing',
      description: 'Enable optical character recognition for scanning paper records.'
    },
    {
      id: 'enable_certificates',
      name: 'Certificate Generation',
      description: 'Allow generation of baptism, marriage, and funeral certificates.'
    },
    {
      id: 'enable_liturgical_calendar',
      name: 'Liturgical Calendar',
      description: 'Display liturgical calendar with feast days and readings.'
    },
    {
      id: 'enable_invoicing',
      name: 'Invoicing',
      description: 'Enable invoice generation and payment tracking.'
    },
    {
      id: 'enable_audit_logs',
      name: 'Audit Logs',
      description: 'Track all changes made to church records for compliance and security.'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Feature Toggles</h3>

      <div className="space-y-3">
        {features.map((feature) => (
          <div key={feature.id} className="flex items-start border-b pb-3">
            <div className="flex items-center h-5">
              <input
                id={feature.id}
                name={feature.id}
                type="checkbox"
                checked={formData[feature.id]}
                onChange={handleInputChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor={feature.id} className="font-medium text-gray-700">{feature.name}</label>
              <p className="text-gray-500">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Disabling features will hide the corresponding functionality in the church's interface.</p>
              <p className="mt-1">Some features may require additional setup or have usage-based costs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureTogglesSection;
