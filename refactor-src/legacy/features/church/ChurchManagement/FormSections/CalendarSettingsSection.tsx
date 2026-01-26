import React from 'react';

const CalendarSettingsSection = ({ formData, handleInputChange, feastOverridesFile, handleFileChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Liturgical Calendar Settings</h3>

      <div>
        <label htmlFor="calendar_type" className="block text-sm font-medium text-gray-700">
          Calendar Type
        </label>
        <select
          id="calendar_type"
          name="calendar_type"
          value={formData.calendar_type}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
        >
          <option value="Julian">Julian Calendar</option>
          <option value="Revised Julian">Revised Julian Calendar</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">
          Select which calendar system this church follows for feast days and services.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="show_fast_days"
              name="show_fast_days"
              type="checkbox"
              checked={formData.show_fast_days}
              onChange={handleInputChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="show_fast_days" className="font-medium text-gray-700">Show Fast Days</label>
            <p className="text-gray-500">Display fasting periods and days on church calendars.</p>
          </div>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="show_local_saints"
              name="show_local_saints"
              type="checkbox"
              checked={formData.show_local_saints}
              onChange={handleInputChange}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="show_local_saints" className="font-medium text-gray-700">Show Local Saints</label>
            <p className="text-gray-500">Display local/regional saints specific to this church's tradition.</p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="feast_overrides" className="block text-sm font-medium text-gray-700">
          Feast Day Overrides
        </label>
        <div className="mt-1">
          <input
            type="file"
            id="feast_overrides"
            name="feast_overrides"
            accept=".json"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Upload a JSON file with custom feast day overrides specific to this church.
          {feastOverridesFile && <span className="ml-2 text-green-600">File selected: {feastOverridesFile.name}</span>}
        </p>

        {formData.feast_overrides_path && (
          <p className="mt-2 text-sm text-blue-600">
            Current overrides file: {formData.feast_overrides_path.split('/').pop()}
          </p>
        )}
      </div>

      <div className="mt-4 p-4 bg-purple-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">Calendar Usage</h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>The calendar settings affect how dates are displayed in records and certificates. For example, a baptism on January 7th may be shown as December 25th (Nativity) on the Julian calendar.</p>
              <p className="mt-2">Feast overrides allow churches to specify local commemorations or special observances particular to their jurisdiction.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsSection;
