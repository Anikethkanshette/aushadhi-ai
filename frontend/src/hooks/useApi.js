/**
 * useApi - Custom hook for API calls with error handling
 * Provides loading, error, and retry states
 */

import { useState, useCallback } from 'react';
import api, { ApiError } from '../api';

export const useApi = (
  apiFunction,
  options = {
    immediate: false,
    retryCount: 3,
    retryDelay: 1000,
  }
) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    isError: false,
  });

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = options.retryCount || 3;
  const retryDelay = options.retryDelay || 1000;

  /**
   * Execute API call with retry logic
   */
  const executeApi = useCallback(
    async (...args) => {
      setState((prev) => ({ ...prev, loading: true, error: null, isError: false }));

      try {
        const result = await apiFunction(...args);
        setState({
          data: result.data || result,
          loading: false,
          error: null,
          isError: false,
        });
        setRetryCount(0);
        return result;
      } catch (err) {
        // Determine if we should retry
        const shouldRetry =
          err.isNetworkError && retryCount < maxRetries;

        if (shouldRetry) {
          setRetryCount((prev) => prev + 1);
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          return executeApi(...args);
        }

        setState({
          data: null,
          loading: false,
          error: err,
          isError: true,
        });
        throw err;
      }
    },
    [apiFunction, retryCount, maxRetries, retryDelay]
  );

  /**
   * Manual retry
   */
  const retry = useCallback(
    async (...args) => {
      setRetryCount(0);
      return executeApi(...args);
    },
    [executeApi]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, isError: false }));
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      isError: false,
    });
    setRetryCount(0);
  }, []);

  return {
    ...state,
    execute: executeApi,
    retry,
    clearError,
    reset,
  };
};
