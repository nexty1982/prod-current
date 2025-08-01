/**
 * HTTP client utility functions for API calls
 */

const BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function request(url: string, options: RequestInit = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}/${url.replace(/^\//, '')}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(fullUrl, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('HTTP request failed:', error);
    throw error;
  }
}

/**
 * GET request
 */
export async function apiGet(url: string) {
  return request(url, {
    method: 'GET',
  });
}

/**
 * POST request
 */
export async function apiPost(url: string, data?: any) {
  return request(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut(url: string, data?: any) {
  return request(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete(url: string) {
  return request(url, {
    method: 'DELETE',
  });
}

/**
 * PATCH request
 */
export async function apiPatch(url: string, data?: any) {
  return request(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}
