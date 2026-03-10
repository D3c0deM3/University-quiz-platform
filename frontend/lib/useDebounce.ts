import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the provided value.
 * The debounced value only updates after the specified delay
 * has passed without any new changes.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
