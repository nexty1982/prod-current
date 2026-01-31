import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  Map, 
  List, 
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Phone,
  Mail,
  Settings,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Home
} from 'lucide-react';

const OrthodoxMetricsMap = () => {
  // Add signup status to each church
  const initialChurches = [
    { id: 1, name: "Holy Resurrection Cathedral", location: "Anchorage, AK", website: "https://www.holyresurrection-anchorage.org", jurisdiction: "Orthodox Church in America", established: "1969", state: "Alaska", lat: 61.2181, lng: -149.9003, status: "signed_up", signupDate: "2024-01-15" },
    { id: 2, name: "Saint Nicholas Orthodox Church", location: "Juneau, AK", website: "https://www.stnicholasjuneau.org", jurisdiction: "Orthodox Church in America", established: "1970", state: "Alaska", lat: 58.3019, lng: -134.4197, status: "in_progress", signupDate: null },
    { id: 3, name: "Saint Herman of Alaska Chapel", location: "Kodiak, AK", website: "https://www.sthermankodiak.org", jurisdiction: "Orthodox Church in America", established: "1794", state: "Alaska", lat: 57.7900, lng: -152.4044, status: "signed_up", signupDate: "2024-02-20" },
    { id: 4, name: "Holy Cross Orthodox Church", location: "Fairbanks, AK", website: "https://www.holycrossfairbanks.org", jurisdiction: "Orthodox Church in America", established: "1965", state: "Alaska", lat: 64.8378, lng: -147.7164, status: "uncontacted", signupDate: null },
    { id: 5, name: "Saint Nicholas Cathedral", location: "Washington, DC", website: "https://www.stnicholasdc.org", jurisdiction: "Orthodox Church in America", established: "1930", state: "District of Columbia", lat: 38.9072, lng: -77.0369, status: "signed_up", signupDate: "2024-01-10" },
    { id: 6, name: "Saint Tikhon Orthodox Monastery", location: "South Canaan, PA", website: "https://www.sttikhonsmonastery.org", jurisdiction: "Orthodox Church in America", established: "1905", state: "Pennsylvania", lat: 41.3318, lng: -75.4277, status: "signed_up", signupDate: "2024-01-05" },
    { id: 7, name: "Saints Peter and Paul Orthodox Church", location: "Potomac, MD", website: "https://www.sspeterpaul.org", jurisdiction: "Orthodox Church in America", established: "1985", state: "Maryland", lat: 39.0458, lng: -77.2086, status: "in_progress", signupDate: null },
    { id: 8, name: "Saint John the Baptist Orthodox Church", location: "Canonsburg, PA", website: "https://www.stjohncanonsburg.org", jurisdiction: "Orthodox Church in America", established: "1916", state: "Pennsylvania", lat: 40.2620, lng: -80.1878, status: "signed_up", signupDate: "2024-02-01" },
    { id: 9, name: "Holy Trinity Orthodox Church", location: "Yonkers, NY", website: "https://www.holytrinityyonkers.org", jurisdiction: "Orthodox Church in America", established: "1936", state: "New York", lat: 40.9312, lng: -73.8988, status: "signed_up", signupDate: "2024-01-25" },
    { id: 10, name: "Saint Vladimir Orthodox Church", location: "Trenton, NJ", website: "https://www.stvladimirtrenton.org", jurisdiction: "Orthodox Church in America", established: "1951", state: "New Jersey", lat: 40.2206, lng: -74.7565, status: "uncontacted", signupDate: null },
    // Additional sample churches for demonstration
    { id: 11, name: "Saint George Greek Orthodox Church", location: "Los Angeles, CA", website: "https://www.stgeorgela.org", jurisdiction: "Greek Orthodox", established: "1923", state: "California", lat: 34.0522, lng: -118.2437, status: "signed_up", signupDate: "2024-03-01" },
    { id: 12, name: "Holy Trinity Greek Orthodox Church", location: "San Francisco, CA", website: "https://www.holytrinitysf.org", jurisdiction: "Greek Orthodox", established: "1903", state: "California", lat: 37.7749, lng: -122.4194, status: "signed_up", signupDate: "2024-02-15" },
    { id: 13, name: "Saint Nicholas Greek Orthodox Church", location: "Chicago, IL", website: "https://www.stnicholaschicago.org", jurisdiction: "Greek Orthodox", established: "1892", state: "Illinois", lat: 41.8781, lng: -87.6298, status: "in_progress", signupDate: null },
    { id: 14, name: "Annunciation Greek Orthodox Church", location: "Boston, MA", website: "https://www.annunciationboston.org", jurisdiction: "Greek Orthodox", established: "1888", state: "Massachusetts", lat: 42.3601, lng: -71.0589, status: "signed_up", signupDate: "2024-01-30" },
    { id: 15, name: "Saint Michael Antiochian Orthodox Church", location: "Houston, TX", website: "https://www.stmichaelhouston.org", jurisdiction: "Antiochian Orthodox", established: "1952", state: "Texas", lat: 29.7604, lng: -95.3698, status: "uncontacted", signupDate: null },
    { id: 16, name: "Saint John Russian Orthodox Church", location: "Miami, FL", website: "https://www.stjohnmiami.org", jurisdiction: "Russian Orthodox (ROCOR)", established: "1963", state: "Florida", lat: 25.7617, lng: -80.1918, status: "signed_up", signupDate: "2024-02-28" },
    { id: 17, name: "Holy Trinity Serbian Orthodox Church", location: "Denver, CO", website: "https://www.holytrinitydenver.org", jurisdiction: "Serbian Orthodox", established: "1949", state: "Colorado", lat: 39.7392, lng: -104.9903, status: "in_progress", signupDate: null },
    { id: 18, name: "Saint Mary Romanian Orthodox Church", location: "Seattle, WA", website: "https://www.stmaryseattle.org", jurisdiction: "Romanian Orthodox", established: "1965", state: "Washington", lat: 47.6062, lng: -122.3321, status: "signed_up", signupDate: "2024-03-10" },
    { id: 19, name: "Saints Cyril and Methodius Bulgarian Orthodox Church", location: "Atlanta, GA", website: "https://www.stscmatlanta.org", jurisdiction: "Bulgarian Orthodox", established: "1968", state: "Georgia", lat: 33.7490, lng: -84.3880, status: "uncontacted", signupDate: null },
    { id: 20, name: "Saint Andrew Ukrainian Orthodox Church", location: "Phoenix, AZ", website: "https://www.standrewphoenix.org", jurisdiction: "Ukrainian Orthodox", established: "1972", state: "Arizona", lat: 33.4484, lng: -112.0740, status: "signed_up", signupDate: "2024-03-05" }
  ];

  const [churches, setChurches] = useState(initialChurches);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('all');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [darkMode, setDarkMode] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState({ x: 0, y: 0 });
  const [showStats, setShowStats] = useState(true);

  // Get unique values for filters
  const jurisdictions = ['all', ...new Set(churches.map(church => church.jurisdiction))];
  const states = ['all', ...new Set(churches.map(church => church.state))].sort();
  const statuses = ['all', 'signed_up', 'in_progress', 'uncontacted'];

  // Filter churches
  const filteredChurches = useMemo(() => {
    return churches.filter(church => {
      const matchesSearch = 
        church.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        church.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        church.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesJurisdiction = selectedJurisdiction === 'all' || church.jurisdiction === selectedJurisdiction;
      const matchesState = selectedState === 'all' || church.state === selectedState;
      const matchesStatus = selectedStatus === 'all' || church.status === selectedStatus;
      
      return matchesSearch && matchesJurisdiction && matchesState && matchesStatus;
    });
  }, [churches, searchTerm, selectedJurisdiction, selectedState, selectedStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = churches.length;
    const signedUp = churches.filter(c => c.status === 'signed_up').length;
    const inProgress = churches.filter(c => c.status === 'in_progress').length;
    const uncontacted = churches.filter(c => c.status === 'uncontacted').length;
    const conversionRate = total > 0 ? (signedUp / total * 100).toFixed(1) : 0;
    
    return { total, signedUp, inProgress, uncontacted, conversionRate };
  }, [churches]);

  // Status colors and icons
  const getStatusColor = (status) => {
    switch (status) {
      case 'signed_up': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'uncontacted': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed_up': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'uncontacted': return <XCircle className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'signed_up': return 'Signed Up';
      case 'in_progress': return 'In Progress';
      case 'uncontacted': return 'Uncontacted';
      default: return 'Unknown';
    }
  };

  const getJurisdictionColor = (jurisdiction) => {
    const colors = {
      'Greek Orthodox': '#3B82F6',
      'Orthodox Church in America': '#10B981',
      'Antiochian Orthodox': '#8B5CF6',
      'Russian Orthodox (ROCOR)': '#EF4444',
      'Serbian Orthodox': '#F59E0B',
      'Romanian Orthodox': '#6366F1',
      'Bulgarian Orthodox': '#EC4899',
      'Carpatho-Russian Orthodox': '#F97316',
      'Ukrainian Orthodox': '#06B6D4'
    };
    return colors[jurisdiction] || '#6B7280';
  };

  // Update church status
  const updateChurchStatus = (churchId, newStatus) => {
    setChurches(prev => prev.map(church => 
      church.id === churchId 
        ? { 
            ...church, 
            status: newStatus, 
            signupDate: newStatus === 'signed_up' ? new Date().toISOString().split('T')[0] : null 
          }
        : church
    ));
  };

  // Export data
  const exportData = () => {
    const dataStr = JSON.stringify(churches, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'orthodox_metrics_churches.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import data
  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          setChurches(importedData);
        } catch (error) {
          alert('Error importing data: Invalid JSON format');
        }
      };
      reader.readAsText(file);
    }
  };

  // US States coordinates for map (simplified)
  const stateStats = useMemo(() => {
    const stateData = {};
    churches.forEach(church => {
      if (!stateData[church.state]) {
        stateData[church.state] = { total: 0, signedUp: 0 };
      }
      stateData[church.state].total++;
      if (church.status === 'signed_up') {
        stateData[church.state].signedUp++;
      }
    });
    return stateData;
  }, [churches]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OrthodoxMetrics Dashboard</h1>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Church Signup Tracking & Outreach Management
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {showStats ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <Map className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 shadow-sm' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
            
            {/* Data Sync */}
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <label className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Bar */}
      {showStats && (
        <div className={`border-b ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} px-6 py-4`}>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Churches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.signedUp}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Signed Up</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.uncontacted}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Uncontacted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.conversionRate}%</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Conversion Rate</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-140px)]">
        {/* Sidebar */}
        <div className={`transition-all duration-300 ${
          sidebarOpen ? 'w-96' : 'w-0'
        } ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r overflow-hidden`}>
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search churches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Filters */}
            <div className="space-y-3">
              <select
                value={selectedJurisdiction}
                onChange={(e) => setSelectedJurisdiction(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="all">All Jurisdictions</option>
                {jurisdictions.slice(1).map(jurisdiction => (
                  <option key={jurisdiction} value={jurisdiction}>{jurisdiction}</option>
                ))}
              </select>

              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="all">All States</option>
                {states.slice(1).map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="all">All Statuses</option>
                <option value="signed_up">Signed Up</option>
                <option value="in_progress">In Progress</option>
                <option value="uncontacted">Uncontacted</option>
              </select>
            </div>

            {/* Church List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredChurches.map(church => (
                  <div
                    key={church.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-a
