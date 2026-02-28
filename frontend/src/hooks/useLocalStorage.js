/**
 * useLocalStorage - Custom hook for localStorage
 * Persists state in localStorage with sync across tabs
 */

import { useState, useCallback, useEffect } from 'react';

export const useLocalStorage = (key, initialValue = null) => {
  // Initialize state from localStorage or initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  /**
   * Set value in localStorage and state
   */
  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        // Dispatch custom event for cross-tab sync
        window.dispatchEvent(
          new CustomEvent('local-storage-change', {
            detail: { key, value: valueToStore },
          })
        );
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  /**
   * Remove from localStorage
   */
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent('local-storage-change', {
          detail: { key, value: null, removed: true },
        })
      );
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  /**
   * Listen for storage changes from other tabs
   */
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      }
    };

    const handleCustomStorageChange = (e) => {
      if (e.detail.key === key) {
        if (e.detail.removed) {
          setStoredValue(initialValue);
        } else {
          setStoredValue(e.detail.value);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleCustomStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};
