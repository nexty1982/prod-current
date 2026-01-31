import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Heart, Church, Users, Baby, Droplets, TrendingUp, Calendar, Globe, Info, AlertTriangle, BarChart3, Archive } from 'lucide-react';

const CompleteParishDashboardWithTabs = () => {
  const [activeTab, setActiveTab] = useState('sacraments');
  const [baptismChartType, setBaptismChartType] = useState('line');
  const [funeralChartType, setFuneralChartType] = useState('pie');
  const [ethnicityChartType, setEthnicityChartType] = useState('pie');
  const [showMethodology, setShowMethodology] = useState(false);

  // Marriage data derived from actual marriage_records.csv
  const marriageData = [
    { decade: "1940s", count: 30 },
    { decade: "1950s", count: 24 },
    { decade: "1960s", count: 28 },
    { decade: "1970s", count: 32 },
    { decade: "1980s", count: 16 },
    { decade: "1990s", count: 6 },
    { decade: "2000s", count: 8 },
    { decade: "2010s", count: 6 },
    { decade: "2020s", count: 6 }
  ];

  // Baptism data derived from actual baptism_records.csv (2000-2025)
  const baptismData = [
    { year: 2000, count: 4 },
    { year: 2001, count: 1 },
    { year: 2002, count: 4 },
    { year: 2003, count: 5 },
    { year: 2004, count: 6 },
    { year: 2005, count: 4 },
    { year: 2006, count: 2 },
    { year: 2007, count: 0 },
    { year: 2008, count: 2 },
    { year: 2009, count: 2 },
    { year: 2010, count: 3 },
    { year: 2011, count: 6 },
    { year: 2012, count: 3 },
    { year: 2013, count: 1 },
    { year: 2014, count: 0 },
    { year: 2015, count: 2 },
    { year: 2016, count: 4 },
    { year: 2017, count: 1 },
    { year: 2018, count: 3 },
    { year: 2019, count: 4 },
    { year: 2020, count: 3 },
    { year: 2021, count: 0 },
    { year: 2022, count: 0 },
    { year: 2023, count: 6 },
    { year: 2024, count: 3 },
    { year: 2025, count: 2 }
  ];

  // Funeral data derived from actual funeral_records.csv
  const funeralData = [
    { ageGroup: "0-17", count: 1, color: "#3b82f6", percentage: 0.25 },
    { ageGroup: "18-29", count: 12, color: "#10b981", percentage: 2.94 },
    { ageGroup: "30-49", count: 24, color: "#f59e0b", percentage: 5.88 },
    { ageGroup: "50-69", count: 131, color: "#ef4444", percentage: 32.11 },
    { ageGroup: "70-89", count: 202, color: "#8b5cf6", percentage: 49.51 },
    { ageGroup: "90+", count: 38, color: "#06b6d4", percentage: 9.31 }
  ];

  // Ethnicity data derived from surname analysis
  const ethnicityData = [
    {
      ethnicity: "Other/Mixed",
      count: 459,
      percentage: 61.4,
      color: "#94a3b8",
      description: "Surnames not clearly categorizable or potentially Americanized"
    },
    {
      ethnicity: "Slavic/Eastern European",
      count: 227,
      percentage: 30.3,
      color: "#3b82f6",
      description: "Ukrainian, Russian, Polish, Czech, Slovak origins"
    },
    {
      ethnicity: "Germanic/Scandinavian",
      count: 19,
      percentage: 2.5,
      color: "#10b981",
      description: "German, Austrian, Scandinavian origins"
    },
    {
      ethnicity: "Anglo/Western European",
      count: 18,
      percentage: 2.4,
      color: "#f59e0b",
      description: "English, Irish, Scottish, Welsh origins"
    },
    {
      ethnicity: "Italian",
      count: 13,
      percentage: 1.7,
      color: "#ef4444",
      description: "Italian origins"
    },
    {
      ethnicity: "Greek",
      count: 7,
      percentage: 0.9,
      color: "#8b5cf6",
      description: "Greek origins"
    },
    {
      ethnicity: "Middle Eastern/Arab",
      count: 5,
      percentage: 0.7,
      color: "#06b6d4",
      description: "Arabic, Lebanese, Syrian origins"
    }
  ];

  // Calculate statistics
  const totalMarriages = marriageData.reduce((sum, item) => sum + item.count, 0);
  const totalBaptisms = baptismData.reduce((sum, item) => sum + item.count, 0);
  const totalFunerals = funeralData.reduce((sum, item) => sum + item.count, 0);
  const totalSurnames = ethnicityData.reduce((sum, item) => sum + item.count, 0);
  const peakMarriageDecade = marriageData.reduce((max, item) => item.count > max.count ? item : max);
  const peakBaptismYear = baptismData.reduce((max, item) => item.count > max.count ? item : max);
  const elderlyFunerals = funeralData.filter(item => item.ageGroup === "70-89" || item.ageGroup === "90+")
    .reduce((sum, item) => sum + item.count, 0);
  const slavicPercentage = ethnicityData.find(item => item.ethnicity === "Slavic/Eastern European")?.percentage || 0;

  // Custom Tooltip Components
  const MarriageTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`${label}`}</p>
          <p className="text-blue-600">
            <span className="font-medium">Marriages: </span>
            {`${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const BaptismTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Year ${label}`}</p>
          <p className="text-blue-600">
            <span className="font-medium">Baptisms: </span>
            {`${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  const FuneralTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Age Group: ${data.ageGroup}`}</p>
          <p style={{ color: data.color }}>
            <span className="font-medium">Funerals: </span>
            {`${data.count} (${data.percentage.toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const FuneralPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Age Group: ${data.ageGroup}`}</p>
          <p style={{ color: data.color }}>
            <span className="font-medium">Count: </span>
            {`${data.count} (${data.percentage.toFixed(1)}%)`}
          </p>
        </div>
      );
    }
    return null;
  };

  const EthnicityTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg max-w-xs">
          <p className="font-semibold text-gray-800 mb-1">{data.ethnicity}</p>
          <p style={{ color: data.color }} className="mb-2">
            <span className="font-medium">Count: </span>
            {`${data.count} surnames (${data.percentage}%)`}
          </p>
          <p className="text-xs text-gray-600">{data.description}</p>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
    </div>
  );

  const renderBaptismChart = () => {
    if (baptismChartType === 'area') {
      return (
        <AreaChart data={baptismData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" stroke="#666" fontSize={11} />
          <YAxis stroke="#666" fontSize={11} />
          <Tooltip content={<BaptismTooltip />} />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      );
    }

    return (
      <LineChart data={baptismData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" stroke="#666" fontSize={11} />
        <YAxis stroke="#666" fontSize={11} />
        <Tooltip content={<BaptismTooltip />} />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    );
  };

  const renderFuneralChart = () => {
    if (funeralChartType === 'pie') {
      return (
        <PieChart>
          <Pie
            data={funeralData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ ageGroup, percentage }) => `${ageGroup} (${percentage.toFixed(1)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {funeralData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<FuneralPieTooltip />} />
        </PieChart>
      );
    }

    return (
      <BarChart data={funeralData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="ageGroup" stroke="#666" fontSize={11} />
        <YAxis stroke="#666" fontSize={11} />
        <Tooltip content={<FuneralTooltip />} />
        <Bar dataKey="count" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
      </BarChart>
    );
  };

  const renderEthnicityChart = () => {
    if (ethnicityChartType === 'pie') {
      return (
        <PieChart>
          <Pie
            data={ethnicityData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ ethnicity, percentage }) => percentage > 3 ? `${ethnicity.split('/')[0]} (${percentage}%)` : ''}
            outerRadius={120}
            fill="#8884d8"
            dataKey="count"
          >
            {ethnicityData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<EthnicityTooltip />} />
        </PieChart>
      );
    }

    return (
      <BarChart data={ethnicityData} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" stroke="#666" fontSize={11} />
        <YAxis 
          dataKey="ethnicity" 
          type="category" 
          width={150} 
          stroke="#666" 
          fontSize={10}
          tick={{ textAnchor: 'end' }}
        />
        <Tooltip content={<EthnicityTooltip />} />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
      </BarChart>
    );
  };

  const TabButton = ({ tabId, icon: Icon, label, isActive, onClick }) => (
    <button
      onClick={() => onClick(tabId)}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
        isActive 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 shadow-md'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Church className="h-10 w-10 text-blue-600" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Orthodox Parish Records Dashboard</h1>
              <p className="text-gray-600 text-lg">Complete Sacramental Records & Cultural Heritage Analysis</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4">
            <TabButton
              tabId="sacraments"
              icon={BarChart3}
              label="Sacramental Records"
              isActive={activeTab === 'sacraments'}
              onClick={setActiveTab}
            />
            <TabButton
              tabId="ethnicity"
              icon={Globe}
              label="Cultural Heritage"
              isActive={activeTab === 'ethnicity'}
              onClick={setActiveTab}
            />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'sacraments' && (
          <div>
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
              <StatCard 
                icon={Heart} 
                title="Total Marriages" 
                value={totalMarriages} 
                subtitle="Since 1940s"
                color="#ef4444"
              />
              <StatCard 
                icon={Baby} 
                title="Total Baptisms" 
                value={totalBaptisms} 
                subtitle="Since 2000"
                color="#3b82f6"
              />
              <StatCard 
                icon={Users} 
                title="Total Funerals" 
                value={totalFunerals} 
                subtitle="All records"
                color="#8b5cf6"
              />
              <StatCard 
                icon={TrendingUp} 
                title="Peak Marriages" 
                value={peakMarriageDecade.decade} 
                subtitle={`${peakMarriageDecade.count} ceremonies`}
                color="#10b981"
              />
              <StatCard 
                icon={Droplets} 
                title="Peak Baptisms" 
                value={peakBaptismYear.year} 
                subtitle={`${peakBaptismYear.count} sacraments`}
                color="#f59e0b"
              />
              <StatCard 
                icon={Calendar} 
                title="Elderly Funerals" 
                value={`${((elderlyFunerals/totalFunerals)*100).toFixed(0)}%`} 
                subtitle="Age 70+"
                color="#06b6d4"
              />
            </div>

            {/* Sacramental Charts */}
            <div className="space-y-8">
              {/* Marriage Records Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Heart className="h-6 w-6 text-red-500" />
                    Marriage Records by Decade
                  </h2>
                  <p className="text-gray-600">Orthodox wedding sacraments performed in the parish</p>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marriageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="decade" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip content={<MarriageTooltip />} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Historical Insight:</strong> Peak activity in the 1970s (32 marriages) during community expansion, 
                    with stabilized numbers (6-8 per decade) reflecting current parish size.
                  </p>
                </div>
              </div>

              {/* Baptism Records Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Droplets className="h-6 w-6 text-blue-500" />
                      Baptisms by Year (2000-2025)
                    </h2>
                    <p className="text-gray-600">Baptisms and chrismations performed in the parish</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBaptismChartType('line')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        baptismChartType === 'line' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setBaptismChartType('area')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        baptismChartType === 'area' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Area
                    </button>
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={300}>
                  {renderBaptismChart()}
                </ResponsiveContainer>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Baptism Trends:</strong> Recent recovery with 6 baptisms in 2023, showing renewed parish vitality. 
                    Average of 3.3 baptisms per active year indicates steady spiritual growth.
                  </p>
                </div>
              </div>

              {/* Funeral Records Chart */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                      <Users className="h-6 w-6 text-purple-500" />
                      Funeral Records by Age Group
                    </h2>
                    <p className="text-gray-600">Memorial services and funeral rites by age demographics</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFuneralChartType('pie')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        funeralChartType === 'pie' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Pie
                    </button>
                    <button
                      onClick={() => setFuneralChartType('bar')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        funeralChartType === 'bar' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Bar
                    </button>
                  </div>
                </div>

                <R
