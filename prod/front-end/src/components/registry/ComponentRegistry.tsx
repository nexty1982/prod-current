import React, { Suspense, lazy, useEffect, useState } from 'react';
import { CircularProgress, Box, Alert, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Types
interface AddonConfig {
  component: string;
  entry: string;
  displayName: string;
  description?: string;
  version?: string;
  route: string;
  showInMenu: boolean;
  installedAt: string;
  installedBy: string;
}

interface AddonsRegistry {
  version: string;
  lastUpdated: string;
  addons: Record<string, AddonConfig>;
}

// Component loading cache
const componentCache = new Map<string, React.ComponentType<any>>();

/**
 * Dynamic component loader with error handling
 */
const loadAddonComponent = async (entry: string): Promise<React.ComponentType<any>> => {
  // Check cache first
  if (componentCache.has(entry)) {
    return componentCache.get(entry)!;
  }

  try {
    // For addon components, we need to dynamically import from the addons directory
    const modulePath = entry.replace('/addons/', './addons/');
    
    // First check if running in development vs production
    let module;
    try {
      // Try direct import first (for development)
      module = await import(/* webpackIgnore: true */ `${modulePath}`);
    } catch (devError) {
      try {
        // Try alternative paths for production builds
        const altPath = entry.replace('/addons/', '/static/addons/');
        module = await import(/* webpackIgnore: true */ `${altPath}`);
      } catch (prodError) {
        // Try fetching as a remote script if local import fails
        const response = await fetch(entry);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const scriptContent = await response.text();
        
        // Create a dynamic module from the script content
        const moduleCode = `
          ${scriptContent}
          export default window.ParishMapWrapper || window.ParishMap || (() => React.createElement('div', {}, 'Component not found'));
        `;
        
        const blob = new Blob([moduleCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        module = await import(url);
        URL.revokeObjectURL(url);
      }
    }
    
    // Handle different export patterns
    const Component = module.default || module[Object.keys(module)[0]];
    
    if (!Component) {
      throw new Error(`No valid component export found in ${entry}`);
    }

    // Cache the component
    componentCache.set(entry, Component);
    
    return Component;
  } catch (error) {
    console.error(`Failed to load addon component from ${entry}:`, error);
    
    // Return error component with more helpful information
    const ErrorComponent: React.FC = () => (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Component Load Error</Typography>
        <Typography variant="body2">
          Failed to load component from: {entry}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          Error: {error instanceof Error ? error.message : String(error)}
        </Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block', fontWeight: 'bold' }}>
          💡 Make sure the Parish Map component was properly installed and the server was restarted.
        </Typography>
      </Alert>
    );
    
    componentCache.set(entry, ErrorComponent);
    return ErrorComponent;
  }
};

/**
 * Addon Component Wrapper with error boundary and loading
 */
interface AddonComponentProps {
  config: AddonConfig;
  [key: string]: any;
}

const AddonComponent: React.FC<AddonComponentProps> = ({ config, ...props }) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const LoadedComponent = await loadAddonComponent(config.entry);
        
        if (mounted) {
          setComponent(() => LoadedComponent);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadComponent();

    return () => {
      mounted = false;
    };
  }, [config.entry]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading {config.displayName}...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Failed to Load Component</Typography>
        <Typography variant="body2">{config.displayName}</Typography>
        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      </Alert>
    );
  }

  if (!Component) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="h6">Component Not Found</Typography>
        <Typography variant="body2">{config.displayName}</Typography>
      </Alert>
    );
  }

  return (
    <Suspense fallback={
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress size={24} />
      </Box>
    }>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * Hook to fetch and manage addons registry
 */
export const useAddonsRegistry = () => {
  const [registry, setRegistry] = useState<AddonsRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistry = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/bigbook/addons', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch addons registry: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setRegistry({
          version: data.version || '1.0.0',
          lastUpdated: data.lastUpdated || new Date().toISOString(),
          addons: data.addons || {}
        });
      } else {
        throw new Error(data.error || 'Failed to load addons registry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Set empty registry on error
      setRegistry({
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        addons: {}
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const refreshRegistry = () => {
    fetchRegistry();
  };

  return {
    registry,
    loading,
    error,
    refreshRegistry
  };
};

/**
 * Component Registry Manager
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private registry: AddonsRegistry | null = null;
  private routeMap = new Map<string, AddonConfig>();

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  public async initialize(): Promise<void> {
    try {
      const response = await fetch('/api/bigbook/addons', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.registry = {
            version: data.version || '1.0.0',
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            addons: data.addons || {}
          };

          // Build route map
          this.buildRouteMap();
        }
      }
    } catch (error) {
      console.error('Failed to initialize ComponentRegistry:', error);
      // Initialize with empty registry
      this.registry = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        addons: {}
      };
    }
  }

  private buildRouteMap(): void {
    this.routeMap.clear();
    
    if (this.registry) {
      Object.values(this.registry.addons).forEach(addon => {
        this.routeMap.set(addon.route, addon);
      });
    }
  }

  public getAddonByRoute(route: string): AddonConfig | undefined {
    return this.routeMap.get(route);
  }

  public getAllAddons(): AddonConfig[] {
    return this.registry ? Object.values(this.registry.addons) : [];
  }

  public getMenuItems(): AddonConfig[] {
    return this.getAllAddons().filter(addon => addon.showInMenu);
  }

  public hasRoute(route: string): boolean {
    return this.routeMap.has(route);
  }

  public async refresh(): Promise<void> {
    await this.initialize();
  }

  public createAddonRoute(config: AddonConfig): React.ReactElement {
    return <AddonComponent key={config.route} config={config} />;
  }
}

/**
 * Higher-order component for addon route protection
 */
export const withAddonRoute = (route: string) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    const AddonRouteWrapper: React.FC<any> = (props) => {
      const registry = ComponentRegistry.getInstance();
      const navigate = useNavigate();
      const [isValidRoute, setIsValidRoute] = useState<boolean | null>(null);

      useEffect(() => {
        const checkRoute = async () => {
          await registry.initialize();
          const isValid = registry.hasRoute(route);
          setIsValidRoute(isValid);
          
          if (!isValid) {
            // Redirect to 404 or addon not found page
            navigate('/admin/bigbook', { replace: true });
          }
        };

        checkRoute();
      }, [route, registry, navigate]);

      if (isValidRoute === null) {
        return (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Validating addon route...
            </Typography>
          </Box>
        );
      }

      if (!isValidRoute) {
        return (
          <Alert severity="error" sx={{ m: 2 }}>
            <Typography variant="h6">Addon Not Found</Typography>
            <Typography variant="body2">
              The requested addon route "{route}" is not available.
            </Typography>
          </Alert>
        );
      }

      return <WrappedComponent {...props} />;
    };

    AddonRouteWrapper.displayName = `withAddonRoute(${WrappedComponent.displayName || WrappedComponent.name})`;
    
    return AddonRouteWrapper;
  };
};

/**
 * Dynamic Addon Route Component
 */
export const DynamicAddonRoute: React.FC<{ route: string }> = ({ route }) => {
  const { registry, loading, error } = useAddonsRegistry();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading addon registry...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Registry Error</Typography>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!registry) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        <Typography variant="h6">No Registry Available</Typography>
        <Typography variant="body2">
          Addon registry could not be loaded.
        </Typography>
      </Alert>
    );
  }

  const addonConfig = Object.values(registry.addons).find(addon => addon.route === route);

  if (!addonConfig) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6">Addon Not Found</Typography>
        <Typography variant="body2">
          No addon found for route: {route}
        </Typography>
      </Alert>
    );
  }

  return <AddonComponent config={addonConfig} />;
};

export default ComponentRegistry; 