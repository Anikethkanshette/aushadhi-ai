/**
 * Frontend Configuration
 * Centralized configuration for API, endpoints, and constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/patients/login',
  AUTH_PHARMACIST_LOGIN: '/pharmacist/login',
  
  // Medicines
  MEDICINES_LIST: '/medicines/',
  MEDICINES_SEARCH: '/medicines/search/alternatives',
  MEDICINES_RECOMMENDATIONS: (id) => `/medicines/recommendations/${id}`,
  MEDICINES_GET: (id) => `/medicines/${id}`,
  MEDICINES_UPDATE: (id) => `/medicines/${id}/inventory`,
  
  // Orders
  ORDERS_CREATE: '/orders/',
  ORDERS_GET: (id) => `/orders/${id}`,
  ORDERS_LIST: (patientId) => `/orders/?patient_id=${patientId}`,
  ORDERS_UPDATE_STATUS: (id) => `/orders/${id}/status`,
  ORDERS_CANCEL: (id) => `/orders/${id}/cancel`,
  
  // Patients
  PATIENTS_PROFILE: (abhaId) => `/patients/abha/${abhaId}/profile`,
  PATIENTS_NOTIFICATIONS: (patientId) => `/patients/${patientId}/notifications`,
  PATIENTS_NOTIF_MARK_READ: (abhaId, notificationId) => `/patients/${abhaId}/notifications/${notificationId}/read`,
  PATIENTS_NOTIF_MARK_ALL: (abhaId) => `/patients/${abhaId}/notifications/read-all`,
  
  // Agent
  AGENT_CHAT: '/agent/chat',
  AGENT_VOICE: '/agent/voice',
  AGENT_WELFARE: (abhaId) => `/agent/welfare/${abhaId}`,
  AGENT_SCAN: '/agent/scan-prescription',
  
  // Pharmacist
  PHARMACIST_STATS: '/pharmacist/stats',
  PHARMACIST_ORDERS: '/pharmacist/orders',
  PHARMACIST_ORDERS_BULK_STATUS: '/pharmacist/orders/bulk-status',
  PHARMACIST_INVENTORY: '/pharmacist/inventory',
  PHARMACIST_NOTIFICATIONS: '/pharmacist/patient-notifications',
  
  // Webhooks
  WEBHOOK_FULFILLMENT: '/webhook/fulfillment',
  WEBHOOK_NOTIFICATION: '/webhook/notification',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error Codes (from backend)
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DATABASE_ERROR: 'DATABASE_ERROR',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
};

// Response Status
export const RESPONSE_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  INVALID_REQUEST: 'invalid_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  SERVER_ERROR: 'server_error',
  PARTIALLY_SUCCESS: 'partial_success',
};

// notifications
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

// Validation Rules
export const VALIDATION_RULES = {
  ABHA_ID: {
    pattern: /^\d{4}-\d{4}-\d{4}$/,
    message: 'ABHA ID must be in format: 1234-5678-9012',
  },
  PHONE: {
    pattern: /^[0-9]{10}$/,
    message: 'Phone number must be 10 digits',
  },
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email',
  },
  PASSWORD: {
    minLength: 6,
    message: 'Password must be at least 6 characters',
  },
  QUANTITY: {
    min: 1,
    max: 1000,
    message: 'Quantity must be between 1 and 1000',
  },
  AMOUNT: {
    min: 0.01,
    max: 999999.99,
    message: 'Amount must be between 0.01 and 999,999.99',
  },
};

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 5000, // 5 seconds
  MODAL_ANIMATION_DURATION: 300, // 300ms
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_DURATION: 3600000, // 1 hour
};

// Feature Flags
export const FEATURES = {
  ENABLE_VOICE: true,
  ENABLE_PRESCRIPTION_SCAN: true,
  ENABLE_WELFARE_CHECK: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_PHARMACIST_DASHBOARD: true,
  ENABLE_OFFLINE_MODE: true,
};

// Messages
export const MESSAGES = {
  // Success
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',
  ORDER_CREATED: 'Order created successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  ACTION_SUCCESS: 'Action completed successfully',
  
  // Error
  LOGIN_FAILED: 'Login failed. Please check your credentials.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested item was not found.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  PAYMENT_FAILED: 'Payment failed. Please try again.',
  
  // Loading
  LOADING: 'Loading...',
  PROCESSING: 'Processing your request...',
  
  // Empty
  NO_RESULTS: 'No results found',
  NO_ORDERS: 'You have no orders yet',
  NO_MEDICINES: 'No medicines found',
};

export default {
  API_CONFIG,
  API_ENDPOINTS,
  HTTP_STATUS,
  ERROR_CODES,
  RESPONSE_STATUS,
  NOTIFICATION_TYPES,
  VALIDATION_RULES,
  UI_CONFIG,
  FEATURES,
  MESSAGES,
};
