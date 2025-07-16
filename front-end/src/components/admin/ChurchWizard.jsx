import React, { useState, useReducer } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Form state reducer
const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.step]: {
          ...state[action.step],
          [action.field]: action.value
        }
      };
    case 'RESET_FORM':
      return initialFormState;
    default:
      return state;
  }
};

// Initial form state
const initialFormState = {
  churchInfo: {
    name: '',
    address: '',
    city: '',
    region: '',
    country: '',
    phone: '',
    website: ''
  },
  language: {
    preferred_language: 'en',
    timezone: 'America/New_York',
    calendar_type: 'gregorian'
  },
  adminAccount: {
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    title: 'Father'
  },
  optional: {
    logo: null,
    description: '',
    established_year: ''
  },
  templateSettings: {
    setup_templates: false,
    auto_setup_standard: true,
    generate_components: false,
    record_types: ['baptism', 'marriage', 'funeral'],
    template_style: 'orthodox_traditional'
  },
  databaseConfig: {
    test_connection: false,
    connection_status: null,
    connection_message: ''
  },
  testChurch: {
    is_test_church: false,
    auto_populate_data: true,
    include_sample_records: true,
    sample_record_count: 50
  }
};

const ChurchWizard = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, dispatch] = useReducer(formReducer, initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [setupProgress, setSetupProgress] = useState(null);

  const totalSteps = 6; // Expanded from 4 to 6 steps

  // Language options
  const languageOptions = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'gr', label: 'Ελληνικά (Greek)', flag: '🇬🇷' },
    { value: 'ru', label: 'Русский (Russian)', flag: '🇷🇺' },
    { value: 'ro', label: 'Română (Romanian)', flag: '🇷🇴' },
    { value: 'sr', label: 'Српски (Serbian)', flag: '🇷🇸' }
  ];

  // Timezone options (major Orthodox regions)
  const timezoneOptions = [
    { value: 'America/New_York', label: 'Eastern Time (US/Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US/Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US/Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US/Canada)' },
    { value: 'Europe/Athens', label: 'Athens, Greece' },
    { value: 'Europe/Moscow', label: 'Moscow, Russia' },
    { value: 'Europe/Belgrade', label: 'Belgrade, Serbia' },
    { value: 'Europe/Bucharest', label: 'Bucharest, Romania' },
    { value: 'Europe/Kiev', label: 'Kiev, Ukraine' },
    { value: 'Australia/Sydney', label: 'Sydney, Australia' }
  ];

  // Clergy titles
  const clergyTitles = [
    'Father',
    'Archimandrite', 
    'Bishop',
    'Archbishop',
    'Metropolitan',
    'Patriarch',
    'Deacon',
    'Protodeacon',
    'Archdeacon'
  ];

  // Update form field
  const updateField = (step, field, value) => {
    dispatch({ type: 'UPDATE_FIELD', step, field, value });
    // Clear error for this field
    if (errors[`${step}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${step}.${field}`]: null
      }));
    }
  };

  // Handle file upload
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, 'optional.logo': 'Please select an image file' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({ ...prev, 'optional.logo': 'Image must be smaller than 5MB' }));
        return;
      }
      updateField('optional', 'logo', file);
    }
  };

  // Test database connection
  const testDatabaseConnection = async () => {
    setIsTestingConnection(true);
    updateField('databaseConfig', 'connection_status', 'testing');
    updateField('databaseConfig', 'connection_message', 'Testing connection...');

    try {
      // Generate church ID for testing
      const church_id = `CHURCH_${formData.churchInfo.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now()}`;
      
      const response = await fetch(`/api/churches/test-connection/${church_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        updateField('databaseConfig', 'connection_status', 'success');
        updateField('databaseConfig', 'connection_message', result.message || 'Database connection successful! Ready to proceed.');
        updateField('databaseConfig', 'test_connection', true);
      } else {
        throw new Error('Connection test failed');
      }
      
    } catch (error) {
      updateField('databaseConfig', 'connection_status', 'error');
      updateField('databaseConfig', 'connection_message', `Connection failed: ${error.message}`);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle record type selection
  const handleRecordTypeChange = (recordType, checked) => {
    const currentTypes = formData.templateSettings.record_types;
    const newTypes = checked 
      ? [...currentTypes, recordType]
      : currentTypes.filter(type => type !== recordType);
    
    updateField('templateSettings', 'record_types', newTypes);
  };

  // Validate current step
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Church Info
        if (!formData.churchInfo.name.trim()) {
          newErrors['churchInfo.name'] = 'Church name is required';
        }
        if (!formData.churchInfo.address.trim()) {
          newErrors['churchInfo.address'] = 'Address is required';
        }
        if (!formData.churchInfo.city.trim()) {
          newErrors['churchInfo.city'] = 'City is required';
        }
        if (!formData.churchInfo.country.trim()) {
          newErrors['churchInfo.country'] = 'Country is required';
        }
        break;

      case 2: // Language settings - no validation needed (defaults provided)
        break;

      case 3: // Admin Account
        if (!formData.adminAccount.full_name.trim()) {
          newErrors['adminAccount.full_name'] = 'Full name is required';
        }
        if (!formData.adminAccount.email.trim()) {
          newErrors['adminAccount.email'] = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminAccount.email)) {
          newErrors['adminAccount.email'] = 'Please enter a valid email address';
        }
        if (!formData.adminAccount.password) {
          newErrors['adminAccount.password'] = 'Password is required';
        } else if (formData.adminAccount.password.length < 8) {
          newErrors['adminAccount.password'] = 'Password must be at least 8 characters';
        }
        if (formData.adminAccount.password !== formData.adminAccount.confirm_password) {
          newErrors['adminAccount.confirm_password'] = 'Passwords do not match';
        }
        break;

      case 4: // Optional Settings - no validation needed
        break;

      case 5: // Template Setup - no validation needed (optional)
        break;

      case 6: // Review - no additional validation
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate to next step
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      submitData.append('name', formData.churchInfo.name);
      submitData.append('address', formData.churchInfo.address);
      submitData.append('city', formData.churchInfo.city);
      submitData.append('region', formData.churchInfo.region);
      submitData.append('country', formData.churchInfo.country);
      submitData.append('phone', formData.churchInfo.phone);
      submitData.append('website', formData.churchInfo.website);
      
      submitData.append('preferred_language', formData.language.preferred_language);
      submitData.append('timezone', formData.language.timezone);
      submitData.append('calendar_type', formData.language.calendar_type);
      
      submitData.append('admin_full_name', formData.adminAccount.full_name);
      submitData.append('admin_email', formData.adminAccount.email);
      submitData.append('admin_password', formData.adminAccount.password);
      submitData.append('admin_title', formData.adminAccount.title);
      
      submitData.append('description', formData.optional.description);
      submitData.append('established_year', formData.optional.established_year);
      
      // Template settings
      submitData.append('setup_templates', formData.templateSettings.setup_templates);
      submitData.append('auto_setup_standard', formData.templateSettings.auto_setup_standard);
      submitData.append('generate_components', formData.templateSettings.generate_components);
      submitData.append('record_types', JSON.stringify(formData.templateSettings.record_types));
      submitData.append('template_style', formData.templateSettings.template_style);
      
      // Test church settings
      submitData.append('is_test_church', formData.testChurch.is_test_church);
      submitData.append('auto_populate_data', formData.testChurch.auto_populate_data);
      submitData.append('include_sample_records', formData.testChurch.include_sample_records);
      submitData.append('sample_record_count', formData.testChurch.sample_record_count);
      
      if (formData.optional.logo) {
        submitData.append('logo', formData.optional.logo);
      }

      const response = await fetch('/api/churches', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        throw new Error('Failed to create church');
      }

      const result = await response.json();
      
      setSubmitSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(result);
        resetWizard();
      }, 2000);

    } catch (error) {
      console.error('Error creating church:', error);
      setErrors({ submit: 'Failed to create church. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset wizard
  const resetWizard = () => {
    dispatch({ type: 'RESET_FORM' });
    setCurrentStep(1);
    setErrors({});
    setSubmitSuccess(false);
  };

  // Render error message
  const renderError = (field) => {
    if (errors[field]) {
      return <p className="text-red-500 text-sm mt-1">{errors[field]}</p>;
    }
    return null;
  };

  // Success message
  if (submitSuccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-lg w-full mx-4">
          <div className="text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {formData.testChurch.is_test_church ? 'Test Church Created Successfully!' : 'Church Created Successfully!'}
            </h3>
            <p className="text-gray-600 mb-4">
              {formData.churchInfo.name} has been added to the system.
              {formData.testChurch.is_test_church && (
                <span className="block text-yellow-600 font-medium mt-1">
                  🧪 This is a test church with sample data
                </span>
              )}
            </p>
            
            <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">What's Next:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ Church database created and configured</li>
                <li>✓ Administrator account activated</li>
                {formData.templateSettings.setup_templates ? (
                  <li>✓ Record templates configured and ready</li>
                ) : (
                  <li>• Set up record templates from the admin panel</li>
                )}
                {formData.testChurch.is_test_church && formData.testChurch.include_sample_records && (
                  <li>✓ Sample records populated ({formData.testChurch.sample_record_count} records)</li>
                )}
                {formData.testChurch.is_test_church && formData.testChurch.auto_populate_data && (
                  <li>✓ Church staff and member data populated</li>
                )}
                <li>• Begin adding church records and data</li>
                <li>• Configure additional user accounts</li>
                {formData.testChurch.is_test_church && (
                  <li className="text-yellow-600">• Remember: This is test data - clean when ready for production</li>
                )}
              </ul>
            </div>
            
            <p className="text-sm text-gray-500">
              The administrator will receive login instructions via email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add New Orthodox Church</h2>
            <p className="text-sm text-gray-600">Step {currentStep} of {totalSteps}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}: {
                currentStep === 1 ? 'Church Information' :
                currentStep === 2 ? 'Language & Settings' :
                currentStep === 3 ? 'Administrator Account' :
                currentStep === 4 ? 'Database Connection' :
                currentStep === 5 ? 'Template Setup' :
                'Review & Create'
              }
            </span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="flex justify-between mt-3 text-xs text-gray-500">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>Church Info</span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>Language</span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>Admin</span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>Database</span>
            <span className={currentStep >= 5 ? 'text-blue-600 font-medium' : ''}>Templates</span>
            <span className={currentStep >= 6 ? 'text-blue-600 font-medium' : ''}>Review</span>
          </div>
        </div>

        {/* Form content */}
        <div className="px-6 py-4">
          {/* Step 1: Church Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Church Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Church Name *
                    </label>
                    <input
                      type="text"
                      value={formData.churchInfo.name}
                      onChange={(e) => updateField('churchInfo', 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., St. Nicholas Orthodox Church"
                    />
                    {renderError('churchInfo.name')}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={formData.churchInfo.address}
                      onChange={(e) => updateField('churchInfo', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Street address"
                    />
                    {renderError('churchInfo.address')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.churchInfo.city}
                      onChange={(e) => updateField('churchInfo', 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {renderError('churchInfo.city')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State/Region
                    </label>
                    <input
                      type="text"
                      value={formData.churchInfo.region}
                      onChange={(e) => updateField('churchInfo', 'region', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={formData.churchInfo.country}
                      onChange={(e) => updateField('churchInfo', 'country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {renderError('churchInfo.country')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.churchInfo.phone}
                      onChange={(e) => updateField('churchInfo', 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.churchInfo.website}
                      onChange={(e) => updateField('churchInfo', 'website', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                </div>

                {/* Test Church Option */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="test_church"
                      checked={formData.testChurch.is_test_church}
                      onChange={(e) => {
                        updateField('testChurch', 'is_test_church', e.target.checked);
                        // Auto-enable templates and sample data for test churches
                        if (e.target.checked) {
                          updateField('templateSettings', 'setup_templates', true);
                          updateField('templateSettings', 'auto_setup_standard', true);
                          updateField('templateSettings', 'generate_components', true);
                        }
                      }}
                      className="mt-1 h-4 w-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                    />
                    <div>
                      <label htmlFor="test_church" className="text-sm font-medium text-yellow-900 cursor-pointer">
                        Create as Test Church
                      </label>
                      <p className="text-xs text-yellow-700 mt-1">
                        Automatically populate with sample data including baptism, marriage, and funeral records. 
                        Perfect for testing, demonstrations, and development. Can be easily identified and removed later.
                      </p>
                      
                      {formData.testChurch.is_test_church && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="auto_populate"
                              checked={formData.testChurch.auto_populate_data}
                              onChange={(e) => updateField('testChurch', 'auto_populate_data', e.target.checked)}
                              className="h-3 w-3 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="auto_populate" className="text-xs text-yellow-800">
                              Auto-populate with church staff and member data
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="sample_records"
                              checked={formData.testChurch.include_sample_records}
                              onChange={(e) => updateField('testChurch', 'include_sample_records', e.target.checked)}
                              className="h-3 w-3 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                            />
                            <label htmlFor="sample_records" className="text-xs text-yellow-800">
                              Include sample records (baptisms, marriages, funerals)
                            </label>
                          </div>
                          
                          {formData.testChurch.include_sample_records && (
                            <div className="flex items-center space-x-2">
                              <label className="text-xs text-yellow-800">Sample records count:</label>
                              <select
                                value={formData.testChurch.sample_record_count}
                                onChange={(e) => updateField('testChurch', 'sample_record_count', parseInt(e.target.value))}
                                className="text-xs border border-yellow-300 rounded px-1 py-0.5 bg-white"
                              >
                                <option value={25}>25 records</option>
                                <option value={50}>50 records</option>
                                <option value={100}>100 records</option>
                                <option value={200}>200 records</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Language & Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Language & Regional Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Language
                    </label>
                    <select
                      value={formData.language.preferred_language}
                      onChange={(e) => updateField('language', 'preferred_language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {languageOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.flag} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.language.timezone}
                      onChange={(e) => updateField('language', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {timezoneOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Calendar Type
                    </label>
                    <select
                      value={formData.language.calendar_type}
                      onChange={(e) => updateField('language', 'calendar_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gregorian">Gregorian (New Calendar)</option>
                      <option value="julian">Julian (Old Calendar)</option>
                      <option value="both">Both Calendars</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Language Settings Info</h4>
                  <p className="text-sm text-blue-700">
                    The selected language will be used for the church's interface, email templates, 
                    and generated certificates. You can change these settings later in the admin panel.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Admin Account */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Church Administrator Account</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <select
                      value={formData.adminAccount.title}
                      onChange={(e) => updateField('adminAccount', 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {clergyTitles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.adminAccount.full_name}
                      onChange={(e) => updateField('adminAccount', 'full_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., John Doe"
                    />
                    {renderError('adminAccount.full_name')}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.adminAccount.email}
                      onChange={(e) => updateField('adminAccount', 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@church.com"
                    />
                    {renderError('adminAccount.email')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.adminAccount.password}
                      onChange={(e) => updateField('adminAccount', 'password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Minimum 8 characters"
                    />
                    {renderError('adminAccount.password')}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={formData.adminAccount.confirm_password}
                      onChange={(e) => updateField('adminAccount', 'confirm_password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {renderError('adminAccount.confirm_password')}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Administrator Account</h4>
                  <p className="text-sm text-yellow-700">
                    This account will have full administrative access to the church's records and settings. 
                    The admin can create additional user accounts and manage permissions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Database Connection Test */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Database Connection Test</h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 className="font-medium text-blue-900 mb-2">Connection Testing</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    We'll test the database connection to ensure your church's data will be properly stored and accessible.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <div className="font-medium text-gray-900">Database Configuration</div>
                        <div className="text-sm text-gray-600">
                          Database: orthodox_{formData.churchInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {formData.databaseConfig.connection_status === 'success' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Connected
                          </span>
                        )}
                        {formData.databaseConfig.connection_status === 'error' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ✗ Failed
                          </span>
                        )}
                        {formData.databaseConfig.connection_status === 'testing' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Testing
                          </span>
                        )}
                        <button
                          onClick={testDatabaseConnection}
                          disabled={isTestingConnection}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                        >
                          {isTestingConnection ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Testing...
                            </>
                          ) : (
                            'Test Connection'
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {formData.databaseConfig.connection_message && (
                      <div className={`p-3 rounded-lg text-sm ${
                        formData.databaseConfig.connection_status === 'success' 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : formData.databaseConfig.connection_status === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      }`}>
                        {formData.databaseConfig.connection_message}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="mb-2"><strong>What happens during testing:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Verify database server connectivity</li>
                    <li>Test user permissions and access rights</li>
                    <li>Validate church database schema</li>
                    <li>Ensure data isolation and security</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Template Setup (Optional) */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Record Templates Setup (Optional)</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-yellow-900 mb-2">Optional Setup</h4>
                  <p className="text-sm text-yellow-700">
                    You can set up record templates now or skip this step and configure them later from the admin panel.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Enable Template Setup */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-base font-medium text-gray-900">
                        Set up record templates now
                      </label>
                      <p className="text-sm text-gray-600">
                        Configure baptism, marriage, and funeral record templates
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.templateSettings.setup_templates}
                        onChange={(e) => updateField('templateSettings', 'setup_templates', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Template Configuration */}
                  {formData.templateSettings.setup_templates && (
                    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
                      {/* Record Types */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Record Types to Set Up
                        </label>
                        <div className="space-y-2">
                          {[
                            { id: 'baptism', label: 'Baptism Records', description: 'Track baptisms and certificates' },
                            { id: 'marriage', label: 'Marriage Records', description: 'Wedding ceremonies and certificates' },
                            { id: 'funeral', label: 'Funeral Records', description: 'Memorial services and burial records' },
                            { id: 'communion', label: 'First Communion', description: 'First communion ceremonies' },
                            { id: 'confirmation', label: 'Confirmation', description: 'Confirmation ceremonies' }
                          ].map(type => (
                            <label key={type.id} className="flex items-start space-x-3">
                              <input
                                type="checkbox"
                                checked={formData.templateSettings.record_types.includes(type.id)}
                                onChange={(e) => handleRecordTypeChange(type.id, e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{type.label}</div>
                                <div className="text-xs text-gray-600">{type.description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Auto Setup Options */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900">
                              Auto-setup standard templates
                            </label>
                            <p className="text-xs text-gray-600">
                              Use predefined Orthodox templates
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.templateSettings.auto_setup_standard}
                            onChange={(e) => updateField('templateSettings', 'auto_setup_standard', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-900">
                              Generate record components
                            </label>
                            <p className="text-xs text-gray-600">
                              Create editor and viewer interfaces
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.templateSettings.generate_components}
                            onChange={(e) => updateField('templateSettings', 'generate_components', e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Template Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Template Style
                        </label>
                        <select
                          value={formData.templateSettings.template_style}
                          onChange={(e) => updateField('templateSettings', 'template_style', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="orthodox_traditional">Orthodox Traditional</option>
                          <option value="orthodox_modern">Orthodox Modern</option>
                          <option value="orthodox_minimal">Orthodox Minimal</option>
                          <option value="custom">Custom (configure later)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Optional Settings & Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Settings & Review</h3>
                
                {/* Optional settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Church Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {renderError('optional.logo')}
                    {formData.optional.logo && (
                      <p className="text-sm text-green-600 mt-1">✓ {formData.optional.logo.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Established Year
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max={new Date().getFullYear()}
                      value={formData.optional.established_year}
                      onChange={(e) => updateField('optional', 'established_year', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.optional.description}
                      onChange={(e) => updateField('optional', 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the church..."
                    />
                  </div>
                </div>

                {/* Review Summary */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Review Information</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Church Information</h5>
                      <dl className="space-y-1">
                        <div><dt className="inline font-medium">Name:</dt> <dd className="inline">{formData.churchInfo.name}</dd></div>
                        <div><dt className="inline font-medium">Address:</dt> <dd className="inline">{formData.churchInfo.address}</dd></div>
                        <div><dt className="inline font-medium">City:</dt> <dd className="inline">{formData.churchInfo.city}, {formData.churchInfo.region}</dd></div>
                        <div><dt className="inline font-medium">Country:</dt> <dd className="inline">{formData.churchInfo.country}</dd></div>
                        {formData.churchInfo.phone && <div><dt className="inline font-medium">Phone:</dt> <dd className="inline">{formData.churchInfo.phone}</dd></div>}
                      </dl>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Settings</h5>
                      <dl className="space-y-1">
                        <div><dt className="inline font-medium">Language:</dt> <dd className="inline">{languageOptions.find(l => l.value === formData.language.preferred_language)?.label}</dd></div>
                        <div><dt className="inline font-medium">Timezone:</dt> <dd className="inline">{timezoneOptions.find(t => t.value === formData.language.timezone)?.label}</dd></div>
                        <div><dt className="inline font-medium">Calendar:</dt> <dd className="inline">{formData.language.calendar_type}</dd></div>
                      </dl>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Administrator</h5>
                      <dl className="space-y-1">
                        <div><dt className="inline font-medium">Name:</dt> <dd className="inline">{formData.adminAccount.title} {formData.adminAccount.full_name}</dd></div>
                        <div><dt className="inline font-medium">Email:</dt> <dd className="inline">{formData.adminAccount.email}</dd></div>
                      </dl>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Database & Templates</h5>
                      <dl className="space-y-1">
                        <div><dt className="inline font-medium">Connection:</dt> <dd className="inline">
                          {formData.databaseConfig.connection_status === 'success' ? '✓ Tested' : 
                           formData.databaseConfig.test_connection ? '✓ Ready' : '⚠ Not tested'}
                        </dd></div>
                        <div><dt className="inline font-medium">Templates:</dt> <dd className="inline">
                          {formData.templateSettings.setup_templates ? 
                            `${formData.templateSettings.record_types.length} types selected` : 
                            'Setup later'}
                        </dd></div>
                        {formData.templateSettings.setup_templates && (
                          <div><dt className="inline font-medium">Style:</dt> <dd className="inline">{formData.templateSettings.template_style}</dd></div>
                        )}
                        <div><dt className="inline font-medium">Church Type:</dt> <dd className="inline">
                          {formData.testChurch.is_test_church ? 
                            <span className="text-yellow-600 font-medium">🧪 Test Church</span> : 
                            'Production Church'}
                        </dd></div>
                        {formData.testChurch.is_test_church && (
                          <div><dt className="inline font-medium">Sample Data:</dt> <dd className="inline">
                            {formData.testChurch.include_sample_records ? 
                              `${formData.testChurch.sample_record_count} sample records` : 
                              'No sample records'}
                          </dd></div>
                        )}
                      </dl>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">Optional</h5>
                      <dl className="space-y-1">
                        {formData.optional.logo && <div><dt className="inline font-medium">Logo:</dt> <dd className="inline">✓ Uploaded</dd></div>}
                        {formData.optional.established_year && <div><dt className="inline font-medium">Established:</dt> <dd className="inline">{formData.optional.established_year}</dd></div>}
                        {formData.optional.description && <div><dt className="inline font-medium">Description:</dt> <dd className="inline">{formData.optional.description.substring(0, 50)}...</dd></div>}
                      </dl>
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={resetWizard}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>

          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Back
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button
                onClick={nextStep}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Create Church
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchWizard;
