import React, { useState } from 'react';

const UsersSection = ({ assignedUsers, allUsers, handleAssignUser, handleRemoveUser }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('viewer');

  const availableUsers = allUsers.filter(user =>
    !assignedUsers.some(assignedUser => assignedUser.user_id === user.id)
  );

  const handleAssignClick = () => {
    if (selectedUserId) {
      handleAssignUser(selectedUserId, selectedRole);
      setSelectedUserId('');
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Assigned Users</h3>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-grow">
          <label htmlFor="user_select" className="block text-sm font-medium text-gray-700">
            Assign User
          </label>
          <select
            id="user_select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">Select a user</option>
            {availableUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="role_select" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role_select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="admin">Admin</option>
            <option value="priest">Priest</option>
            <option value="deacon">Deacon</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={handleAssignClick}
            disabled={!selectedUserId}
            className="h-10 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-300"
          >
            Assign
          </button>
        </div>
      </div>

      <div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assignedUsers.length > 0 ? (
                assignedUsers.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => handleRemoveUser(user.user_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    No users assigned to this church yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-800">User Role Information</h3>
            <div className="mt-2 text-sm text-gray-600">
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-semibold">Admin:</span> Full access to church records and settings</li>
                <li><span className="font-semibold">Priest:</span> Can manage all records and perform administrative functions</li>
                <li><span className="font-semibold">Deacon:</span> Can view all records and edit certain types</li>
                <li><span className="font-semibold">Viewer:</span> Can only view records, no editing permissions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersSection;
