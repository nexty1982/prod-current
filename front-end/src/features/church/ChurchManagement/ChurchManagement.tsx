import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import OrthodoxBanner from '@/components/OrthodoxBanner/OrthodoxBanner';
import EditChurchModal from './EditChurchModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';
import api from '@/api/orthodox-metrics.api';

const ChurchManagement = () => {
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    fetchChurches();
  }, []);

  const fetchChurches = async () => {
    try {
      setLoading(true);
      const response = await api.churches.getAll();
      setChurches(response.churches || response);
    } catch (error) {
      console.error('Error fetching churches:', error);
      toast.error('Failed to load churches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChurch = () => {
    setSelectedChurch(null);
    setEditModalOpen(true);
  };

  const handleEditChurch = (church) => {
    setSelectedChurch(church);
    setEditModalOpen(true);
  };

  const handleDeleteChurch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this church? This action cannot be undone.')) {
      return;
    }

    try {
      await api.churches.delete(id);
      toast.success('Church deleted successfully');
      fetchChurches();
    } catch (error) {
      console.error('Error deleting church:', error);
      toast.error('Failed to delete church. Please try again.');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await api.churches.updateStatus(id, !currentStatus);
      toast.success(`Church ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      fetchChurches();
    } catch (error) {
      console.error('Error toggling church status:', error);
      toast.error('Failed to update church status. Please try again.');
    }
  };

  const closeModal = (refreshData = false) => {
    setEditModalOpen(false);
    if (refreshData) {
      fetchChurches();
    }
  };

  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Church Name', flex: 2 },
    { field: 'address', headerName: 'Address', flex: 2 },
    { field: 'timezone', headerName: 'Timezone', flex: 1 },
    { field: 'language', headerName: 'Language', width: 100 },
    {
      field: 'active',
      headerName: 'Status',
      width: 120,
      cellRenderer: (params) => {
        const status = params.value ? 'Active' : 'Inactive';
        const className = params.value ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {status}
          </span>
        );
      }
    },
    {
      headerName: 'Actions',
      width: 200,
      cellRenderer: (params) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditChurch(params.data)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
          >
            Edit
          </button>
          <button
            onClick={() => handleToggleStatus(params.data.id, params.data.active)}
            className={`px-2 py-1 rounded text-xs text-white ${params.data.active ? 'bg-orange-500' : 'bg-green-500'}`}
          >
            {params.data.active ? 'Deactivate' : 'Activate'}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => handleDeleteChurch(params.data.id)}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Delete
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="church-management p-6">
      <OrthodoxBanner subtitle="Church Management" />

      <div className="my-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Church Management</h1>
        {isSuperAdmin && (
          <button
            onClick={handleCreateChurch}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Add New Church
          </button>
        )}
      </div>

      <div className="ag-theme-alpine w-full h-[600px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            Loading churches...
          </div>
        ) : (
          <AgGridReact
            columnDefs={columnDefs}
            rowData={churches}
            pagination={true}
            paginationPageSize={10}
            domLayout="autoHeight"
          />
        )}
      </div>

      {editModalOpen && (
        <EditChurchModal
          church={selectedChurch}
          isOpen={editModalOpen}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default ChurchManagement;
