/**
 * Error Utilities
 * Converts error codes to user-friendly messages
 */

import { ERROR_CODES, RESPONSE_STATUS, MESSAGES } from '../config';

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (!error) {
    return 'An unknown error occurred';
  }

  // ApiError instance
  if (error.code) {
    return getErrorMessageByCode(error.code, error.details);
  }

  // Axios error
  if (error.response?.data?.error_code) {
    return getErrorMessageByCode(error.response.data.error_code, error.response.data.error_details);
  }

  // Network/timeout errors
  if (error.code === 'ECONNABORTED') {
    return MESSAGES.ERROR.TIMEOUT || 'Request timeout. Please try again.';
  }

  if (error.message === 'Network Error') {
    return MESSAGES.ERROR.NETWORK || 'Network error. Please check your connection.';
  }

  // Fallback
  return error.message || 'An unexpected error occurred';
};

/**
 * Get message by error code
 */
export const getErrorMessageByCode = (code, details = null) => {
  const messages = {
    [ERROR_CODES.VALIDATION_ERROR]: MESSAGES.ERROR.VALIDATION || 'Please check your input',
    [ERROR_CODES.NOT_FOUND]: MESSAGES.ERROR.NOT_FOUND || 'Resource not found',
    [ERROR_CODES.DATABASE_ERROR]: MESSAGES.ERROR.DATABASE || 'Database error. Please try again.',
    [ERROR_CODES.UNAUTHORIZED]: MESSAGES.ERROR.UNAUTHORIZED || 'Please log in again',
    [ERROR_CODES.FORBIDDEN]: MESSAGES.ERROR.FORBIDDEN || 'You do not have permission',
    [ERROR_CODES.CONFLICT]: MESSAGES.ERROR.CONFLICT || 'Resource conflict',
    [ERROR_CODES.RESOURCE_EXHAUSTED]: MESSAGES.ERROR.RESOURCE_EXHAUSTED || 'Resource limit exceeded',
    [ERROR_CODES.INTERNAL_ERROR]: MESSAGES.ERROR.SERVER || 'Server error. Please try again.',
    [ERROR_CODES.AGENT_ERROR]: MESSAGES.ERROR.AGENT || 'Agent error. Please try again.',
    'TIMEOUT': MESSAGES.ERROR.TIMEOUT || 'Request timeout',
    'NETWORK_ERROR': MESSAGES.ERROR.NETWORK || 'Network error',
    'RATE_LIMITED': MESSAGES.ERROR.RATE_LIMITED || 'Too many requests. Please wait.',
  };

  return messages[code] || `Error: ${code}`;
};

/**
 * Is retryable error
 */
export const isRetryableError = (error) => {
  if (!error) return false;

  // Network errors are retryable
  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return true;
  }

  // 5xx errors are retryable
  if (error.status >= 500) {
    return true;
  }

  // Rate limit is retryable
  if (error.code === 'RATE_LIMITED' || error.status === 429) {
    return true;
  }

  return false;
};

/**
 * Is fatal error (not retryable)
 */
export const isFatalError = (error) => {
  if (!error) return false;

  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    return true;
  }

  if (error.code === ERROR_CODES.UNAUTHORIZED) {
    return true;
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return true;
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return true;
  }

  if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404) {
    return true;
  }

  return false;
};

/**
 * Get validation error message
 */
export const getValidationErrors = (error) => {
  const errors = {};

  if (error.details && Array.isArray(error.details)) {
    error.details.forEach((detail) => {
      const field = detail.loc?.[0] || 'general';
      errors[field] = detail.msg || 'Invalid input';
    });
  }

  return errors;
};

/**
 * Format error for display
 */
export const formatErrorForDisplay = (error) => {
  return {
    message: getErrorMessage(error),
    code: error.code || 'UNKNOWN',
    isRetryable: isRetryableError(error),
    isFatal: isFatalError(error),
    details: error.details,
  };
};
