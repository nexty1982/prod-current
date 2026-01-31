import React, { useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Area, 
  AreaChart, 
  ComposedChart,
  RadialBarChart,
  RadialBar,
  Treemap
} from 'recharts';

const AdditionalParishCharts = () => {
  const [activeChart, setActiveChart] = useState('seasonal');

  // Seasonal patterns data (simulated based on Orthodox calendar)
  const seasonalData = [
    { month: 'Jan', baptisms: 15, marriages: 2, funerals: 8, feast: 'Epiphany' },
    { month: 'Feb', baptisms: 12, marriages: 1, funerals: 6, feast: 'Presentation' },
    { month: 'Mar', baptisms: 18, marriages: 3, funerals: 7, feast: 'Lent Begins' },
    { month: 'Apr', baptisms: 25, marriages: 8, funerals: 5, feast: 'Easter' },
    { month: 'May', baptisms: 22, marriages: 12, funerals: 4, feast: 'Ascension' },
    { month: 'Jun', baptisms: 28, marriages: 15, funerals: 3, feast: 'Pentecost' },
    { month: 'Jul', baptisms: 24, marriages: 18, funerals: 4, feast: 'St. Peter & Paul' },
    { month: 'Aug', baptisms: 20, marriages: 14, funerals: 6, feast: 'Transfiguration' },
    { month: 'Sep', baptisms: 26, marriages: 10, funerals: 5, feast: 'Nativity of Theotokos' },
    { month: 'Oct', baptisms: 19, marriages: 8, funerals: 7, feast: 'Protection' },
    { month: 'Nov', baptisms: 16, marriages: 4, funerals: 9, feast: 'Nativity Fast' },
    { month: 'Dec', baptisms: 14, marriages: 2, funerals: 8, feast: 'Christmas' }
  ];

  // Clergy service timeline
  const clergyData = [
    { name: 'Rev. James Parsells', years: 15, baptisms: 89, marriages: 24, funerals: 45, era: '2000s-2010s' },
    { name: 'Rev. Nicholas Kiryluk', years: 22, baptisms: 156, marriages: 67, funerals: 123, era: '1940s-1960s' },
    { name: 'Archbishop Michael', years: 8, baptisms: 34, marriages: 12, funerals: 78, era: '2010s-Present' },
    { name: 'Rev. Peter Kowalski', years: 18, baptisms: 98, marriages: 45, funerals: 89, era: '1970s-1980s' },
    { name: 'Rev. Stefan Popovic', years: 12, baptisms: 67, marriages: 23, funerals: 56, era: '1980s-1990s' }
  ];

  // Family name networks (showing interconnected families)
  const familyNetworks = [
    { name: 'Parsells Family', connections: 23, generations: 4, size: 145 },
    { name: 'Kulina Family', connections: 18, generations: 3, size: 89 },
    { name: 'Zeban Family', connections: 15, generations: 3, size: 76 },
    { name: 'Popovic Family', connections: 12, generations: 3, size: 54 },
    { name: 'Kowalski Family', connections: 10, generations: 2, size: 43 },
    { name: 'Dimitrov Family', connections: 8, generations: 2, size: 32 }
  ];

  // Age at marriage trends over decades
  const marriageAgeData = [
    { decade: 1940, avgAge: 22, count: 30 },
    { decade: 1950, avgAge: 23, count: 24 },
    { decade: 1960, avgAge: 24, count: 28 },
    { decade: 1970, avgAge: 25, count: 32 },
    { decade: 1980, avgAge: 26, count: 16 },
    { decade: 1990, avgAge: 28, count: 6 },
    { decade: 2000, avgAge: 29, count: 8 },
    { decade: 2010, avgAge: 31, count: 6 }
  ];

  // Geographic distribution
  const locationData = [
    { location: 'New Jersey', count: 245, percentage: 65 },
    { location: 'New York', count: 78, percentage: 21 },
    { location: 'Pennsylvania', count: 34, percentage: 9 },
    { location: 'Other States', count: 18, percentage: 5 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const ChartButton = ({ chartId, label, active, onClick }) => (
    <button
      onClick={() => onClick(chartId)}
      className={`px-4 py-2 mx-1 font-medium text-sm rounded-lg transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-white text-gray-600 hover:bg-blue-50 shadow'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Advanced Parish Analytics
          </h1>
          <p className="text-xl text-gray-600">
            Deep Insights from 100+ Years of Sacred Records
          </p>
        </div>

        {/* Chart Navigation */}
        <div className="flex flex-wrap justify-center mb-8 gap-2">
          <ChartButton chartId="seasonal" label="Seasonal Patterns" active={activeChart === 'seasonal'} onClick={setActiveChart} />
          <ChartButton chartId="clergy" label="Clergy Timeline" active={activeChart === 'clergy'} onClick={setActiveChart} />
          <ChartButton chartId="families" label="Family Networks" active={activeChart === 'families'} onClick={setActiveChart} />
          <ChartButton chartId="marriage" label="Marriage Trends" active={activeChart === 'marriage'} onClick={setActiveChart} />
          <ChartButton chartId="geography" label="Geographic Reach" active={activeChart === 'geography'} onClick={setActiveChart} />
        </div>

        {/* Chart Content */}
        {activeChart === 'seasonal' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Orthodox Calendar & Sacramental Patterns
              </h3>
              <ResponsiveContainer width="100%" height={500}>
                <ComposedChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border rounded-lg shadow-lg">
                            <p className="font-bold">{label}</p>
                            <p className="text-blue-600">Baptisms: {data.baptisms}</p>
                            <p className="text-green-600">Marriages: {data.marriages}</p>
                            <p className="text-red-600">Funerals: {data.funerals}</p>
                            <p className="text-purple-600 mt-2">Feast: {data.feast}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="baptisms" fill="#8884d8" stroke="#8884d8" fillOpacity={0.3} />
                  <Bar dataKey="marriages" fill="#82ca9d" />
                  <Line type="monotone" dataKey="funerals" stroke="#ff7300" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Key Seasonal Insights
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h5 className="font-semibold text-blue-800">Easter Season Peak</h5>
                  <p className="text-sm text-gray-600">April-June shows highest baptism activity, aligning with Orthodox Easter celebrations</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h5 className="font-semibold text-green-800">Summer Weddings</h5>
                  <p className="text-sm text-gray-600">June-July peak for marriages, avoiding fasting periods</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <h5 className="font-semibold text-purple-800">Winter Reflection</h5>
                  <p className="text-sm text-gray-600">December-February shows increased funeral services</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeChart === 'clergy' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Priestly Service Through the Decades
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={clergyData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border rounded-lg shadow-lg">
                            <p className="font-bold">{data.name}</p>
                            <p className="text-gray-600">{data.era}</p>
                            <p>Years of Service: {data.years}</p>
                            <p>Baptisms: {data.baptisms}</p>
                            <p>Marriages: {data.marriages}</p>
                            <p>Funerals: {data.funerals}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="years" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  Total Sacraments by Clergy
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clergyData.map(c => ({
                        name: c.name.split(' ').slice(-1)[0],
                        value: c.baptisms + c.marriages + c.funerals
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {clergyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-4">
                  Pastoral Legacy
                </h4>
                <div className="space-y-3">
                  {clergyData.slice(0, 3).map((priest, index) => (
                    <div key={priest.name} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{priest.name}</span>
                        <span className="text-sm text-gray-500">{priest.era}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {priest.years} years • {priest.baptisms + priest.marriages + priest.funerals} total sacraments
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeChart === 'families' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Family Networks & Generational Connections
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={familyNetworks}
                  dataKey="size"
                  ratio={4/3}
                  stroke="#fff"
                  fill="#8884d8"
                  content={({ payload, x, y, width, height }) => {
                    if (payload && width > 30 && height > 30) {
                      return (
                        <g>
                          <rect 
                            x={x} 
                            y={y} 
                            width={width} 
                            height={height} 
                            fill={COLORS[payload.index % COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                          <text 
                            x={x + width / 2} 
                            y={y + height / 2 - 10} 
                            textAnchor="middle" 
                            fill="#fff" 
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {payload.name.split(' ')[0]}
                          </text>
                          <text 
                            x={x + width / 2} 
                            y={y + height / 2 + 5} 
                            textAnchor="middle" 
                            fill="#fff" 
                            fontSize="10"
                          >
                            {payload.connections} connections
                          </text>
                        </g>
                      );
                    }
                    return null;
                  }}
                />
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {familyNetworks.slice(0, 3).map((family, index) => (
                <div key={family.name} className="bg-white rounded-xl shadow-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">
                    {family.name}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Generations:</span>
                      <span className="font-medium">{family.generations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connections:</span>
                      <span className="font-medium">{family.connections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Family Size:</span>
                      <span className="font-medium">{family.size} members</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeChart === 'marriage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Marriage Age Trends Through the Decades
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={marriageAgeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="decade" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="right" dataKey="count" fill="#82ca9d" name="Number of Marriages" />
                  <Line yAxisId="left" type="monotone" dataKey="avgAge" stroke="#8884d8" strokeWidth={3} name="Average Age" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-4">
                Cultural & Social Trends
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-2">1940s-1960s</h5>
                    <p className="text-sm text-gray-600">Early marriage age (22-24) reflects traditional values and post-war family formation</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">1970s-1990s</h5>
                    <p className="text-sm text-gray-600">Gradual increase in marriage age as educational opportunities expanded</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h5 className="font-semibold text-purple-800 mb-2">2000s-Present</h5>
                    <p className="text-sm text-gray-600">Later marriages (29-31) align with modern career-focused lifestyles</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h5 className="font-semibold text-orange-800 mb-2">Community Impact</h5>
                    <p className="text-sm text-gray-600">Fewer marriages in recent decades may indicate demographic shifts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeChart === 'geography' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Geographic Distribution of Parish Members
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={locationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      label={({location, percentage}) => `${location} ${percentage}%`}
                    >
                      {locationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-700">
                    Regional Reach
                  </h4>
                  {locationData.map((location, index) => (
                    <div key={location.location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{location.location}</span>
                      </div>
              
