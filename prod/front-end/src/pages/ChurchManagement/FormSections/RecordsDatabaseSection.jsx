import React from 'react';

const RecordsDatabaseSection = ({ formData, handleInputChange, databases, verifyDatabaseConnection }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Records Database Configuration</h3>

      <div>
        <label htmlFor="records_database_name" className="block text-sm font-medium text-gray-700">
          Records Database
        </label>
        <div className="mt-1 flex rounded-md shadow-sm">
          <select
            id="records_database_name"
            name="records_database_name"
            value={formData.records_database_name}
            onChange={handleInputChange}
            className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">Select a database</option>
            {databases.map((db) => (
              <option key={db.name} value={db.name}>
                {db.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={verifyDatabaseConnection}
            className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 text-sm font-medium rounded-r-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Verify Connection
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Select an existing MariaDB database where church records will be stored.
        </p>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Database Notes</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Each church must have its own database schema.</li>
                <li>The database must be created before it can be assigned to a church.</li>
                <li>Required tables will be automatically created when verified.</li>
                <li>Changing the database after setup may result in data loss.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordsDatabaseSection;
