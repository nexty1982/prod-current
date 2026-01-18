/**
 * AG Grid Module Registration
 * 
 * Registers AG Grid Community modules globally to prevent error #272:
 * "No AG Grid modules are registered"
 * 
 * This must be called once before any AG Grid components are rendered.
 * The registration is guarded to prevent double registration.
 */

import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

let isRegistered = false;

/**
 * Register AG Grid Community modules once
 * Safe to call multiple times - will only register once
 */
export function registerAgGridModulesOnce(): void {
  if (isRegistered) {
    return;
  }

  try {
    ModuleRegistry.registerModules([AllCommunityModule]);
    isRegistered = true;
    console.debug('[AG Grid] Community modules registered successfully');
  } catch (error) {
    console.error('[AG Grid] Failed to register modules:', error);
    throw error;
  }
}
