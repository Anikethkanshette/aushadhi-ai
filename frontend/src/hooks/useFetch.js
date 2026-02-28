/**
 * useFetch - Custom hook for fetching data
 * Provides loading, error states, and built-in cache
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import api, { ApiError } from '../api';
import { API_CONFIG } from '../config';

// In-memory cache for API responses
const fetchCache = new Map();

export const useFetch = (
  url,
  options = {
    immediate: true,
    cache: true,
    cacheTime: API_CONFIG.CACHE_TIME || 60000, // 1 minute default
    method: 'GET',
    data: null,
    dependencies: [],
  }
) => {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
    isError: false,
  });

  const cacheKeyRef = useRef(`${options.method}:${url}`);
  const cacheTimerRef = useRef(null);

  /**
   * Check if cached data is still valid
   */
  const getCachedData = useCallback(() => {
    if (!options.cache) return null;

    const cached = fetchCache.get(cacheKeyRef.current);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > options.cacheTime;
    if (isExpired) {
      fetchCache.delete(cacheKeyRef.current);
      return null;
    }

    return cached.data;
  }, [options.cache, options.cacheTime]);

  /**
   * Cache data
   */
  const setCachedData = useCallback((data) => {
    if (!options.cache) return;

    fetchCache.set(cacheKeyRef.current, {
      data,
      timestamp: Date.now(),
    });

    // Clear cache after timeout
    if (cacheTimerRef.current) {
      clearTimeout(cacheTimerRef.current);
    }
    cacheTimerRef.current = setTimeout(() => {
      fetchCache.delete(cacheKeyRef.current);
    }, options.cacheTime);
  }, [options.cache, options.cacheTime]);

  /**
   * Fetch data
   */
  const fetchData = useCallback(async (fetchUrl = url, fetchOptions = {}) => {
    const actualUrl = fetchUrl || url;
    if (!actualUrl) {
      setState((prev) => ({
        ...prev,
        error: new Error('URL is required'),
        isError: true,
      }));
      return;
    }

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setState({
        data: cachedData,
        loading: false,
        error: null,
        isError: false,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, isError: false }));

    try {
      let response;

      if (options.method === 'GET' || !options.method) {
        response = await api.get(actualUrl, fetchOptions);
      } else if (options.method === 'POST') {
        response = await api.post(actualUrl, options.data || fetchOptions.data, fetchOptions);
      } else if (options.method === 'PUT') {
        response = await api.put(actualUrl, options.data || fetchOptions.data, fetchOptions);
      } else if (options.method === 'PATCH') {
        response = await api.patch(actualUrl, options.data || fetchOptions.data, fetchOptions);
      } else if (options.method === 'DELETE') {
        response = await api.delete(actualUrl, fetchOptions);
      }

      const responseData = response.data || response;
      setCachedData(responseData);

      setState({
        data: responseData,
        loading: false,
        error: null,
        isError: false,
      });

      return responseData;
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err,
        isError: true,
      });
    }
  }, [url, options, getCachedData, setCachedData]);

  /**
   * Refetch data
   */
  const refetch = useCallback(async (fetchUrl = url) => {
    // Invalidate cache
    fetchCache.delete(cacheKeyRef.current);
    return fetchData(fetchUrl);
  }, [url, fetchData]);

  /**
   * Fetch on mount if immediate is true
   */
  useEffect(() => {
    if (options.immediate && url) {
      fetchData();
    }

    // Cleanup cache timer on unmount
    return () => {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
      }
    };
  }, [url, options.immediate, fetchData, ...options.dependencies]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, isError: false }));
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    fetchCache.delete(cacheKeyRef.current);
  }, []);

  return {
    ...state,
    refetch,
    fetch: fetchData,
    clearError,
    clearCache,
  };
};
