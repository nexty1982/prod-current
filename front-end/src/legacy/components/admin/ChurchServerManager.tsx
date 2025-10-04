import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Settings, 
  FileText, 
  Plus, 
  Search, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Cpu,
  HardDrive,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

// Types
interface ChurchServer {
  id: number;
  name: string;
  language: string;
  port: number;
  status: 'running' | 'stopped' | 'error';
  admin_email: string;
  last_active: string;
  cpu_usage: number;
  ram_usage: number;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

// Main Component
const ChurchServerManager: React.FC = () => {
  const [servers, setServers] = useState<ChurchServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ChurchServer | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Form states
  const [newServer, setNewServer] = useState({
    name: '',
    language: 'en',
    port: 3001,
    admin_email: ''
  });

  // Dummy data for testing
  const dummyServers: ChurchServer[] = [
    {
      id: 1,
      name: "St. Peter & Paul Orthodox Church",
      language: "en",
      port: 3001,
      status: "running",
      admin_email: "admin@stpeterpaul.org",
      last_active: "2025-07-11T10:30:00Z",
      cpu_usage: 23.5,
      ram_usage: 67.2
    },
    {
      id: 2,
      name: "Αγία Τριάδα (Holy Trinity)",
      language: "gr",
      port: 3002,
      status: "stopped",
      admin_email: "admin@holytrinitygr.org",
      last_active: "2025-07-10T15:45:00Z",
      cpu_usage: 0,
      ram_usage: 12.1
    },
    {
      id: 3,
      name: "Свети Николај (St. Nicholas)",
      language: "rs",
      port: 3003,
      status: "error",
      admin_email: "admin@stnicholasrs.org",
      last_active: "2025-07-11T08:15:00Z",
      cpu_usage: 5.2,
      ram_usage: 45.8
    }
  ];

  const dummyLogs: LogEntry[] = [
    { timestamp: "2025-07-11T10:30:15Z", level: "info", message: "Server started successfully" },
    { timestamp: "2025-07-11T10:29:45Z", level: "info", message: "Database connection established" },
    { timestamp: "2025-07-11T10:29:30Z", level: "warn", message: "High memory usage detected" },
    { timestamp: "2025-07-11T10:28:12Z", level: "error", message: "Failed to connect to external API" },
    { timestamp: "2025-07-11T10:27:00Z", level: "info", message: "User authentication successful" }
  ];

  // API Functions (using dummy data for now)
  const fetchServers = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/churches');
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setServers(dummyServers);
      setError(null);
    } catch (err) {
      setError('Failed to fetch server data');
    } finally {
      setLoading(false);
    }
  };

  const startServer = async (id: number) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/churches/${id}/start`, { method: 'POST' });
      
      setServers(prev => prev.map(server => 
        server.id === id ? { ...server, status: 'running' as const } : server
      ));
    } catch (err) {
      setError('Failed to start server');
    }
  };

  const stopServer = async (id: number) => {
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/churches/${id}/stop`, { method: 'POST' });
      
      setServers(prev => prev.map(server => 
        server.id === id ? { ...server, status: 'stopped' as const, cpu_usage: 0 } : server
      ));
    } catch (err) {
      setError('Failed to stop server');
    }
  };

  const fetchLogs = async (id: number) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/churches/${id}/logs`);
      // const data = await response.json();
      
      setLogs(dummyLogs);
    } catch (err) {
      setError('Failed to fetch logs');
    }
  };

  const addServer = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/churches', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(newServer)
      // });
      
      const newId = Math.max(...servers.map(s => s.id)) + 1;
      const serverToAdd: ChurchServer = {
        ...newServer,
        id: newId,
        status: 'stopped',
        last_active: new Date().toISOString(),
        cpu_usage: 0,
        ram_usage: 0
      };
      
      setServers(prev => [...prev, serverToAdd]);
      setShowAddModal(false);
      setNewServer({ name: '', language: 'en', port: 3001, admin_email: '' });
    } catch (err) {
      setError('Failed to add server');
    }
  };

  const updateServer = async () => {
    if (!selectedServer) return;
    
    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/churches/${selectedServer.id}`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(selectedServer)
      // });
      
      setServers(prev => prev.map(server => 
        server.id === selectedServer.id ? selectedServer : server
      ));
      setShowEditModal(false);
    } catch (err) {
      setError('Failed to update server');
    }
  };

  const restartAllServers = async () => {
    try {
      const runningServers = servers.filter(s => s.status === 'running');
      for (const server of runningServers) {
        await stopServer(server.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startServer(server.id);
      }
    } catch (err) {
      setError('Failed to restart all servers');
    }
  };

  // Effects
  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Filter servers
  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage = selectedLanguage === '' || server.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  // Helper functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'stopped': return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusPill = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case 'running': return `${baseClasses} bg-green-100 text-green-800`;
      case 'stopped': return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'error': return `${baseClasses} bg-red-100 text-red-800`;
      default: return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  const formatLastActive = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const languages = [
    { code: '', label: 'All Languages' },
    { code: 'en', label: 'English' },
    { code: 'gr', label: 'Greek' },
    { code: 'rs', label: 'Serbian' },
    { code: 'ru', label: 'Russian' },
    { code: 'ar', label: 'Arabic' }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #8a0303 0%, #a01010 100%)' }}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Church Server Manager
          </h1>
          <p className="text-red-100">
            Manage multiple isolated backend church server instances
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <div className="mb-6 p-6 rounded-lg" style={{ background: '#fefae0' }}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Add New Server */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 rounded-lg text-white font-medium transition-colors"
              style={{ background: '#C8A951' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Church Server
            </button>

            {/* Restart All */}
            <button
              onClick={restartAllServers}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart All
            </button>

            {/* Search */}
            <div className="flex items-center bg-white rounded-lg px-3 py-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search by church name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>

            {/* Language Filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg outline-none"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Servers Table */}
        <div className="rounded-lg overflow-hidden shadow-lg" style={{ background: '#fefae0' }}>
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-500" />
              <p className="text-gray-600">Loading church servers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Church Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Port
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CPU %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RAM %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServers.map((server) => (
                    <tr key={server.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {server.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {server.admin_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        :{server.port}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {server.language.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(server.status)}
                          <span className={`ml-2 ${getStatusPill(server.status)}`}>
                            {server.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatLastActive(server.last_active)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Cpu className="w-4 h-4 mr-1 text-gray-400" />
                          {server.cpu_usage}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <HardDrive className="w-4 h-4 mr-1 text-gray-400" />
                          {server.ram_usage}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Start/Stop */}
                          {server.status === 'running' ? (
                            <button
                              onClick={() => stopServer(server.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Stop Server"
                            >
                              <Square className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => startServer(server.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Start Server"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Server"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Logs */}
                          <button
                            onClick={() => {
                              setSelectedServer(server);
                              fetchLogs(server.id);
                              setShowLogsModal(true);
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                            title="View Logs"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Server Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add New Church Server</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Church Name
                  </label>
                  <input
                    type="text"
                    value={newServer.name}
                    onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter church name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={newServer.language}
                    onChange={(e) => setNewServer(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="gr">Greek</option>
                    <option value="rs">Serbian</option>
                    <option value="ru">Russian</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={newServer.port}
                    onChange={(e) => setNewServer(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="3001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={newServer.admin_email}
                    onChange={(e) => setNewServer(prev => ({ ...prev, admin_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@church.org"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addServer}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ background: '#C8A951' }}
                >
                  Add Server
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Server Modal */}
        {showEditModal && selectedServer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Edit Server: {selectedServer.name}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    value={selectedServer.language}
                    onChange={(e) => setSelectedServer(prev => prev ? ({ ...prev, language: e.target.value }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="gr">Greek</option>
                    <option value="rs">Serbian</option>
                    <option value="ru">Russian</option>
                    <option value="ar">Arabic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={selectedServer.port}
                    onChange={(e) => setSelectedServer(prev => prev ? ({ ...prev, port: parseInt(e.target.value) }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    value={selectedServer.admin_email}
                    onChange={(e) => setSelectedServer(prev => prev ? ({ ...prev, admin_email: e.target.value }) : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateServer}
                  className="px-4 py-2 text-white rounded-lg transition-colors"
                  style={{ background: '#C8A951' }}
                >
                  Update Server
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {showLogsModal && selectedServer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Server Logs: {selectedServer.name}</h2>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-y-auto max-h-96">
                {logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      log.level === 'error' ? 'bg-red-900 text-red-200' :
                      log.level === 'warn' ? 'bg-yellow-900 text-yellow-200' :
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => fetchLogs(selectedServer.id)}
                  className="px-4 py-2 text-white rounded-lg transition-colors mr-2"
                  style={{ background: '#C8A951' }}
                >
                  Refresh Logs
                </button>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurchServerManager;
