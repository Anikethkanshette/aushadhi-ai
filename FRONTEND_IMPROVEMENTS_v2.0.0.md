# Frontend Improvements v2.0.0 Documentation

## Overview

This document details the comprehensive modernization of the AushadhiAI frontend application (v2.0.0) to match enterprise standards, improve maintainability, and provide better developer experience.

**Version:** 2.0.0  
**Date:** 2024  
**Status:** Complete  
**Dependencies:** React 18.3.1, Axios 1.7.2, Tailwind CSS 3.4.4, Framer Motion

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [New Modules](#new-modules)
3. [Configuration System](#configuration-system)
4. [API Client](#api-client)
5. [Custom Hooks](#custom-hooks)
6. [State Management](#state-management)
7. [Utilities](#utilities)
8. [Error Handling](#error-handling)
9. [Migration Guide](#migration-guide)
10. [Component Best Practices](#component-best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Frontend Stack

```
Frontend v2.0.0
├── Configuration Layer (config.js)
├── API Layer (api.js)
├── State Management
│   ├── Context (AppContext.jsx)
│   └── Hooks (useApi, useAuth, useFetch, etc.)
├── Components
│   ├── Pages
│   ├── UI Components
│   └── Error Boundaries
├── Utilities
│   ├── Error Utils
│   ├── Validation Utils
│   └── Format Utils
└── Styling (Tailwind CSS)
```

### Key Principles

- **Centralized Configuration**: All API endpoints, error codes, validation rules in one place
- **Standardized Error Handling**: Consistent error codes matching backend
- **Custom Hooks**: Reusable logic for common operations (data fetching, authentication, pagination)
- **Context-Based State**: Global state management with useAppContext
- **Error Boundaries**: Graceful error handling at component level
- **Utility Functions**: Shared formatting, validation, error handling

---

## New Modules

### Directory Structure

```
frontend/src/
├── config.js                 # Centralized configuration
├── api.js                    # API client with error handling
├── App.jsx                   # Updated: Uses AppProvider & ErrorBoundary
├── context/
│   └── AppContext.jsx        # Global state management
├── hooks/
│   ├── index.js
│   ├── useApi.js             # Generic API call hook
│   ├── useAuth.js            # Authentication hook
│   ├── useFetch.js           # Data fetching hook with cache
│   ├── usePagination.js      # Pagination hook
│   └── useLocalStorage.js    # localStorage hook
├── utils/
│   ├── index.js
│   ├── errorUtils.js         # Error handling utilities
│   ├── validationUtils.js    # Input validation
│   └── formatUtils.js        # Formatting utilities
├── components/
│   └── ErrorBoundary.jsx     # Error boundary component
└── pages/                    # Existing page components (updated)
```

---

## Configuration System

### config.js

Centralized configuration file providing all constants, endpoints, error codes, and validation rules.

**Location:** `frontend/src/config.js`

### API Configuration

```javascript
import { API_CONFIG } from './config';

// API configuration
const baseUrl = API_CONFIG.BASE_URL;        // 'http://localhost:8000'
const timeout = API_CONFIG.TIMEOUT;         // 30000ms
const retryAttempts = API_CONFIG.RETRY_ATTEMPTS;  // 3
const retryDelay = API_CONFIG.RETRY_DELAY;  // 1000ms
```

### API Endpoints

```javascript
import { API_ENDPOINTS } from './config';

// Organized by feature
API_ENDPOINTS.AUTH_LOGIN              // '/patients/login'
API_ENDPOINTS.MEDICINES_LIST          // '/medicines/'
API_ENDPOINTS.MEDICINES_SEARCH        // '/medicines/search'
API_ENDPOINTS.ORDERS_CREATE           // '/orders/'
API_ENDPOINTS.ORDERS_LIST             // '/orders/'
API_ENDPOINTS.AGENT_CHAT              // '/agent/chat'
API_ENDPOINTS.AGENT_UPLOAD            // '/agent/upload'
// ... 27+ endpoints total
```

### Error Codes

```javascript
import { ERROR_CODES } from './config';

// Matching backend error codes
ERROR_CODES.VALIDATION_ERROR          // 'VALIDATION_ERROR'
ERROR_CODES.NOT_FOUND                 // 'NOT_FOUND'
ERROR_CODES.DATABASE_ERROR            // 'DATABASE_ERROR'
ERROR_CODES.UNAUTHORIZED              // 'UNAUTHORIZED'
ERROR_CODES.FORBIDDEN                 // 'FORBIDDEN'
ERROR_CODES.CONFLICT                  // 'CONFLICT'
ERROR_CODES.RESOURCE_EXHAUSTED        // 'RESOURCE_EXHAUSTED'
ERROR_CODES.INTERNAL_ERROR            // 'INTERNAL_ERROR'
// ... 10+ error codes
```

### Validation Rules

```javascript
import { VALIDATION_RULES } from './config';

// Pre-defined validation patterns
VALIDATION_RULES.ABHA_ID              // { pattern, message }
VALIDATION_RULES.PHONE                // { message }
VALIDATION_RULES.EMAIL                // { pattern, message }
VALIDATION_RULES.PASSWORD             // { minLength, message }
VALIDATION_RULES.QUANTITY             // { min: 1, max: 1000 }
VALIDATION_RULES.AMOUNT               // { min: 0.01, max: 999999.99 }
```

### Feature Flags

```javascript
import { FEATURES } from './config';

// Feature flags for optional features
FEATURES.ENABLE_VOICE_INPUT           // Enable/disable voice features
FEATURES.ENABLE_PRESCRIPTION_SCAN     // Enable/disable prescription scanning
FEATURES.ENABLE_WELFARE_INTEGRATION   // Enable/disable welfare checks
// ... more flags
```

### Localized Messages

```javascript
import { MESSAGES } from './config';

// Success messages
MESSAGES.SUCCESS.LOGIN                // User-friendly login success message
MESSAGES.SUCCESS.ORDER_CREATED        // Order created success message

// Error messages
MESSAGES.ERROR.NETWORK                // Network error message
MESSAGES.ERROR.TIMEOUT                // Timeout error message
MESSAGES.ERROR.VALIDATION             // Validation error message

// Loading messages
MESSAGES.LOADING.FETCHING             // Fetching data...
MESSAGES.LOADING.SUBMITTING           // Submitting...
```

---

## API Client

### Overview

Centralized API client providing standardized error handling, retry logic, and request/response interceptors.

**Location:** `frontend/src/api.js`

### Basic Usage

```javascript
import api from './api';

// GET request
const response = await api.get('/medicines/');
console.log(response.data);  // Returns data directly

// POST request
const response = await api.post('/orders/', {
    prescription_id: 'RX123',
    items: [...],
});

// PUT request
const response = await api.put(`/orders/${id}`, updateData);

// PATCH request
const response = await api.patch(`/orders/${id}`, { status: 'completed' });

// DELETE request
await api.delete(`/orders/${id}`);
```

### Response Format

All API responses are standardized:

```javascript
{
  success: true,
  data: { /* actual data */ },
  message: "Success message",
  meta: {
    timestamp: "2024-01-01T12:00:00Z",
    duration_ms: 45,
    request_id: "uuid-here"
  }
}
```

### Error Handling

```javascript
import api, { ApiError } from './api';

try {
  const response = await api.post('/orders/', data);
  console.log(response.data);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(error.code);           // 'VALIDATION_ERROR'
    console.log(error.message);        // "Invalid medication"
    console.log(error.details);        // { field: 'quantity', issue: '...' }
    
    // Check error type
    if (error.isValidationError()) { /* ... */ }
    if (error.isUnauthorized()) { /* ... */ }
    if (error.isNetworkError()) { /* ... */ }
  }
}
```

### Setting Authorization

```javascript
import api from './api';

// Set token (typically after login)
const token = loginResponse.token;
api.setToken(token);

// Clear token (typically on logout)
api.setToken(null);
```

### File Upload

```javascript
import api from './api';

const handleFileUpload = async (file) => {
  try {
    const response = await api.upload('/agent/upload', file, (progress) => {
      console.log(`Upload progress: ${progress.loaded}/${progress.total}`);
    });
    console.log('File uploaded:', response.data);
  } catch (error) {
    console.error('Upload failed:', error.message);
  }
};
```

### Retry Logic

The API client automatically retries failed requests with exponential backoff:

- **Retryable Errors**: Network errors, timeouts, 5xx server errors, rate limits
- **Non-Retryable Errors**: Validation errors, unauthorized, forbidden, not found
- **Retry Count**: 3 attempts (configurable)
- **Retry Delay**: 1000ms (configurable)

---

## Custom Hooks

### useApi Hook

Generic hook for API calls with loading and error states.

```javascript
import { useApi } from './hooks';

function MyComponent() {
  const { data, loading, error, execute, retry, clearError } = useApi(
    async () => {
      const response = await api.get('/medicines/');
      return response.data;
    },
    { immediate: false }  // Don't execute on mount
  );

  const handleFetch = async () => {
    try {
      const result = await execute();
      console.log('Data:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={() => retry()}>Retry</button>
        </div>
      )}
      {data && <p>Data: {JSON.stringify(data)}</p>}
      <button onClick={handleFetch}>Fetch</button>
    </div>
  );
}
```

### useAuth Hook

Manages authentication state (login/logout/tokens).

```javascript
import { useAuth } from './hooks';

function LoginPage() {
  const { 
    patientToken, 
    pharmacistToken,
    isAuthenticated,
    isPatient,
    isPharmacist,
    isLoading,
    error,
    patientLogin,
    pharmacistLogin,
    logout,
    clearError,
  } = useAuth();

  const handlePatientLogin = async () => {
    try {
      const result = await patientLogin('1234-5678-9012');
      console.log('Logged in:', result.patient);
    } catch (err) {
      console.error('Login failed:', err.message);
    }
  };

  const handlePharmacistLogin = async () => {
    try {
      const result = await pharmacistLogin('email@example.com', 'password', 'LIC123');
      console.log('Logged in:', result.pharmacist);
    } catch (err) {
      console.error('Login failed:', err.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isAuthenticated ? (
        <>
          <button onClick={handlePatientLogin}>Patient Login</button>
          <button onClick={handlePharmacistLogin}>Pharmacist Login</button>
        </>
      ) : (
        <button onClick={logout}>Logout</button>
      )}
    </div>
  );
}
```

### useFetch Hook

Fetches data with built-in caching and error handling.

```javascript
import { useFetch } from './hooks';

function MedicinesList() {
  const {
    data: medicines,
    loading,
    error,
    refetch,
    clearCache,
  } = useFetch('/medicines/', {
    immediate: true,
    cache: true,
    cacheTime: 60000,  // 1 minute
  });

  if (loading) return <div>Loading medicines...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {medicines?.map((med) => (
        <div key={med.id}>{med.name}</div>
      ))}
      <button onClick={() => refetch()}>Refresh</button>
      <button onClick={() => clearCache()}>Clear Cache</button>
    </div>
  );
}
```

### usePagination Hook

Manages pagination state for lists.

```javascript
import { usePagination } from './hooks';

function PaginatedList({ items }) {
  const pagination = usePagination(items, 20);  // 20 items per page

  return (
    <div>
      {/* Display current page items */}
      {pagination.currentItems.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}

      {/* Pagination info */}
      <p>
        Showing {pagination.startIndex} to {pagination.endIndex} of{' '}
        {pagination.total}
      </p>

      {/* Pagination controls */}
      <button 
        onClick={pagination.prevPage} 
        disabled={!pagination.hasPrevPage}
      >
        Previous
      </button>

      <span>Page {pagination.currentPage} of {pagination.pageCount}</span>

      <button 
        onClick={pagination.nextPage} 
        disabled={!pagination.hasNextPage}
      >
        Next
      </button>

      {/* Change page size */}
      <select onChange={(e) => pagination.changePageSize(Number(e.target.value))}>
        <option value="10">10 per page</option>
        <option value="20">20 per page</option>
        <option value="50">50 per page</option>
      </select>
    </div>
  );
}
```

### useLocalStorage Hook

Persists state in localStorage with cross-tab sync.

```javascript
import { useLocalStorage } from './hooks';

function PreferencesComponent() {
  const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
  const [language, setLanguage, removeLanguage] = useLocalStorage('language', 'en');

  return (
    <div>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option>light</option>
          <option>dark</option>
        </select>
      </label>

      <label>
        Language:
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option>en</option>
          <option>hi</option>
        </select>
      </label>

      <button onClick={removeTheme}>Reset Theme</button>
    </div>
  );
}
```

---

## State Management

### AppContext

Global state management using React Context API.

**Location:** `frontend/src/context/AppContext.jsx`

### Setup

```javascript
// In main App component
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </ErrorBoundary>
  );
}
```

### Usage

```javascript
import { useAppContext } from './context/AppContext';

function MyComponent() {
  const {
    // Patient state
    patient,
    patientId,
    isLoadingPatient,
    errorPatient,

    // Pharmacist state
    pharmacist,
    pharmacistId,
    isLoadingPharmacist,
    errorPharmacist,

    // Notifications
    notifications,

    // UI state
    sidebarOpen,
    activeTab,
    theme,

    // Methods
    setPatient,
    setPharmacist,
    addNotification,
    removeNotification,
    clearNotifications,
    toggleSidebar,
    setTheme,
    toggleTheme,
  } = useAppContext();

  // Use context values and methods
  const handleAddNotification = () => {
    addNotification({
      id: Date.now(),
      type: 'success',
      message: 'Order created successfully!',
      duration: 5000,
    });
  };

  return <div>...</div>;
}
```

### Updating Patient Data

```javascript
const { setPatient, setIsLoadingPatient, setErrorPatient } = useAppContext();

async function loadPatientData(abhaId) {
  setIsLoadingPatient(true);
  try {
    const response = await api.get(`/patients/${abhaId}`);
    setPatient(response.data);
    setErrorPatient(null);
  } catch (error) {
    setErrorPatient(error.message);
  } finally {
    setIsLoadingPatient(false);
  }
}
```

---

## Utilities

### Error Utilities

Convert error codes to user-friendly messages.

```javascript
import { 
  getErrorMessage, 
  isRetryableError, 
  formatErrorForDisplay 
} from './utils/errorUtils';

try {
  // API call
} catch (error) {
  const message = getErrorMessage(error);
  const isRetryable = isRetryableError(error);
  const formatted = formatErrorForDisplay(error);

  console.log(formatted);
  // {
  //   message: "Invalid medication",
  //   code: "VALIDATION_ERROR",
  //   isRetryable: false,
  //   isFatal: true,
  //   details: { field: 'quantity', ... }
  // }
}
```

### Validation Utilities

Validate user inputs with pre-defined rules.

```javascript
import {
  validateAbhaId,
  validatePhone,
  validateEmail,
  validatePassword,
  validateForm,
  checkPasswordStrength,
} from './utils/validationUtils';

// Single field validation
const result = validateAbhaId('1234-5678-9012');
if (!result.valid) {
  console.log(result.error);
}

// Form validation
const formData = {
  email: 'user@example.com',
  password: 'SecurePass123!',
};

const rules = {
  email: validateEmail,
  password: validatePassword,
};

const { isValid, errors } = validateForm(formData, rules);

// Password strength
const strength = checkPasswordStrength('MyPassword123!');
console.log(strength.level);  // 'strong'
```

### Format Utilities

Format values for display.

```javascript
import {
  formatDate,
  formatTime,
  formatCurrency,
  formatStatus,
  formatOrderStatus,
  getStatusColor,
  truncateText,
  capitalize,
  titleCase,
} from './utils/formatUtils';

// Date/time formatting
formatDate(new Date());                      // '01/15/2024'
formatTime(new Date());                      // '14:30'
formatDateTime(new Date());                  // '01/15/2024 14:30'

// Currency formatting
formatCurrency(999.99, 'INR');              // '₹ 999.99'

// Status formatting
formatOrderStatus('completed');              // 'Completed'
getStatusColor('completed');                 // 'green'

// Text formatting
truncateText('Long text here...', 10);       // 'Long text ...'
capitalize('hello');                         // 'Hello'
titleCase('hello world');                    // 'Hello World'
```

---

## Error Handling

### Error Boundary Component

Catches errors in component tree and displays fallback UI.

**Location:** `frontend/src/components/ErrorBoundary.jsx`

```javascript
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

### Error Boundary Features

- Catches unhandled React errors
- Shows user-friendly error UI
- Provides "Try Again" and "Reload" options
- Shows error details in development
- Tracks error count (resets if > 3)

### API Error Handling Strategy

1. **Validation Errors** (400, 422)
   - Show field-specific error messages
   - Don't retry automatically
   - Let user correct and resubmit

2. **Unauthorized** (401)
   - Log out user and redirect to login
   - Don't retry

3. **Forbidden** (403)
   - Show "Access Denied" message
   - Don't retry

4. **Not Found** (404)
   - Show "Resource not found"
   - Don't retry

5. **Server Errors** (5xx)
   - Show "Server error" message
   - Retry automatically up to 3 times
   - Provide manual retry option

6. **Network Errors**
   - Show "Connection failed"
   - Retry automatically
   - Provide manual retry option

### Example: Component with Error Handling

```javascript
import { useFetch } from './hooks';
import { getErrorMessage } from './utils/errorUtils';

function OrdersList() {
  const { data, loading, error, refetch } = useFetch('/orders/');

  if (loading) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return (
      <div style={{ color: 'red' }}>
        <p>Error: {getErrorMessage(error)}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      {data?.map((order) => (
        <div key={order.id}>{order.id}</div>
      ))}
    </div>
  );
}
```

---

## Migration Guide

### From v1.0 to v2.0

#### Step 1: Update Imports

**Before (v1.0):**
```javascript
import axios from 'axios';
const API_BASE = 'http://localhost:8000';

axios.post(`${API_BASE}/orders/`, data);
```

**After (v2.0):**
```javascript
import api from './api';
import { API_ENDPOINTS } from './config';

api.post(API_ENDPOINTS.ORDERS_CREATE, data);
```

#### Step 2: Add Error Handling

**Before (v1.0):**
```javascript
try {
  const response = await axios.post(...);
} catch (error) {
  console.log(error.response.data);
}
```

**After (v2.0):**
```javascript
import { ApiError } from './api';
import { getErrorMessage } from './utils/errorUtils';

try {
  const response = await api.post(...);
} catch (error) {
  if (error instanceof ApiError) {
    console.log(getErrorMessage(error));
  }
}
```

#### Step 3: Use Hooks for Data Fetching

**Before (v1.0):**
```javascript
function Component() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get('/medicines/')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);
}
```

**After (v2.0):**
```javascript
import { useFetch } from './hooks';

function Component() {
  const { data, loading, error } = useFetch('/medicines/');
}
```

#### Step 4: Replace Global State with Context

**Before (v1.0):**
```javascript
// In App.jsx
const [patient, setPatient] = useState(null);

// Pass down as props
<Dashboard patient={patient} setPatient={setPatient} />
```

**After (v2.0):**
```javascript
// In AppContext.jsx
const { patient, setPatient } = useAppContext();
```

#### Step 5: Update Component Props

**Before (v1.0):**
```javascript
function Dashboard({ patient, onLogout, apiBase }) {
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    axios.get(`${apiBase}/medicines/`)
      .then(res => setMedicines(res.data.medicines));
  }, [apiBase]);
}
```

**After (v2.0):**
```javascript
import { useAppContext } from './context/AppContext';
import { useFetch } from './hooks';

function Dashboard() {
  const { patient, logout } = useAppContext();
  const { data: medicines } = useFetch('/medicines/');
}
```

### Breaking Changes

1. **API_BASE no longer passed as prop** - Use config.js instead
2. **Response format changed** - Backend now returns `{ status, data, message }` format
3. **Error codes standardized** - Use `error.code` instead of checking HTTP status
4. **State management** - Use AppContext instead of passing state as props
5. **Axios directly** - Use `api` client instead of `axios` directly

---

## Component Best Practices

### Recommended Component Structure

```javascript
import React, { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFetch } from '../hooks';
import { getErrorMessage } from '../utils/errorUtils';
import api, { API_ENDPOINTS } from '../config';

/**
 * Component Name
 * Brief description of what this component does
 */
function MyComponent() {
  // 1. Get context
  const { patient, addNotification } = useAppContext();

  // 2. Use hooks
  const { data, loading, error, refetch } = useFetch(API_ENDPOINTS.MY_ENDPOINT);

  // 3. Local state if needed
  const [localState, setLocalState] = React.useState(null);

  // 4. Effects
  useEffect(() => {
    // Component logic here
  }, []);

  // 5. Event handlers
  const handleSubmit = async (formData) => {
    try {
      const response = await api.post(API_ENDPOINTS.MY_POST, formData);
      addNotification({
        type: 'success',
        message: 'Success!',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: getErrorMessage(error),
      });
    }
  };

  // 6. Render
  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {getErrorMessage(error)}</p>}
      {data && <>
        {/* Render data */}
      </>}
    </div>
  );
}

export default MyComponent;
```

### Common Patterns

#### Data Fetching Pattern
```javascript
const { data, loading, error, refetch } = useFetch('/endpoint/');

return (
  <>
    {loading && <LoadingSpinner />}
    {error && <ErrorMessage onRetry={refetch} />}
    {data && <DataDisplay data={data} />}
  </>
);
```

#### Form Submission Pattern
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await api.post(API_ENDPOINTS.CREATE, formData);
    addNotification({ type: 'success', message: 'Created!' });
    refetch();
  } catch (error) {
    addNotification({ type: 'error', message: getErrorMessage(error) });
  }
};
```

#### Authentication Pattern
```javascript
const { isPatient, logout } = useAuth();

if (!isPatient) {
  return <Navigate to="/login" />;
}

return (
  <>
    {/* Protected content */}
    <button onClick={logout}>Logout</button>
  </>
);
```

---

## Troubleshooting

### Issue: API Returns Error

**Solution:**
```javascript
import { getErrorMessage, formatErrorForDisplay } from './utils/errorUtils';

catch (error) {
  const formatted = formatErrorForDisplay(error);
  console.log('Error Code:', formatted.code);
  console.log('Message:', formatted.message);
  console.log('Retryable:', formatted.isRetryable);
}
```

### Issue: State Not Updating Across Components

**Solution:** Use AppContext instead of passing state as props
```javascript
import { useAppContext } from './context/AppContext';

function Component() {
  const { patient, setPatient } = useAppContext();
  // Now patient is updated everywhere
}
```

### Issue: Stale Data in useFetch

**Solution:** Call refetch or clear cache
```javascript
const { data, refetch, clearCache } = useFetch('/endpoint/');

// After mutation
refetch();      // Refetch with cache check
clearCache();   // Clear cache and refetch
```

### Issue: Hook Called Outside Component

**Solution:** Make sure hook is called inside React component
```javascript
// ❌ Wrong
const data = useFetch('/endpoint/');

// ✅ Correct
function MyComponent() {
  const data = useFetch('/endpoint/');
}
```

### Issue: useAppContext Throws Error

**Solution:** Wrap component with AppProvider
```javascript
// ❌ Wrong
<MyComponent />  // useAppContext will fail

// ✅ Correct
<AppProvider>
  <MyComponent />
</AppProvider>
```

---

## Summary

The AushadhiAI Frontend v2.0.0 modernization provides:

✅ **Centralized Configuration** - All settings in one place  
✅ **Standardized API Client** - Consistent error handling and retry logic  
✅ **Custom Hooks** - Reusable logic for common operations  
✅ **Global State Management** - Context-based state with useAppContext  
✅ **Error Boundaries** - Graceful error handling at component level  
✅ **Utility Functions** - Formatting, validation, error handling helpers  
✅ **Type Safety** - JSDoc comments for better IDE support  
✅ **Developer Experience** - Cleaner, more maintainable code patterns  

All modules follow enterprise standards and best practices, making the codebase scalable and maintainable for future development.
