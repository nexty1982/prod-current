// server/utils/apiResponse.js - Standardized API Response Utility

class ApiResponse {
  /**
   * Success response
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {object} meta - Additional metadata
   */
  static success(data = null, message = 'Success', meta = null) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null && data !== undefined) {
      response.data = data;
    }
    
    if (meta !== null && meta !== undefined) {
      response.meta = meta;
    }
    
    return response;
  }
  
  /**
   * Error response
   * @param {string} message - Error message
   * @param {string} code - Error code
   * @param {number} status - HTTP status code
   * @param {any} details - Additional error details
   */
  static error(message = 'An error occurred', code = 'ERROR', status = 500, details = null) {
    const response = {
      success: false,
      error: {
        message,
        code,
        status
      },
      timestamp: new Date().toISOString()
    };
    
    if (details !== null && details !== undefined) {
      response.error.details = details;
    }
    
    if (process.env.NODE_ENV === 'development' && details instanceof Error) {
      response.error.stack = details.stack;
    }
    
    return response;
  }
  
  /**
   * Paginated response
   * @param {array} items - Data items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total items
   */
  static paginated(items, page, limit, total) {
    return {
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Validation error response
   * @param {array} errors - Array of validation errors
   * @param {string} message - Overall error message
   */
  static validationError(errors, message = 'Validation failed') {
    return {
      success: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
        status: 400,
        validationErrors: errors
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Not found response
   * @param {string} resource - Resource type that was not found
   * @param {string} identifier - Resource identifier
   */
  static notFound(resource = 'Resource', identifier = '') {
    const message = identifier ? 
      `${resource} with identifier '${identifier}' not found` : 
      `${resource} not found`;
    
    return {
      success: false,
      error: {
        message,
        code: 'NOT_FOUND',
        status: 404
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Unauthorized response
   * @param {string} message - Custom unauthorized message
   */
  static unauthorized(message = 'Authentication required') {
    return {
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED',
        status: 401
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Forbidden response
   * @param {string} message - Custom forbidden message
   */
  static forbidden(message = 'You do not have permission to access this resource') {
    return {
      success: false,
      error: {
        message,
        code: 'FORBIDDEN',
        status: 403
      },
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ApiResponse;
