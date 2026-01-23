/**
 * Cache and guard utilities for admin endpoint calls
 * Prevents spam and provides graceful fallbacks
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  churchId: number;
  recordType: string;
}

// In-memory cache for schema/mappings per churchId+recordType
const schemaCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cache key for churchId + recordType
 */
function getCacheKey(churchId: number, recordType: string, endpoint: string): string {
  return `${endpoint}:${churchId}:${recordType}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  const age = Date.now() - entry.timestamp;
  return age < CACHE_TTL;
}

/**
 * Get cached data if available and valid
 */
export function getCached<T>(churchId: number, recordType: string, endpoint: string): T | null {
  const key = getCacheKey(churchId, recordType, endpoint);
  const entry = schemaCache.get(key);
  if (isCacheValid(entry)) {
    return entry.data;
  }
  if (entry) {
    // Remove stale entry
    schemaCache.delete(key);
  }
  return null;
}

/**
 * Set cache entry
 */
export function setCached<T>(churchId: number, recordType: string, endpoint: string, data: T): void {
  const key = getCacheKey(churchId, recordType, endpoint);
  schemaCache.set(key, {
    data,
    timestamp: Date.now(),
    churchId,
    recordType,
  });
}

/**
 * Clear cache for a specific church/recordType
 */
export function clearCache(churchId?: number, recordType?: string): void {
  if (churchId && recordType) {
    // Clear specific entry
    const keysToDelete: string[] = [];
    schemaCache.forEach((entry, key) => {
      if (entry.churchId === churchId && entry.recordType === recordType) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => schemaCache.delete(key));
  } else {
    // Clear all
    schemaCache.clear();
  }
}

/**
 * Check if user has admin permissions
 * Returns true if user has admin role, false otherwise
 */
export function hasAdminPermission(user: any): boolean {
  if (!user) return false;
  const roles = user.role || user.roles || [];
  if (Array.isArray(roles)) {
    return roles.some((r: string) => 
      ['admin', 'super_admin', 'church_admin'].includes(r.toLowerCase())
    );
  }
  return ['admin', 'super_admin', 'church_admin'].includes(String(roles).toLowerCase());
}

/**
 * Safe fetch with error handling and logging
 * Returns null on 403/404, throws on other errors
 */
export async function safeAdminFetch(
  url: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; data: any; status: number } | null> {
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    if (response.status === 403 || response.status === 404) {
      // Don't log these as errors - they're expected for non-admin users
      return { ok: false, data: null, status: response.status };
    }

    if (!response.ok) {
      // Log other errors once
      console.warn(`Admin endpoint returned ${response.status}: ${url}`);
      return { ok: false, data: null, status: response.status };
    }

    const data = await response.json();
    return { ok: true, data, status: response.status };
  } catch (error) {
    // Network errors - log once
    console.warn(`Failed to fetch admin endpoint: ${url}`, error);
    return null;
  }
}
