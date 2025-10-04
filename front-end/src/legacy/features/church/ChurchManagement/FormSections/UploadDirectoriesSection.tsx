import React from 'react';

const UploadDirectoriesSection = ({ formData, handleInputChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Upload Directories Configuration</h3>

      <div>
        <label htmlFor="avatar_dir" className="block text-sm font-medium text-gray-700">
          Avatar Directory
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="avatar_dir"
            name="avatar_dir"
            value={formData.avatar_dir}
            onChange={handleInputChange}
            placeholder="/uploads/[church_id]/avatars"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Path where member profile images will be stored. Leave blank to use default path.
        </p>
      </div>

      <div>
        <label htmlFor="ocr_upload_dir" className="block text-sm font-medium text-gray-700">
          OCR Upload Directory
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="ocr_upload_dir"
            name="ocr_upload_dir"
            value={formData.ocr_upload_dir}
            onChange={handleInputChange}
            placeholder="/uploads/[church_id]/ocr"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Path where OCR document scans will be stored. Leave blank to use default path.
        </p>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Directory Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Directories will be automatically created if they don't exist.</li>
                <li>All church uploads are isolated in their own directories.</li>
                <li>You can use [church_id] as a placeholder in the path.</li>
                <li>Default paths will be used if left blank.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadDirectoriesSection;
