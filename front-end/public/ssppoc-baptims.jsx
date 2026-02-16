import React, { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Baby, Droplets, TrendingUp, Calendar } from 'lucide-react';

const BaptismsByYearChart = () => {
  const [chartType, setChartType] = useState('line');
  
  // Data derived from actual baptism_records.csv (2000-2025)
  const baptismData = [
    { year: 2000, count: 4 },
    { year: 2001, count: 1 },
    { year: 2002, count: 4 },
    { year: 2003, count: 5 },
    { year: 2004, count: 6 },
    { year: 2005, count: 4 },
    { year: 2006, count: 2 },
    { year: 2007, count: 0 }, // No data, but keeping for continuity
    { year: 2008, count: 2 },
    { year: 2009, count: 2 },
    { year: 2010, count: 3 },
    { year: 2011, count: 6 },
    { year: 2012, count: 3 },
    { year: 2013, count: 1 },
    { year: 2014, count: 0 }, // No data
    { year: 2015, count: 2 },
    { year: 2016, count: 4 },
    { year: 2017, count: 1 },
    { year: 2018, count: 3 },
    { year: 2019, count: 4 },
    { year: 2020, count: 3 },
    { year: 2021, count: 0 }, // No data
    { year: 2022, count: 0 }, // No data
    { year: 2023, count: 6 },
    { year: 2024, count: 3 },
    { year: 2025, count: 2 }
  ];

  const totalBaptisms = baptismData.reduce((sum, item) => sum + item.count, 0);
  const averagePerYear = (totalBaptisms / baptismData.filter(item => item.count > 0).length).toFixed(1);
  const peakYear = baptismData.reduce((max, item) => item.count > max.count ? item : max);

  const CustomTooltip = ({ active, payload, label }) => {
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

  const renderChart = () => {
    if (chartType === 'area') {
      return (
        <AreaChart data={baptismData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="year" 
            stroke="#666"
            fontSize={12}
            fontWeight="500"
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            fontWeight="500"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
            name="Number of Baptisms"
          />
        </AreaChart>
      );
    }

    return (
      <LineChart data={baptismData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="year" 
          stroke="#666"
          fontSize={12}
          fontWeight="500"
        />
        <YAxis 
          stroke="#666"
          fontSize={12}
          fontWeight="500"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="count" 
          stroke="#3b82f6" 
          strokeWidth={3}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          name="Number of Baptisms"
        />
      </LineChart>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Droplets className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Orthodox Parish Baptism Records</h1>
          </div>
          <p className="text-gray-600 text-lg">Baptisms and Chrismations by Year (2000-2025)</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Baptisms</p>
                <p className="text-3xl font-bold text-gray-900">{totalBaptisms}</p>
                <p className="text-sm text-gray-500">Since 2000</p>
              </div>
              <Baby className="h-12 w-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Peak Year</p>
                <p className="text-3xl font-bold text-gray-900">{peakYear.year}</p>
                <p className="text-sm text-gray-500">{peakYear.count} baptisms</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average per Year</p>
                <p className="text-3xl font-bold text-gray-900">{averagePerYear}</p>
                <p className="text-sm text-gray-500">Active years</p>
              </div>
              <Calendar className="h-12 w-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Activity</p>
                <p className="text-3xl font-bold text-gray-900">11</p>
                <p className="text-sm text-gray-500">2023-2025</p>
              </div>
              <Droplets className="h-12 w-12 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Baptisms by Year</h2>
              <p className="text-gray-600">Orthodox baptisms and chrismations performed in the parish</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'line' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Line Chart
              </button>
              <button
                onClick={() => setChartType('area')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  chartType === 'area' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Area Chart
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            {renderChart()}
          </ResponsiveContainer>

          {/* Analysis */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Baptism Trends Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <p><strong>Early 2000s:</strong> Consistent activity with 4-6 baptisms annually, showing steady parish growth and new member integration.</p>
              </div>
              <div>
                <p><strong>2010s Variability:</strong> Fluctuating numbers from 1-6 baptisms per year, likely reflecting changing demographics and family patterns.</p>
              </div>
              <div>
                <p><strong>Recent Recovery:</strong> 2023 marked a strong recovery with 6 baptisms, suggesting renewed parish vitality and growth.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Data source: Parish Baptism Records • 26 years analyzed • {totalBaptisms} total sacraments recorded</p>
        </div>
      </div>
    </div>
  );
};

export default BaptismsByYearChart;
