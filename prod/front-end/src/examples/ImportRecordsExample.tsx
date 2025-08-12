// front-end/src/examples/ImportRecordsExample.tsx
// Example usage of ImportRecordsButton component

import React from 'react';
import ImportRecordsButton from '../components/ImportRecordsButton';

const ImportRecordsExample: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📤 Records Import System
        </h1>
        
        <div className="space-y-6">
          {/* Usage Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Import Records from JSON
            </h2>
            <p className="text-gray-600 mb-4">
              Use the import button below to upload baptism, marriage, or funeral records in JSON format.
              Select the record type, target church, and upload your JSON file for batch processing.
            </p>
            
            {/* Import Button */}
            <div className="flex justify-start">
              <ImportRecordsButton />
            </div>
          </div>

          {/* Features Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Features
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Support for baptism, marriage, and funeral records
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Client-side JSON validation and parsing
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Church selection from active churches
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Batch import up to 1000 records at once
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Sample JSON download for each record type
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✅</span>
                Comprehensive error handling and validation
              </li>
            </ul>
          </div>

          {/* Sample Data Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Sample JSON Formats
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Baptism Sample */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">💧 Baptism Records</h4>
                <pre className="text-xs text-blue-700 overflow-x-auto">
{`[
  {
    "person_name": "John Smith",
    "date_performed": "2024-06-15",
    "priest_name": "Father Andreas",
    "birth_date": "2024-01-15",
    "parents": "Michael & Maria Smith",
    "sponsors": "George & Elena",
    "notes": "Beautiful ceremony"
  }
]`}
                </pre>
              </div>

              {/* Marriage Sample */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">💒 Marriage Records</h4>
                <pre className="text-xs text-green-700 overflow-x-auto">
{`[
  {
    "groom_name": "Alexander Petrov",
    "bride_name": "Sofia Ivanova", 
    "date_performed": "2024-07-20",
    "priest_name": "Father Nicholas",
    "witnesses": "Dimitri & Anna",
    "marriage_license": "ML-2024-123",
    "notes": "Traditional ceremony"
  }
]`}
                </pre>
              </div>

              {/* Funeral Sample */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">🕊️ Funeral Records</h4>
                <pre className="text-xs text-purple-700 overflow-x-auto">
{`[
  {
    "person_name": "Constantine Georgios",
    "deceased_date": "2024-05-10",
    "burial_date": "2024-05-13", 
    "priest_name": "Father Michael",
    "burial_location": "Holy Cross",
    "age": 87,
    "notes": "Beloved member"
  }
]`}
                </pre>
              </div>
            </div>
          </div>

          {/* API Integration Notes */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              API Integration
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">
                <strong>Endpoint:</strong> <code className="bg-gray-200 px-2 py-1 rounded">POST /api/records/import</code>
              </p>
              <p className="text-gray-700 mb-2">
                <strong>Sample Endpoint:</strong> <code className="bg-gray-200 px-2 py-1 rounded">GET /api/records/sample/:recordType</code>
              </p>
              <p className="text-gray-700">
                <strong>Authentication:</strong> Requires priest, deacon, admin, or super_admin role
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportRecordsExample;
