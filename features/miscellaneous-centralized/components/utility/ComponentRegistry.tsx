import React, { Suspense, lazy } from 'react';
import { CircularProgress, Box, Alert, Typography } from '@mui/material';

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

// Empty registry - no more API calls
const EMPTY_REGISTRY: AddonsRegistry = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  addons: {}
};

/**
 * Hook to get empty addons registry (no API calls)
 */
export const useAddonsRegistry = () => {
  return {
    registry: EMPTY_REGISTRY,
    loading: false,
    error: null,
    refreshRegistry: () => {} // No-op
  };
};

/**
 * Component Registry Manager - Simplified with no API calls
 */
export class ComponentRegistry {
  private static instance: ComponentRegistry;
  private registry: AddonsRegistry = EMPTY_REGISTRY;
  private routeMap = new Map<string, AddonConfig>();

  private constructor() {}

  public static getInstance(): ComponentRegistry {
    if (!ComponentRegistry.instance) {
      ComponentRegistry.instance = new ComponentRegistry();
    }
    return ComponentRegistry.instance;
  }

  public async initialize(): Promise<void> {
    // No API calls - use empty registry
    this.registry = EMPTY_REGISTRY;
    this.buildRouteMap();
  }

  private buildRouteMap(): void {
    this.routeMap.clear();
    // No addons to map
  }

  public getAddonByRoute(route: string): AddonConfig | undefined {
    return this.routeMap.get(route);
  }

  public getAllAddons(): AddonConfig[] {
    return [];
  }

  public getMenuItems(): AddonConfig[] {
    return [];
  }

  public hasRoute(route: string): boolean {
    return false;
  }

  public async refresh(): Promise<void> {
    // No-op
  }

  public createAddonRoute(config: AddonConfig): React.ReactElement {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        <Typography variant="h6">Addon Not Available</Typography>
        <Typography variant="body2">
          Addon functionality has been removed. Grid columns now come from database schema only.
        </Typography>
      </Alert>
    );
  }
}

/**
 * Higher-order component for addon route protection
 */
export const withAddonRoute = (route: string) => {
  return (WrappedComponent: React.ComponentType<any>) => {
    const AddonRouteWrapper: React.FC<any> = (props) => {
      return (
        <Alert severity="warning" sx={{ m: 2 }}>
          <Typography variant="h6">Addon Routes Disabled</Typography>
          <Typography variant="body2">
            Addon route "{route}" is not available. Addon functionality has been removed.
          </Typography>
        </Alert>
      );
    };

    AddonRouteWrapper.displayName = `withAddonRoute(${WrappedComponent.displayName || WrappedComponent.name})`;
    return AddonRouteWrapper;
  };
};

/**
 * Dynamic Addon Route Component
 */
export const DynamicAddonRoute: React.FC<{ route: string }> = ({ route }) => {
  return (
    <Alert severity="info" sx={{ m: 2 }}>
      <Typography variant="h6">Addon Not Available</Typography>
      <Typography variant="body2">
        Addon route "{route}" is not available. Addon functionality has been removed.
      </Typography>
    </Alert>
  );
};

export default ComponentRegistry; 