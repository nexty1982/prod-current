import React, { useState, useEffect } from 'react';
import { PlusIcon, BuildingOfficeIcon, UsersIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import ChurchWizard from './ChurchWizard';
import EditChurchModal from './EditChurchModal';

const ChurchManagement = () => {
  const [churches, setChurches] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedChurchId, setSelectedChurchId] = useState(null);

  // Fetch churches on component mount
  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/churches', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch churches');
      }

      const data = await response.json();
      console.log('✅ Church API Response:', data);
      
      if (data.success && Array.isArray(data.churches)) {
        setChurches(data.churches);
      } else {
        console.error('❌ Invalid API response format:', data);
        setChurches([]);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching churches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChurchCreated = (newChurch) => {
    console.log('New church created:', newChurch);
    setShowWizard(false);
    fetchChurches(); // Refresh the list
    
    // Show success notification
    alert(`Church "${newChurch.name}" created successfully!`);
  };

  const handleEditChurch = (churchId) => {
    setSelectedChurchId(churchId);
    setEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedChurchId(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageFlag = (lang) => {
    const flags = {
      'en': '🇺🇸',
      'gr': '🇬🇷',
      'ru': '🇷🇺',
      'ro': '🇷🇴',
      'sr': '🇷🇸'
    };
    return flags[lang] || '🌐';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading churches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <h3 className="text-red-800 font-medium">Error Loading Churches</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchChurches}
          className="mt-3 text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Church Management</h1>
            <p className="text-gray-600 mt-1">
              Manage Orthodox church instances and provisioning
            </p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add New Church</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Churches</p>
                <p className="text-2xl font-bold text-gray-900">{churches.length}</p>
              </div>
            </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {churches.reduce((sum, church) => sum + (church.user_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {churches.reduce((sum, church) => {
                    const counts = church.record_counts || {};
                    return sum + (counts.baptisms || 0) + (counts.marriages || 0) + (counts.funerals || 0);
                  }, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-yellow-600 font-bold text-lg">🌍</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Languages</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(churches.map(c => c.preferred_language || c.language)).size}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Churches List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Churches</h2>
        </div>
        
        {churches.length === 0 ? (
          <div className="p-8 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Churches Yet</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first Orthodox church instance.
            </p>
            <button
              onClick={() => setShowWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add First Church
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Church</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Language</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {churches.map((church) => (
                  <tr key={church.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {church.logo_path ? (
                          <img
                            src={church.logo_path}
                            alt={`${church.name} logo`}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{church.name}</div>
                          <div className="text-sm text-gray-500">{church.database_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.city}, {church.region}</div>
                      <div className="text-sm text-gray-500">{church.country}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.address || "Address not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.email || "Email not specified"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getLanguageFlag(church.preferred_language)}</span>
                        <span className="text-sm text-gray-900">{church.preferred_language?.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{church.user_count || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="space-y-1">
                        <div>B: {church.record_counts?.baptisms || 0}</div>
                        <div>M: {church.record_counts?.marriages || 0}</div>
                        <div>F: {church.record_counts?.funerals || 0}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${church.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{church.status}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(church.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                        onClick={() => handleEditChurch(church.id)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Church Wizard Modal */}
      {showWizard && (
        <ChurchWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleChurchCreated}
        />
      )}
      <EditChurchModal
        open={editModalOpen}
        onClose={handleCloseEditModal}
        churchId={selectedChurchId}
        onSave={fetchChurches}
      />
    </div>
  );
};

export default ChurchManagement;
