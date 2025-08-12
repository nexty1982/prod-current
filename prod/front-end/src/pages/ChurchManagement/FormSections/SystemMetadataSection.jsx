import React from 'react';

const SystemMetadataSection = ({ created, updated }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">System Metadata</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Created At
          </label>
          <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
            {formatDate(created)}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Last Updated
          </label>
          <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
            {formatDate(updated)}
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">System Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>This metadata is automatically tracked by the system and cannot be edited manually.</p>
              <p className="mt-1">For detailed change history, please refer to the church audit logs.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMetadataSection;
