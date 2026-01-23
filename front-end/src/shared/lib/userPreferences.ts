/**
 * User Preferences Utility
 * Handles persisting user preferences with localStorage fallback
 */

const PREFERENCES_PREFIX = 'om_user_preferences_';

/**
 * Get user ID from auth context or localStorage
 * Falls back to 'anonymous' if no user is logged in
 */
function getUserId(): string {
  // Try to get from localStorage/auth context
  // For now, use a simple approach - can be enhanced with actual auth integration
  const storedUserId = localStorage.getItem('om_user_id');
  if (storedUserId) {
    return storedUserId;
  }
  
  // Fallback to anonymous user
  return 'anonymous';
}

/**
 * Get a user preference value
 * @param key - Preference key (e.g., 'normalRecordsTable.autoShrink')
 * @param defaultValue - Default value if preference doesn't exist
 * @returns The preference value or defaultValue
 */
export function getUserPreference<T>(key: string, defaultValue: T): T {
  try {
    const userId = getUserId();
    const storageKey = `${PREFERENCES_PREFIX}${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) {
      return defaultValue;
    }
    
    const preferences = JSON.parse(stored);
    const keys = key.split('.');
    let value: any = preferences;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value as T;
  } catch (error) {
    console.warn('Error reading user preference:', error);
    return defaultValue;
  }
}

/**
 * Set a user preference value
 * @param key - Preference key (e.g., 'normalRecordsTable.autoShrink')
 * @param value - Value to store
 */
export function setUserPreference<T>(key: string, value: T): void {
  try {
    const userId = getUserId();
    const storageKey = `${PREFERENCES_PREFIX}${userId}`;
    
    // Get existing preferences
    const stored = localStorage.getItem(storageKey);
    let preferences: any = stored ? JSON.parse(stored) : {};
    
    // Set nested value
    const keys = key.split('.');
    let current = preferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch (error) {
    console.warn('Error saving user preference:', error);
  }
}
