import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-markercluster/dist/styles.min.css';
import L from 'leaflet';
import { Disclosure, Transition } from '@headlessui/react';
import { ChevronUpIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

// CSS Styles
const styles = `
/* Parish Map Component Styles */

/* Container */
.parish-map-container {
  display: flex;
  height: 100%;
  width: 100%;
  position: relative;
}

/* Map */
.parish-map {
  height: 100%;
  width: 100%;
  z-index: 1;
}

/* Loading spinner */
.parish-map-spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: parish-map-spin 1s ease-in-out infinite;
}

@keyframes parish-map-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Filters panel */
.parish-filters {
  background-color: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  z-index: 10;
}

@media (min-width: 768px) {
  .parish-filters {
    width: 20rem;
  }
  
  .parish-filters.collapsed {
    width: 3rem;
  }
}

/* Popup styles */
.parish-popup {
  max-width: 300px;
  padding: 0.5rem;
}

.parish-popup h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e40af;
}

.parish-popup p {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

/* Cluster styles */
.parish-map-cluster-group {
  z-index: 5;
}

.marker-cluster {
  background-color: rgba(49, 130, 206, 0.6);
}

.marker-cluster div {
  background-color: rgba(49, 130, 206, 0.8);
  color: white;
  font-weight: bold;
}

/* Filter sections */
.parish-filters-content {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.parish-filters-count {
  background-color: #ebf5ff;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin-bottom: 1.5rem;
}

.parish-filters-jurisdiction-button,
.parish-filters-state-button,
.parish-filters-diocese-button,
.parish-filters-city-button {
  background-color: #f3f4f6;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  width: 100%;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.parish-filters-jurisdiction-button:hover,
.parish-filters-state-button:hover,
.parish-filters-diocese-button:hover,
.parish-filters-city-button:hover {
  background-color: #e5e7eb;
}

.parish-filters-jurisdiction-panel,
.parish-filters-state-panel,
.parish-filters-diocese-panel,
.parish-filters-city-panel {
  padding: 1rem;
}

.parish-filters-state-select,
.parish-filters-diocese-select {
  width: 100%;
  height: 8rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem;
}

.parish-filters-city-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
}

.parish-filters-city-suggestions {
  position: absolute;
  z-index: 20;
  margin-top: 0.25rem;
  width: 100%;
  background-color: white;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  max-height: 15rem;
  overflow-y: auto;
}

.parish-filters-city-suggestion {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
}

.parish-filters-city-suggestion:hover {
  background-color: #f3f4f6;
}

/* Responsive adjustments */
@media (max-width: 767px) {
  .parish-map-container {
    flex-direction: column;
  }
  
  .parish-filters {
    width: 100%;
    max-height: 30vh;
  }
  
  .parish-map-content {
    height: 70vh;
  }
}
`;

// SVG Icon Component
const OrthodoxChurchIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <g transform="translate(0 -1020.362)">
      <circle cx="16" cy="1036.362" r="16" fill="#1565c0"/>
      <path d="M16 1024.362v4m-4 0h8m-8 0v16m8-16v16m-8 0h8m-4-16v-4m0 20v4" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 1028.362h8v4h-8z" fill="#fff"/>
      <circle cx="16" cy="1036.362" r="2" fill="#fff"/>
      <path d="M14 1040.362h4l-2 4z" fill="#fff"/>
      <path d="M16 1024.362l-2 2h4z" fill="#fff"/>
    </g>
  </svg>
);

// Configuration
const mapConfig = {
  // Default center of the map (center of continental US)
  defaultCenter: [39.8283, -98.5795] as [number, number],
  
  // Default zoom level
  defaultZoom: 4,
  
  // Tile layer URL for the map background
  tileLayerUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  
  // Attribution for the map tiles
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  
  // Marker clustering configuration
  clustering: {
    // Maximum zoom level at which clusters are applied
    maxZoom: 14,
    
    // Maximum radius in pixels for a cluster
    maxClusterRadius: 50,
    
    // Whether to spiderfy clusters on maximum zoom
    spiderfyOnMaxZoom: true,
    
    // Whether to show coverage on hover
    showCoverageOnHover: true,
    
    // Whether to zoom to bounds of cluster on click
    zoomToBoundsOnClick: true,
    
    // Whether to animate cluster splitting/merging
    animate: true
  },
  
  // Icon configuration
  icons: {
    // Path to the Orthodox church icon
    churchIconPath: '/assets/orthodox-church-marker.svg',
    
    // Size of the icon
    iconSize: [32, 32] as [number, number],
    
    // Position of the icon anchor relative to its size
    iconAnchor: [16, 32] as [number, number],
    
    // Position of the popup anchor relative to the icon anchor
    popupAnchor: [0, -32] as [number, number]
  },
  
  // API endpoints
  api: {
    // Endpoint to fetch parish GeoJSON data
    parishesEndpoint: '/api/parishes/oca/geojson'
  }
};

// Jurisdiction colors for styling
const jurisdictionColors = {
  'OCA': '#1565c0', // Orthodox Church in America
  'GOARCH': '#0277bd', // Greek Orthodox Archdiocese of America
  'ROCOR': '#283593', // Russian Orthodox Church Outside Russia
  'Antiochian': '#00695c', // Antiochian Orthodox Christian Archdiocese
  'Serbian': '#4527a0', // Serbian Orthodox Church
  'Romanian': '#ad1457', // Romanian Orthodox Archdiocese
  'Bulgarian': '#2e7d32', // Bulgarian Eastern Orthodox Diocese
  'Ukrainian': '#ef6c00', // Ukrainian Orthodox Church of the USA
  'default': '#546e7a' // Default color for other jurisdictions
};

// Filter configuration
const filterConfig = {
  // Default open state for filter sections
  defaultOpenSections: {
    jurisdiction: true,
    state: true,
    diocese: false,
    city: false
  },
  
  // Maximum number of city suggestions to show
  maxCitySuggestions: 10
};

// TypeScript Interfaces
interface Coordinates {
  lat: number;
  lng: number;
}

interface ParishProperties {
  name: string;
  jurisdiction?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  diocese?: string;
  deanery?: string;
  founded?: string;
  phone?: string;
  email?: string;
  website?: string;
  [key: string]: any; // For any additional properties
}

interface ParishGeometry {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface ParishFeature {
  type: string;
  geometry: ParishGeometry;
  properties: ParishProperties;
}

interface ParishGeoJSON {
  type: string;
  features: ParishFeature[];
}

interface IconOptions {
  iconUrl?: string;
  iconSize?: [number, number];
  iconAnchor?: [number, number];
  popupAnchor?: [number, number];
}

interface MapOptions {
  center?: [number, number];
  zoom?: number;
  tileLayer?: string;
  attribution?: string;
}

interface ClusterOptions {
  enabled?: boolean;
  maxZoom?: number;
  maxClusterRadius?: number;
  spiderfyOnMaxZoom?: boolean;
  showCoverageOnHover?: boolean;
  zoomToBoundsOnClick?: boolean;
  animate?: boolean;
}

interface FilterState {
  jurisdiction: string[];
  state: string[];
  diocese: string[];
  city: string;
}

interface ParishMapProps {
  dataSource?: string;
  iconOptions?: IconOptions;
  showFilters?: boolean;
  mapOptions?: MapOptions;
  clusterOptions?: ClusterOptions;
}

// Mock data for demonstration
const mockParishData: ParishGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-73.9857, 40.7484] // New York
      },
      properties: {
        name: "St. Nicholas Orthodox Cathedral",
        jurisdiction: "OCA",
        address: "15 E 97th St",
        city: "New York",
        state: "NY",
        zip: "10029",
        diocese: "Diocese of New York and New Jersey",
        phone: "(212) 555-1234",
        email: "info@stnicholascathedral.org",
        website: "https://www.stnicholascathedral.org",
        founded: "1903"
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-87.6298, 41.8781] // Chicago
      },
      properties: {
        name: "Holy Trinity Orthodox Cathedral",
        jurisdiction: "OCA",
        address: "1121 N Leavitt St",
        city: "Chicago",
        state: "IL",
        zip: "60622",
        diocese: "Diocese of the Midwest",
        phone: "(773) 555-4321",
        email: "office@holytrinitycathedral.org",
        website: "https://www.holytrinitycathedral.org",
        founded: "1892"
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-122.4194, 37.7749] // San Francisco
      },
      properties: {
        name: "Holy Virgin Cathedral",
        jurisdiction: "ROCOR",
        address: "6210 Geary Blvd",
        city: "San Francisco",
        state: "CA",
        zip: "94121",
        diocese: "Western American Diocese",
        phone: "(415) 555-6789",
        email: "info@holyvirgincathedral.org",
        website: "https://www.holyvirgincathedral.org",
        founded: "1927"
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-84.3880, 33.7490] // Atlanta
      },
      properties: {
        name: "Annunciation Greek Orthodox Cathedral",
        jurisdiction: "GOARCH",
        address: "2500 Clairmont Rd NE",
        city: "Atlanta",
        state: "GA",
        zip: "30329",
        diocese: "Metropolis of Atlanta",
        phone: "(404) 555-8765",
        email: "office@atlgoc.org",
        website: "https://www.atlgoc.org",
        founded: "1905"
      }
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-118.2437, 34.0522] // Los Angeles
      },
      properties: {
        name: "St. Sophia Greek Orthodox Cathedral",
        jurisdiction: "GOARCH",
        address: "1324 S Normandie Ave",
        city: "Los Angeles",
        state: "CA",
        zip: "90006",
        diocese: "Metropolis of San Francisco",
        phone: "(323) 555-9876",
        email: "office@stsophia.org",
        website: "https://www.stsophia.org",
        founded: "1952"
      }
    }
  ]
};

// useParishFilters Hook
const useParishFilters = (parishes: ParishFeature[]) => {
  // Initialize filter state
  const [filters, setFilters] = useState<FilterState>({
    jurisdiction: [],
    state: [],
    diocese: [],
    city: '',
  });

  // Extract unique values for filter options
  const jurisdictions = useMemo(() => {
    const uniqueJurisdictions = [...new Set(parishes.map(p => p.properties.jurisdiction))];
    return uniqueJurisdictions.filter(Boolean).sort() as string[];
  }, [parishes]);

  const states = useMemo(() => {
    const uniqueStates = [...new Set(parishes.map(p => p.properties.state))];
    return uniqueStates.filter(Boolean).sort() as string[];
  }, [parishes]);

  const dioceses = useMemo(() => {
    const uniqueDioceses = [...new Set(parishes.map(p => p.properties.diocese))];
    return uniqueDioceses.filter(Boolean).sort() as string[];
  }, [parishes]);

  const cities = useMemo(() => {
    const uniqueCities = [...new Set(parishes.map(p => p.properties.city))];
    return uniqueCities.filter(Boolean).sort() as string[];
  }, [parishes]);

  // Apply filters to parishes
  const filteredParishes = useMemo(() => {
    return parishes.filter(parish => {
      const { properties } = parish;
      
      // Filter by jurisdiction
      if (filters.jurisdiction.length > 0 && !filters.jurisdiction.includes(properties.jurisdiction || '')) {
        return false;
      }
      
      // Filter by state
      if (filters.state.length > 0 && !filters.state.includes(properties.state || '')) {
        return false;
      }
      
      // Filter by diocese
      if (filters.diocese.length > 0 && !filters.diocese.includes(properties.diocese || '')) {
        return false;
      }
      
      // Filter by city (case-insensitive partial match)
      if (filters.city && !(properties.city || '').toLowerCase().includes(filters.city.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [parishes, filters]);

  // Update a specific filter
  const updateFilter = (filterName: keyof FilterState, value: string | string[]) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      jurisdiction: [],
      state: [],
      diocese: [],
      city: '',
    });
  };

  return {
    filters,
    filteredParishes,
    jurisdictions,
    states,
    dioceses,
    cities,
    updateFilter,
    resetFilters,
  };
};

// ParishPopup Component
const ParishPopup: React.FC<{ parish: ParishProperties }> = ({ parish }) => {
  if (!parish) return null;

  return (
    <div className="parish-popup max-w-xs">
      <h3 className="text-lg font-bold text-primary-800">{parish.name}</h3>
      
      {parish.jurisdiction && (
        <p className="text-sm text-gray-600 mb-2">{parish.jurisdiction}</p>
      )}
      
      {parish.address && (
        <div className="mb-2">
          <p className="text-gray-800">{parish.address}</p>
          <p className="text-gray-800">
            {parish.city && `${parish.city}, `}
            {parish.state && `${parish.state} `}
            {parish.zip}
          </p>
        </div>
      )}
      
      {(parish.diocese || parish.deanery) && (
        <div className="mb-2">
          {parish.diocese && (
            <p className="text-sm">
              <span className="font-medium">Diocese:</span> {parish.diocese}
            </p>
          )}
          {parish.deanery && (
            <p className="text-sm">
              <span className="font-medium">Deanery:</span> {parish.deanery}
            </p>
          )}
        </div>
      )}
      
      {parish.founded && (
        <p className="text-sm mb-2">
          <span className="font-medium">Founded:</span> {parish.founded}
        </p>
      )}
      
      <div className="mt-3 space-y-1.5">
        {parish.phone && (
          <div className="flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a 
              href={`tel:${parish.phone.replace(/[^0-9]/g, '')}`}
              className="text-blue-600 hover:underline"
            >
              {parish.phone}
            </a>
          </div>
        )}
        
        {parish.email && (
          <div className="flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <a 
              href={`mailto:${parish.email}`}
              className="text-blue-600 hover:underline"
            >
              {parish.email}
            </a>
          </div>
        )}
        
        {parish.website && (
          <div className="flex items-center text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <a
              href={parish.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// MapBoundsUpdater Component
const MapBoundsUpdater: React.FC<{ parishes: ParishFeature[] }> = ({ parishes }) => {
  const map = useMap();
  
  useEffect(() => {
    if (parishes.length > 0) {
      const bounds = L.latLngBounds(
        parishes.map(parish => [
          parish.geometry.coordinates[1],
          parish.geometry.coordinates[0]
        ])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [parishes, map]);
  
  return null;
};

/**
 * ParishMap Component - Displays an interactive map of Orthodox parishes
 * 
 * @param {Object} props - Component props
 * @param {string} props.dataSource - URL to fetch GeoJSON parish data
 * @param {Object} props.iconOptions - Custom icon options
 * @param {string} props.iconOptions.iconUrl - URL for the church icon
 * @param {Array} props.iconOptions.iconSize - Size of the icon [width, height]
 * @param {boolean} props.showFilters - Whether to show the filters panel (default: true)
 * @param {Object} props.mapOptions - Custom map options
 * @param {Array} props.mapOptions.center - Initial map center [lat, lng]
 * @param {number} props.mapOptions.zoom - Initial zoom level
 * @param {string} props.mapOptions.tileLayer - URL for the map tile layer
 * @param {string} props.mapOptions.attribution - Attribution for the map tiles
 * @param {Object} props.clusterOptions - Options for marker clustering
 * @param {boolean} props.clusterOptions.enabled - Whether to enable clustering (default: true)
 */
const ParishMap: React.FC<ParishMapProps> = ({
  dataSource = '/api/parishes/oca/geojson',
  iconOptions = {
    iconUrl: '/assets/orthodox-church-marker.svg',
    iconSize: [32, 32]
  },
  showFilters = true,
  mapOptions = {},
  clusterOptions = { enabled: true }
}) => {
  // Add styles to document head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const [parishes, setParishes] = useState<ParishFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  const {
    filters,
    filteredParishes,
    jurisdictions,
    states,
    dioceses,
    cities,
    updateFilter,
    resetFilters,
  } = useParishFilters(parishes);

  // Create custom icon
  const orthodoxIcon = useMemo(() => new L.Icon({
    iconUrl: iconOptions.iconUrl || mapConfig.icons.churchIconPath,
    iconSize: iconOptions.iconSize || mapConfig.icons.iconSize,
    iconAnchor: iconOptions.iconAnchor || mapConfig.icons.iconAnchor,
    popupAnchor: iconOptions.popupAnchor || mapConfig.icons.popupAnchor,
  }), [iconOptions]);

  // Map configuration
  const mapCenter = mapOptions.center || mapConfig.defaultCenter;
  const mapZoom = mapOptions.zoom || mapConfig.defaultZoom;
  const tileLayerUrl = mapOptions.tileLayer || mapConfig.tileLayerUrl;
  const tileAttribution = mapOptions.attribution || mapConfig.attribution;

  useEffect(() => {
    const fetchParishes = async () => {
      try {
        setLoading(true);
        // For demo purposes, use mock data if no dataSource is provided or if we're in development
        if (dataSource === '/api/parishes/oca/geojson' || process.env.NODE_ENV === 'development') {
          // Use mock data
          setParishes(mockParishData.features);
          setLoading(false);
          return;
        }
        
        const response = await fetch(dataSource);
        if (!response.ok) {
          throw new Error(`Failed to fetch parishes: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        setParishes(data.features || []);
      } catch (err) {
        console.error('Error fetching parish data:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchParishes();
  }, [dataSource]);

  // Function to handle clicking on a marker
  const handleMarkerClick = (parish: ParishFeature) => {
    if (mapRef.current) {
      mapRef.current.setView(
        [parish.geometry.coordinates[1], parish.geometry.coordinates[0]],
        14
      );
    }
  };

  // Fix Leaflet icon issue
  useEffect(() => {
    // This is needed for Leaflet to properly load icons
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  return (
    <div className="parish-map-container flex h-full flex-col md:flex-row">
      {/* Filters Panel */}
      {showFilters && (
        <ParishFilters
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          jurisdictions={jurisdictions}
          states={states}
          dioceses={dioceses}
          cities={cities}
          totalParishes={parishes.length}
          filteredCount={filteredParishes.length}
        />
      )}

      {/* Map Container */}
      <div className="parish-map-content flex-grow relative h-[70vh] md:h-full">
        {loading ? (
          <div className="parish-map-loading absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 z-10">
            <div className="text-center">
              <div className="parish-map-spinner mb-2"></div>
              <p className="text-gray-700">Loading parish data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="parish-map-error absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75 z-10">
            <div className="text-center p-4 bg-white rounded-lg shadow-lg">
              <div className="text-red-600 text-xl mb-2">Error</div>
              <p className="text-gray-700">{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef as any}
            className="parish-map"
          >
            <TileLayer
              attribution={tileAttribution}
              url={tileLayerUrl}
            />
            {clusterOptions.enabled !== false ? (
              <MarkerClusterGroup
                chunkedLoading
                spiderfyOnMaxZoom={true}
                disableClusteringAtZoom={14}
                maxClusterRadius={50}
                className="parish-map-cluster-group"
              >
                {filteredParishes.map((parish, index) => (
                  <Marker
                    key={`parish-${index}-${parish.properties.name}`}
                    position={[
                      parish.geometry.coordinates[1],
                      parish.geometry.coordinates[0]
                    ]}
                    icon={orthodoxIcon}
                    eventHandlers={{
                      click: () => handleMarkerClick(parish)
                    }}
                  >
                    <Popup>
                      <ParishPopup parish={parish.properties} />
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            ) : (
              filteredParishes.map((parish, index) => (
                <Marker
                  key={`parish-${index}-${parish.properties.name}`}
                  position={[
                    parish.geometry.coordinates[1],
                    parish.geometry.coordinates[0]
                  ]}
                  icon={orthodoxIcon}
                  eventHandlers={{
                    click: () => handleMarkerClick(parish)
                  }}
                >
                  <Popup>
                    <ParishPopup parish={parish.properties} />
                  </Popup>
                </Marker>
              ))
            )}
            {filteredParishes.length > 0 && <MapBoundsUpdater parishes={filteredParishes} />}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default ParishMap;