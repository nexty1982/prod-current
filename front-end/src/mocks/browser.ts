/**
 * Mock Service Worker (MSW) Browser Setup
 * 
 * This file sets up MSW for browser environment.
 * Only used when VITE_ENABLE_MOCKS=true in development mode.
 */

import { setupWorker } from 'msw/browser';
import { mockHandlers } from '../api/mocks/handlers/mockhandlers';

// Create the MSW worker with all mock handlers
export const worker = setupWorker(...mockHandlers);
