/**
 * Church Branding Context
 * 
 * Provides church-specific branding (name, logo, theme color) for dynamic header display.
 * Fetches branding from multi-tenant church databases (om_church_{id}).
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface ChurchBranding {
  church_id: number;
  church_name: string;
  church_name_display: string;
  logo_url: string | null;
  primary_theme_color: string;
  email: string | null;
  website: string | null;
}

interface ChurchBrandingContextType {
  branding: ChurchBranding | null;
  loading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: ChurchBranding = {
  church_id: 0,
  church_name: 'Orthodox Church',
  church_name_display: 'Records Management System',
  logo_url: null,
  primary_theme_color: '#6200EE',
  email: null,
  website: null
};

const ChurchBrandingContext = createContext<ChurchBrandingContextType>({
  branding: defaultBranding,
  loading: false,
  error: null,
  refreshBranding: async () => {}
});

interface ChurchBrandingProviderProps {
  children: ReactNode;
}

export function ChurchBrandingProvider({ children }: ChurchBrandingProviderProps) {
  const { user, authenticated } = useAuth();
  const [branding, setBranding] = useState<ChurchBranding | null>(defaultBranding);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    // Get church_id from user or URL
    const churchId = user?.church_id || getChurchIdFromUrl();
    
    if (!churchId) {
      setBranding(defaultBranding);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/church-branding/${churchId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branding: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setBranding(result.data);
      } else {
        setBranding(defaultBranding);
      }
    } catch (err: any) {
      console.error('❌ Error fetching church branding:', err);
      setError(err.message);
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  }, [user?.church_id]);

  // Fetch branding when user changes or on mount
  useEffect(() => {
    if (authenticated) {
      fetchBranding();
    } else {
      // Check URL for church_id when not authenticated
      const urlChurchId = getChurchIdFromUrl();
      if (urlChurchId) {
        fetchBranding();
      } else {
        setBranding(defaultBranding);
      }
    }
  }, [authenticated, user?.church_id, fetchBranding]);

  const contextValue: ChurchBrandingContextType = {
    branding,
    loading,
    error,
    refreshBranding: fetchBranding
  };

  return (
    <ChurchBrandingContext.Provider value={contextValue}>
      {children}
    </ChurchBrandingContext.Provider>
  );
}

/**
 * Extract church_id from URL path
 * Supports patterns like /church/46/... or /om_church_46/...
 */
function getChurchIdFromUrl(): number | null {
  const path = window.location.pathname;
  
  // Match /church/:id pattern
  const churchMatch = path.match(/\/church\/(\d+)/);
  if (churchMatch) {
    return parseInt(churchMatch[1], 10);
  }
  
  // Match /om_church_:id pattern
  const omChurchMatch = path.match(/\/om_church_(\d+)/);
  if (omChurchMatch) {
    return parseInt(omChurchMatch[1], 10);
  }
  
  // Match church_id query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const queryChurchId = urlParams.get('church_id');
  if (queryChurchId) {
    return parseInt(queryChurchId, 10);
  }
  
  return null;
}

export function useChurchBranding(): ChurchBrandingContextType {
  const context = useContext(ChurchBrandingContext);
  if (!context) {
    throw new Error('useChurchBranding must be used within a ChurchBrandingProvider');
  }
  return context;
}

export { ChurchBrandingContext };
export default ChurchBrandingProvider;
