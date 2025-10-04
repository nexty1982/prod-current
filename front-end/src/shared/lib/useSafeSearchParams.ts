import { useSearchParams, useLocation } from 'react-router-dom';

/**
 * Safe wrapper for useSearchParams that prevents "Cannot read properties of undefined (reading 'getAll')" errors
 * 
 * @returns A URLSearchParams object that always has getAll and get methods
 */
export function useSafeSearchParams(): URLSearchParams {
  const location = useLocation();
  let searchParams: URLSearchParams;
  
  try {
    const [sp] = useSearchParams();
    // Check if the returned object has the getAll method
    if (sp && typeof sp.getAll === 'function') {
      searchParams = sp;
    } else {
      // Fallback: create URLSearchParams from location.search
      searchParams = new URLSearchParams(location.search || '');
    }
  } catch (error) {
    // Fallback: create URLSearchParams from location.search
    searchParams = new URLSearchParams(location.search || '');
  }
  
  return searchParams;
}

/**
 * Helper to safely get a single parameter value
 * 
 * @param sp - URLSearchParams object
 * @param key - Parameter key
 * @param fallback - Default value if key not found
 * @returns The parameter value or fallback
 */
export function getOne(sp: URLSearchParams, key: string, fallback = ''): string {
  return sp.get(key) ?? fallback;
}

/**
 * Helper to safely get multiple parameter values
 * 
 * @param sp - URLSearchParams object  
 * @param key - Parameter key
 * @returns Array of parameter values (empty array if none found)
 */
export function getMany(sp: URLSearchParams, key: string): string[] {
  return typeof sp.getAll === 'function' ? sp.getAll(key) : [];
}

/**
 * Helper to safely get all values from FormData
 * 
 * @param fd - FormData object (or any unknown value)
 * @param key - Form field key
 * @returns Array of string values (empty array if FormData invalid or key not found)
 */
export function safeGetAll(fd: unknown, key: string): string[] {
  return fd instanceof FormData && typeof fd.getAll === 'function' 
    ? (fd.getAll(key) as string[]) 
    : [];
}
