import React, { useState, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Download, Filter, Search, Moon, Sun, BarChart3, Users, Building, MapPin, Church, Calendar, FileText, TrendingUp } from 'lucide-react';

const OCAMetricsOverview = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedView, setSelectedView] = useState('overview');
  const gridRef = useRef();

  // Enhanced OCA Diocese data with realistic information
  const rowData = [
    { 
      diocese: 'Diocese of the Northeast', 
      parishes: 120, 
      missions: 45, 
      institutions: 25,
      region: 'Eastern US',
      established: 1905,
      cathedral: 'St. Nicholas Cathedral, NYC',
      hierarch: 'His Grace Bishop Michael',
      clergy: 95,
      deacons: 23,
      baptisms2024: 245,
      marriages2024: 78,
      funerals2024: 156,
      population: 12500,
      avgAttendance: 65
    },
    { 
      diocese: 'Diocese of the South', 
      parishes: 80, 
      missions: 35, 
      institutions: 20,
      region: 'Southern US',
      established: 1922,
      cathedral: 'St. Nicholas Cathedral, Miami',
      hierarch: 'His Grace Bishop Alexander',
      clergy: 68,
      deacons: 18,
      baptisms2024: 198,
      marriages2024: 65,
      funerals2024: 124,
      population: 9800,
      avgAttendance: 72
    },
    { 
      diocese: 'Diocese of the Midwest', 
      parishes: 90, 
      missions: 40, 
      institutions: 18,
      region: 'Central US',
      established: 1918,
      cathedral: 'Holy Trinity Cathedral, Chicago',
      hierarch: 'His Grace Bishop Daniel',
      clergy: 74,
      deacons: 20,
      baptisms2024: 212,
      marriages2024: 71,
      funerals2024: 138,
      population: 11200,
      avgAttendance: 68
    },
    { 
      diocese: 'Diocese of the West', 
      parishes: 70, 
      missions: 30, 
      institutions: 15,
      region: 'Western US',
      established: 1934,
      cathedral: 'Holy Virgin Cathedral, San Francisco',
      hierarch: 'His Grace Bishop Nicholas',
      clergy: 58,
      deacons: 15,
      baptisms2024: 167,
      marriages2024: 54,
      funerals2024: 102,
      population: 8900,
      avgAttendance: 71
    },
    { 
      diocese: 'Archdiocese of Canada', 
      parishes: 60, 
      missions: 20, 
      institutions: 12,
      region: 'Canada',
      established: 1916,
      cathedral: 'St. Barbara Cathedral, Edmonton',
      hierarch: 'His Grace Bishop Irenee',
      clergy: 48,
      deacons: 12,
      baptisms2024: 134,
      marriages2024: 43,
      funerals2024: 89,
      population: 7200,
      avgAttendance: 69
    },
    { 
      diocese: 'Diocese of Mexico', 
      parishes: 36, 
      missions: 12, 
      institutions: 10,
      region: 'Mexico',
      established: 1972,
      cathedral: 'Protection of the Theotokos, Mexico City',
      hierarch: 'His Grace Bishop Alejo',
      clergy: 32,
      deacons: 8,
      baptisms2024: 89,
      marriages2024: 28,
      funerals2024: 45,
      population: 4500,
      avgAttendance: 78
    }
  ];

  const columnDefs = [
    { 
      headerName: 'Diocese', 
      field: 'diocese', 
      sortable: true, 
      filter: true,
      pinned: 'left',
      width: 280,
      cellRenderer: (params) => (
        <div className="flex items-center gap-3 py-2">
          <div className="w-3 h-3 bg-blue-600 rounded-full flex-shrink-0"></div>
          <div>
            <div className="font-semibold text-gray-900">{params.value}</div>
            <div className="text-sm text-gray-500">{params.data.hierarch}</div>
          </div>
        </div>
      )
    },
    { 
      headerName: 'Region', 
      field: 'region', 
      sortable: true, 
      filter: true,
      width: 120
    },
    { 
      headerName: 'Parishes', 
      field: 'parishes', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 100,
      cellRenderer: (params) => (
        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded text-sm">{params.value}</span>
      )
    },
    { 
      headerName: 'Missions', 
      field: 'missions', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 100,
      cellRenderer: (params) => (
        <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded text-sm">{params.value}</span>
      )
    },
    { 
      headerName: 'Institutions', 
      field: 'institutions', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 120,
      cellRenderer: (params) => (
        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded text-sm">{params.value}</span>
      )
    },
    { 
      headerName: 'Total Communities', 
      valueGetter: params => params.data.parishes + params.data.missions + params.data.institutions,
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 150,
      cellRenderer: (params) => (
        <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded">{params.value}</span>
      )
    },
    { 
      headerName: 'Clergy', 
      field: 'clergy', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 100
    },
    { 
      headerName: 'Population', 
      field: 'population', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 120,
      valueFormatter: params => params.value?.toLocaleString()
    },
    { 
      headerName: 'Baptisms 2024', 
      field: 'baptisms2024', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 130,
      cellRenderer: (params) => (
        <span className="text-blue-600 font-medium">{params.value}</span>
      )
    },
    { 
      headerName: 'Marriages 2024', 
      field: 'marriages2024', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 140,
      cellRenderer: (params) => (
        <span className="text-green-600 font-medium">{params.value}</span>
      )
    },
    { 
      headerName: 'Funerals 2024', 
      field: 'funerals2024', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 130,
      cellRenderer: (params) => (
        <span className="text-gray-600 font-medium">{params.value}</span>
      )
    },
    { 
      headerName: 'Avg Attendance %', 
      field: 'avgAttendance', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 150,
      cellRenderer: (params) => (
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${params.value}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium">{params.value}%</span>
        </div>
      )
    },
    { 
      headerName: 'Established', 
      field: 'established', 
      sortable: true, 
      filter: 'agNumberColumnFilter',
      width: 120
    }
  ];

  // Calculate comprehensive summary statistics
  const summaryStats = useMemo(() => {
    return rowData.reduce((acc, row) => ({
      totalParishes: acc.totalParishes + row.parishes,
      totalMissions: acc.totalMissions + row.missions,
      totalInstitutions: acc.totalInstitutions + row.institutions,
      totalClergy: acc.totalClergy + row.clergy,
      totalBaptisms: acc.totalBaptisms + row.baptisms2024,
      totalMarriages: acc.totalMarriages + row.marriages2024,
      totalFunerals: acc.totalFunerals + row.funerals2024,
      totalPopulation: acc.totalPopulation + row.population,
      avgAttendance: Math.round((acc.avgAttendance + row.avgAttendance) / 2),
    }), {
      totalParishes: 0,
      totalMissions: 0,
      totalInstitutions: 0,
      totalClergy: 0,
      totalBaptisms: 0,
      totalMarriages: 0,
      totalFunerals: 0,
      totalPopulation: 0,
      avgAttendance: 0,
    });
  }, []);

  const onExportCsv = () => {
    if (gridRef.current) {
      gridRef.current.api.exportDataAsCsv({
        fileName: 'oca-metrics-overview.csv',
        columnSeparator: ',',
        suppressQuotes: false
      });
    }
  };

  const onFilterTextBoxChanged = () => {
    if (gridRef.current) {
      gridRef.current.api.setQuickFilter(searchText);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "blue" }) => (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`h-8 w-8 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const ViewTab = ({ id, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white' 
          : isDarkMode 
            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-xl">☦</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    OCA Metrics Overview
                  </h1>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Orthodox Church in America - Administrative Dashboard
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <ViewTab 
                  id="overview" 
                  label="Overview" 
                  isActive={selectedView === 'overview'} 
                  onClick={setSelectedView} 
                />
                <ViewTab 
                  id="analytics" 
                  label="Analytics" 
                  isActive={selectedView === 'analytics'} 
                  onClick={setSelectedView} 
                />
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'} transition-colors`}
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <StatCard 
            icon={Building} 
            title="Total Parishes" 
            value={summaryStats.totalParishes} 
            subtitle="Active communities"
            color="blue"
          />
          <StatCard 
            icon={MapPin} 
            title="Total Missions" 
            value={summaryStats.totalMissions} 
            subtitle="Growing communities"
            color="amber"
          />
          <StatCard 
            icon={Church} 
            title="Institutions" 
            value={summaryStats.totalInstitutions} 
            subtitle="Schools & monasteries"
            color="purple"
          />
          <StatCard 
            icon={Users} 
            title="Clergy" 
            value={summaryStats.totalClergy} 
            subtitle="Priests serving"
            color="green"
          />
          <StatCard 
            icon={Calendar} 
            title="2024 Baptisms" 
            value={summaryStats.totalBaptisms} 
            subtitle="New Orthodox Christians"
            color="blue"
          />
          <StatCard 
            icon={TrendingUp} 
            title="Population" 
            value={summaryStats.totalPopulation} 
            subtitle="Total faithful"
            color="indigo"
          />
        </div>

        {/* Controls */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6 mb-6 shadow-sm`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search dioceses, clergy, regions..."
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setTimeout(onFilterTextBoxChanged, 100);
                  }}
                  className={`pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Filter className="h-4 w-4" />
                <span>Advanced filters available</span>
              </div>
            </div>
            <button
              onClick={onExportCsv}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Export to CSV</span>
            </button>
          </div>
        </div>

        {/* AG Grid */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden shadow-sm`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Diocese Overview & Sacramental Statistics
                </h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Comprehensive data across all OCA dioceses and their communities
                </p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <BarChart3 className="h-4 w-4" />
                <span>Last updated: {new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <div 
              className={`${isDarkMode ? 'ag-theme-alpine-dark' : 'ag-theme-alpine'}`} 
              style={{ height: 600, width: '100%' }}
            >
              <AgGridReact
                ref={gridRef}
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={{
                  flex: 1,
                  minWidth: 100,
                  resizable: true,
                  sortable: true,
                  filter: true,
                }}
                enableRangeSelection={true}
                animateRows={true}
                pagination={true}
                paginationPageSize={10}
                suppressCellFocus={true}
                rowSelection="multiple"
                enableBrowserTooltips={true}
                rowHeight={60}
                headerHeight={50}
              />
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              2024 Sacramental Activity
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Baptisms:</span>
                <div className="text-right">
                  <span className="font-semibold text-blue-600 text-lg">{summaryStats.totalBaptisms}</span>
                  <div className="text-xs text-gray-500">+12% vs 2023</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Marriages:</span>
                <div className="text-right">
                  <span className="font-semibold text-green-600 text-lg">{summaryStats.totalMarriages}</span>
                  <div className="text-xs text-gray-500">+8% vs 2023</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Funerals:</span>
                <div className="text-right">
                  <span className="font-semibold text-purple-600 text-lg">{summaryStats.totalFunerals}</span>
                  <div className="text-xs text-gray-500">-3% vs 2023</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border p-6 shadow-sm`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Community Distribution
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Total Communities:</span>
                <span className="font-semibold text-lg">{summaryStats.totalParishes + summaryStats.totalMissions + summaryStats.totalInstitutions}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Parishes</span>
                  <span className="font-medium text-blue-600">{summaryStats.totalParishes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Missions</span>
                  <span className="font-medium text

