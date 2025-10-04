import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

// Components for each section
import BasicInfoSection from './FormSections/BasicInfoSection';
import RecordsDatabaseSection from './FormSections/RecordsDatabaseSection';
import UploadDirectoriesSection from './FormSections/UploadDirectoriesSection';
import CalendarSettingsSection from './FormSections/CalendarSettingsSection';
import AppearanceSection from './FormSections/AppearanceSection';
import UsersSection from './FormSections/UsersSection';
import FeatureTogglesSection from './FormSections/FeatureTogglesSection';
import SystemMetadataSection from './FormSections/SystemMetadataSection';

const EditChurchModal = ({ church, isOpen, onClose }) => {
  const isNewChurch = !church;
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    timezone: 'UTC',
    language: 'en',
    active: true,
    records_database_name: '',
    avatar_dir: '',
    ocr_upload_dir: '',
    calendar_type: 'Revised Julian',
    show_fast_days: true,
    show_local_saints: true,
    feast_overrides_path: '',
    theme_color: 'purple',
    logo_path: '',
    banner_path: '',
    favicon_path: '',
    enable_ocr: true,
    enable_certificates: true,
    enable_liturgical_calendar: true,
    enable_invoicing: false,
    enable_audit_logs: false,
    created_at: '',
    updated_at: ''
  });

  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

  // Files for upload
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [feastOverridesFile, setFeastOverridesFile] = useState(null);

  useEffect(() => {
    // If editing an existing church, populate form data
    if (church) {
      setFormData(prevData => ({
        ...prevData,
        ...church
      }));
      fetchAssignedUsers(church.id);
    }

    fetchDatabases();
    fetchAllUsers();
  }, [church?.id]); // Only depend on church.id instead of the entire church object

  const fetchDatabases = async () => {
    try {
      const response = await axios.get('/api/databases', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDatabases(response.data);
    } catch (error) {
      console.error('Error fetching databases:', error);
      toast.error('Failed to load databases. Please try again.');
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users. Please try again.');
    }
  };

  const fetchAssignedUsers = async (churchId) => {
    try {
      const response = await axios.get(`/api/churches/${churchId}/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAssignedUsers(response.data);
    } catch (error) {
      console.error('Error fetching church users:', error);
      toast.error('Failed to load church users. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleFileChange = (e, setFileFunction) => {
    const file = e.target.files[0];
    if (file) {
      setFileFunction(file);
    }
  };

  const uploadFiles = async (churchId) => {
    const uploads = [];

    if (logoFile) {
      const logoFormData = new FormData();
      logoFormData.append('file', logoFile);
      logoFormData.append('type', 'logo');

      uploads.push(
        axios.post(`/api/churches/${churchId}/upload`, logoFormData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
    }

    if (bannerFile) {
      const bannerFormData = new FormData();
      bannerFormData.append('file', bannerFile);
      bannerFormData.append('type', 'banner');

      uploads.push(
        axios.post(`/api/churches/${churchId}/upload`, bannerFormData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
    }

    if (faviconFile) {
      const faviconFormData = new FormData();
      faviconFormData.append('file', faviconFile);
      faviconFormData.append('type', 'favicon');

      uploads.push(
        axios.post(`/api/churches/${churchId}/upload`, faviconFormData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
    }

    if (feastOverridesFile) {
      const feastOverridesFormData = new FormData();
      feastOverridesFormData.append('file', feastOverridesFile);
      feastOverridesFormData.append('type', 'feast_overrides');

      uploads.push(
        axios.post(`/api/churches/${churchId}/upload`, feastOverridesFormData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      );
    }

    if (uploads.length > 0) {
      try {
        await Promise.all(uploads);
      } catch (error) {
        console.error('Error uploading files:', error);
        toast.error('Some files failed to upload.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;

      if (isNewChurch) {
        // Create new church
        response = await axios.post('/api/churches', formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        toast.success('Church created successfully');
      } else {
        // Update existing church
        response = await axios.put(`/api/churches/${church.id}`, formData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });

        toast.success('Church updated successfully');
      }

      // Upload files if any
      if (response.data && response.data.id) {
        await uploadFiles(response.data.id);
      }

      onClose(true); // Close modal and refresh data
    } catch (error) {
      console.error('Error saving church:', error);
      toast.error(error.response?.data?.message || 'Failed to save church. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyDatabaseConnection = async () => {
    if (!formData.records_database_name) {
      toast.warning('Please select a database first');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post('/api/churches/verify-database',
        { database_name: formData.records_database_name },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );

      if (response.data.success) {
        toast.success('Database connection verified successfully');
      } else {
        toast.error('Database connection failed');
      }
    } catch (error) {
      console.error('Error verifying database:', error);
      toast.error('Database connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId, role) => {
    try {
      if (!church || !church.id) {
        toast.warning('Please save the church first before assigning users');
        return;
      }

      await axios.post(`/api/churches/${church.id}/users`,
        { user_id: userId, role },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );

      toast.success('User assigned successfully');
      fetchAssignedUsers(church.id);
    } catch (error) {
      console.error('Error assigning user:', error);
      toast.error('Failed to assign user to church');
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      if (!church || !church.id) return;

      await axios.delete(`/api/churches/${church.id}/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success('User removed successfully');
      fetchAssignedUsers(church.id);
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user from church');
    }
  };

  return (
    <Dialog open={isOpen} onClose={() => onClose(false)} className="relative z-50">
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <Dialog.Panel className="mx-auto max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded bg-white p-6 shadow-xl">
          <Dialog.Title className="text-2xl font-bold mb-4">
            {isNewChurch ? 'Add New Church' : `Edit Church: ${church?.name}`}
          </Dialog.Title>

          <form onSubmit={handleSubmit}>
            <Tabs selectedIndex={activeTab} onSelect={index => setActiveTab(index)}>
              <TabList>
                <Tab>Basic Info</Tab>
                <Tab>Records Database</Tab>
                <Tab>Upload Directories</Tab>
                <Tab>Calendar Settings</Tab>
                <Tab>Appearance</Tab>
                <Tab>Users</Tab>
                <Tab>Features</Tab>
                <Tab>Advanced</Tab>
                {!isNewChurch && <Tab>System Info</Tab>}
              </TabList>

              <div className="py-4">
                <TabPanel>
                  <BasicInfoSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </TabPanel>

                <TabPanel>
                  <RecordsDatabaseSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                    databases={databases}
                    verifyDatabaseConnection={verifyDatabaseConnection}
                  />
                </TabPanel>

                <TabPanel>
                  <UploadDirectoriesSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </TabPanel>

                <TabPanel>
                  <CalendarSettingsSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                    feastOverridesFile={feastOverridesFile}
                    handleFileChange={(e) => handleFileChange(e, setFeastOverridesFile)}
                  />
                </TabPanel>

                <TabPanel>
                  <AppearanceSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                    logoFile={logoFile}
                    bannerFile={bannerFile}
                    faviconFile={faviconFile}
                    handleLogoChange={(e) => handleFileChange(e, setLogoFile)}
                    handleBannerChange={(e) => handleFileChange(e, setBannerFile)}
                    handleFaviconChange={(e) => handleFileChange(e, setFaviconFile)}
                  />
                </TabPanel>

                <TabPanel>
                  <UsersSection
                    assignedUsers={assignedUsers}
                    allUsers={allUsers}
                    handleAssignUser={handleAssignUser}
                    handleRemoveUser={handleRemoveUser}
                  />
                </TabPanel>

                <TabPanel>
                  <FeatureTogglesSection
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </TabPanel>

                <TabPanel>
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                    
                    {/* Church Language Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Church Language
                        </label>
                        <select
                          name="language"
                          value={formData.language}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="en">English</option>
                          <option value="el">Greek (Ελληνικά)</option>
                          <option value="ru">Russian (Русский)</option>
                          <option value="ro">Romanian (Română)</option>
                          <option value="ka">Georgian (ქართული)</option>
                        </select>
                      </div>

                      {/* Auto-populated Database Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Database Name
                        </label>
                        <input
                          type="text"
                          value={formData.records_database_name}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                          placeholder="Auto-generated on creation"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This field is automatically populated and cannot be changed.
                        </p>
                      </div>
                    </div>

                    {/* Church Record Types Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Church Record Types
                      </label>
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                        <p className="text-sm text-gray-600 mb-3">
                          Available record types in this church's database:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-sm">Baptism Records</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span className="text-sm">Marriage Records</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
                            <span className="text-sm">Funeral Records</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                            <span className="text-sm">Chrismation Records</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                            <span className="text-sm">Ordination Records</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
                            <span className="text-sm">Memorial Services</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Record types are automatically created based on your church's database schema.
                        </p>
                      </div>
                    </div>

                    {/* User Management Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Church User Management
                      </label>
                      <div className="bg-white border border-gray-200 rounded-md">
                        <div className="px-4 py-3 border-b border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900">Assigned Users</h4>
                        </div>
                        <div className="p-4">
                          {assignedUsers && assignedUsers.length > 0 ? (
                            <div className="space-y-2">
                              {assignedUsers.map((user) => (
                                <div key={user.id || user.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3">
                                      {(user.first_name || '').charAt(0)}{(user.last_name || '').charAt(0)}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {user.first_name || ''} {user.last_name || ''}
                                      </p>
                                      <p className="text-xs text-gray-500">{user.email || ''}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {user.role || 'viewer'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUser(user.id || user.user_id)}
                                      className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No users assigned to this church
                            </p>
                          )}
                          
                          {/* Add User Button */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Add User to Church
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabPanel>

                {!isNewChurch && (
                  <TabPanel>
                    <SystemMetadataSection
                      created={church?.created_at}
                      updated={church?.updated_at}
                    />
                  </TabPanel>
                )}
              </div>
            </Tabs>

            <div className="flex justify-end gap-2 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Church'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default EditChurchModal;
