/**
 * AppContext - Global application state
 * Manages patient/pharmacist data, notifications, UI state
 */

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';

const AppContext = createContext(null);

/**
 * AppProvider Component
 */
export const AppProvider = ({ children }) => {
  // Initialize state from localStorage
  const getInitialState = () => {
    const savedPatient = localStorage.getItem('aushadhi_patient');
    const savedPharmacistToken = localStorage.getItem('aushadhi_pharmacist_token');
    
    return {
      // Patient data
      patient: savedPatient ? JSON.parse(savedPatient) : null,
      patientId: savedPatient ? JSON.parse(savedPatient).id : null,

      // Pharmacist data
      pharmacist: savedPharmacistToken ? { authenticated: true } : null,
      pharmacistId: null,

      // Notifications
      notifications: [],

      // UI state
      sidebarOpen: localStorage.getItem('sidebarOpen') === 'true' || true,
      activeTab: 'home',
      theme: localStorage.getItem('theme') || 'light',

      // Loading states
      isLoadingPatient: false,
      isLoadingPharmacist: false,

      // Error states
      errorPatient: null,
      errorPharmacist: null,

      // Last updated timestamps
      lastPatientUpdate: null,
      lastNotificationUpdate: null,
    };
  };

  const [state, setState] = useState(getInitialState());

  /**
   * Set patient data
   */
  const setPatient = useCallback((patient) => {
    setState((prev) => ({
      ...prev,
      patient,
      patientId: patient?.id,
      lastPatientUpdate: new Date(),
    }));
  }, []);

  /**
   * Set patient loading state
   */
  const setIsLoadingPatient = useCallback((loading) => {
    setState((prev) => ({
      ...prev,
      isLoadingPatient: loading,
    }));
  }, []);

  /**
   * Set patient error
   */
  const setErrorPatient = useCallback((error) => {
    setState((prev) => ({
      ...prev,
      errorPatient: error,
    }));
  }, []);

  /**
   * Clear patient error
   */
  const clearErrorPatient = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errorPatient: null,
    }));
  }, []);

  /**
   * Set pharmacist data
   */
  const setPharmacist = useCallback((pharmacist) => {
    setState((prev) => ({
      ...prev,
      pharmacist,
      pharmacistId: pharmacist?.id,
      lastPatientUpdate: new Date(),
    }));
  }, []);

  /**
   * Set pharmacist loading state
   */
  const setIsLoadingPharmacist = useCallback((loading) => {
    setState((prev) => ({
      ...prev,
      isLoadingPharmacist: loading,
    }));
  }, []);

  /**
   * Set pharmacist error
   */
  const setErrorPharmacist = useCallback((error) => {
    setState((prev) => ({
      ...prev,
      errorPharmacist: error,
    }));
  }, []);

  /**
   * Clear pharmacist error
   */
  const clearErrorPharmacist = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errorPharmacist: null,
    }));
  }, []);

  /**
   * Add notification
   */
  const addNotification = useCallback((notification) => {
    setState((prev) => ({
      ...prev,
      notifications: [notification, ...prev.notifications],
      lastNotificationUpdate: new Date(),
    }));
  }, []);

  /**
   * Update notification
   */
  const updateNotification = useCallback((id, updates) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif) =>
        notif.id === id ? { ...notif, ...updates } : notif
      ),
    }));
  }, []);

  /**
   * Remove notification
   */
  const removeNotification = useCallback((id) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((notif) => notif.id !== id),
    }));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: [],
    }));
  }, []);

  /**
   * Set sidebar open state
   */
  const setSidebarOpen = useCallback((open) => {
    setState((prev) => ({
      ...prev,
      sidebarOpen: open,
    }));
    localStorage.setItem('sidebarOpen', open);
  }, []);

  /**
   * Toggle sidebar
   */
  const toggleSidebar = useCallback(() => {
    setState((prev) => {
      const newState = !prev.sidebarOpen;
      localStorage.setItem('sidebarOpen', newState);
      return { ...prev, sidebarOpen: newState };
    });
  }, []);

  /**
   * Set active tab
   */
  const setActiveTab = useCallback((tab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  /**
   * Set theme
   */
  const setTheme = useCallback((theme) => {
    setState((prev) => ({
      ...prev,
      theme,
    }));
    localStorage.setItem('theme', theme);
  }, []);

  /**
   * Toggle theme
   */
  const toggleTheme = useCallback(() => {
    setState((prev) => {
      const newTheme = prev.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { ...prev, theme: newTheme };
    });
  }, []);

  /**
   * Clear all state (logout)
   */
  const clearAll = useCallback(() => {
    setState({
      patient: null,
      patientId: null,
      pharmacist: null,
      pharmacistId: null,
      notifications: [],
      sidebarOpen: true,
      activeTab: 'home',
      theme: 'light',
      isLoadingPatient: false,
      isLoadingPharmacist: false,
      errorPatient: null,
      errorPharmacist: null,
      lastPatientUpdate: null,
      lastNotificationUpdate: null,
    });
  }, []);

  const value = {
    // State
    ...state,

    // Patient methods
    setPatient,
    setIsLoadingPatient,
    setErrorPatient,
    clearErrorPatient,

    // Pharmacist methods
    setPharmacist,
    setIsLoadingPharmacist,
    setErrorPharmacist,
    clearErrorPharmacist,

    // Notification methods
    addNotification,
    updateNotification,
    removeNotification,
    clearNotifications,

    // UI methods
    setSidebarOpen,
    toggleSidebar,
    setActiveTab,
    setTheme,
    toggleTheme,

    // General methods
    clearAll,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * useAppContext Hook
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export default AppContext;
