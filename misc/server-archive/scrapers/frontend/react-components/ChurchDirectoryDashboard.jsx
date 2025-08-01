// 📁 server/scrapers/frontend/react-components/ChurchDirectoryDashboard.jsx
// Step 5: Autonomous Frontend Visualization - Main Dashboard Component

import React, { useState, useEffect, useMemo } from 'react';
import { 
    MapContainer, 
    TileLayer, 
    Marker, 
    Popup, 
    LayersControl 
} from 'react-leaflet';
import { AgGridReact } from 'ag-grid-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import 'leaflet/dist/leaflet.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const ChurchDirectoryDashboard = () => {
    // State management
    const [churches, setChurches] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [mapData, setMapData] = useState([]);
    const [filterOptions, setFilterOptions] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('grid');
    const [filters, setFilters] = useState({
        jurisdiction: '',
        state: '',
        establishmentYearFrom: '',
        establishmentYearTo: '',
        validationScore: 70,
        search: ''
    });

    // Fetch data on component mount
    useEffect(() => {
        Promise.all([
            fetchChurches(),
            fetchStatistics(),
            fetchMapData(),
            fetchFilterOptions()
        ]).then(() => {
            setLoading(false);
        }).catch(error => {
            console.error('Error loading dashboard data:', error);
            setLoading(false);
        });
    }, []);

    // API calls
    const fetchChurches = async (page = 1) => {
        try {
            const params = new URLSearchParams({
                page,
                limit: 100,
                ...filters
            });
            
            const response = await fetch(`/api/churches?${params}`);
            const data = await response.json();
            
            if (data.success) {
                setChurches(data.data);
            }
        } catch (error) {
            console.error('Error fetching churches:', error);
        }
    };

    const fetchStatistics = async () => {
        try {
            const [jurisdictions, geographical, quality] = await Promise.all([
                fetch('/api/statistics/jurisdictions').then(r => r.json()),
                fetch('/api/statistics/geographical').then(r => r.json()),
                fetch('/api/statistics/quality').then(r => r.json())
            ]);

            setStatistics({
                jurisdictions: jurisdictions.data || [],
                geographical: geographical.data || [],
                quality: quality.data || []
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchMapData = async () => {
        try {
            const response = await fetch('/api/map-data');
            const data = await response.json();
            
            if (data.success) {
                setMapData(data.data.churches || []);
            }
        } catch (error) {
            console.error('Error fetching map data:', error);
        }
    };

    const fetchFilterOptions = async () => {
        try {
            const response = await fetch('/api/filter-options');
            const data = await response.json();
            
            if (data.success) {
                setFilterOptions(data.data);
            }
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    // AG Grid configuration
    const columnDefs = useMemo(() => [
        {
            field: 'name',
            headerName: 'Church Name',
            sortable: true,
            filter: true,
            flex: 2,
            cellRenderer: (params) => (
                <div>
                    <strong>{params.value}</strong>
                    {params.data.patron_saint && (
                        <div style={{ fontSize: '0.8em', color: '#666' }}>
                            {params.data.patron_saint}
                        </div>
                    )}
                </div>
            )
        },
        {
            field: 'jurisdiction',
            headerName: 'Jurisdiction',
            sortable: true,
            filter: true,
            flex: 1.5
        },
        {
            field: 'city',
            headerName: 'City',
            sortable: true,
            filter: true,
            flex: 1
        },
        {
            field: 'state',
            headerName: 'State',
            sortable: true,
            filter: true,
            width: 80
        },
        {
            field: 'establishment_year',
            headerName: 'Founded',
            sortable: true,
            filter: true,
            width: 100
        },
        {
            field: 'parish_priest',
            headerName: 'Priest',
            sortable: true,
            filter: true,
            flex: 1
        },
        {
            field: 'validation_score',
            headerName: 'Quality',
            sortable: true,
            filter: true,
            width: 90,
            cellRenderer: (params) => (
                <div style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    backgroundColor: params.value >= 80 ? '#d4edda' : 
                                   params.value >= 60 ? '#fff3cd' : '#f8d7da',
                    color: params.value >= 80 ? '#155724' : 
                           params.value >= 60 ? '#856404' : '#721c24',
                    fontSize: '0.8em',
                    textAlign: 'center'
                }}>
                    {params.value || 'N/A'}
                </div>
            )
        },
        {
            field: 'website',
            headerName: 'Website',
            width: 100,
            cellRenderer: (params) => (
                params.value ? (
                    <a 
                        href={params.value} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#007bff' }}
                    >
                        🌐
                    </a>
                ) : null
            )
        }
    ], []);

    // Chart configurations
    const jurisdictionChartData = useMemo(() => {
        if (!statistics.jurisdictions?.length) return null;

        return {
            labels: statistics.jurisdictions.map(j => j.jurisdiction),
            datasets: [
                {
                    label: 'Total Churches',
                    data: statistics.jurisdictions.map(j => j.total_churches),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }
            ]
        };
    }, [statistics.jurisdictions]);

    const stateDistributionData = useMemo(() => {
        if (!statistics.geographical?.length) return null;

        return {
            labels: statistics.geographical.slice(0, 10).map(g => g.state),
            datasets: [
                {
                    label: 'Churches per State',
                    data: statistics.geographical.slice(0, 10).map(g => g.church_count),
                    backgroundColor: '#36A2EB',
                    borderColor: '#1E88E5',
                    borderWidth: 1
                }
            ]
        };
    }, [statistics.geographical]);

    const qualityTrendData = useMemo(() => {
        if (!statistics.quality?.length) return null;

        return {
            labels: statistics.quality.slice(0, 30).map(q => 
                new Date(q.update_date).toLocaleDateString()
            ),
            datasets: [
                {
                    label: 'Validation Rate %',
                    data: statistics.quality.slice(0, 30).map(q => 
                        (q.validated_records / q.total_records * 100).toFixed(1)
                    ),
                    borderColor: '#4BC0C0',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                }
            ]
        };
    }, [statistics.quality]);

    // Filter handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        fetchChurches(1);
    };

    const clearFilters = () => {
        setFilters({
            jurisdiction: '',
            state: '',
            establishmentYearFrom: '',
            establishmentYearTo: '',
            validationScore: 70,
            search: ''
        });
        setTimeout(() => fetchChurches(1), 100);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading Orthodox Church Directory...</p>
            </div>
        );
    }

    return (
        <div className="church-directory-dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <h1>🏛️ Orthodox Church Directory</h1>
                <p>Comprehensive directory of Orthodox churches in the United States</p>
            </header>

            {/* Statistics Overview */}
            <div className="stats-overview">
                <div className="stat-card">
                    <h3>{churches.length}</h3>
                    <p>Total Churches</p>
                </div>
                <div className="stat-card">
                    <h3>{statistics.jurisdictions?.length || 0}</h3>
                    <p>Jurisdictions</p>
                </div>
                <div className="stat-card">
                    <h3>{filterOptions.states?.length || 0}</h3>
                    <p>States</p>
                </div>
                <div className="stat-card">
                    <h3>{Math.round(churches.filter(c => c.validation_score >= 80).length / churches.length * 100) || 0}%</h3>
                    <p>High Quality Data</p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="filter-panel">
                <div className="filter-row">
                    <select 
                        value={filters.jurisdiction}
                        onChange={(e) => handleFilterChange('jurisdiction', e.target.value)}
                    >
                        <option value="">All Jurisdictions</option>
                        {filterOptions.jurisdictions?.map(j => (
                            <option key={j} value={j}>{j}</option>
                        ))}
                    </select>

                    <select 
                        value={filters.state}
                        onChange={(e) => handleFilterChange('state', e.target.value)}
                    >
                        <option value="">All States</option>
                        {filterOptions.states?.map(s => (
                            <option key={s.state} value={s.state}>
                                {s.state} ({s.church_count})
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        placeholder="Search churches..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />

                    <div className="filter-actions">
                        <button onClick={applyFilters} className="btn-primary">
                            Apply Filters
                        </button>
                        <button onClick={clearFilters} className="btn-secondary">
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button 
                    className={activeTab === 'grid' ? 'active' : ''}
                    onClick={() => setActiveTab('grid')}
                >
                    📊 Data Grid
                </button>
                <button 
                    className={activeTab === 'map' ? 'active' : ''}
                    onClick={() => setActiveTab('map')}
                >
                    🗺️ Map View
                </button>
                <button 
                    className={activeTab === 'analytics' ? 'active' : ''}
                    onClick={() => setActiveTab('analytics')}
                >
                    📈 Analytics
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'grid' && (
                    <div className="ag-theme-alpine" style={{ height: 600, width: '100%' }}>
                        <AgGridReact
                            columnDefs={columnDefs}
                            rowData={churches}
                            pagination={true}
                            paginationPageSize={50}
                            defaultColDef={{
                                resizable: true,
                                sortable: true,
                                filter: true
                            }}
                            suppressRowClickSelection={false}
                            rowSelection="single"
                        />
                    </div>
                )}

                {activeTab === 'map' && (
                    <div style={{ height: 600 }}>
                        <MapContainer
                            center={[39.8283, -98.5795]} // Center of USA
                            zoom={4}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {mapData.map((church, index) => (
                                <Marker
                                    key={church.id || index}
                                    position={[40, -100]} // Placeholder - would need geocoding
                                >
                                    <Popup>
                                        <div>
                                            <h4>{church.name}</h4>
                                            <p><strong>Jurisdiction:</strong> {church.jurisdiction}</p>
                                            <p><strong>Location:</strong> {church.city}, {church.state}</p>
                                            {church.parish_priest && (
                                                <p><strong>Priest:</strong> {church.parish_priest}</p>
                                            )}
                                            {church.website && (
                                                <p>
                                                    <a href={church.website} target="_blank" rel="noopener noreferrer">
                                                        Visit Website
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="analytics-grid">
                        <div className="chart-container">
                            <h3>Churches by Jurisdiction</h3>
                            {jurisdictionChartData && (
                                <Pie data={jurisdictionChartData} options={{
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom'
                                        }
                                    }
                                }} />
                            )}
                        </div>

                        <div className="chart-container">
                            <h3>Top 10 States by Church Count</h3>
                            {stateDistributionData && (
                                <Bar data={stateDistributionData} options={{
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            display: false
                                        }
                                    }
                                }} />
                            )}
                        </div>

                        <div className="chart-container">
                            <h3>Data Quality Trend</h3>
                            {qualityTrendData && (
                                <Line data={qualityTrendData} options={{
                                    responsive: true,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            max: 100
                                        }
                                    }
                                }} />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChurchDirectoryDashboard;
