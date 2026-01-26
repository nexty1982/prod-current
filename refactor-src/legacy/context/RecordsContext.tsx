import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface RecordType {
  id: string;
  name: string;
  icon: string;
  description: string;
  count: number;
  table_name: string;
  category: 'sacramental' | 'administrative' | 'membership';
  lastUpdated?: string;
  actions: string[];
}

export interface RecordFilter {
  category: string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  searchTerm: string;
  sortBy: 'name' | 'count' | 'lastUpdated';
  sortOrder: 'asc' | 'desc';
}

interface RecordsContextType {
  recordTypes: RecordType[];
  filteredRecordTypes: RecordType[];
  selectedChurch: any;
  availableChurches: any[];
  filters: RecordFilter;
  loading: boolean;
  error: string | null;
  updateFilters: (newFilters: Partial<RecordFilter>) => void;
  clearFilters: () => void;
  refreshRecords: () => void;
  navigateToRecord: (recordType: string) => void;
}

const defaultFilters: RecordFilter = {
  category: 'all',
  dateRange: { start: null, end: null },
  searchTerm: '',
  sortBy: 'name',
  sortOrder: 'asc'
};

const RecordsContext = createContext<RecordsContextType | null>(null);

export const useRecords = () => {
  const context = useContext(RecordsContext);
  if (!context) {
    throw new Error('useRecords must be used within a RecordProvider');
  }
  return context;
};

export const RecordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, hasRole } = useAuth();
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<any>(null);
  const [availableChurches, setAvailableChurches] = useState<any[]>([]);
  const [filters, setFilters] = useState<RecordFilter>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default record types configuration
  const defaultRecordTypes: RecordType[] = [
    {
      id: 'baptism_records',
      name: 'Baptism Records',
      icon: '👶',
      description: 'Baptism ceremonies and certificates',
      count: 0,
      table_name: 'baptism_records',
      category: 'sacramental',
      actions: ['view', 'add', 'export', 'preview']
    },
    {
      id: 'marriage_records',
      name: 'Marriage Records',
      icon: '💒',
      description: 'Wedding ceremonies and certificates',
      count: 0,
      table_name: 'marriage_records',
      category: 'sacramental',
      actions: ['view', 'add', 'export', 'preview']
    },
    {
      id: 'funeral_records',
      name: 'Funeral Records',
      icon: '⚱️',
      description: 'Funeral services and memorials',
      count: 0,
      table_name: 'funeral_records',
      category: 'sacramental',
      actions: ['view', 'add', 'export', 'preview']
    },
    {
      id: 'members',
      name: 'Church Members',
      icon: '👥',
      description: 'Church membership database',
      count: 0,
      table_name: 'members',
      category: 'membership',
      actions: ['view', 'add', 'export']
    },
    {
      id: 'clergy',
      name: 'Clergy Records',
      icon: '⛪',
      description: 'Clergy and staff information',
      count: 0,
      table_name: 'clergy',
      category: 'administrative',
      actions: ['view', 'add', 'export']
    },
    {
      id: 'donations',
      name: 'Donations',
      icon: '💰',
      description: 'Financial contributions and offerings',
      count: 0,
      table_name: 'donations',
      category: 'administrative',
      actions: ['view', 'add', 'export']
    },
    {
      id: 'calendar_events',
      name: 'Calendar Events',
      icon: '📅',
      description: 'Liturgical and parish events',
      count: 0,
      table_name: 'calendar_events',
      category: 'administrative',
      actions: ['view', 'add', 'export']
    }
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (hasRole(['super_admin'])) {
        await loadAllChurches();
      } else {
        await loadUserChurch();
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load church data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllChurches = async () => {
    try {
      const response = await fetch('/api/admin/churches?is_active=1', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableChurches(data.churches || []);
        
        if (data.churches.length > 0) {
          const firstChurch = data.churches[0];
          setSelectedChurch(firstChurch);
          await loadRecordCounts(firstChurch.id);
        }
      }
    } catch (error) {
      console.error('Error loading churches:', error);
    }
  };

  const loadUserChurch = async () => {
    try {
      const response = await fetch('/api/churches', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.churches && data.data.churches.length > 0) {
          const userChurch = data.data.churches[0];
          setSelectedChurch(userChurch);
          setAvailableChurches(data.data.churches);
          await loadRecordCounts(userChurch.id);
        }
      }
    } catch (error) {
      console.error('Error loading user church:', error);
    }
  };

  const loadRecordCounts = async (churchDbId: number) => {
    try {
      const response = await fetch(`/api/admin/church-database/${churchDbId}/record-counts`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const responseData = data.success ? data.data : data;
        const counts = responseData.record_counts || {};

        // Update record types with actual counts
        const updatedRecords = defaultRecordTypes.map(record => ({
          ...record,
          count: counts[record.table_name] || 0,
          lastUpdated: new Date().toISOString()
        }));

        setRecordTypes(updatedRecords);
      } else {
        setRecordTypes(defaultRecordTypes);
      }
    } catch (error) {
      console.error('Error loading record counts:', error);
      setRecordTypes(defaultRecordTypes);
    }
  };

  // Filter records based on current filters
  const filteredRecordTypes = useCallback(() => {
    let filtered = [...recordTypes];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(record => record.category === filters.category);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.name.toLowerCase().includes(searchLower) ||
        record.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort records
    filtered.sort((a, b) => {
      const aValue = a[filters.sortBy];
      const bValue = b[filters.sortBy];
      const modifier = filters.sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier;
      }
      
      return (aValue > bValue ? 1 : -1) * modifier;
    });

    return filtered;
  }, [recordTypes, filters]);

  const updateFilters = (newFilters: Partial<RecordFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  const refreshRecords = () => {
    if (selectedChurch) {
      loadRecordCounts(selectedChurch.id);
    }
  };

  const navigateToRecord = (recordType: string) => {
    // Navigate to specific record type page
    window.location.href = `/apps/../features/records/records/${recordType}`;
  };

  return (
    <RecordsContext.Provider
      value={{
        recordTypes,
        filteredRecordTypes: filteredRecordTypes(),
        selectedChurch,
        availableChurches,
        filters,
        loading,
        error,
        updateFilters,
        clearFilters,
        refreshRecords,
        navigateToRecord
      }}
    >
      {children}
    </RecordsContext.Provider>
  );
}; 