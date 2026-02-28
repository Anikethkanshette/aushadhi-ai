/**
 * API Client
 * Handles all API calls with standardized error handling
 */

import axios from 'axios';
import { API_CONFIG, HTTP_STATUS, ERROR_CODES, RESPONSE_STATUS } from './config';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API Response Handler
 * Ensures all responses are in standard format
 */
const handleResponse = (response) => {
  // If backend response is already standardized
  if (response.data && typeof response.data === 'object' && response.data.status) {
    if (response.data.status === RESPONSE_STATUS.SUCCESS || 
        response.data.status === RESPONSE_STATUS.PARTIALLY_SUCCESS) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        meta: response.data.meta,
      };
    } else {
      throw new ApiError(
        response.data.message || 'Unknown error',
        response.data.error_code || ERROR_CODES.INTERNAL_ERROR,
        response.data.error_details,
        response.status
      );
    }
  }
  
  // Fallback for non-standardized responses
  return {
    success: true,
    data: response.data,
    message: 'Success',
    meta: {
      timestamp: new Date().toISOString(),
      duration_ms: 0,
    },
  };
};

/**
 * Error Handler
 * Handles all types of errors
 */
const handleError = (error) => {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;
    
    // Standardized error response from backend
    if (data && data.error_code) {
      throw new ApiError(
        data.message || 'Unknown error',
        data.error_code,
        data.error_details,
        status
      );
    }
    
    // Map HTTP status to error code
    let errorCode = ERROR_CODES.INTERNAL_ERROR;
    let message = 'An error occurred';
    
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
      case HTTP_STATUS.UNPROCESSABLE_ENTITY:
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        message = data.detail || 'Invalid request';
        break;
      case HTTP_STATUS.UNAUTHORIZED:
        errorCode = ERROR_CODES.UNAUTHORIZED;
        message = 'Please log in again';
        break;
      case HTTP_STATUS.FORBIDDEN:
        errorCode = ERROR_CODES.FORBIDDEN;
        message = 'You do not have permission';
        break;
      case HTTP_STATUS.NOT_FOUND:
        errorCode = ERROR_CODES.NOT_FOUND;
        message = 'Not found';
        break;
      case HTTP_STATUS.CONFLICT:
        errorCode = ERROR_CODES.CONFLICT;
        message = data.detail || 'Resource conflict';
        break;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        errorCode = 'RATE_LIMITED';
        message = 'Too many requests. Please wait.';
        break;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        errorCode = ERROR_CODES.INTERNAL_ERROR;
        message = 'Server error. Please try again.';
        break;
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        errorCode = ERROR_CODES.INTERNAL_ERROR;
        message = 'Service unavailable. Please try again.';
        break;
      default:
        message = data.detail || data.message || 'An error occurred';
    }
    
    throw new ApiError(message, errorCode, null, status);
  }
  
  // Network error
  if (error.code === 'ECONNABORTED') {
    throw new ApiError('Request timeout. Please check your connection.', 'TIMEOUT', null, null);
  }
  
  if (error.message === 'Network Error') {
    throw new ApiError('Network error. Please check your connection.', 'NETWORK_ERROR', null, null);
  }
  
  // Unknown error
  throw new ApiError(error.message || 'Unknown error', ERROR_CODES.INTERNAL_ERROR, null, null);
};

/**
 * Custom API Error Class
 */
export class ApiError extends Error {
  constructor(message, code, details = null, status = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }

  isValidationError() {
    return this.code === ERROR_CODES.VALIDATION_ERROR;
  }

  isNotFound() {
    return this.code === ERROR_CODES.NOT_FOUND;
  }

  isUnauthorized() {
    return this.code === ERROR_CODES.UNAUTHORIZED;
  }

  isForbidden() {
    return this.code === ERROR_CODES.FORBIDDEN;
  }

  isConflict() {
    return this.code === ERROR_CODES.CONFLICT;
  }

  isServerError() {
    return this.code === ERROR_CODES.INTERNAL_ERROR;
  }

  isNetworkError() {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

/**
 * API Methods
 */
const api = {
  /**
   * GET Request
   */
  get: async (url, config = {}) => {
    try {
      const response = await apiClient.get(url, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * POST Request
   */
  post: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.post(url, data, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * PUT Request
   */
  put: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.put(url, data, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * PATCH Request
   */
  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await apiClient.patch(url, data, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * DELETE Request
   */
  delete: async (url, config = {}) => {
    try {
      const response = await apiClient.delete(url, config);
      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Upload File
   */
  upload: async (url, file, onProgress = null) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: onProgress,
      });

      return handleResponse(response);
    } catch (error) {
      return handleError(error);
    }
  },

  /**
   * Set Authorization Token
   */
  setToken: (token) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  /**
   * Set Base URL
   */
  setBaseURL: (url) => {
    apiClient.defaults.baseURL = url;
  },

  /**
   * Get Client Instance
   */
  getClient: () => apiClient,
};

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Response: ${response.status}`, response.data);
    }
    return response;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API] Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
