import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce any fast-changing value (such as search text input).
 * Returns the debounced value only after the specified delay has passed.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
