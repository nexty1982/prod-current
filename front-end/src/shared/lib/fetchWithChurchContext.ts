/**
 * Utility function to add church context headers to fetch requests
 * This helps prevent "Record request without church context" warnings
 */

interface FetchWithChurchContextOptions extends RequestInit {
  churchId?: number | string | null;
  skipChurchContext?: boolean; // For routes that shouldn't have church context
}

/**
 * Wraps fetch() to automatically add church context headers
 * @param url - The URL to fetch
 * @param options - Fetch options, including optional churchId
 * @returns Promise<Response>
 */
export async function fetchWithChurchContext(
  url: string,
  options: FetchWithChurchContextOptions = {}
): Promise<Response> {
  const { churchId, skipChurchContext, ...fetchOptions } = options;

  // Get churchId from various sources if not provided
  let finalChurchId: number | string | null | undefined = churchId;

  // If churchId is not provided, try to get it from:
  // 1. URL path (e.g., /api/admin/churches/46/...)
  const urlMatch = url.match(/\/churches\/(\d+)/);
  if (!finalChurchId && urlMatch) {
    finalChurchId = urlMatch[1];
  }

  // 2. localStorage (from user object)
  if (!finalChurchId && typeof window !== 'undefined') {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        finalChurchId = user?.church_id || user?.churchId;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // 3. sessionStorage
  if (!finalChurchId && typeof window !== 'undefined') {
    try {
      const sessionChurchId = sessionStorage.getItem('church_id') || sessionStorage.getItem('churchId');
      if (sessionChurchId) {
        finalChurchId = sessionChurchId;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  // Prepare headers
  const headers = new Headers(fetchOptions.headers);

  // Add church context header if we have a churchId and shouldn't skip it
  if (!skipChurchContext && finalChurchId) {
    const churchIdStr = String(finalChurchId).trim();
    // Only add if it's a valid church ID (not empty, 'none', 'undefined', etc.)
    if (churchIdStr && !['none', 'undefined', 'null', 'nan', ''].includes(churchIdStr.toLowerCase())) {
      headers.set('X-Church-Id', churchIdStr);
    }
  }

  // Ensure credentials are included for session-based auth
  const finalOptions: RequestInit = {
    ...fetchOptions,
    credentials: fetchOptions.credentials || 'include',
    headers,
  };

  return fetch(url, finalOptions);
}

/**
 * Helper to get churchId from URL or storage
 */
export function getChurchIdFromContext(): number | string | null {
  // Try localStorage first
  if (typeof window !== 'undefined') {
    try {
      const authUser = localStorage.getItem('auth_user');
      if (authUser) {
        const user = JSON.parse(authUser);
        if (user?.church_id || user?.churchId) {
          return user.church_id || user.churchId;
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // Try sessionStorage
    try {
      const sessionChurchId = sessionStorage.getItem('church_id') || sessionStorage.getItem('churchId');
      if (sessionChurchId) {
        return sessionChurchId;
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return null;
}
