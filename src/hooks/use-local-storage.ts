import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}

export function useAutoSave<T>(
  key: string,
  value: T,
  delay: number = 30000
) {
  const [, setValue] = useLocalStorage(key, value);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setValue(value);
      setLastSaved(new Date());
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, setValue]);

  return { lastSaved };
}
