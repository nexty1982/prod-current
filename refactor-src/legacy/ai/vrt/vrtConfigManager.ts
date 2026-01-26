// VRT Configuration Manager
// Centralizes configuration management for all VRT modules and coordinates logging

import { SnapshotConfig } from '../visualTesting/snapshotEngine';
import { DiffConfig } from '../visualTesting/diffAnalyzer';
import { ConfidenceConfig } from '../visualTesting/confidenceAdjuster';
import { PlaywrightConfig } from '../visualTesting/playwrightTests';
import { LearningConfig } from '../learning/regressionFeedback';
import { vrtSecurity, VRTUser, logVRTAction } from './vrtSecurity';

export interface VRTMasterConfig {
  snapshot: SnapshotConfig;
  diff: DiffConfig;
  confidence: ConfidenceConfig;
  playwright: PlaywrightConfig;
  learning: LearningConfig;
  security: {
    enabledInProduction: boolean;
    requireSuperAdmin: boolean;
    auditLogging: boolean;
    maxSnapshotRetention: number;
    maxAuditLogRetention: number;
    rateLimitPerHour: number;
  };
  system: {
    version: string;
    lastUpdated: string;
    environment: 'development' | 'staging' | 'production';
    debugMode: boolean;
    performanceLogging: boolean;
  };
}

export interface VRTConfigEvent {
  timestamp: string;
  user: string;
  action: 'CONFIG_LOADED' | 'CONFIG_SAVED' | 'CONFIG_RESET' | 'CONFIG_VALIDATED' | 'CONFIG_ERROR';
  module: string;
  changes?: Record<string, any>;
  errors?: string[];
  success: boolean;
}

export class VRTConfigManager {
  private static instance: VRTConfigManager;
  private config: VRTMasterConfig;
  private configEvents: VRTConfigEvent[] = [];
  private storageKey = 'vrt_master_config';
  private eventsKey = 'vrt_config_events';
  private currentUser: VRTUser | null = null;

  private constructor() {
    this.config = this.loadDefaultConfig();
    this.loadPersistedConfig();
    this.loadConfigEvents();
    this.validateConfig();
  }

  public static getInstance(): VRTConfigManager {
    if (!VRTConfigManager.instance) {
      VRTConfigManager.instance = new VRTConfigManager();
    }
    return VRTConfigManager.instance;
  }

  /**
   * Set current user for logging and security
   */
  public setUser(user: VRTUser | null): void {
    this.currentUser = user;
  }

  /**
   * Get complete VRT configuration
   */
  public getConfig(): VRTMasterConfig {
    return JSON.parse(JSON.stringify(this.config)); // Deep clone
  }

  /**
   * Get specific module configuration
   */
  public getModuleConfig<T extends keyof VRTMasterConfig>(module: T): VRTMasterConfig[T] {
    return JSON.parse(JSON.stringify(this.config[module]));
  }

  /**
   * Update configuration for a specific module
   */
  public async updateModuleConfig<T extends keyof VRTMasterConfig>(
    module: T,
    newConfig: Partial<VRTMasterConfig[T]>,
    user?: VRTUser
  ): Promise<{ success: boolean; errors?: string[] }> {
    const effectiveUser = user || this.currentUser;
    
    try {
      // Validate the new configuration
      const validationResult = this.validateModuleConfig(module, newConfig);
      if (!validationResult.valid) {
        await this.logConfigEvent({
          action: 'CONFIG_ERROR',
          module: module as string,
          errors: validationResult.errors,
          success: false
        }, effectiveUser);
        
        return { success: false, errors: validationResult.errors };
      }

      // Store old config for logging
      const oldConfig = { ...this.config[module] };

      // Update the configuration
      this.config[module] = {
        ...this.config[module],
        ...newConfig
      } as VRTMasterConfig[T];

      // Update system metadata
      this.config.system.lastUpdated = new Date().toISOString();

      // Persist the configuration
      await this.persistConfig();

      // Log the configuration change
      await this.logConfigEvent({
        action: 'CONFIG_SAVED',
        module: module as string,
        changes: this.getConfigDiff(oldConfig, this.config[module]),
        success: true
      }, effectiveUser);

      // Also log via VRT security system
      if (effectiveUser) {
        await logVRTAction(effectiveUser, 'SETTINGS_UPDATE', {
          module: module as string,
          configUpdated: Object.keys(newConfig),
          timestamp: new Date().toISOString()
        });
      }

      console.log(`[VRT Config] Successfully updated ${module} configuration`, {
        changes: Object.keys(newConfig),
        timestamp: this.config.system.lastUpdated
      });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown configuration error';
      
      await this.logConfigEvent({
        action: 'CONFIG_ERROR',
        module: module as string,
        errors: [errorMessage],
        success: false
      }, effectiveUser);

      console.error(`[VRT Config] Failed to update ${module} configuration:`, error);
      return { success: false, errors: [errorMessage] };
    }
  }

  /**
   * Reset configuration to defaults
   */
  public async resetConfig(user?: VRTUser): Promise<{ success: boolean; errors?: string[] }> {
    const effectiveUser = user || this.currentUser;
    
    try {
      const oldConfig = { ...this.config };
      this.config = this.loadDefaultConfig();
      this.config.system.lastUpdated = new Date().toISOString();

      await this.persistConfig();

      await this.logConfigEvent({
        action: 'CONFIG_RESET',
        module: 'ALL',
        changes: { reset_to_defaults: true },
        success: true
      }, effectiveUser);

      if (effectiveUser) {
        await logVRTAction(effectiveUser, 'SETTINGS_UPDATE', {
          action: 'config_reset_all_modules',
          timestamp: new Date().toISOString()
        });
      }

      console.log('[VRT Config] Configuration reset to defaults');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset configuration';
      
      await this.logConfigEvent({
        action: 'CONFIG_ERROR',
        module: 'ALL',
        errors: [errorMessage],
        success: false
      }, effectiveUser);

      return { success: false, errors: [errorMessage] };
    }
  }

  /**
   * Get configuration events for audit purposes
   */
  public getConfigEvents(
    module?: string,
    action?: VRTConfigEvent['action'],
    startDate?: Date,
    endDate?: Date
  ): VRTConfigEvent[] {
    let events = [...this.configEvents];

    if (module && module !== 'ALL') {
      events = events.filter(event => event.module === module);
    }

    if (action) {
      events = events.filter(event => event.action === action);
    }

    if (startDate) {
      events = events.filter(event => new Date(event.timestamp) >= startDate);
    }

    if (endDate) {
      events = events.filter(event => new Date(event.timestamp) <= endDate);
    }

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Export configuration as JSON
   */
  public exportConfig(): string {
    const exportData = {
      config: this.config,
      exported: new Date().toISOString(),
      version: this.config.system.version,
      environment: this.config.system.environment
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  public async importConfig(configJson: string, user?: VRTUser): Promise<{ success: boolean; errors?: string[] }> {
    const effectiveUser = user || this.currentUser;
    
    try {
      const importData = JSON.parse(configJson);
      
      if (!importData.config) {
        throw new Error('Invalid configuration format: missing config object');
      }

      // Validate the imported configuration
      const validationResult = this.validateCompleteConfig(importData.config);
      if (!validationResult.valid) {
        return { success: false, errors: validationResult.errors };
      }

      const oldConfig = { ...this.config };
      this.config = {
        ...importData.config,
        system: {
          ...importData.config.system,
          lastUpdated: new Date().toISOString()
        }
      };

      await this.persistConfig();

      await this.logConfigEvent({
        action: 'CONFIG_LOADED',
        module: 'ALL',
        changes: { imported_from: importData.exported || 'unknown' },
        success: true
      }, effectiveUser);

      if (effectiveUser) {
        await logVRTAction(effectiveUser, 'SETTINGS_UPDATE', {
          action: 'config_imported',
          sourceVersion: importData.version,
          sourceEnvironment: importData.environment,
          timestamp: new Date().toISOString()
        });
      }

      console.log('[VRT Config] Configuration imported successfully');
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import configuration';
      
      await this.logConfigEvent({
        action: 'CONFIG_ERROR',
        module: 'ALL',
        errors: [errorMessage],
        success: false
      }, effectiveUser);

      return { success: false, errors: [errorMessage] };
    }
  }

  // Private helper methods

  private loadDefaultConfig(): VRTMasterConfig {
    return {
      snapshot: {
        enabled: true,
        retentionDays: 30,
        breakpoints: {
          desktop: { width: 1920, height: 1080 },
          tablet: { width: 768, height: 1024 },
          mobile: { width: 375, height: 667 }
        },
        quality: 0.9,
        format: 'png'
      },
      diff: {
        sensitivity: 0.05,
        ignoreRegions: [],
        colorThreshold: 10,
        pixelThreshold: 0.01
      },
      confidence: {
        enabled: true,
        baselineConfidence: 0.8,
        diffThreshold: 0.1,
        learningRate: 0.1
      },
      playwright: {
        enabled: true,
        timeout: 30000,
        browsers: ['chromium', 'firefox'],
        retries: 2
      },
      learning: {
        enabled: true,
        minSamples: 50,
        learningRate: 0.1,
        retentionDays: 90
      },
      security: {
        enabledInProduction: false,
        requireSuperAdmin: true,
        auditLogging: true,
        maxSnapshotRetention: 30,
        maxAuditLogRetention: 90,
        rateLimitPerHour: 100
      },
      system: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        environment: this.detectEnvironment(),
        debugMode: this.detectEnvironment() === 'development',
        performanceLogging: true
      }
    };
  }

  private loadPersistedConfig(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const persistedConfig = JSON.parse(stored);
        this.config = {
          ...this.config,
          ...persistedConfig,
          system: {
            ...this.config.system,
            ...persistedConfig.system
          }
        };
      }
    } catch (error) {
      console.warn('[VRT Config] Failed to load persisted configuration, using defaults');
    }
  }

  private async persistConfig(): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.config));
    } catch (error) {
      console.error('[VRT Config] Failed to persist configuration:', error);
      throw error;
    }
  }

  private loadConfigEvents(): void {
    try {
      const stored = localStorage.getItem(this.eventsKey);
      if (stored) {
        this.configEvents = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('[VRT Config] Failed to load config events');
      this.configEvents = [];
    }
  }

  private async logConfigEvent(
    event: Omit<VRTConfigEvent, 'timestamp' | 'user'>,
    user?: VRTUser | null
  ): Promise<void> {
    const configEvent: VRTConfigEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      user: user?.name || 'system'
    };

    this.configEvents.push(configEvent);

    // Keep only recent events to avoid storage bloat
    if (this.configEvents.length > 500) {
      this.configEvents = this.configEvents.slice(-500);
    }

    try {
      localStorage.setItem(this.eventsKey, JSON.stringify(this.configEvents));
    } catch (error) {
      console.error('[VRT Config] Failed to save config event:', error);
    }

    console.log(`[VRT Config Event] ${event.action} - ${event.module}`, configEvent);
  }

  private validateConfig(): void {
    const validationResult = this.validateCompleteConfig(this.config);
    if (!validationResult.valid) {
      console.warn('[VRT Config] Configuration validation failed:', validationResult.errors);
      // Reset to defaults if validation fails
      this.config = this.loadDefaultConfig();
    }
  }

  private validateModuleConfig(module: string, config: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Add specific validation logic for each module
    switch (module) {
      case 'snapshot':
        if (config.quality && (config.quality < 0 || config.quality > 1)) {
          errors.push('Snapshot quality must be between 0 and 1');
        }
        if (config.retentionDays && config.retentionDays < 1) {
          errors.push('Retention days must be at least 1');
        }
        break;

      case 'diff':
        if (config.sensitivity && (config.sensitivity < 0 || config.sensitivity > 1)) {
          errors.push('Diff sensitivity must be between 0 and 1');
        }
        break;

      case 'security':
        if (config.rateLimitPerHour && config.rateLimitPerHour < 1) {
          errors.push('Rate limit must be at least 1 action per hour');
        }
        break;
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private validateCompleteConfig(config: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validate required top-level properties
    const requiredModules = ['snapshot', 'diff', 'confidence', 'playwright', 'learning', 'security', 'system'];
    for (const module of requiredModules) {
      if (!config[module]) {
        errors.push(`Missing required module: ${module}`);
      }
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private getConfigDiff(oldConfig: any, newConfig: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    for (const key in newConfig) {
      if (oldConfig[key] !== newConfig[key]) {
        changes[key] = {
          from: oldConfig[key],
          to: newConfig[key]
        };
      }
    }

    return changes;
  }

  private detectEnvironment(): 'development' | 'staging' | 'production' {
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    } else if (window.location.hostname.includes('staging')) {
      return 'staging';
    } else {
      return 'development';
    }
  }
}

// Export singleton instance
export const vrtConfigManager = VRTConfigManager.getInstance();

// Helper functions for easy access
export function getVRTConfig(): VRTMasterConfig {
  return vrtConfigManager.getConfig();
}

export function getVRTModuleConfig<T extends keyof VRTMasterConfig>(module: T): VRTMasterConfig[T] {
  return vrtConfigManager.getModuleConfig(module);
}

export async function updateVRTConfig<T extends keyof VRTMasterConfig>(
  module: T,
  config: Partial<VRTMasterConfig[T]>,
  user?: VRTUser
): Promise<{ success: boolean; errors?: string[] }> {
  return vrtConfigManager.updateModuleConfig(module, config, user);
} 