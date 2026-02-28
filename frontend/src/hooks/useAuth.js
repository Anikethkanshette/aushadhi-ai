/**
 * useAuth - Custom hook for authentication
 * Manages login, logout, token storage, and auth state
 */

import { useState, useCallback, useEffect } from 'react';
import api from '../api';
import { API_ENDPOINTS } from '../config';

/**
 * Get stored token from localStorage
 */
const getStoredToken = (userType) => {
  const key = userType === 'pharmacist' ? 'pharmacistToken' : 'patientToken';
  return localStorage.getItem(key);
};

/**
 * Store token in localStorage
 */
const storeToken = (userType, token) => {
  const key = userType === 'pharmacist' ? 'pharmacistToken' : 'patientToken';
  if (token) {
    localStorage.setItem(key, token);
  } else {
    localStorage.removeItem(key);
  }
};

export const useAuth = () => {
  const [authState, setAuthState] = useState({
    patientToken: null,
    pharmacistToken: null,
    patientId: null,
    pharmacistId: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  /**
   * Initialize auth - check for stored tokens
   */
  useEffect(() => {
    const patientToken = getStoredToken('patient');
    const pharmacistToken = getStoredToken('pharmacist');

    if (patientToken || pharmacistToken) {
      setAuthState((prev) => ({
        ...prev,
        patientToken: patientToken || null,
        pharmacistToken: pharmacistToken || null,
        isAuthenticated: !!patientToken || !!pharmacistToken,
      }));

      // Set API token
      if (patientToken) {
        api.setToken(patientToken);
      } else if (pharmacistToken) {
        api.setToken(pharmacistToken);
      }
    }
  }, []);

  /**
   * Patient Login
   */
  const patientLogin = useCallback(async (abhaId, password = null) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.post(API_ENDPOINTS.AUTH_LOGIN, {
        abha_id: abhaId,
        password,
      });

      const { token, patient } = response.data;

      storeToken('patient', token);
      api.setToken(token);

      setAuthState({
        patientToken: token,
        pharmacistToken: null,
        patientId: patient.id || abhaId,
        pharmacistId: null,
        user: patient,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { token, patient };
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
        isAuthenticated: false,
      }));
      throw err;
    }
  }, []);

  /**
   * Pharmacist Login
   */
  const pharmacistLogin = useCallback(async (email, password, licenseNumber) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.post(API_ENDPOINTS.PHARMACIST_LOGIN, {
        email,
        password,
        license_number: licenseNumber,
      });

      const { token, pharmacist } = response.data;

      storeToken('pharmacist', token);
      api.setToken(token);

      setAuthState({
        patientToken: null,
        pharmacistToken: token,
        patientId: null,
        pharmacistId: pharmacist.id,
        user: pharmacist,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { token, pharmacist };
    } catch (err) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message,
        isAuthenticated: false,
      }));
      throw err;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(() => {
    storeToken('patient', null);
    storeToken('pharmacist', null);
    api.setToken(null);

    setAuthState({
      patientToken: null,
      pharmacistToken: null,
      patientId: null,
      pharmacistId: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Check if logged in as patient
   */
  const isPatient = authState.patientToken !== null;

  /**
   * Check if logged in as pharmacist
   */
  const isPharmacist = authState.pharmacistToken !== null;

  /**
   * Get active token
   */
  const getToken = useCallback(() => {
    return authState.patientToken || authState.pharmacistToken;
  }, [authState.patientToken, authState.pharmacistToken]);

  return {
    // State
    ...authState,
    isPatient,
    isPharmacist,
    
    // Methods
    patientLogin,
    pharmacistLogin,
    logout,
    clearError,
    getToken,
  };
};
