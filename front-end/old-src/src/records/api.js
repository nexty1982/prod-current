/**
 * API functions for record management across baptism, marriage, and funeral records
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/helpers/httpClient';
import { API_ENDPOINTS, CERTIFICATE_ENDPOINTS } from './constants';

/**
 * Fetch records with pagination, sorting, and filtering
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {Object} params - Query parameters for the request
 * @returns {Promise<Object>} - The response data
 */
export const fetchRecords = async (recordType, params) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    // Format date parameters if they exist
    const formattedParams = { ...params };
    if (formattedParams.startDate && formattedParams.startDate instanceof Date) {
      formattedParams.startDate = formattedParams.startDate.toISOString();
    }
    if (formattedParams.endDate && formattedParams.endDate instanceof Date) {
      formattedParams.endDate = formattedParams.endDate.toISOString();
    }

    // Use apiGet with query parameters
    const url = `${endpoint.replace('/api/', '')}${Object.keys(formattedParams).length ? '?' + new URLSearchParams(formattedParams).toString() : ''}`;
    const response = await apiGet(url);

    // Handle different response formats
    const records = response.records || response || [];
    const totalRecords = response.totalRecords || response.total || records.length;

    return { records, totalRecords };
  } catch (error) {
    console.error(`Error fetching ${recordType} records:`, error);
    throw error;
  }
};

/**
 * Create a new record
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {Object} data - The record data
 * @returns {Promise<Object>} - The created record
 */
export const createRecord = async (recordType, data) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const response = await apiPost(endpoint.replace('/api/', ''), data);
    return response;
  } catch (error) {
    console.error(`Error creating ${recordType} record:`, error);
    throw error;
  }
};

/**
 * Update an existing record
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {string|number} id - The record ID
 * @param {Object} data - The updated record data
 * @returns {Promise<Object>} - The updated record
 */
export const updateRecord = async (recordType, id, data) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const response = await apiPut(`${endpoint.replace('/api/', '')}/${id}`, data);
    return response;
  } catch (error) {
    console.error(`Error updating ${recordType} record:`, error);
    throw error;
  }
};

/**
 * Delete a record
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {string|number} id - The record ID
 * @returns {Promise<Object>} - The response data
 */
export const deleteRecord = async (recordType, id) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const response = await apiDelete(`${endpoint.replace('/api/', '')}/${id}`);
    return response;
  } catch (error) {
    console.error(`Error deleting ${recordType} record:`, error);
    throw error;
  }
};

/**
 * Fetch record history
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {string|number} id - The record ID
 * @returns {Promise<Array>} - The record history
 */
export const fetchRecordHistory = async (recordType, id) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const response = await apiGet(`${endpoint.replace('/api/', '')}/${id}/history`);
    return response;
  } catch (error) {
    console.error(`Error fetching ${recordType} record history:`, error);
    throw error;
  }
};

/**
 * Import records from a file
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {File} file - The file to import
 * @returns {Promise<Object>} - The import results
 */
export const importRecords = async (recordType, file) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const formData = new FormData();
    formData.append('file', file);

    // Use fetch directly for file uploads since ky handles FormData automatically
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${BASE_URL}${endpoint}/import`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error importing ${recordType} records:`, error);
    throw error;
  }
};

/**
 * Fetch dropdown options for filters
 * @param {string} optionType - The type of options to fetch (locations, clergy)
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @returns {Promise<Array>} - The options
 */
export const fetchDropdownOptions = async (optionType, recordType = null) => {
  try {
    let endpoint;

    switch (optionType) {
      case 'clergy':
        endpoint = '/api/clergy';
        break;
      case 'locations':
        if (recordType === 'funeral') {
          endpoint = '/api/funeral-records/unique-values?table=funeral_records&column=burial_location';
        } else {
          endpoint = '/api/locations';
        }
        break;
      default:
        throw new Error(`Invalid option type: ${optionType}`);
    }

    const response = await apiGet(endpoint.replace('/api/', ''));

    // Handle different response formats
    if (optionType === 'locations' && recordType === 'funeral') {
      return response.values || [];
    }

    return response || [];
  } catch (error) {
    console.error(`Error fetching ${optionType}:`, error);
    return [];
  }
};

/**
 * Generate a certificate for a record
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {string|number} id - The record ID
 * @param {Object} options - Certificate generation options
 * @returns {string} - The download URL
 */
export const generateCertificate = (recordType, id, options = {}) => {
  try {
    const endpoint = CERTIFICATE_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    // Create query parameters
    const params = new URLSearchParams();

    if (options.fieldOffsets) {
      params.append('offsets', encodeURIComponent(JSON.stringify(options.fieldOffsets)));
    }

    if (options.fontSizes) {
      params.append('fontSizes', encodeURIComponent(JSON.stringify(options.fontSizes)));
    }

    if (options.hiddenFields) {
      params.append('hiddenFields', encodeURIComponent(JSON.stringify(Array.from(options.hiddenFields))));
    }

    return `${endpoint}/${id}/download?${params.toString()}`;
  } catch (error) {
    console.error(`Error generating ${recordType} certificate:`, error);
    throw error;
  }
};

/**
 * Preview a certificate for a record
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @param {string|number} id - The record ID
 * @param {Object} options - Certificate preview options
 * @returns {Promise<Object>} - The preview data
 */
export const previewCertificate = async (recordType, id, options = {}) => {
  try {
    const endpoint = CERTIFICATE_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const response = await apiPost(`${endpoint.replace('/api/', '')}/${id}/preview`, {
      fieldOffsets: options.fieldOffsets || {},
      fontSizes: options.fontSizes || {},
      hiddenFields: options.hiddenFields ? Array.from(options.hiddenFields) : []
    });

    return response;
  } catch (error) {
    console.error(`Error previewing ${recordType} certificate:`, error);
    throw error;
  }
};

/**
 * Test API connectivity
 * @param {string} recordType - The type of record (baptism, marriage, funeral)
 * @returns {Promise<Object>} - The test results
 */
export const testAPI = async (recordType) => {
  try {
    const endpoint = API_ENDPOINTS[recordType];
    if (!endpoint) {
      throw new Error(`Invalid record type: ${recordType}`);
    }

    const url = `${endpoint.replace('/api/', '')}?page=1&limit=1`;
    const response = await apiGet(url);

    // Also test certificate endpoint if available
    let certificateResponse = null;
    try {
      const certEndpoint = CERTIFICATE_ENDPOINTS[recordType];
      if (certEndpoint) {
        certificateResponse = await apiGet(`${certEndpoint.replace('/api/', '')}/test`);
      }
    } catch (certError) {
      console.warn(`Certificate API test failed for ${recordType}:`, certError);
    }

    return {
      success: true,
      status: 200, // Since apiGet would throw if not successful
      certificateStatus: certificateResponse ? 200 : 'Not tested'
    };
  } catch (error) {
    console.error(`API test failed for ${recordType}:`, error);
    throw error;
  }
};