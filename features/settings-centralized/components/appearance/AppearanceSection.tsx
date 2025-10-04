import React from 'react';

const AppearanceSection = ({
  formData,
  handleInputChange,
  logoFile,
  bannerFile,
  faviconFile,
  handleLogoChange,
  handleBannerChange,
  handleFaviconChange
}) => {
  const themeColors = [
    { value: 'purple', label: 'Purple (Lent)', class: 'bg-purple-600' },
    { value: 'gold', label: 'Gold (Feast)', class: 'bg-yellow-500' },
    { value: 'red', label: 'Red (Martyrs)', class: 'bg-red-600' },
    { value: 'blue', label: 'Blue (Theotokos)', class: 'bg-blue-600' },
    { value: 'green', label: 'Green (Pentecost)', class: 'bg-green-600' },
    { value: 'white', label: 'White (Pascha)', class: 'bg-gray-100 border border-gray-300' },
    { value: 'black', label: 'Black (Holy Friday)', class: 'bg-gray-900' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Appearance & Branding</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Theme Color (Liturgical Color)
        </label>
        <div className="mt-2 grid grid-cols-3 md:grid-cols-7 gap-3">
          {themeColors.map((color) => (
            <div key={color.value} className="flex items-center">
              <input
                id={`theme-color-${color.value}`}
                name="theme_color"
                type="radio"
                value={color.value}
                checked={formData.theme_color === color.value}
                onChange={handleInputChange}
                className="sr-only"
              />
              <label
                htmlFor={`theme-color-${color.value}`}
                className={`
                  cursor-pointer flex flex-col items-center space-y-1 p-2 rounded-md border-2
                  ${formData.theme_color === color.value ? 'border-blue-500' : 'border-transparent'}
                `}
              >
                <span className={`w-8 h-8 rounded-full ${color.class}`}></span>
                <span className="text-xs">{color.label}</span>
              </label>
            </div>
          ))}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Select a liturgical color theme for the church's interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div>
          <label htmlFor="logo_upload" className="block text-sm font-medium text-gray-700">
            Church Logo
          </label>
          <div className="mt-1 flex items-center">
            {formData.logo_path ? (
              <div className="relative mr-3">
                <img
                  src={formData.logo_path}
                  alt="Current logo"
                  className="h-16 w-16 object-contain border rounded"
                />
              </div>
            ) : (
              <div className="h-16 w-16 border rounded flex items-center justify-center bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <input
              type="file"
              id="logo_upload"
              name="logo_upload"
              accept="image/*"
              onChange={handleLogoChange}
              className="ml-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            PNG or JPG, max 2MB. Recommended size: 200x200px.
            {logoFile && <span className="ml-1 text-green-600">Selected: {logoFile.name}</span>}
          </p>
        </div>

        <div>
          <label htmlFor="banner_upload" className="block text-sm font-medium text-gray-700">
            Header Banner
          </label>
          <div className="mt-1 flex items-center">
            {formData.banner_path ? (
              <div className="relative mr-3">
                <img
                  src={formData.banner_path}
                  alt="Current banner"
                  className="h-16 w-32 object-cover border rounded"
                />
              </div>
            ) : (
              <div className="h-16 w-32 border rounded flex items-center justify-center bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <input
              type="file"
              id="banner_upload"
              name="banner_upload"
              accept="image/*"
              onChange={handleBannerChange}
              className="ml-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            PNG or JPG, max 2MB. Recommended size: 800x200px.
            {bannerFile && <span className="ml-1 text-green-600">Selected: {bannerFile.name}</span>}
          </p>
        </div>

        <div>
          <label htmlFor="favicon_upload" className="block text-sm font-medium text-gray-700">
            Favicon
          </label>
          <div className="mt-1 flex items-center">
            {formData.favicon_path ? (
              <div className="relative mr-3">
                <img
                  src={formData.favicon_path}
                  alt="Current favicon"
                  className="h-12 w-12 object-contain border rounded"
                />
              </div>
            ) : (
              <div className="h-12 w-12 border rounded flex items-center justify-center bg-gray-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <input
              type="file"
              id="favicon_upload"
              name="favicon_upload"
              accept="image/png,image/x-icon,image/svg+xml"
              onChange={handleFaviconChange}
              className="ml-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            ICO, PNG or SVG. Recommended size: 32x32px.
            {faviconFile && <span className="ml-1 text-green-600">Selected: {faviconFile.name}</span>}
          </p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-purple-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">Appearance Preview</h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>The selected theme color will be applied to buttons, headers, and highlighted elements throughout the interface.</p>
              <p className="mt-2">Images will be automatically resized and optimized for web display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSection;
