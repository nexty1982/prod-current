import React, { useState, useEffect } from 'react';
import { FaCalendarDay, FaChurch, FaBookOpen, FaCross, FaStar } from 'react-icons/fa';
import axios from 'axios';

const OrthodoxCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayData, setTodayData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('today'); // 'today' or 'month'

  // Load today's liturgical data
  useEffect(() => {
    loadTodayData();
  }, []);

  // Load month data when switching to month view
  useEffect(() => {
    if (view === 'month') {
      loadMonthData();
    }
  }, [view, currentDate]);

  const loadTodayData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/liturgical-calendar/today');
      setTodayData(response.data);
    } catch (error) {
      console.error('Error loading today\'s liturgical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await axios.get(`/api/liturgical-calendar/month/${year}/${month}`);
      setMonthData(response.data);
    } catch (error) {
      console.error('Error loading month liturgical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDateData = async (date) => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const response = await axios.get(`/api/liturgical-calendar/date/${dateStr}`);
      setTodayData(response.data);
      setSelectedDate(date);
    } catch (error) {
      console.error('Error loading date liturgical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLiturgicalColorStyle = (color) => {
    const colors = {
      white: '#ffffff',
      red: '#dc3545',
      purple: '#6f42c1',
      green: '#28a745',
      gold: '#ffc107',
      blue: '#007bff',
      black: '#343a40'
    };
    return colors[color] || colors.green;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const renderSaintsList = (saints) => {
    if (!saints || saints.length === 0) {
      return <p className="text-gray-600">No saints recorded for this day</p>;
    }

    return (
      <div className="space-y-3">
        {saints.map((saint, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
            <div className="flex items-start gap-3">
              <FaStar className="text-amber-500 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800">{saint.name}</h4>
                {saint.title && (
                  <p className="text-sm text-amber-700 italic">{saint.title}</p>
                )}
                {saint.description && (
                  <p className="text-gray-700 text-sm mt-2">{saint.description}</p>
                )}
                {saint.commemoration && (
                  <p className="text-gray-600 text-xs mt-1">
                    Commemoration: {saint.commemoration}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderReadings = (readings) => {
    if (!readings || readings.length === 0) {
      return <p className="text-gray-600">No scripture readings for this day</p>;
    }

    return (
      <div className="space-y-3">
        {readings.map((reading, index) => (
          <div key={index} className="bg-white rounded-lg p-4 border border-amber-200 shadow-sm">
            <div className="flex items-start gap-3">
              <FaBookOpen className="text-amber-600 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-amber-800">{reading.title}</h4>
                <p className="text-amber-700 font-medium">{reading.citation}</p>
                {reading.type && (
                  <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded mt-1">
                    {reading.type}
                  </span>
                )}
                {reading.text && (
                  <p className="text-gray-700 text-sm mt-2 italic">"{reading.text}"</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTodayView = () => {
    if (!todayData) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <FaCross className="text-amber-600 text-2xl" />
            <div>
              <h2 className="text-2xl font-bold text-amber-800">
                {formatDate(selectedDate)}
              </h2>
              {todayData.liturgicalSeason && (
                <p className="text-amber-700">
                  Liturgical Season: {todayData.liturgicalSeason}
                </p>
              )}
              {todayData.fastingStatus && (
                <p className="text-amber-600 text-sm">
                  Fasting: {todayData.fastingStatus}
                </p>
              )}
            </div>
          </div>
          
          {todayData.liturgicalColor && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-700">Liturgical Color:</span>
              <div 
                className="w-4 h-4 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: getLiturgicalColorStyle(todayData.liturgicalColor) }}
              ></div>
              <span className="text-sm text-amber-800 capitalize">
                {todayData.liturgicalColor}
              </span>
            </div>
          )}
        </div>

        {/* Saints */}
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <FaChurch className="text-amber-600 text-xl" />
            <h3 className="text-xl font-bold text-amber-800">Saints of the Day</h3>
          </div>
          {renderSaintsList(todayData.saints)}
        </div>

        {/* Scripture Readings */}
        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <FaBookOpen className="text-amber-600 text-xl" />
            <h3 className="text-xl font-bold text-amber-800">Scripture Readings</h3>
          </div>
          {renderReadings(todayData.readings)}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const today = new Date();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="space-y-6">
        {/* Month Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            ←
          </button>
          <h2 className="text-2xl font-bold text-amber-800">{monthName}</h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-amber-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center font-semibold text-amber-800 border-r border-amber-200 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((day, index) => (
              <div key={index} className="border-r border-b border-amber-200 last:border-r-0 h-24">
                {day && (
                  <button
                    onClick={() => loadDateData(day)}
                    className={`w-full h-full p-1 text-left hover:bg-amber-50 transition-colors relative ${
                      day.toDateString() === today.toDateString() 
                        ? 'bg-amber-100 font-bold' 
                        : ''
                    } ${
                      day.toDateString() === selectedDate.toDateString()
                        ? 'bg-amber-200'
                        : ''
                    }`}
                  >
                    <span className="text-sm">{day.getDate()}</span>
                    {monthData && monthData[day.getDate()] && (
                      <div className="absolute bottom-1 left-1 right-1">
                        <div className="text-xs text-amber-700 truncate">
                          {monthData[day.getDate()].saints && monthData[day.getDate()].saints.length > 0 && (
                            <FaStar className="inline text-amber-500 text-xs" />
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <FaCalendarDay className="text-amber-600 text-2xl" />
              <h1 className="text-3xl font-bold text-amber-800">Orthodox Calendar</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('today')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  view === 'today'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  view === 'month'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                Month View
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            <p className="mt-2 text-amber-700">Loading liturgical data...</p>
          </div>
        )}

        {/* Content */}
        {!loading && view === 'today' && renderTodayView()}
        {!loading && view === 'month' && renderMonthView()}
      </div>
    </div>
  );
};

export default OrthodoxCalendar;
